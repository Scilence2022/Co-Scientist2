import type { AgentRole, AppSettings, ModelRef } from '@shared/domain'

/** Agents that use the quality-critical high tier; everything else uses fast. */
const HIGH_TIER_AGENTS: AgentRole[] = ['generation', 'reflection', 'meta-review', 'supervisor']

/**
 * Resolves which model — and which provider serving it — a given agent should
 * use. Honours per-agent overrides first, then the tiered strategy (high tier
 * for quality-critical agents, fast tier for high-volume agents). Because every
 * selection is a {@link ModelRef}, different agents can be routed to models
 * hosted by different providers.
 */
export function resolveModelRef(agent: AgentRole, settings: AppSettings): ModelRef {
  const override = settings.llm.overrides[agent]
  if (override && override.model.trim()) return override

  return HIGH_TIER_AGENTS.includes(agent)
    ? settings.llm.tiers.highTier
    : settings.llm.tiers.fastTier
}
