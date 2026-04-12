import { useState } from 'react'
import { api } from '../lib/api'
import { Zap, ShieldOff, RotateCcw, RefreshCw, Play, Info, RotateCw } from 'lucide-react'
import AttackDetailPanel from './AttackDetailPanel'

export default function AttackControlPanel({ onRefresh, systemStatus }) {
  const [loading, setLoading]       = useState(null)
  const [log, setLog]               = useState([])
  const [showDetail, setShowDetail] = useState(false)

  const addLog = (msg, type = 'ok') =>
    setLog(prev => [{ msg, type, t: new Date().toLocaleTimeString('en-US', { hour12: false }) }, ...prev].slice(0, 5))

  const run = async (id, label, fn, successMsg) => {
    setLoading(id); addLog(`${label}...`, 'warn')
    const res = await fn()
    if (res) addLog(successMsg ?? `${label} complete`, 'ok')
    else     addLog(`${label} failed — backend offline?`, 'err')
    setLoading(null)
    // Force immediate refresh after any action
    onRefresh?.()
    setTimeout(() => onRefresh?.(), 1000)
    setTimeout(() => onRefresh?.(), 2500)
  }

  const isUnderAttack = systemStatus === 'critical' || systemStatus === 'warning'
  const logColor = { ok: '#2d6a4f', warn: '#b7770d', err: '#c0392b' }

  return (
    <>
      <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #D1BFA2' }}>
        <div className="flex items-center gap-2 mb-4">
          <Play size={14} style={{ color: '#b7770d' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Controls</p>
          {isUnderAttack && (
            <button onClick={() => setShowDetail(true)}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors animate-flicker"
              style={{ color: '#c0392b', border: '1px solid #c0392b', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fde8e6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Info size={11} /> Details
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 mb-3">
          <button onClick={() => run('attack', 'Simulating attack', api.simulateAttack, 'Attack started — watch threat score rise')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-40"
            style={{ color: '#c0392b', background: '#fde8e6', border: '1px solid #c0392b' }}>
            {loading === 'attack' ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Simulate Attack
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => run('contain', 'Containing threat', api.contain, 'Threat contained — score reset')}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#b7770d', background: '#fef3cd', border: '1px solid #b7770d' }}>
              {loading === 'contain' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldOff size={14} />}
              Contain
            </button>
            <button onClick={() => run('snapshot', 'Taking snapshot', api.takeSnapshot, 'Snapshot created')}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#2d6a4f', background: '#d4edda', border: '1px solid #2d6a4f' }}>
              {loading === 'snapshot' ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Snapshot
            </button>
          </div>
          <button onClick={() => run('factory', 'Resetting to clean state', api.factoryReset, 'System reset — all files restored, fresh start')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.01] disabled:opacity-40"
            style={{ color: '#6b5a45', background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
            {loading === 'factory' ? <RefreshCw size={12} className="animate-spin" /> : <RotateCw size={12} />}
            Factory Reset (Fresh Start)
          </button>
        </div>

        {log.length > 0 && (
          <div className="rounded-lg p-3 font-mono text-xs space-y-1" style={{ background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
            {log.map((l, i) => (
              <p key={i} className="flex items-center gap-2" style={{ color: i === 0 ? logColor[l.type] : '#6b5a45' }}>
                <span style={{ color: '#C2A68D' }}>{l.t}</span>
                <span>{l.msg}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <AttackDetailPanel visible={showDetail} onClose={() => setShowDetail(false)} />
    </>
  )
}
