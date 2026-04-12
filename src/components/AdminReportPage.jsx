import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { BarChart2, Users, ShieldAlert, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'

const EMPLOYEES = [
  { id: 'EMP001', name: 'Alex Morgan',      role: 'Administrator', avatar: 'AM', dept: 'IT Security' },
  { id: 'EMP002', name: 'Sarah Chen',       role: 'SOC Analyst',   avatar: 'SC', dept: 'Security Ops' },
  { id: 'EMP003', name: 'James Wilson',     role: 'Viewer',        avatar: 'JW', dept: 'Management' },
  { id: 'EMP004', name: 'Priya Nair',       role: 'IT Operations', avatar: 'PN', dept: 'Infrastructure' },
  { id: 'EMP005', name: 'David Reeves',     role: 'CISO',          avatar: 'DR', dept: 'Executive' },
]

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
      <div className="p-2.5 rounded-lg shrink-0" style={{ background: color + '15' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color: '#1a1a1a' }}>{value}</p>
        <p className="text-xs" style={{ color: '#6b5a45' }}>{label}</p>
      </div>
    </div>
  )
}

export default function AdminReportPage({ user }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const d = await api.threatEvents(100)
    if (Array.isArray(d)) setEvents(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Only admins and CISO can see this
  if (!user || !['Administrator', 'CISO'].includes(user.role)) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#F5F5DC' }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
          <ShieldAlert size={40} style={{ color: '#c0392b', margin: '0 auto 12px' }} />
          <p className="font-bold" style={{ color: '#c0392b' }}>Access Denied</p>
          <p className="text-xs mt-1" style={{ color: '#6b5a45' }}>Admin or CISO role required</p>
        </div>
      </div>
    )
  }

  const loginEvents    = events.filter(e => e.event_type === 'user_login')
  const attackEvents   = events.filter(e => e.event_type?.includes('attack') || e.event_type?.includes('canary') || e.event_type?.includes('ransomware'))
  const recoveryEvents = events.filter(e => e.event_type?.includes('recovery') || e.event_type?.includes('restore'))
  const unauthorised   = events.filter(e => e.event_type === 'unauthorized_login_attempt')

  // Per-employee activity from login events
  const empActivity = EMPLOYEES.map(emp => {
    const logins   = loginEvents.filter(e => e.action_taken?.includes(emp.name)).length
    const lastSeen = loginEvents.find(e => e.action_taken?.includes(emp.name))?.timestamp
    return { ...emp, logins, lastSeen }
  })

  const fmt = (ts) => {
    if (!ts) return 'Never'
    try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
    catch { return ts }
  }

  const eventColor = (type) => {
    if (type?.includes('attack') || type?.includes('canary') || type?.includes('ransomware')) return '#c0392b'
    if (type?.includes('login')) return '#2d6a4f'
    if (type?.includes('recovery') || type?.includes('restore')) return '#2563eb'
    if (type?.includes('unauthorized')) return '#c0392b'
    return '#6b5a45'
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5 space-y-4" style={{ background: '#F5F5DC' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg" style={{ color: '#1a1a1a' }}>Admin Activity Report</p>
          <p className="text-xs" style={{ color: '#6b5a45' }}>Organisation-wide security activity and employee monitoring</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ background: '#FFFFFF', border: '1px solid #D1BFA2', color: '#6b5a45' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#C2A68D'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#D1BFA2'}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Employees"    value={EMPLOYEES.length}       color="#1a3a5c" />
        <StatCard icon={Clock}       label="Login Events"       value={loginEvents.length}     color="#2d6a4f" />
        <StatCard icon={ShieldAlert} label="Attack Events"      value={attackEvents.length}    color="#c0392b" />
        <StatCard icon={AlertTriangle} label="Unauthorised Attempts" value={unauthorised.length} color="#b7770d" />
      </div>

      {/* Employee activity table */}
      <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} style={{ color: '#1a3a5c' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Employee Activity</p>
        </div>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-semibold" style={{ color: '#6b5a45' }}>
            <div className="col-span-4">Employee</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2 text-center">Logins</div>
            <div className="col-span-2">Last Seen</div>
          </div>
          {empActivity.map(emp => (
            <div key={emp.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg items-center"
              style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
              <div className="col-span-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: '#D1BFA2', color: '#3d3020' }}>{emp.avatar}</div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{emp.name}</p>
                  <p className="text-xs" style={{ color: '#6b5a45' }}>{emp.id}</p>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#FFFFFF', border: '1px solid #D1BFA2', color: '#3d3020' }}>
                  {emp.role}
                </span>
              </div>
              <div className="col-span-2 text-xs" style={{ color: '#6b5a45' }}>{emp.dept}</div>
              <div className="col-span-2 text-center">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: emp.logins > 0 ? '#d4edda' : '#F5F5DC', color: emp.logins > 0 ? '#2d6a4f' : '#6b5a45' }}>
                  {emp.logins}
                </span>
              </div>
              <div className="col-span-2 text-xs" style={{ color: '#6b5a45' }}>{fmt(emp.lastSeen)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent events log */}
      <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} style={{ color: '#b7770d' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>All Security Events</p>
          <span className="ml-auto text-xs" style={{ color: '#6b5a45' }}>{events.length} total</span>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
          {events.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: '#6b5a45' }}>
              {loading ? 'Loading events...' : 'No events yet — connect to Supabase to see live data'}
            </p>
          )}
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs font-mono"
              style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
              <span className="shrink-0 w-16" style={{ color: '#C2A68D' }}>
                {e.timestamp ? new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
              </span>
              <span className="shrink-0 w-40 truncate font-semibold" style={{ color: eventColor(e.event_type) }}>
                {e.event_type}
              </span>
              <span className="flex-1 truncate" style={{ color: '#3d3020' }}>{e.action_taken}</span>
              {e.threat_score > 0 && (
                <span className="shrink-0 font-bold" style={{ color: '#c0392b' }}>+{e.threat_score}</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
