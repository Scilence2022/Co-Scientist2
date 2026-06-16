import type { Campaign, StrainDesign } from '@shared/domain'
import type { EngineContext } from '../context'
import { parseJsonLoose } from '../../llm'
import { generationPrompt, SYSTEM_PREAMBLE, type GenerationStrategy } from '../prompts'
import { coerceDesign } from './util'
import { demoGenerateDesigns } from '../demo'

/**
 * Generation agent. Produces an initial set of designs (and later expansions)
 * using a rotating library of strategies, grounding in literature via the
 * deep-research MCP when available.
 */
export class GenerationAgent {
  constructor(private ctx: EngineContext) {}

  async generate(
    campaign: Campaign,
    strategy: GenerationStrategy,
    count: number,
    cycle: number,
    metaFeedback?: string
  ): Promise<StrainDesign[]> {
    const existingTitles = this.ctx.store.getDesigns(campaign.id).map((d) => d.title)

    if (this.ctx.demoMode) {
      const designs = demoGenerateDesigns(campaign, count, cycle * 7 + strategy.length)
      designs.forEach((d) => this.ctx.upsertDesign(d))
      this.ctx.log(
        campaign.id,
        'generation',
        'success',
        `Generated ${designs.length} designs via ${strategy} strategy`,
        { strategy }
      )
      return designs
    }

    // Literature grounding (best-effort).
    let literature: string | undefined
    if (strategy === 'literature' && this.ctx.deepResearch.available) {
      const finding = await this.ctx.deepResearch.search([
        {
          query: `metabolic engineering strategies to ${campaign.objective} ${campaign.productTarget} in ${campaign.host.preset}`,
          researchGoal: campaign.goal
        }
      ])
      if (finding) literature = finding.summary
    }

    const prompt = generationPrompt(campaign, strategy, {
      count,
      literature,
      metaFeedback,
      existingTitles: existingTitles.slice(-20)
    })

    // Budget scales with the number of designs requested: each full design is
    // ~2.5K tokens of JSON, plus headroom for adaptive thinking. The client
    // clamps this to the model's real max-output ceiling, so asking generously
    // is safe — it prevents the truncated-JSON → 0-designs failure mode.
    const res = await this.ctx.llm.complete({
      agent: 'generation',
      system: SYSTEM_PREAMBLE,
      prompt,
      effort: 'high',
      think: true,
      maxTokens: Math.max(16000, count * 3000 + 4000)
    })

    const parsed = parseJsonLoose<any[]>(res.text)
    const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
    const designs = list
      .map((o) => coerceDesign(o, campaign, 'generated', () => this.ctx.newId()))
      .filter((d): d is StrainDesign => !!d)

    designs.forEach((d) => this.ctx.upsertDesign(d))
    this.ctx.log(
      campaign.id,
      'generation',
      designs.length ? 'success' : 'warning',
      `Generated ${designs.length} designs via ${strategy} strategy${literature ? ' (literature-grounded)' : ''}`,
      { strategy }
    )
    return designs
  }
}
