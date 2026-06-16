import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Empty } from '../components/ui'
import { IconTournament, IconChevron } from '../components/Icons'

export function TournamentView(): JSX.Element {
  const { snapshot } = useStore()
  const [open, setOpen] = useState<string | null>(null)

  if (!snapshot) return <div className="page"><Empty icon={<IconTournament size={36} />} title="No campaign selected" /></div>

  const matches = [...snapshot.matches].reverse()
  const designTitle = (id: string) => snapshot.designs.find((d) => d.id === id)?.title ?? '(removed)'

  const debates = matches.filter((m) => m.mode === 'debate').length

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Tournament</h2>
        <span className="spacer" />
        <span className="badge">{matches.length} matches</span>
        <span className="badge accent">{debates} debates</span>
      </div>

      {matches.length === 0 ? (
        <Empty title="No matches yet" hint="The Ranking agent runs Elo tournament matches between designs as the campaign progresses." />
      ) : (
        <div className="col gap-sm">
          {matches.map((m) => {
            const expanded = open === m.id
            const winnerIsA = m.winnerId === m.designAId
            return (
              <div key={m.id} className="card" style={{ padding: 0 }}>
                <div
                  className="row"
                  style={{ padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => setOpen(expanded ? null : m.id)}
                >
                  <IconChevron
                    size={14}
                    className=""
                  />
                  <span className={`badge ${m.mode === 'debate' ? 'accent' : ''}`}>{m.mode}</span>
                  <div style={{ marginLeft: 8 }}>
                    <span style={{ fontWeight: winnerIsA ? 700 : 400, color: winnerIsA ? 'var(--text)' : 'var(--text-muted)' }}>
                      {designTitle(m.designAId)}
                    </span>
                    <span className="faint" style={{ margin: '0 8px' }}>vs</span>
                    <span style={{ fontWeight: !winnerIsA ? 700 : 400, color: !winnerIsA ? 'var(--text)' : 'var(--text-muted)' }}>
                      {designTitle(m.designBId)}
                    </span>
                  </div>
                  <span className="spacer" />
                  <span className="faint" style={{ fontSize: 'var(--fs-xs)' }}>cycle {m.cycle}</span>
                  <span className="badge ok" style={{ marginLeft: 8 }}>Δ{m.eloDelta}</span>
                </div>
                {expanded && (
                  <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="detail-block" style={{ marginTop: 12 }}>
                      <h4>Debate / comparison</h4>
                      <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{m.transcript}</p>
                    </div>
                    <div className="detail-block" style={{ marginBottom: 0 }}>
                      <h4>Decision rationale</h4>
                      <p>{m.rationale}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
