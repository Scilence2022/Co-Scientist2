import type { AppSettings } from '@shared/domain'
import type { LLMClient, LLMRequest, LLMResponse } from './types'
import { resolveModel } from './ModelRouter'

/**
 * Minimal OpenAI-compatible chat-completions client (for users who route the
 * agents through a proxy, a local model, or another provider). Uses fetch so
 * there is no extra dependency. Temperature is honoured here (unlike the
 * Anthropic path, where it is removed on Opus 4.8).
 */
export class OpenAICompatibleClient implements LLMClient {
  private settings: AppSettings
  private baseUrl: string

  constructor(settings: AppSettings) {
    this.settings = settings
    this.baseUrl = (settings.llm.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const model = resolveModel(req.agent, this.settings)
    const body = {
      model,
      max_tokens: req.maxTokens ?? this.settings.llm.maxTokens,
      temperature: this.settings.llm.temperature,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.llm.apiKey}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      throw new Error(`LLM request failed: ${res.status} ${await res.text()}`)
    }
    const json: any = await res.json()
    const text: string = json.choices?.[0]?.message?.content ?? ''
    return {
      text,
      model,
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
