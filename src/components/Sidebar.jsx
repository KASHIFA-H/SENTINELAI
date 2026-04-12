import { LayoutDashboard, Activity, FolderOpen, Lock, HardDrive, ScrollText, Users, Brain, Cpu, Radio, Menu, LogOut, User, BarChart2 } from 'lucide-react'

const nav = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'threats',     label: 'Threat Monitor',      icon: Activity },
  { id: 'ot',          label: 'OT Asset Status',     icon: Cpu },
  { id: 'ml',          label: 'ML Prediction',       icon: Brain },
  { id: 'exfil',       label: 'Exfiltration',        icon: Radio },
  { id: 'folders',     label: 'Monitored Folders',   icon: FolderOpen },
  { id: 'quarantine',  label: 'Quarantine',          icon: Lock },
  { id: 'backups',     label: 'Backups',             icon: HardDrive },
  { id: 'logs',        label: 'System Logs',         icon: ScrollText },
  { id: 'awareness',   label: 'Human Awareness',     icon: Users },
  { id: 'profile',     label: 'My Profile',          icon: User },
  { id: 'admin',       label: 'Admin Report',        icon: BarChart2 },
]

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 90" fill="none">
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

export default function Sidebar({ active, onNavigate, collapsed, onToggle, user, onLogout }) {
  return (
    <aside
      className="shrink-0 flex flex-col h-screen border-r transition-all duration-300"
      style={{ background: '#D1BFA2', borderColor: '#C2A68D', width: collapsed ? 56 : 220 }}>

      {/* Header — logo + hamburger */}
      <div className="flex items-center border-b px-3 py-3 gap-2" style={{ borderColor: '#C2A68D' }}>
        {!collapsed && (
          <>
            <LogoMark size={36} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight" style={{ color: '#1a1a1a' }}>
                <span style={{ color: '#1a3a5c' }}>Sentinel</span><span style={{ color: '#00a8c0' }}>Shield</span>
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ background: '#00a8c0', color: '#fff', fontSize: 9 }}>AI</span>
                <span className="text-xs font-mono" style={{ color: '#6b5a45' }}>v2.4</span>
              </div>
            </div>
          </>
        )}
        <button onClick={onToggle}
          className="shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: '#3d3020' }}
          onMouseEnter={e => e.currentTarget.style.background = '#C2A68D'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Menu size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className="w-full flex items-center rounded-lg transition-all duration-150 relative border"
              style={{
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '8px 0' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                ...(isActive
                  ? { background: '#C2A68D', color: '#1a1a1a', borderColor: '#BFAF8D' }
                  : { background: 'transparent', color: '#3d3020', borderColor: 'transparent' })
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#C2A68D'; e.currentTarget.style.color = '#1a1a1a' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3d3020' } }}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ background: '#2d6a4f' }} />
              )}
              <Icon size={15} style={{ color: isActive ? '#1a1a1a' : '#6b5a45' }} />
              {!collapsed && <span className="font-medium text-xs tracking-wide">{label}</span>}
              {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#1a1a1a' }} />}
            </button>
          )
        })}
      </nav>

      {/* User info + logout at bottom */}
      {user && (
        <div className="border-t px-3 py-3" style={{ borderColor: '#C2A68D' }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: '#C2A68D', color: '#3d3020', border: '1px solid #BFAF8D' }}>
                {user.avatar}
              </div>
              <button onClick={onLogout} title="Sign out"
                className="p-1 rounded transition-colors" style={{ color: '#6b5a45' }}
                onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                onMouseLeave={e => e.currentTarget.style.color = '#6b5a45'}>
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: '#C2A68D', color: '#3d3020', border: '1px solid #BFAF8D' }}>
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#1a1a1a' }}>{user.name}</p>
                <p className="text-xs truncate" style={{ color: '#6b5a45' }}>{user.role}</p>
              </div>
              <button onClick={onLogout} title="Sign out"
                className="shrink-0 p-1 rounded transition-colors" style={{ color: '#6b5a45' }}
                onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                onMouseLeave={e => e.currentTarget.style.color = '#6b5a45'}>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
