import { AlertTriangle, CheckCircle, Eye, Info } from 'lucide-react'

export default function CanaryAlertPanel({ triggered = false, canaryIntact = true }) {
  const isTriggered = triggered || !canaryIntact
  const color       = isTriggered ? '#c0392b' : '#2d6a4f'
  const bgColor     = isTriggered ? '#fde8e6' : '#d4edda'
  const borderColor = isTriggered ? '#c0392b' : '#2d6a4f'

  return (
    <div className="rounded-xl p-5 relative overflow-hidden transition-all duration-500"
      style={isTriggered
        ? { background: '#FFFFFF', border: '1px solid #c0392b', boxShadow: '0 2px 12px rgba(192,57,43,0.2)', animation: 'pulse-red 1.2s ease-in-out infinite' }
        : { background: '#FFFFFF', border: '1px solid #D1BFA2' }
      }>

      {isTriggered && (
        <div className="absolute left-0 right-0 h-0.5 animate-scan pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      )}

      <div className="flex items-center gap-2 mb-4">
        <Eye size={14} style={{ color }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Canary Detection</p>
        {isTriggered && (
          <span className="ml-auto text-xs font-bold animate-flicker" style={{ color: '#c0392b' }}>● ALERT</span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="p-4 rounded-xl shrink-0" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
          {isTriggered
            ? <AlertTriangle size={28} className="animate-flicker" style={{ color }} />
            : <CheckCircle  size={28} style={{ color }} />
          }
        </div>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color }}>
            Canary: {isTriggered ? 'TRIGGERED' : 'SAFE'}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#6b5a45' }}>
            {isTriggered
              ? 'Ransomware touched the trap file — attack confirmed before full encryption'
              : 'Trap file untouched — no ransomware activity detected'}
          </p>
        </div>
      </div>

      <div className="mb-3 px-3 py-2 rounded-lg flex items-start gap-2"
        style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
        <Info size={11} style={{ color: '#C2A68D', marginTop: 1, flexShrink: 0 }} />
        <p className="text-xs" style={{ color: '#3d3020' }}>
          A canary file is a hidden trap. If ransomware touches it, we detect the attack
          <span style={{ color: '#C2A68D' }}> before your real files are encrypted.</span>
        </p>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${isTriggered ? 'animate-pulse' : ''}`}
          style={{ background: color }} />
        <span className="font-mono text-xs flex-1 truncate" style={{ color: '#6b5a45' }}>
          _sentinelshield_do_not_touch.txt
        </span>
        <span className="text-xs font-bold shrink-0" style={{ color }}>
          {canaryIntact && !triggered ? 'INTACT' : 'MODIFIED'}
        </span>
      </div>
    </div>
  )
}
