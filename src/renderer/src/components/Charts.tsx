import { useMemo } from 'react'
import type { SystemStatistics, EloSnapshot } from '@shared/domain'

/**
 * Elo-over-time chart — the paper's signature metric. Plots the top-10 average
 * and the best Elo across supervisor cycles. Hand-rolled SVG to stay on-brand.
 */
export function EloChart({ stats }: { stats: SystemStatistics[] }): JSX.Element {
  const W = 640
  const H = 220
  const pad = { l: 44, r: 16, t: 14, b: 26 }

  const pts = stats.filter((s) => s.cycle > 0)
  if (pts.length < 2) {
    return <div className="empty" style={{ height: H }}>Elo trend appears once the tournament has a few cycles.</div>
  }

  const xs = pts.map((s) => s.cycle)
  const all = pts.flatMap((s) => [s.topEloAvg10, s.bestElo])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...all) - 10
  const maxY = Math.max(...all) + 10
  const sx = (x: number) => pad.l + ((x - minX) / Math.max(1, maxX - minX)) * (W - pad.l - pad.r)
  const sy = (y: number) => H - pad.b - ((y - minY) / Math.max(1, maxY - minY)) * (H - pad.t - pad.b)

  const line = (key: 'topEloAvg10' | 'bestElo') =>
    pts.map((s, i) => `${i === 0 ? 'M' : 'L'}${sx(s.cycle).toFixed(1)},${sy(s[key]).toFixed(1)}`).join(' ')

  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) / yTicks) * i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--border-subtle)" />
          <text x={pad.l - 8} y={sy(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-faint)">
            {Math.round(t)}
          </text>
        </g>
      ))}
      <path d={line('topEloAvg10')} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <path d={line('bestElo')} fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4 3" />
      {pts.map((s, i) => (
        <circle key={i} cx={sx(s.cycle)} cy={sy(s.topEloAvg10)} r="2.4" fill="var(--accent)" />
      ))}
      <text x={pad.l} y={H - 6} fontSize="10" fill="var(--text-faint)">cycle {minX}</text>
      <text x={W - pad.r} y={H - 6} fontSize="10" fill="var(--text-faint)" textAnchor="end">
        cycle {maxX}
      </text>
    </svg>
  )
}

export function ChartLegend(): JSX.Element {
  return (
    <div className="row gap-md" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
      <span className="row gap-sm">
        <svg width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" stroke="var(--accent)" strokeWidth="2" />
        </svg>
        Top-10 avg Elo
      </span>
      <span className="row gap-sm">
        <svg width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        Best Elo
      </span>
    </div>
  )
}

/** Tiny inline sparkline for a design's Elo history. */
export function Sparkline({ history }: { history: EloSnapshot[] }): JSX.Element {
  const W = 90
  const H = 22
  const data = useMemo(() => history.map((h) => h.elo), [history])
  if (data.length < 2) return <span className="faint mono">—</span>
  const min = Math.min(...data)
  const max = Math.max(...data)
  const sx = (i: number) => (i / (data.length - 1)) * W
  const sy = (v: number) => H - 2 - ((v - min) / Math.max(1, max - min)) * (H - 4)
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')
  const up = data[data.length - 1] >= data[0]
  return (
    <svg width={W} height={H}>
      <path d={d} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="1.6" />
    </svg>
  )
}

/** Horizontal distribution bar (e.g. designs by status). */
export function StackBar({
  segments
}: {
  segments: { label: string; value: number; color: string }[]
}): JSX.Element {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-input)' }}>
        {segments.map(
          (s, i) =>
            s.value > 0 && (
              <div
                key={i}
                style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                title={`${s.label}: ${s.value}`}
              />
            )
        )}
      </div>
      <div className="row wrap gap-md" style={{ marginTop: 8, fontSize: 'var(--fs-sm)' }}>
        {segments.map((s, i) => (
          <span key={i} className="row gap-sm muted">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            {s.label} <b style={{ color: 'var(--text)' }}>{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
