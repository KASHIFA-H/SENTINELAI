import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import LiveActivityFeed  from './LiveActivityFeed'
import EntropyGraph      from './EntropyGraph'
import ThreatScoreGauge  from './ThreatScoreGauge'
import MLPredictionPanel from './MLPredictionPanel'
import ThreatTrendChart  from './ThreatTrendChart'

export default function ThreatActivityPage() {
  const [sys, setSys] = useState({ status: 'secure', threat_score: 0, exfiltration: {} })

  useEffect(() => {
    const poll = () => api.status().then(d => { if (d) setSys(d) })
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>
      <p className="font-semibold text-lg" style={{ color: '#1a1a1a' }}>Threat Monitor</p>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-2"><ThreatScoreGauge score={Math.min(sys.threat_score, 100)} /></div>
        <div className="col-span-10 h-80"><LiveActivityFeed /></div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8"><EntropyGraph /></div>
        <div className="col-span-4"><ThreatTrendChart /></div>
      </div>
      <MLPredictionPanel status={sys.status} threatScore={sys.threat_score} exfil={sys.exfiltration} />
    </div>
  )
}
