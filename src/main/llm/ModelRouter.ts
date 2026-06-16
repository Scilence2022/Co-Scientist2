import type { AgentRole, AppSettings } from '@shared/domain'

/**
 * Resolves which model id a given agent should use, honouring the tiered
 * strategy (Opus for quality-critical agents, Sonnet for high-volume agents)
 * and any per-agent overrides set in Settings.
 */
export function resolveModel(agent: AgentRole, settings: AppSettings): string {
  const override = settings.llm.overrides[agent]
  if (override && override.trim()) return override.trim()

  const highTierAgents: AgentRole[] = ['generation', 'reflection', 'meta-review', 'supervisor']
  return highTierAgents.includes(agent)
    ? settings.llm.tiers.highTierModel
    : settings.llm.tiers.fastTierModel
}
