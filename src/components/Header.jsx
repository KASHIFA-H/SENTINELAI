import { useEffect, useState } from 'react'
import { Wifi, AlertTriangle, CheckCircle } from 'lucide-react'

/* Same logo mark as sidebar/login */
function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size * 90 / 80} viewBox="0 0 80 90" fill="none">
      <path d="M40 4 L74 18 L74 52 C74 68 58 80 40 86 C22 80 6 68 6 52 L6 18 Z" fill="#1a3a5c" />
      <path d="M40 10 L68 22 L68 52 C68 65 54 76 40 81 C26 76 12 65 12 52 L12 22 Z" fill="#1e4976" />
      <line x1="20" y1="35" x2="28" y2="35" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="55" x2="60" y2="55" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="35" x2="28" y2="28" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="55" x2="52" y2="62" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="35" r="2" fill="#00c8e0" />
      <circle cx="60" cy="55" r="2" fill="#00c8e0" />
      <path d="M50 30 C50 30 46 27 41 28 C36 29 33 32 33 35 C33 38 35 40 39 41 L43 42 C47 43 49 45 49 48 C49 51 46 54 41 55 C36 56 33 53 33 53"
        stroke="#e8eef4" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="58" cy="22" r="4" fill="#00c8e0" opacity="0.9" />
      <circle cx="58" cy="22" r="2" fill="#ffffff" opacity="0.8" />
    </svg>
  )
}

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <span className="font-mono text-sm" style={{ color: '#6b5a45' }}>
      {t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      <span style={{ color: '#C2A68D' }} className="mx-2">·</span>
      <span style={{ color: '#3d3020' }}>{t.toLocaleTimeString('en-US', { hour12: false })}</span>
    </span>
  )
}

export default function Header({ status = 'secure' }) {
  const isAttack = status === 'critical'
  const isWarn   = status === 'warning'

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b"
      style={{ background: '#FFFFFF', borderColor: '#D1BFA2' }}>

      <div className="flex items-center gap-3">
        <LogoMark size={28} />
        <span className="font-bold text-sm tracking-tight" style={{ color: '#1a1a1a' }}>
          <span style={{ color: '#1a3a5c' }}>Sentinel</span><span style={{ color: '#00a8c0' }}>Shield</span>
          <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded align-middle"
            style={{ background: '#00a8c0', color: '#fff', fontSize: 9 }}>AI</span>
        </span>
        <span style={{ color: '#C2A68D' }} className="text-lg">|</span>
        <span className="text-xs" style={{ color: '#6b5a45' }}>Ransomware Defense Platform</span>
      </div>

      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border ${isAttack ? 'animate-flicker' : ''}`}
        style={isAttack
          ? { background: '#fde8e6', borderColor: '#c0392b', color: '#c0392b' }
          : isWarn
          ? { background: '#fef3cd', borderColor: '#b7770d', color: '#b7770d' }
          : { background: '#d4edda', borderColor: '#2d6a4f', color: '#2d6a4f' }
        }>
        {isAttack ? <><AlertTriangle size={12} /> UNDER ATTACK</>
          : isWarn  ? <><AlertTriangle size={12} /> WARNING</>
          : <><CheckCircle size={12} /> SYSTEM PROTECTED</>}
      </div>

      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#6b5a45' }}>
          <Wifi size={13} style={{ color: '#C2A68D' }} /> 48 nodes
        </span>
        <LiveClock />
      </div>
    </header>
  )
}
