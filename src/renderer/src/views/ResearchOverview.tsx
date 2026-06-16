import { useStore } from '../store/useStore'
import { Empty } from '../components/ui'
import { IconOverview } from '../components/Icons'

export function ResearchOverview(): JSX.Element {
  const { snapshot, openDesign, setView } = useStore()
  if (!snapshot) return <div className="page"><Empty icon={<IconOverview size={36} />} title="No campaign selected" /></div>

  const meta = snapshot.metaReviews[snapshot.metaReviews.length - 1]
  const designTitle = (id: string) => snapshot.designs.find((d) => d.id === id)?.title

  if (!meta) {
    return (
      <div className="page">
        <Empty
          icon={<IconOverview size={36} />}
          title="No research overview yet"
          hint="The Meta-review agent synthesises a DBTL roadmap from the campaign's reviews and tournament once enough designs have been evaluated. Run the campaign to generate it."
        />
      </div>
    )
  }

  return (
    <div className="page page-narrow col gap-lg">
      <div>
        <h2 style={{ fontSize: 'var(--fs-xl)', marginBottom: 6 }}>Research overview</h2>
        <div className="faint" style={{ fontSize: 'var(--fs-sm)' }}>
          Synthesised by the Meta-review agent · cycle {meta.cycle}
        </div>
      </div>

      <div className="card pad-lg">
        <div className="section-title">Executive summary</div>
        <p style={{ lineHeight: 1.6, margin: 0 }}>{meta.overview.summary}</p>
      </div>

      <div className="col gap-md">
        <div className="section-title">Engineering roadmap</div>
        {meta.overview.areas.map((area, i) => (
          <div key={i} className="card">
            <div className="card-title" style={{ marginBottom: 8 }}>{area.title}</div>
            <p className="muted" style={{ marginTop: 0, lineHeight: 1.55 }}>{area.justification}</p>
            {area.exampleExperiments.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 12 }}>Example experiments</div>
                <ul className="list-tight" style={{ margin: 0, paddingLeft: 18 }}>
                  {area.exampleExperiments.map((e, k) => (
                    <li key={k}>{e}</li>
                  ))}
                </ul>
              </>
            )}
            {area.relatedDesignIds.length > 0 && (
              <div className="row wrap gap-sm" style={{ marginTop: 12 }}>
                {area.relatedDesignIds.map((id) => (
                  <button
                    key={id}
                    className="badge accent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      openDesign(id)
                      setView('designs')
                    }}
                  >
                    {designTitle(id) ?? 'design'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {meta.critiquePatterns.length > 0 && (
        <div className="card">
          <div className="section-title">Recurring critique patterns</div>
          <ul className="list-tight muted" style={{ margin: 0, paddingLeft: 18 }}>
            {meta.critiquePatterns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {meta.suggestedExperts.length > 0 && (
        <div className="card">
          <div className="section-title">Suggested collaborators</div>
          <div className="col gap-md">
            {meta.suggestedExperts.map((e, i) => (
              <div key={i}>
                <div style={{ fontWeight: 600 }}>{e.name}</div>
                <div className="faint" style={{ fontSize: 'var(--fs-sm)' }}>{e.expertise}</div>
                <div className="muted" style={{ marginTop: 3 }}>{e.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
