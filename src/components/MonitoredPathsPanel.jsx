import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import { FolderOpen, Plus, RefreshCw, ToggleLeft, ToggleRight, Shield, X, ChevronDown } from 'lucide-react'

// Common Windows/cross-platform folder suggestions
const SUGGESTIONS = [
  { label: 'Documents',   path: 'C:\\Users\\KASHIFA H\\Documents',   icon: '📄' },
  { label: 'Desktop',     path: 'C:\\Users\\KASHIFA H\\Desktop',     icon: '🖥️' },
  { label: 'Downloads',   path: 'C:\\Users\\KASHIFA H\\Downloads',   icon: '⬇️' },
  { label: 'Pictures',    path: 'C:\\Users\\KASHIFA H\\Pictures',    icon: '🖼️' },
  { label: 'Videos',      path: 'C:\\Users\\KASHIFA H\\Videos',      icon: '🎬' },
  { label: 'Music',       path: 'C:\\Users\\KASHIFA H\\Music',       icon: '🎵' },
  { label: 'OneDrive',    path: 'C:\\Users\\KASHIFA H\\OneDrive',    icon: '☁️' },
  { label: 'AppData',     path: 'C:\\Users\\KASHIFA H\\AppData\\Roaming', icon: '⚙️' },
  { label: 'D:\\ Drive',  path: 'D:\\',                              icon: '💾' },
  { label: 'E:\\ Drive',  path: 'E:\\',                              icon: '💾' },
  { label: 'Projects',    path: 'C:\\Users\\KASHIFA H\\Projects',    icon: '🗂️' },
  { label: 'Backup',      path: 'C:\\Users\\KASHIFA H\\Backup',      icon: '🔒' },
]

export default function MonitoredPathsPanel() {
  const [paths, setPaths]       = useState([])
  const [input, setInput]       = useState('')
  const [adding, setAdding]     = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [filter, setFilter]     = useState('')
  const inputRef = useRef(null)
  const dropRef  = useRef(null)

  useEffect(() => {
    api.status().then(d => {
      if (d?.monitored_paths?.length)
        setPaths(d.monitored_paths.map(p => ({ path: p, active: true })))
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (i) =>
    setPaths(prev => prev.map((p, idx) => idx === i ? { ...p, active: !p.active } : p))

  const remove = (i) =>
    setPaths(prev => prev.filter((_, idx) => idx !== i))

  const addPath = async (pathVal) => {
    const p = (pathVal ?? input).trim()
    if (!p || paths.find(x => x.path === p)) return
    setAdding(true)
    setShowSuggest(false)
    await api.addPath(p)
    setPaths(prev => [...prev, { path: p, active: true }])
    setInput('')
    setAdding(false)
  }

  const pickSuggestion = (s) => {
    setInput(s.path)
    setShowSuggest(false)
    inputRef.current?.focus()
  }

  const filtered = SUGGESTIONS.filter(s =>
    !paths.find(p => p.path === s.path) &&
    (filter === '' || s.label.toLowerCase().includes(filter.toLowerCase()) || s.path.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="rounded-xl p-4 flex flex-col w-full" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2', height: 380 }}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen size={13} style={{ color: '#2d6a4f' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Monitored Dirs</p>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: '#d4edda', color: '#2d6a4f', border: '1px solid #a8d5b5' }}>
          {paths.filter(p => p.active).length} active
        </span>
      </div>

      {/* Path list — fixed max height, scrolls */}
      <div className="overflow-y-auto scrollbar-thin space-y-1.5 mb-3" style={{ maxHeight: 180 }}>
        {paths.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: '#C2A68D' }}>No directories monitored yet</p>
        )}
        {paths.map((p, i) => (
          <div key={i}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors group"
            style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C2A68D'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#D1BFA2'}>
            <Shield size={11} style={{ color: p.active ? '#2d6a4f' : '#C2A68D' }} className="shrink-0" />
            <span className="flex-1 text-xs font-mono truncate" style={{ color: p.active ? '#1a1a1a' : '#6b5a45' }}
              title={p.path}>{p.path}</span>
            <button onClick={() => toggle(i)} className="shrink-0 opacity-70 hover:opacity-100">
              {p.active
                ? <ToggleRight size={17} style={{ color: '#2d6a4f' }} />
                : <ToggleLeft  size={17} style={{ color: '#C2A68D' }} />}
            </button>
            <button onClick={() => remove(i)}
              className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              style={{ color: '#c0392b' }}>
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Add input + suggestions */}
      <div className="relative" ref={dropRef}>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setFilter(e.target.value); setShowSuggest(true) }}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={e => { if (e.key === 'Enter') addPath(); if (e.key === 'Escape') setShowSuggest(false) }}
              placeholder="C:\path\to\folder"
              className="w-full rounded-lg px-2.5 py-2 text-xs placeholder-[#C2A68D] focus:outline-none font-mono"
              style={{ background: '#F5F5DC', border: '1px solid #D1BFA2', color: '#1a1a1a' }}
              onFocusCapture={e => e.target.style.borderColor = '#C2A68D'}
              onBlurCapture={e => e.target.style.borderColor = '#D1BFA2'}
            />
            <button onClick={() => setShowSuggest(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: '#C2A68D' }}>
              <ChevronDown size={12} />
            </button>
          </div>
          <button onClick={() => addPath()} disabled={adding || !input.trim()}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            style={{ color: '#2d6a4f', border: '1px solid #2d6a4f', background: 'transparent' }}
            onMouseEnter={e => { if (!adding) e.currentTarget.style.background = '#d4edda' }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {adding ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
            Add
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggest && filtered.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden shadow-lg"
            style={{ background: '#FFFFFF', border: '1px solid #D1BFA2', maxHeight: 220, overflowY: 'auto' }}>
            <p className="px-3 py-1.5 text-xs font-semibold" style={{ color: '#6b5a45', borderBottom: '1px solid #D1BFA2' }}>
              Suggested folders
            </p>
            {filtered.map((s, i) => (
              <button key={i} onClick={() => pickSuggestion(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F5DC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="text-sm">{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: '#1a1a1a' }}>{s.label}</p>
                  <p className="text-xs font-mono truncate" style={{ color: '#6b5a45' }}>{s.path}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
