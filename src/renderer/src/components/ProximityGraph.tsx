import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum
} from 'd3-force'
import type { StrainDesign } from '@shared/domain'

interface Node extends SimulationNodeDatum {
  id: string
  cluster: number
  elo: number
  title: string
  status: string
}

const CLUSTER_COLORS = [
  '#3fb6a8',
  '#5b8def',
  '#8a7fd6',
  '#d8a64a',
  '#4fb477',
  '#d4685f',
  '#5fb6c9',
  '#c77fb0'
]

/**
 * Force-directed cluster map of the active designs. Colour = proximity cluster,
 * radius = Elo. Designs in the same cluster are linked, surfacing the structure
 * of the explored hypothesis space.
 */
export function ProximityGraph({
  designs,
  selectedId,
  onSelect
}: {
  designs: StrainDesign[]
  selectedId: string | null
  onSelect: (id: string) => void
}): JSX.Element {
  const W = 720
  const H = 460
  const ref = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])

  const sig = useMemo(
    () => designs.map((d) => `${d.id}:${d.clusterId ?? 0}:${d.elo}`).join('|'),
    [designs]
  )

  useEffect(() => {
    const ns: Node[] = designs.map((d) => ({
      id: d.id,
      cluster: d.clusterId ?? 0,
      elo: d.elo,
      title: d.title,
      status: d.status
    }))
    // Link designs that share a cluster (chain within each cluster).
    const byCluster = new Map<number, Node[]>()
    for (const n of ns) {
      if (!byCluster.has(n.cluster)) byCluster.set(n.cluster, [])
      byCluster.get(n.cluster)!.push(n)
    }
    const links: { source: string; target: string }[] = []
    for (const group of byCluster.values()) {
      for (let i = 1; i < group.length; i++) {
        links.push({ source: group[0].id, target: group[i].id })
      }
    }
    const sim = forceSimulation(ns)
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide<Node>().radius((n) => radius(n.elo) + 6))
      .force(
        'link',
        forceLink(links)
          .id((n: any) => n.id)
          .distance(70)
          .strength(0.25)
      )
      .stop()
    for (let i = 0; i < 240; i++) sim.tick()
    setNodes([...ns])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  if (!designs.length) {
    return <div className="empty">No active designs to map yet.</div>
  }

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {nodes.map((n) => {
          const sel = n.id === selectedId
          const color = CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length]
          return (
            <g
              key={n.id}
              transform={`translate(${n.x ?? W / 2},${n.y ?? H / 2})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(n.id)}
            >
              <circle
                r={radius(n.elo)}
                fill={color}
                fillOpacity={sel ? 0.95 : 0.55}
                stroke={sel ? '#fff' : color}
                strokeWidth={sel ? 2 : 1}
              />
              <text y={radius(n.elo) + 12} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">
                {n.title.length > 24 ? `${n.title.slice(0, 23)}…` : n.title}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function radius(elo: number): number {
  return 7 + Math.max(0, Math.min(18, (elo - 1180) / 12))
}
