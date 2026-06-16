import type { AppSettings } from '@shared/domain'
import { resolveMaxOutputTokens } from '@shared/models'
import type { LLMClient, LLMRequest, LLMResponse } from './types'
import { resolveModel } from './ModelRouter'
import { getProvider, resolveBaseUrl, type ProviderDefinition } from '@shared/providers'

/**
 * OpenAI-compatible chat-completions client.
 *
 * Drives every non-Anthropic provider in the catalogue. Honours provider
 * defaults (base URL, headers) and any user override in `AppSettings.llm`.
 * Temperature is honoured here (unlike the Anthropic path, where it is
 * removed on Opus 4.8).
 */
export class OpenAICompatibleClient implements LLMClient {
  private settings: AppSettings
  private provider: ProviderDefinition | undefined
  private baseUrl: string
  /** Provider-specific extra headers (e.g. OpenRouter's HTTP-Referer). */
  private extraHeaders: Record<string, string>

  constructor(settings: AppSettings) {
    this.settings = settings
    this.provider = getProvider(settings.llm.provider)
    this.baseUrl = resolveBaseUrl(this.provider ?? { baseUrl: '' } as ProviderDefinition, settings.llm.baseUrl)
    this.extraHeaders = this.buildHeaders()
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    const id = this.provider?.id
    if (id === 'openrouter') {
      // OpenRouter attribution headers (recommended for higher rate limits).
      // The renderer can override by editing the request, but in main we set
      // sensible defaults that satisfy the recommendation.
      headers['HTTP-Referer'] = 'https://github.com/strain-co-scientist'
      headers['X-Title'] = 'Strain Co-Scientist'
    }
    return headers
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const model = resolveModel(req.agent, this.settings)
    // Adaptive output budget: clamp to the model's real max-output ceiling
    // (e.g. DeepSeek V4 emits up to 384K tokens, far above Claude's 128K).
    const body = {
      model,
      max_tokens: resolveMaxOutputTokens(model, req.maxTokens ?? this.settings.llm.maxTokens),
      temperature: this.settings.llm.temperature,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.extraHeaders
    }
    // Local servers (Ollama) often run without auth — omit the header rather
    // than send an empty string, which some servers reject.
    if (this.settings.llm.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.settings.llm.apiKey}`
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(
        `LLM request failed (${this.provider?.label ?? this.settings.llm.provider} ${res.status}): ${errText || res.statusText}`
      )
    }
    const json: any = await res.json()
    const text: string = json.choices?.[0]?.message?.content ?? ''
    return {
      text,
      model,
      stopReason: json.choices?.[0]?.finish_reason ?? undefined,
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0
      }
    }
  }

  async ping(): Promise<string> {
    const res = await this.complete({
      agent: 'supervisor',
      system: 'You are a connectivity probe.',
      prompt: 'Reply with the single word: ready',
      maxTokens: 16,
      effort: 'low'
    })
    return res.text.trim()
  }
}
