import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Empty, clockTime } from '../components/ui'
import { IconLog } from '../components/Icons'
import { AGENT_LABELS } from '@shared/domain'

export function ActivityLog(): JSX.Element {
  const { snapshot } = useStore()
  const [agent, setAgent] = useState<string>('all')
  const [severity, setSeverity] = useState<string>('all')

  if (!snapshot) return <div className="page"><Empty icon={<IconLog size={36} />} title="No campaign selected" /></div>

  let events = [...snapshot.events].reverse()
  if (agent !== 'all') events = events.filter((e) => e.agent === agent)
  if (severity !== 'all') events = events.filter((e) => e.severity === severity)

  const agents = Array.from(new Set(snapshot.events.map((e) => e.agent)))

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Activity log</h2>
        <span className="spacer" />
        <select value={agent} onChange={(e) => setAgent(e.target.value)} style={{ width: 160 }}>
          <option value="all">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>{AGENT_LABELS[a as keyof typeof AGENT_LABELS] ?? a}</option>
          ))}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ width: 140 }}>
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="card">
        {events.length === 0 ? (
          <Empty title="No events" hint="Run the campaign to populate the activity log." />
        ) : (
          <div className="scroll-y" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {events.map((e) => (
              <div key={e.id} className="feed-line">
                <span className="feed-time">{clockTime(e.at)}</span>
                <span className="feed-agent">{e.agent}</span>
                <span className={`feed-msg ${e.severity}`}>{e.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
