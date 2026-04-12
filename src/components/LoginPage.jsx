import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, AlertTriangle, Loader, Shield } from 'lucide-react'
import { api, setToken } from '../lib/api'

function LogoMark({ size = 64 }) {
  return (
    <svg width={size} height={size * 90 / 80} viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 4 L74 18 L74 52 C74 68 58 80 40 86 C22 80 6 68 6 52 L6 18 Z" fill="#1a3a5c" />
      <path d="M40 10 L68 22 L68 52 C68 65 54 76 40 81 C26 76 12 65 12 52 L12 22 Z" fill="#1e4976" />
      <line x1="20" y1="35" x2="28" y2="35" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="55" x2="60" y2="55" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="35" x2="28" y2="28" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="55" x2="52" y2="62" stroke="#00c8e0" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="35" r="2" fill="#00c8e0" />
      <circle cx="60" cy="55" r="2" fill="#00c8e0" />
      <circle cx="28" cy="28" r="1.5" fill="#00c8e0" opacity="0.7" />
      <circle cx="52" cy="62" r="1.5" fill="#00c8e0" opacity="0.7" />
      <path d="M50 30 C50 30 46 27 41 28 C36 29 33 32 33 35 C33 38 35 40 39 41 L43 42 C47 43 49 45 49 48 C49 51 46 54 41 55 C36 56 33 53 33 53"
        stroke="#e8eef4" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M50 30 C50 30 46 27 41 28 C36 29 33 32 33 35"
        stroke="#a0b8cc" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="58" cy="22" r="4" fill="#00c8e0" opacity="0.9" />
      <circle cx="58" cy="22" r="2" fill="#ffffff" opacity="0.8" />
    </svg>
  )
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const timeout = new Promise(r => setTimeout(() => r(null), 8000))
    const res = await Promise.race([api.login(email.trim().toLowerCase(), password), timeout])
    if (res === null) {
      setError('Cannot connect to server. Make sure the backend is running.')
    } else if (res?.success && res.user) {
      if (res.token) setToken(res.token)
      // Request notification permission on login
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      await api.setSession(res.user)
      onLogin(res.user)
    } else {
      setError(res?.error ?? 'Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5DC' }}>
      <div className="relative w-full max-w-sm mx-auto px-6 flex flex-col items-center">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <LogoMark size={68} />
          <h1 className="text-2xl font-bold mt-3" style={{ color: '#1a1a1a' }}>
            <span style={{ color: '#1a3a5c' }}>Sentinel</span><span style={{ color: '#00a8c0' }}>Shield</span>
            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded align-middle"
              style={{ background: '#00a8c0', color: '#fff' }}>AI</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b5a45' }}>Ransomware Defense Platform</p>
        </div>

        {/* Form card */}
        <div className="w-full rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
          <h2 className="font-semibold text-base mb-1 text-center" style={{ color: '#1a1a1a' }}>Welcome back</h2>
          <p className="text-xs text-center mb-6" style={{ color: '#6b5a45' }}>Sign in with your company credentials</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#C2A68D' }} />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="company@sentinelshield.ai"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm placeholder-[#C2A68D] focus:outline-none transition-colors"
                style={{ background: '#F5F5DC', border: '1px solid #D1BFA2', color: '#1a1a1a' }}
                onFocus={e => e.target.style.borderColor = '#C2A68D'}
                onBlur={e => e.target.style.borderColor = '#D1BFA2'}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#C2A68D' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm placeholder-[#C2A68D] focus:outline-none transition-colors"
                style={{ background: '#F5F5DC', border: '1px solid #D1BFA2', color: '#1a1a1a' }}
                onFocus={e => e.target.style.borderColor = '#C2A68D'}
                onBlur={e => e.target.style.borderColor = '#D1BFA2'}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#C2A68D' }}
                onMouseEnter={e => e.currentTarget.style.color = '#6b5a45'}
                onMouseLeave={e => e.currentTarget.style.color = '#C2A68D'}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: '#fde8e6', border: '1px solid #c0392b', color: '#c0392b' }}>
                <AlertTriangle size={12} className="shrink-0" /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 mt-1"
              style={{ background: '#C2A68D', border: '1px solid #BFAF8D', color: '#1a1a1a' }}>
              {loading
                ? <><Loader size={14} className="animate-spin" /> Authenticating...</>
                : <><Shield size={14} /> Sign In</>
              }
            </button>
          </form>

        </div>

        <p className="text-xs mt-6" style={{ color: '#6b5a45' }}>© 2026 SentinelShield Technologies · v2.4.1-beta</p>
      </div>
    </div>
  )
}
