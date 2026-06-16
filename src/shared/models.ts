/**
 * Per-model capability registry.
 *
 * Context-window and max-output-token limits vary widely between the models a
 * user can route the agents through (Claude Opus, DeepSeek V4, …). Rather than
 * hard-coding a single ceiling, every LLM request derives its output budget
 * from the capabilities of the *specific* model that will serve it, so the
 * engine stays correct whether it is talking to a 128K-output Opus or a
 * 384K-output DeepSeek V4.
 *
 * Lives in `@shared` so the engine (clamping) and the renderer (Settings
 * display) read from a single source of truth.
 */

export interface ModelCapabilities {
  /** Total context window (input + output) in tokens. */
  contextWindow: number
  /** Maximum tokens the model can emit in a single response. */
  maxOutput: number
}

interface RegistryEntry {
  /** Matched against the (case-insensitive) model id. */
  match: RegExp
  caps: ModelCapabilities
}

/**
 * Ordered most-specific first. The first entry whose pattern matches the model
 * id wins, so narrower patterns must precede broader ones.
 */
const REGISTRY: RegistryEntry[] = [
  // --- Anthropic Claude ---
  { match: /opus-4-8|opus-4\.8/i, caps: { contextWindow: 1_000_000, maxOutput: 128_000 } },
  { match: /opus-4-7|opus-4\.7/i, caps: { contextWindow: 1_000_000, maxOutput: 128_000 } },
  { match: /opus-4-6|opus-4\.6|opus-4-5|opus-4\.5/i, caps: { contextWindow: 1_000_000, maxOutput: 128_000 } },
  { match: /fable-5/i, caps: { contextWindow: 1_000_000, maxOutput: 128_000 } },
  { match: /sonnet-4-6|sonnet-4\.6|sonnet-4-5|sonnet-4\.5/i, caps: { contextWindow: 1_000_000, maxOutput: 64_000 } },
  { match: /haiku-4-5|haiku-4\.5/i, caps: { contextWindow: 200_000, maxOutput: 64_000 } },

  // --- DeepSeek V4 (V4-Pro and V4-Flash share the same window/output) ---
  { match: /deepseek.*v4|deepseek-(pro|flash)|v4-(pro|flash)/i, caps: { contextWindow: 1_000_000, maxOutput: 384_000 } },
  // Any other DeepSeek id falls back to the V4 envelope (the family the engine targets).
  { match: /deepseek/i, caps: { contextWindow: 1_000_000, maxOutput: 384_000 } }
]

/**
 * Conservative fallback for an unrecognised model id — small enough to be safe
 * on almost any provider, large enough not to truncate a single review.
 */
export const DEFAULT_CAPABILITIES: ModelCapabilities = {
  contextWindow: 200_000,
  maxOutput: 8_192
}

/** Resolve the capabilities for a model id (falls back to a safe default). */
export function modelCapabilities(modelId: string | undefined): ModelCapabilities {
  const id = (modelId ?? '').trim()
  if (id) {
    for (const entry of REGISTRY) {
      if (entry.match.test(id)) return entry.caps
    }
  }
  return DEFAULT_CAPABILITIES
}

/**
 * Clamp a desired output-token budget to what the model can actually emit.
 * A non-finite / non-positive `desired` falls back to the model's full ceiling.
 */
export function resolveMaxOutputTokens(modelId: string | undefined, desired: number): number {
  const cap = modelCapabilities(modelId).maxOutput
  const want = Number.isFinite(desired) && desired > 0 ? Math.floor(desired) : cap
  return Math.min(want, cap)
}
