import { useState } from 'react'
import { User, Mail, Building, Shield, Calendar, Key, CheckCircle, Edit3 } from 'lucide-react'

const ROLE_COLOR = {
  'Administrator': '#c0392b',
  'CISO':          '#1a3a5c',
  'SOC Analyst':   '#b7770d',
  'IT Operations': '#2d6a4f',
  'Viewer':        '#6b5a45',
}

const ROLE_PERMS = {
  'Administrator': ['Full dashboard access', 'Simulate & contain attacks', 'Restore snapshots', 'Manage users', 'View all logs'],
  'CISO':          ['Full dashboard access', 'View all threat data', 'Approve containment', 'View audit reports'],
  'SOC Analyst':   ['Live threat monitoring', 'Contain threats', 'Take snapshots', 'View quarantine & logs'],
  'IT Operations': ['Monitored folders', 'Backup snapshots', 'System hardening', 'View logs'],
  'Viewer':        ['View dashboard', 'View system status', 'View own file status'],
}

export default function ProfilePage({ user }) {
  const [tab, setTab] = useState('profile')
  if (!user) return null

  const color = ROLE_COLOR[user.role] ?? '#6b5a45'
  const perms = ROLE_PERMS[user.role] ?? []

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6" style={{ background: '#F5F5DC' }}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Profile card */}
        <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ background: color + '20', border: `2px solid ${color}`, color }}>
              {user.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: color + '15', border: `1px solid ${color}`, color }}>
                  {user.role}
                </span>
                <span className="text-xs" style={{ color: '#6b5a45' }}>{user.department}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#6b5a45' }}>{user.id}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['profile', 'permissions', 'security'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-colors"
              style={tab === t
                ? { background: '#C2A68D', color: '#1a1a1a', border: '1px solid #BFAF8D' }
                : { background: '#FFFFFF', color: '#6b5a45', border: '1px solid #D1BFA2' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#6b5a45' }}>Account Details</p>
            {[
              { icon: User,     label: 'Full Name',   value: user.name },
              { icon: Mail,     label: 'Login Email', value: user.login_email ?? user.email },
              { icon: Mail,     label: 'Alert Email', value: user.email },
              { icon: Building, label: 'Department',  value: user.department },
              { icon: Shield,   label: 'Role',        value: user.role },
              { icon: Key,      label: 'Employee ID', value: user.id },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
                <Icon size={14} style={{ color: '#C2A68D' }} className="shrink-0" />
                <span className="text-xs w-28 shrink-0" style={{ color: '#6b5a45' }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Permissions tab */}
        {tab === 'permissions' && (
          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#6b5a45' }}>Access Permissions</p>
            <div className="space-y-2">
              {perms.map(p => (
                <div key={p} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: '#d4edda', border: '1px solid #a8d5b5' }}>
                  <CheckCircle size={13} style={{ color: '#2d6a4f' }} />
                  <span className="text-xs" style={{ color: '#1a1a1a' }}>{p}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{ background: '#F5F5DC', color: '#6b5a45' }}>
              Permissions are assigned by your Administrator based on your role. Contact admin to request changes.
            </p>
          </div>
        )}

        {/* Security tab */}
        {tab === 'security' && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#6b5a45' }}>Security Settings</p>
            {[
              { label: 'Password', value: '••••••••••', note: 'PBKDF2-SHA256 hashed' },
              { label: 'Session Token', value: 'HMAC-SHA256 signed', note: 'Expires on logout' },
              { label: 'Login Rate Limit', value: '5 attempts / 60 seconds', note: 'Per IP address' },
              { label: 'Unauthorized Alert', value: 'Enabled', note: 'Admin notified on unknown login' },
            ].map(({ label, value, note }) => (
              <div key={label} className="px-3 py-2.5 rounded-lg" style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{label}</span>
                  <span className="text-xs font-mono" style={{ color: '#2d6a4f' }}>{value}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#C2A68D' }}>{note}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
