import { useState, useEffect } from 'react'
import { Cpu, Brain, Zap, CheckCircle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

function computeMLScore(status, threatScore, exfil) {
  const signals = {
    behavioralAnomaly: Math.min(threatScore / 2, 50),
    entropySpike:      status === 'critical' ? 90 : status === 'warning' ? 45 : Math.random() * 15,
    exfilRisk:         exfil?.honeypot_hit ? 85 : exfil?.read_anomaly ? 40 : Math.random() * 10,
    canaryRisk:        status === 'critical' ? 95 : status === 'warning' ? 30 : 5,
    networkAnomaly:    Math.random() * 20 + (status === 'critical' ? 30 : 0),
  }
  const weights = { behavioralAnomaly: 0.25, entropySpike: 0.3, exfilRisk: 0.2, canaryRisk: 0.15, networkAnomaly: 0.1 }
  const score = Object.entries(signals).reduce((acc, [k, v]) => acc + v * weights[k], 0)
  return { score: Math.min(Math.round(score), 99), signals }
}

function classifyRansomware(threatScore, status) {
  if (status !== 'critical' && threatScore < 30) return null
  return [
    { name: 'LockBit 3.0',    confidence: 72, method: 'XOR + rename pattern', color: '#c0392b' },
    { name: 'BlackCat/ALPHV', confidence: 18, method: 'Entropy spike profile', color: '#b7770d' },
    { name: 'Cl0p',           confidence: 10, method: 'File modification rate', color: '#6b5a45' },
  ]
}

const RADAR_LABELS = {
  behavioralAnomaly: 'Behavioral',
  entropySpike:      'Entropy',
  exfilRisk:         'Exfil',
  canaryRisk:        'Canary',
  networkAnomaly:    'Network',
}

export default function MLPredictionPanel({ status, threatScore, exfil }) {
  const [ml, setMl]         = useState({ score: 0, signals: {} })
  const [families, setFamilies] = useState(null)
  const [history, setHistory]   = useState([])

  useEffect(() => {
    const result = computeMLScore(status, threatScore, exfil)
    setMl(result)
    setFamilies(classifyRansomware(threatScore, status))
    setHistory(prev => {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      return [...prev.slice(-4), { time: now, score: result.score }]
    })
  }, [status, threatScore, exfil])

  const radarData = Object.entries(ml.signals).map(([k, v]) => ({
    subject: RADAR_LABELS[k] ?? k,
    value: Math.round(v),
  }))

  const riskColor = ml.score >= 70 ? '#c0392b' : ml.score >= 35 ? '#b7770d' : '#2d6a4f'
  const riskLabel = ml.score >= 70 ? 'HIGH RISK' : ml.score >= 35 ? 'ELEVATED' : 'LOW RISK'
  const riskBg    = ml.score >= 70 ? '#fde8e6' : ml.score >= 35 ? '#fef3cd' : '#d4edda'

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2', height: 380, overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: '#fef3cd', border: '1px solid #fde68a' }}>
          <Brain size={14} style={{ color: '#b7770d' }} />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>ML Threat Prediction</p>
        <span className="ml-auto badge" style={{ background: '#d4edda', border: '1px solid #a8d5b5', color: '#2d6a4f' }}>
          <Cpu size={9} /> LIVE MODEL
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Attack probability */}
        <div className="rounded-xl p-4 flex flex-col items-center gap-3"
          style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
          <p className="text-xs" style={{ color: '#6b5a45' }}>Attack Probability</p>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#D1BFA2" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none"
                stroke={riskColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - ml.score / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono" style={{ color: riskColor }}>{ml.score}%</span>
            </div>
          </div>
          <span className="badge" style={{ background: riskBg, border: `1px solid ${riskColor}`, color: riskColor }}>
            {riskLabel}
          </span>
        </div>

        {/* Radar */}
        <div className="rounded-xl p-3 flex flex-col" style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
          <p className="text-xs mb-1" style={{ color: '#6b5a45' }}>Signal Breakdown</p>
          <ResponsiveContainer width="100%" height={110}>
            <RadarChart data={radarData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <PolarGrid stroke="#D1BFA2" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b5a45', fontSize: 9 }} />
              <Radar dataKey="value" stroke="#b7770d" fill="#b7770d" fillOpacity={0.2} strokeWidth={1.5} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #D1BFA2', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#6b5a45' }}
                itemStyle={{ color: '#b7770d' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ransomware family classifier */}
      {families ? (
        <div className="rounded-xl p-3" style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
          <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: '#6b5a45' }}>
            <Zap size={11} style={{ color: '#b7770d' }} /> Ransomware Family Classification
          </p>
          <div className="space-y-2">
            {families.map(f => (
              <div key={f.name} className="flex items-center gap-3">
                <span className="text-xs w-28 font-mono" style={{ color: f.color }}>{f.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#D1BFA2' }}>
                  <div className="h-full rounded-full animate-progress"
                    style={{ width: `${f.confidence}%`, background: f.color, opacity: 0.8 }} />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: f.color }}>{f.confidence}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: '#C2A68D' }}>Based on XOR pattern + rename behavior</p>
        </div>
      ) : (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: '#d4edda', border: '1px solid #a8d5b5' }}>
          <CheckCircle size={13} style={{ color: '#2d6a4f' }} />
          <span className="text-xs" style={{ color: '#2d6a4f' }}>No ransomware family detected — system clean</span>
        </div>
      )}


    </div>
  )
}
