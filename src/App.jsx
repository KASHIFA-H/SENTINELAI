import { useState } from 'react'
import LoginPage          from './components/LoginPage'
import Sidebar            from './components/Sidebar'
import Header             from './components/Header'
import Dashboard          from './components/Dashboard'
import ThreatActivityPage from './components/ThreatActivityPage'
import MonitoredPathsPanel from './components/MonitoredPathsPanel'
import QuarantineViewer   from './components/QuarantineViewer'
import FileRecoveryPage   from './components/FileRecoveryPage'
import SystemLogsPage     from './components/SystemLogsPage'
import HumanDefensePanel  from './components/HumanDefensePanel'
import SettingsPage       from './components/SettingsPage'
import URLScanner         from './components/URLScanner'
import AIChatbot          from './components/AIChatbot'
import { useAttackNotifier } from './hooks/useAttackNotifier'
import { clearToken } from './lib/api'
import OTAssetPanel       from './components/OTAssetPanel'
import MLPredictionPanel  from './components/MLPredictionPanel'
import ExfiltrationPanel  from './components/ExfiltrationPanel'
import ProfilePage        from './components/ProfilePage'
import AdminReportPage    from './components/AdminReportPage'

const pages = {
  dashboard:  Dashboard,
  threats:    ThreatActivityPage,
  exfil: () => (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Exfiltration Detection</p>
      <ExfiltrationPanel />
    </div>
  ),
  folders: () => (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Monitored Folders</p>
      <MonitoredPathsPanel />
    </div>
  ),
  quarantine: () => (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Quarantine</p>
      <QuarantineViewer />
    </div>
  ),
  backups:    FileRecoveryPage,
  logs:       SystemLogsPage,
  awareness: () => (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Human Awareness</p>
      <URLScanner />
      <HumanDefensePanel />
    </div>
  ),
  settings:   SettingsPage,
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [page, setPage]       = useState('dashboard')
  const [status, setStatus]   = useState('secure')
  const [sysData, setSysData] = useState({ threat_score: 0, exfiltration: {} })
  const [collapsed, setCollapsed] = useState(false)

  // Fire sound + browser notification on attack
  useAttackNotifier(status, sysData.threat_score, sysData.exfiltration)

  if (!user) return <LoginPage onLogin={setUser} />

  const Page = pages[page] ?? Dashboard

  const sidebarProps = {
    active: page, onNavigate: setPage,
    collapsed, onToggle: () => setCollapsed(c => !c),
    user, onLogout: () => { clearToken(); setUser(null) }
  }

  // Pages that need live status/sysData passed in
  if (page === 'profile') return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header status={status} />
        <ProfilePage user={user} />
      </div>
      <AIChatbot status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
    </div>
  )

  if (page === 'admin') return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header status={status} />
        <AdminReportPage user={user} />
      </div>
      <AIChatbot status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
    </div>
  )

  if (page === 'ot') return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header status={status} />
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: '#F5F5DC' }}>
          <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>OT Asset Status</p>
          <OTAssetPanel systemStatus={status} />
        </div>
      </div>
      <AIChatbot status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
    </div>
  )

  if (page === 'ml') return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header status={status} />
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: '#F5F5DC' }}>
          <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>ML Threat Prediction</p>
          <MLPredictionPanel status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
        </div>
      </div>
      <AIChatbot status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-navy">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header status={status} />
        <main className="flex-1 overflow-hidden">
          <Page onStatusChange={(s, data) => { setStatus(s); if (data) setSysData(data) }} />
        </main>
      </div>
      <AIChatbot status={status} threatScore={sysData.threat_score} exfil={sysData.exfiltration} />
    </div>
  )
}
