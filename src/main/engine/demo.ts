import type {
  Campaign,
  CriterionKey,
  EvolutionStrategy,
  Intervention,
  InterventionType,
  Review,
  ReviewType,
  StrainDesign
} from '@shared/domain'
import { hostDisplayName } from '@shared/hosts'

/**
 * Demo-mode content synthesis. When no LLM is configured (or demo mode is on),
 * the agents produce plausible, domain-appropriate strain-engineering content
 * so the entire system and UI are fully exercisable offline. This is NOT a
 * scientific oracle — it is a faithful structural stand-in for the LLM agents.
 */

const STRATEGY_TEMPLATES: {
  title: (p: string) => string
  type: InterventionType
  targets: (host: string) => string[]
  mechanism: string
}[] = [
  {
    title: (p) => `Relieve feedback inhibition in the ${p} pathway`,
    type: 'enzyme-engineering',
    targets: () => ['committed-step enzyme (feedback-resistant variant)'],
    mechanism:
      'Introduce a feedback-resistant variant of the committed-step enzyme to decouple flux from end-product allosteric inhibition, increasing precursor draw toward the product.'
  },
  {
    title: (p) => `Knock out competing byproduct pathway for ${p}`,
    type: 'knockout',
    targets: (h) => (h.includes('coli') ? ['ldhA', 'pta', 'adhE'] : ['major byproduct dehydrogenase']),
    mechanism:
      'Delete the dominant byproduct-forming branch to redirect carbon and reducing equivalents toward the target pathway, improving yield and reducing acetate/lactate overflow.'
  },
  {
    title: (p) => `Balance NADPH supply for ${p} biosynthesis`,
    type: 'cofactor-balancing',
    targets: () => ['zwf', 'pntAB (transhydrogenase)'],
    mechanism:
      'Rebalance redox by boosting NADPH supply (oxidative PPP / membrane transhydrogenase) to match the cofactor demand of the biosynthetic route, relieving a redox bottleneck.'
  },
  {
    title: (p) => `Dynamic two-stage control of the ${p} pathway`,
    type: 'dynamic-regulation',
    targets: () => ['quorum-sensing / stress-responsive promoter'],
    mechanism:
      'Place the pathway under a growth-decoupled dynamic regulator so biomass accumulates first, then flux is redirected to product, mitigating metabolic burden and toxicity.'
  },
  {
    title: (p) => `Heterologous high-flux route to ${p}`,
    type: 'heterologous-pathway',
    targets: () => ['codon-optimised heterologous operon'],
    mechanism:
      'Express a thermodynamically favourable heterologous route that bypasses an endogenous rate-limiting/regulated step, increasing maximum driving force (MDF).'
  },
  {
    title: (p) => `Promoter/RBS tuning of the rate-limiting ${p} enzyme`,
    type: 'promoter-swap',
    targets: () => ['rate-limiting enzyme expression cassette'],
    mechanism:
      'Tune expression of the rate-limiting enzyme via promoter/RBS libraries to match its in-vivo flux demand without imposing excess protein burden.'
  },
  {
    title: (p) => `Engineer product export for ${p}`,
    type: 'transporter-engineering',
    targets: () => ['efflux transporter (heterologous or native)'],
    mechanism:
      'Introduce/upregulate a product-specific efflux transporter to relieve intracellular product accumulation and feedback/toxicity, sustaining pathway flux.'
  },
  {
    title: (p) => `CRISPRi knockdown of a flux-draining node upstream of ${p}`,
    type: 'knockdown',
    targets: () => ['essential competing node (tunable knockdown)'],
    mechanism:
      'Use a tunable CRISPRi knockdown to throttle an essential competing reaction that cannot be deleted, redistributing flux toward the product while preserving viability.'
  }
]

function rng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function demoGenerateDesigns(
  campaign: Campaign,
  count: number,
  seed: number,
  origin: StrainDesign['origin'] = 'generated'
): StrainDesign[] {
  const host = hostDisplayName(campaign.host.preset, campaign.host.customName)
  const product = campaign.productTarget || 'the target product'
  const rand = rng(seed + count)
  const out: StrainDesign[] = []
  for (let i = 0; i < count; i++) {
    const tpl = STRATEGY_TEMPLATES[(seed + i) % STRATEGY_TEMPLATES.length]
    const interventions: Intervention[] = [
      { type: tpl.type, targets: tpl.targets(host), details: tpl.mechanism }
    ]
    // Some designs stack a second intervention.
    if (rand() > 0.5) {
      const tpl2 = STRATEGY_TEMPLATES[(seed + i + 3) % STRATEGY_TEMPLATES.length]
      interventions.push({ type: tpl2.type, targets: tpl2.targets(host), details: tpl2.mechanism })
    }
    const now = Date.now()
    out.push({
      id: `d_${seed}_${i}_${Math.floor(rand() * 1e6)}`,
      campaignId: campaign.id,
      createdAt: now,
      updatedAt: now,
      title: tpl.title(product),
      summary: `A ${tpl.type.replace('-', ' ')} strategy in ${host}: ${tpl.mechanism}`,
      chassis: host,
      interventions,
      mechanism: tpl.mechanism,
      predictedEffect: `Expected to improve ${campaign.objective.replace('-', ' ')} for ${product} by relieving the targeted bottleneck; magnitude to be quantified by the DBTL screen.`,
      experimentalPlan: [
        { phase: 'design', description: `Design constructs and parts for: ${interventions.map((x) => x.targets.join('/')).join(', ')}.` },
        { phase: 'build', description: `Assemble edits in ${host} using ${campaign.constraints.availableTools[0] ?? 'the standard toolkit'}.` },
        { phase: 'test', description: `Quantify ${product} titer/yield in shake-flask and validate with biological triplicates.` },
        { phase: 'learn', description: 'Use omics/flux analysis to confirm the mechanism and inform the next round.' }
      ],
      constructSuggestions: [],
      risks: [
        'Potential metabolic burden from added expression.',
        'Possible product/intermediate toxicity at higher titers.'
      ],
      citations: [],
      novelty: 4 + Math.floor(rand() * 5),
      origin,
      status: 'draft',
      lineage: { parentIds: [] },
      elo: 1200,
      eloHistory: [],
      wins: 0,
      losses: 0,
      reviewCount: 0
    })
  }
  return out
}

