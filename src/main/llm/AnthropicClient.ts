import Anthropic from '@anthropic-ai/sdk'
import type { AppSettings } from '@shared/domain'
import { resolveMaxOutputTokens } from '@shared/models'
import type { LLMClient, LLMRequest, LLMResponse } from './types'
import { resolveModel } from './ModelRouter'

/**
 * Anthropic-backed LLM client.
 *
 * Notes for Claude 4.x (Opus 4.8 / Sonnet 4.6):
 * - Sampling params (temperature/top_p/top_k) are removed on Opus 4.8 and 400.
 *   We steer depth via `effort` + adaptive thinking instead.
 * - We always stream and collect the final message to stay clear of HTTP
 *   timeouts on longer generations (research overviews, full reviews).
 */
export class AnthropicClient implements LLMClient {
  private client: Anthropic
  private settings: AppSettings

  constructor(settings: AppSettings) {
    this.settings = settings
    this.client = new Anthropic({
      apiKey: settings.llm.apiKey,
      ...(settings.llm.baseUrl ? { baseURL: settings.llm.baseUrl } : {})
    })
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const model = resolveModel(req.agent, this.settings)
    // Adaptive output budget: honour the per-agent request but never exceed
    // what this specific model can actually emit in one response.
    const maxTokens = resolveMaxOutputTokens(model, req.maxTokens ?? this.settings.llm.maxTokens)

    // Built as `any` so newer API fields (output_config.effort, adaptive
    // thinking) pass through regardless of the installed SDK's static types.
    const params: any = {
      model,
      max_tokens: maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.prompt }],
      // effort is GA on Opus 4.6+/Sonnet 4.6 (no beta header needed).
      output_config: { effort: req.effort ?? 'high' },
      ...(req.think ? { thinking: { type: 'adaptive' } } : {})
    }

    const stream = this.client.messages.stream(params)
    const message = await stream.finalMessage()

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return {
      text,
      model: message.model,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens
      }
    }
  }

  async ping(): Promise<string> {
    const res = await this.client.messages.create({
      model: this.settings.llm.tiers.fastTierModel,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }]
    })
    const block = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    return block?.text?.trim() ?? ''
  }
}
