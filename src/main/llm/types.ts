import type { AgentRole } from '@shared/domain'

export type Effort = 'low' | 'medium' | 'high' | 'max'

export interface LLMRequest {
  system: string
  /** The user turn. */
  prompt: string
  /** Which agent is calling — used by the router to pick a model. */
  agent: AgentRole
  /** Reasoning depth / token spend. */
  effort?: Effort
  /** Enable adaptive thinking (recommended for reasoning-heavy steps). */
  think?: boolean
  /** Upper bound on output tokens. */
  maxTokens?: number
}

export interface LLMUsage {
  inputTokens: number
  outputTokens: number
}

export interface LLMResponse {
  text: string
  usage: LLMUsage
  model: string
  /**
   * Why generation stopped (e.g. 'end_turn', 'max_tokens', 'refusal' for
   * Anthropic; 'stop', 'length' for OpenAI-compatible). Surfaced so agents can
   * diagnose truncation when parsing yields nothing.
   */
  stopReason?: string
}

/** Provider-agnostic client used by all agents. */
export interface LLMClient {
  complete(req: LLMRequest): Promise<LLMResponse>
  /** A cheap health/connectivity check. Returns a short echoed string. */
  ping(): Promise<string>
}