export function demoEvolveDesign(
  campaign: Campaign,
  parents: StrainDesign[],
  strategy: EvolutionStrategy,
  seed: number
): StrainDesign {
  const [child] = demoGenerateDesigns(campaign, 1, seed + 97, 'evolved')
  const parent = parents[0]
  child.title = `${strategyVerb(strategy)}: ${parent.title}`
  child.summary = `${strategyVerb(strategy)} of "${parent.title}". ${child.summary}`
  child.lineage = { parentIds: parents.map((p) => p.id), strategy }
  // Evolved designs tend to be a touch higher quality on average.
  child.novelty = Math.min(10, parent.novelty + (strategy === 'out-of-box' ? 2 : 1))
  if (strategy === 'combination' && parents[1]) {
    child.interventions = [...parent.interventions, ...parents[1].interventions].slice(0, 3)
    child.summary = `Combination of "${parent.title}" and "${parents[1].title}".`
  }
  return child
}

function strategyVerb(s: EvolutionStrategy): string {
  return {
    'grounding-enhancement': 'Grounded refinement',
    feasibility: 'Feasibility refinement',
    inspiration: 'Inspired variant',
    combination: 'Combination',
    simplification: 'Simplified variant',
    'out-of-box': 'Divergent variant'
  }[s]
}

export function demoReview(
  campaign: Campaign,
  design: StrainDesign,
  type: ReviewType,
  seed: number
): Omit<Review, 'id' | 'createdAt'> {
  const rand = rng(seed + design.title.length)
  const base = 5 + Math.floor(rand() * 4) // 5-8
  const noise = () => Math.max(2, Math.min(10, base + Math.floor(rand() * 3) - 1))
  const scores: Partial<Record<CriterionKey, number>> = {
    alignment: noise(),
    plausibility: noise(),
    novelty: design.novelty,
    testability: noise(),
    hostCompatibility: noise(),
    safety: 9
  }
  const mean =
    Object.values(scores).reduce((a, b) => a + (b ?? 0), 0) / Object.values(scores).length
  const verdict: Review['verdict'] = mean >= 6.5 ? 'pass' : mean >= 4.5 ? 'revise' : 'reject'
  const narratives: Record<ReviewType, string> = {
    initial: `Initial screen: the design is on-goal and mechanistically coherent for ${design.chassis}. ${verdict === 'reject' ? 'However, the predicted benefit is weak relative to the burden.' : 'It is worth advancing to the tournament.'}`,
    full: `Full review against the literature: the core mechanism is supported; the main uncertainty is the magnitude of flux gain given likely regulatory compensation.`,
    'deep-verification': `Deep verification: decomposed into assumptions — (1) the targeted step is rate-limiting, (2) the edit is genetically tractable, (3) no essential function is lost. Assumption (1) is the load-bearing one and should be validated first.`,
    observation: `Observation review: the design plausibly accounts for reported overflow phenotypes in ${design.chassis}; this strengthens its rationale.`,
    simulation: `Simulation review: stepping through the mechanism, the most likely failure mode is cofactor imbalance downstream; a balancing intervention may be needed.`,
    tournament: `Tournament re-review: addresses the recurring "burden vs benefit" critique better than average.`,
    expert: 'Expert review.'
  }
  return {
    designId: design.id,
    campaignId: campaign.id,
    type,
    scores,
    verdict,
    narrative: narratives[type],
    evidence: ['Pathway/regulation reasoning', design.citations[0]?.title ?? 'host physiology priors'],
    author: 'Reflection (demo)'
  }
}

/** Decide a demo match winner from a deterministic quality score. */
export function demoMatchWinner(
  a: StrainDesign,
  b: StrainDesign
): { winner: 'A' | 'B'; transcript: string; rationale: string } {
  const qa = quality(a)
  const qb = quality(b)
  const winner = qa >= qb ? 'A' : 'B'
  return {
    winner,
    transcript: `Comparing "${a.title}" (q≈${qa.toFixed(1)}) and "${b.title}" (q≈${qb.toFixed(1)}). Weighing novelty, feasibility, and testability for the goal, the stronger feasibility-to-burden ratio decides the match.`,
    rationale: `${winner === 'A' ? a.title : b.title} wins: better balance of mechanistic plausibility and testability with comparable novelty.`
  }
}

function quality(d: StrainDesign): number {
  const interventionScore = Math.min(3, d.interventions.length) * 0.5
  return d.novelty * 0.5 + interventionScore + (d.reviewCount > 0 ? 1 : 0) + (d.elo - 1200) / 100
}
