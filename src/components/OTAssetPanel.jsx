import { useEffect, useState } from 'react'
import { Cpu, Wifi, WifiOff, AlertTriangle, CheckCircle, Activity } from 'lucide-react'

const ASSETS = [
  { id: 'PLC-01',    label: 'PLC-01',          sub: 'Production Line A',  icon: '⚙️' },
  { id: 'PLC-02',    label: 'PLC-02',          sub: 'Production Line B',  icon: '⚙️' },
  { id: 'SCADA',     label: 'SCADA Server',    sub: 'Historian + Control', icon: '🖥️' },
  { id: 'HMI-01',   label: 'HMI Terminal',    sub: 'Control Room',        icon: '📟' },
  { id: 'SAFETY',   label: 'Safety SIS',      sub: 'Triconex SIL-2',      icon: '🛡️' },
]

// Which assets get hit during attack (safety SIS is air-gapped — never affected)
const ATTACK_TARGETS = ['PLC-01', 'SCADA', 'HMI-01', 'PLC-02']

export default function OTAssetPanel({ systemStatus }) {
  const [assetStates, setAssetStates] = useState({})
  const [prevStatus, setPrevStatus] = useState('secure')

  useEffect(() => {
    if (prevStatus === systemStatus) return

    if (systemStatus === 'critical' || systemStatus === 'warning') {
      // Stagger the compromise animations
      ATTACK_TARGETS.forEach((id, i) => {
        setTimeout(() => {
          setAssetStates(s => ({ ...s, [id]: systemStatus }))
        }, i * 400)
      })
    } else if (systemStatus === 'secure' && prevStatus !== 'secure') {
      // Recovery — restore all one by one
      ATTACK_TARGETS.forEach((id, i) => {
        setTimeout(() => {
          setAssetStates(s => ({ ...s, [id]: 'recovering' }))
        }, i * 300)
        setTimeout(() => {
          setAssetStates(s => ({ ...s, [id]: 'secure' }))
        }, i * 300 + 800)
      })
    }
    setPrevStatus(systemStatus)
  }, [systemStatus])

  const getState = (id) => {
    if (id === 'SAFETY') return 'secure' // always safe — air-gapped
    return assetStates[id] ?? 'secure'
  }

  const stateConfig = {
    secure:     { color: '#2d6a4f', bg: '#d4edda', border: '#a8d5b5', label: 'Online',      dot: 'animate-pulse' },
    warning:    { color: '#b7770d', bg: '#fef3cd', border: '#fde68a', label: 'Warning',     dot: 'animate-pulse' },
    critical:   { color: '#c0392b', bg: '#fde8e6', border: '#f5c6c2', label: 'Compromised', dot: 'animate-ping'  },
    recovering: { color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', label: 'Recovering',  dot: 'animate-spin'  },
  }

  const compromisedCount = ATTACK_TARGETS.filter(id => {
    const s = getState(id)
    return s === 'critical' || s === 'warning'
  }).length

  return (
    <div className="rounded-xl p-4" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
      <div className="flex items-center gap-2 mb-3">
        <Activity size={13} style={{ color: '#b7770d' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>OT Asset Status</p>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={compromisedCount > 0
            ? { background: '#fde8e6', color: '#c0392b', border: '1px solid #f5c6c2' }
            : { background: '#d4edda', color: '#2d6a4f', border: '1px solid #a8d5b5' }}>
          {compromisedCount > 0 ? `${compromisedCount} compromised` : 'All Online'}
        </span>
      </div>

      <div className="space-y-1.5">
        {ASSETS.map(asset => {
          const state = getState(asset.id)
          const cfg = stateConfig[state] ?? stateConfig.secure
          return (
            <div key={asset.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-500"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span className="text-sm shrink-0">{asset.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>{asset.label}</p>
                <p className="text-xs truncate" style={{ color: '#6b5a45' }}>{asset.sub}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className={`${cfg.dot} absolute inline-flex h-full w-full rounded-full opacity-75`}
                    style={{ background: cfg.color }} />
                  <span className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: cfg.color }} />
                </span>
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-2 pt-2 border-t" style={{ borderColor: '#D1BFA2', color: '#C2A68D' }}>
        🛡️ Safety SIS air-gapped — attack-proof
      </p>
    </div>
  )
}
