import { useStore } from '../store/useStore'
import { ProximityGraph } from '../components/ProximityGraph'
import { Empty } from '../components/ui'
import { IconGraph } from '../components/Icons'
import { DesignDrawer } from './DesignsExplorer'

export function ProximityView(): JSX.Element {
  const { snapshot, selectedDesignId, openDesign } = useStore()
  if (!snapshot) return <div className="page"><Empty icon={<IconGraph size={36} />} title="No campaign selected" /></div>

  const active = snapshot.designs.filter((d) => d.status === 'active' || d.status === 'flagged')
  const clusters = new Set(active.map((d) => d.clusterId ?? 0)).size
  const selected = snapshot.designs.find((d) => d.id === selectedDesignId) ?? null

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Proximity map</h2>
        <span className="spacer" />
        <span className="badge">{active.length} designs</span>
        <span className="badge accent">{clusters} clusters</span>
      </div>
      <div className="card pad-lg">
        <div className="faint" style={{ fontSize: 'var(--fs-sm)', marginBottom: 10 }}>
          The Proximity agent groups related designs by intervention and content similarity. Colour = cluster, size = Elo.
          Click a node to inspect the design.
        </div>
        <ProximityGraph designs={active} selectedId={selectedDesignId} onSelect={openDesign} />
      </div>
      {selected && <DesignDrawer design={selected} onClose={() => openDesign(null)} />}
    </div>
  )
}
