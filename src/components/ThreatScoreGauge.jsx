export default function ThreatScoreGauge({ score = 0 }) {
  // Show real score (can exceed 100), cap display arc at 200
  const display = Math.max(score, 0)
  const arcPct  = Math.min(display / 200, 1)   // arc fills based on 0–200 range
  const color   = display >= 70 ? '#c0392b' : display >= 30 ? '#b7770d' : '#2d6a4f'
  const bgColor = display >= 70 ? '#fde8e6' : display >= 30 ? '#fef3cd' : '#d4edda'
  const label   = display >= 70 ? 'CRITICAL' : display >= 30 ? 'ELEVATED' : 'NORMAL'

  const r = 52, cx = 64, cy = 64
  const startAngle = -220, endAngle = 40
  const totalArc   = endAngle - startAngle
  const fillArc    = arcPct * totalArc
  const toRad = (d) => (d * Math.PI) / 180
  const arcPath = (start, end) => {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) }
    const e = { x: cx + r * Math.cos(toRad(end)),   y: cy + r * Math.sin(toRad(end)) }
    const large = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2"
      style={{ background: '#FFFFFF', border: `1px solid ${display >= 70 ? color : '#D1BFA2'}` }}>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Threat Score</p>

      <div className="relative w-28 h-28">
        <svg viewBox="0 0 128 128" className="w-full h-full">
          {/* Background track */}
          <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#D1BFA2" strokeWidth="10" strokeLinecap="round" />
          {/* Safe zone 0–30 */}
          <path d={arcPath(startAngle, startAngle + totalArc * 0.15)} fill="none"
            stroke="#2d6a4f" strokeWidth="10" strokeLinecap="round" opacity="0.25" />
          {/* Warning zone 30–70 */}
          <path d={arcPath(startAngle + totalArc * 0.15, startAngle + totalArc * 0.35)} fill="none"
            stroke="#b7770d" strokeWidth="10" strokeLinecap="round" opacity="0.25" />
          {/* Critical zone 70–200 */}
          <path d={arcPath(startAngle + totalArc * 0.35, endAngle)} fill="none"
            stroke="#c0392b" strokeWidth="10" strokeLinecap="round" opacity="0.25" />
          {/* Live fill */}
          {fillArc > 0 && (
            <path d={arcPath(startAngle, startAngle + fillArc)} fill="none"
              stroke={color} strokeWidth="10" strokeLinecap="round"
              style={{ transition: 'all 0.6s ease', filter: display >= 70 ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
          )}
          {/* Tick marks at 30 and 70 */}
          {[{ pct: 0.15, label: '30' }, { pct: 0.35, label: '70' }].map(({ pct, label: tl }) => {
            const angle = startAngle + pct * totalArc
            const ox = cx + (r + 14) * Math.cos(toRad(angle))
            const oy = cy + (r + 14) * Math.sin(toRad(angle))
            return <text key={tl} x={ox} y={oy} textAnchor="middle" fontSize="8" fill="#C2A68D">{tl}</text>
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono leading-none" style={{ color }}>{display}</span>
          <span className="text-xs" style={{ color: '#6b5a45' }}>/ 200</span>
        </div>
      </div>

      <span className="text-xs font-bold tracking-widest px-3 py-1 rounded-full"
        style={{ color, background: bgColor, border: `1px solid ${color}` }}>
        {label}
      </span>

      <div className="flex gap-2 text-xs" style={{ color: '#6b5a45' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#2d6a4f' }} />0–30</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#b7770d' }} />30–70</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#c0392b' }} />70+</span>
      </div>
    </div>
  )
}
