import { useStore } from '../store/useStore'
import { NAV } from '../App'

export function Sidebar(): JSX.Element {
  const { view, setView, snapshot, openDesign } = useStore()

  const counts: Partial<Record<string, number>> = {
    designs: snapshot?.designs.filter((d) => d.status !== 'rejected').length,
    tournament: snapshot?.matches.length,
    log: snapshot?.events.length
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Logo />
          <div>
            <div className="brand-title">Strain Co-Scientist</div>
          </div>
        </div>
        <div className="brand-sub">Rational strain engineering</div>
      </div>
      <nav className="nav">
        <div className="nav-section">Workspace</div>
        {NAV.map((item) => {
          const Icon = item.icon
          const count = counts[item.key]
          return (
            <div
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => {
                openDesign(null)
                setView(item.key)
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {typeof count === 'number' && count > 0 && <span className="nav-count">{count}</span>}
            </div>
          )
        })}
      </nav>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
        Multi-agent engine · v0.1.0
      </div>
    </aside>
  )
}

function Logo(): JSX.Element {
  return (
    <svg className="brand-logo" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M8 14c2-3 6-3 8 0" stroke="var(--accent-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1.4" fill="var(--accent-strong)" />
      <circle cx="15" cy="9" r="1.4" fill="var(--accent-strong)" />
    </svg>
  )
}
