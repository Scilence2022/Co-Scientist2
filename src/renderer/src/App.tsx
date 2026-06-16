import { useEffect } from 'react'
import { useStore, type ViewKey } from './store/useStore'
import {
  IconCampaigns,
  IconDashboard,
  IconExpert,
  IconGraph,
  IconLog,
  IconOverview,
  IconBeaker,
  IconSettings,
  IconTournament
} from './components/Icons'
import { Sidebar } from './views/Sidebar'
import { TopBar } from './views/TopBar'
import { Dashboard } from './views/Dashboard'
import { Campaigns } from './views/Campaigns'
import { DesignsExplorer } from './views/DesignsExplorer'
import { TournamentView } from './views/TournamentView'
import { ProximityView } from './views/ProximityView'
import { ResearchOverview } from './views/ResearchOverview'
import { ExpertView } from './views/ExpertView'
import { ActivityLog } from './views/ActivityLog'
import { Settings } from './views/Settings'

export const NAV: { key: ViewKey; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { key: 'campaigns', label: 'Campaigns', icon: IconCampaigns },
  { key: 'designs', label: 'Designs', icon: IconBeaker },
  { key: 'tournament', label: 'Tournament', icon: IconTournament },
  { key: 'proximity', label: 'Proximity map', icon: IconGraph },
  { key: 'overview', label: 'Research overview', icon: IconOverview },
  { key: 'expert', label: 'Expert-in-the-loop', icon: IconExpert },
  { key: 'log', label: 'Activity log', icon: IconLog },
  { key: 'settings', label: 'Settings', icon: IconSettings }
]

export default function App(): JSX.Element {
  const { ready, view, init } = useStore()

  useEffect(() => {
    void init()
    document.body.classList.add(`platform-${navigatorPlatform()}`)
  }, [init])

  if (!ready) {
    return (
      <div className="app" style={{ gridTemplateColumns: '1fr', gridTemplateAreas: '"main"' }}>
        <div className="empty" style={{ height: '100vh' }}>
          Loading Strain Co-Scientist…
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <TopBar />
      <main className="main">{renderView(view)}</main>
    </div>
  )
}

function renderView(view: ViewKey): JSX.Element {
  switch (view) {
    case 'dashboard':
      return <Dashboard />
    case 'campaigns':
      return <Campaigns />
    case 'designs':
      return <DesignsExplorer />
    case 'tournament':
      return <TournamentView />
    case 'proximity':
      return <ProximityView />
    case 'overview':
      return <ResearchOverview />
    case 'expert':
      return <ExpertView />
    case 'log':
      return <ActivityLog />
    case 'settings':
      return <Settings />
  }
}

function navigatorPlatform(): string {
  return navigator.userAgent.includes('Mac') ? 'darwin' : 'other'
}
