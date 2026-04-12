import { useState, useEffect } from 'react'
import { api } from '../lib/api'

import SystemStatusCard    from './SystemStatusCard'
import ThreatScoreGauge    from './ThreatScoreGauge'
import LiveActivityFeed    from './LiveActivityFeed'
import CanaryAlertPanel    from './CanaryAlertPanel'
import EntropyGraph        from './EntropyGraph'
import BackupSnapshotPanel from './BackupSnapshotPanel'
import QuarantineViewer    from './QuarantineViewer'
import MonitoredPathsPanel from './MonitoredPathsPanel'
import MonitoredFilesPanel from './MonitoredFilesPanel'
import HumanDefensePanel   from './HumanDefensePanel'
import AttackControlPanel  from './AttackControlPanel'
import ExfiltrationPanel   from './ExfiltrationPanel'
import MLPredictionPanel   from './MLPredictionPanel'
import ThreatTrendChart    from './ThreatTrendChart'
import OTAssetPanel        from './OTAssetPanel'

export default function Dashboard({ onStatusChange }) {
  const [sys, setSys] = useState({
    status: 'secure', threat_score: 0, canary_hit: false, canary_intact: true, exfiltration: {}
  })
  const [filesKey, setFilesKey] = useState(0)

  const refresh = () => {
    api.status().then(d => {
      if (d) { setSys(d); onStatusChange?.(d.status, d) }
    })
  }
  const refreshAll = () => { refresh(); setFilesKey(k => k + 1) }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4"
      style={{ background: '#F5F5DC' }}>

      {/* Row 1 */}
      <div className="grid grid-cols-12 gap-4 items-stretch">
        <div className="col-span-3">
          <SystemStatusCard status={sys.status} score={sys.threat_score} />
        </div>
        <div className="col-span-2">
          <ThreatScoreGauge score={sys.threat_score} />
        </div>
        <div className="col-span-4">
          <CanaryAlertPanel triggered={sys.canary_hit} canaryIntact={sys.canary_intact ?? true} />
        </div>
        <div className="col-span-3">
          <AttackControlPanel onRefresh={refreshAll} systemStatus={sys.status} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <MonitoredFilesPanel key={filesKey} onRefresh={refreshAll} />
        <LiveActivityFeed />
      </div>

      {/* Row 3 — Entropy full width */}
      <div className="grid grid-cols-1 gap-4">
        <EntropyGraph />
      </div>

      {/* Row 3b — Trend + OT Assets as equal halves */}
      <div className="grid grid-cols-2 gap-4">
        <ThreatTrendChart />
        <OTAssetPanel systemStatus={sys.status} />
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4">
          <MLPredictionPanel
            status={sys.status}
            threatScore={sys.threat_score}
            exfil={sys.exfiltration}
          />
        </div>
        <div className="col-span-3">
          <MonitoredPathsPanel />
        </div>
        <div className="col-span-5">
          <BackupSnapshotPanel />
        </div>
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-3 gap-4 items-stretch">
        <ExfiltrationPanel />
        <QuarantineViewer onRefresh={refreshAll} />
        <HumanDefensePanel />
      </div>

    </div>
  )
}
