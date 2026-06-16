/* Headless end-to-end smoke test of the multi-agent engine (demo mode). */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Engine } from '../src/main/engine/Engine'
import { DEFAULT_CRITERIA_WEIGHTS } from '../src/shared/domain'
import type { EngineEvent } from '../src/shared/ipc'

async function main(): Promise<void> {
  const events: EngineEvent[] = []
  const root = mkdtempSync(join(tmpdir(), 'scs-'))
  const engine = new Engine((e) => events.push(e), root)

  const settings = engine.getSettings()
  settings.run.demoMode = true
  settings.run.concurrency = 3
  await engine.saveSettings(settings)

  const campaign = engine.createCampaign({
    title: 'Smoke: mevalonate',
    productTarget: 'mevalonate',
    host: { preset: 'ecoli' },
    objective: 'increase-titer',
    goal: 'Increase mevalonate titer in E. coli MG1655 via rational pathway engineering.',
    constraints: {
      availableTools: ['CRISPR-Cas9', 'plasmid overexpression', 'RBS tuning'],
      forbiddenInterventions: [],
      biosafety: 'BSL-1',
      onlyNovel: true
    },
    preferences: 'Prefer genome-integrated edits.',
    criteriaWeights: DEFAULT_CRITERIA_WEIGHTS,
    computeBudget: { initialGeneration: 5, targetDesigns: 14, maxCycles: 10 }
  })

  await engine.startCampaign(campaign.id)

  const start = Date.now()
  while (Date.now() - start < 90_000) {
    const c = engine.listCampaigns().find((x) => x.id === campaign.id)!
    if (['completed', 'stopped', 'error'].includes(c.status)) break
    await new Promise((r) => setTimeout(r, 300))
  }

  const snap = engine.getSnapshot(campaign.id)!
  const active = snap.designs.filter((d) => d.status === 'active' || d.status === 'flagged')
  const lastStat = snap.statistics[snap.statistics.length - 1]

  console.log('--- Engine smoke results ---')
  console.log('status        :', snap.campaign.status)
  console.log('researchPlan  :', snap.campaign.researchPlan ? `${snap.campaign.researchPlan.focusAreas.length} focus areas` : 'none')
  console.log('designs total :', snap.designs.length, '(active', active.length, ', rejected', snap.designs.filter((d) => d.status === 'rejected').length, ')')
  console.log('reviews       :', snap.reviews.length)
  console.log('matches       :', snap.matches.length, `(debates ${snap.matches.filter((m) => m.mode === 'debate').length})`)
  console.log('metaReviews   :', snap.metaReviews.length)
  console.log('stat cycles   :', snap.statistics.length)
  console.log('bestElo       :', lastStat?.bestElo, '/ top10avg', lastStat?.topEloAvg10)
  console.log('evolved       :', snap.designs.filter((d) => d.origin === 'evolved').length)
  console.log('clusters      :', new Set(active.map((d) => d.clusterId ?? 0)).size)
  console.log('events        :', snap.events.length)
  console.log('emitted events:', events.length)
  console.log('construct sugg:', snap.designs.filter((d) => d.constructSuggestions.length > 0).length, 'designs')

  await engine.shutdown()

  const eloRose = (lastStat?.bestElo ?? 1200) !== 1200
  const ok =
    snap.campaign.status === 'completed' &&
    snap.designs.length >= 5 &&
    snap.reviews.length > 0 &&
    snap.matches.length > 0 &&
    snap.metaReviews.length > 0 &&
    snap.statistics.length > 0 &&
    eloRose &&
    snap.designs.some((d) => d.origin === 'evolved')

  console.log(ok ? '\nSMOKE OK' : '\nSMOKE FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
