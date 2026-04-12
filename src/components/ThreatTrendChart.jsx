import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'

const INIT = [
  { day: 'Mon', threats: 3,  blocked: 3  },
  { day: 'Tue', threats: 7,  blocked: 6  },
  { day: 'Wed', threats: 2,  blocked: 2  },
  { day: 'Thu', threats: 12, blocked: 11 },
  { day: 'Fri', threats: 5,  blocked: 5  },
  { day: 'Sat', threats: 1,  blocked: 1  },
  { day: 'Sun', threats: 4,  blocked: 4  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
      <p className="font-semibold mb-1" style={{ color: '#1a1a1a' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.dataKey === 'threats' ? '#c0392b' : '#2d6a4f' }}>
          {p.dataKey === 'threats' ? 'Detected' : 'Blocked'}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function ThreatTrendChart() {
  const [data] = useState(INIT)

  return (
    <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} style={{ color: '#b7770d' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Weekly Threat Trend</p>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: '#6b5a45' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#c0392b', opacity: 0.7 }} /> Detected
          </span>
          <span className="flex items-center gap-1.5" style={{ color: '#6b5a45' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#2d6a4f', opacity: 0.7 }} /> Blocked
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -25 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D1BFA2" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#6b5a45', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b5a45', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(194,166,141,0.1)' }} />
          <Bar dataKey="threats" radius={[3, 3, 0, 0]} maxBarSize={18}>
            {data.map((_, i) => <Cell key={i} fill="#c0392b" fillOpacity={0.7} />)}
          </Bar>
          <Bar dataKey="blocked" radius={[3, 3, 0, 0]} maxBarSize={18}>
            {data.map((_, i) => <Cell key={i} fill="#2d6a4f" fillOpacity={0.7} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
