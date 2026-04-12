import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Eye, AlertTriangle, Activity, Copy, RefreshCw, ShieldAlert, RotateCcw,
         FileText, Lock, Unlock, Cpu, KeyRound } from 'lucide-react'

export default function ExfiltrationPanel() {
  const [data, setData]       = useState(null)
  const [prev, setPrev]       = useState(null)
  const [simming, setSimming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [busy, setBusy]       = useState(null)

  const load = () => {
    api.exfilStatus().then(d => { if (d) setData(d) })
    api.preventionStatus().then(d => { if (d) setPrev(d) })
  }

  useEffect(() => { load(); const id = setInterval(load, 2000); return () => clearInterval(id) }, [])

  const simulate = async () => {
    setSimming(true); await api.simulateExfil()
    setTimeout(() => { load(); setSimming(false) }, 4000)
  }

  const reset = async () => {
    setResetting(true)
    await Promise.all([api.resetExfil(), api.preventReset()])
    load(); setResetting(false)
  }

  const runAction = async (id, fn) => { setBusy(id); await fn(); load(); setBusy(null) }

  const hit      = data?.honeypot_hit
  const anomaly  = data?.read_anomaly
  const isAlert  = hit || anomaly
  const accessed = data?.accessed_files ?? []
  const locked   = prev?.folder_locked
  const encrypted = prev?.files_encrypted?.length > 0

  return (
    <div className="rounded-xl p-5 transition-all duration-500"
      style={{
        background: '#FFFFFF',
        border: isAlert ? '2px solid rgba(192,57,43,0.4)' : '1px solid #D1BFA2',
        boxShadow: isAlert ? '0 0 20px rgba(192,57,43,0.08)' : 'none',
      }}>

      <div className="flex items-center gap-2 mb-4">
        <Eye size={14} style={{ color: isAlert ? '#c0392b' : '#6b5a45' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#6b5a45' }}>Exfiltration Detection</p>
        {isAlert && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full animate-pulse"
            style={{ color: '#c0392b', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)' }}>
            ● DATA THEFT DETECTED
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg"
          style={hit ? { background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }
                     : { background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={13} style={{ color: hit ? '#c0392b' : '#2d6a4f' }} />
            <p className="text-xs font-semibold" style={{ color: hit ? '#c0392b' : '#2d6a4f' }}>
              Honeypot: {hit ? 'TRIGGERED' : 'SAFE'}
            </p>
          </div>
          <p className="text-xs" style={{ color: '#6b5a45' }}>
            {hit ? `Trap: ${data?.honeypot_file}` : '4 traps active — no access'}
          </p>
        </div>
        <div className="p-3 rounded-lg"
          style={anomaly ? { background: 'rgba(183,119,13,0.06)', border: '1px solid rgba(183,119,13,0.2)' }
                         : { background: '#F5F5DC', border: '1px solid #D1BFA2' }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={13} style={{ color: anomaly ? '#b7770d' : '#2d6a4f' }} />
            <p className="text-xs font-semibold" style={{ color: anomaly ? '#b7770d' : '#2d6a4f' }}>
              Volume: {anomaly ? 'ANOMALY' : 'NORMAL'}
            </p>
          </div>
          <p className="text-xs" style={{ color: '#6b5a45' }}>{data?.read_count ?? 0} reads tracked</p>
        </div>
      </div>

      {accessed.length > 0 && (
        <div className="mb-4 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(192,57,43,0.2)' }}>
          <p className="text-xs font-semibold px-3 py-2 flex items-center gap-1"
            style={{ color: '#c0392b', background: 'rgba(192,57,43,0.04)' }}>
            <ShieldAlert size={12} /> Files Copied ({accessed.length})
          </p>
          {accessed.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2"
              style={{
                background: f.startsWith('_honeypot') ? 'rgba(192,57,43,0.06)' : 'rgba(183,119,13,0.04)',
                borderTop: '1px solid rgba(192,57,43,0.1)',
              }}>
              <FileText size={11} style={{ color: f.startsWith('_honeypot') ? '#c0392b' : '#b7770d' }} />
              <span className="text-xs font-mono flex-1" style={{ color: '#1a1a1a' }}>{f}</span>
              {f.startsWith('_honeypot') && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{ color: '#c0392b', background: 'rgba(192,57,43,0.1)' }}>TRAP</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Prevention controls */}
      <div style={{ borderTop: '1px solid #D1BFA2', paddingTop: '14px', marginBottom: '12px' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b5a45' }}>Prevention</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => runAction('lock', locked ? api.preventUnlock : api.preventLock)}
            disabled={busy === 'lock'}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={locked
              ? { background: 'rgba(183,119,13,0.1)', border: '1px solid rgba(183,119,13,0.3)', color: '#b7770d' }
              : { background: '#F5F5DC', border: '1px solid #D1BFA2', color: '#3d3020' }
            }>
            {busy === 'lock' ? <RefreshCw size={16} className="animate-spin" /> : locked ? <Unlock size={16} /> : <Lock size={16} />}
            {locked ? 'Unlock' : 'Lock Folder'}
          </button>
          <button onClick={() => runAction('enc', encrypted ? api.preventDecrypt : api.preventEncrypt)}
            disabled={busy === 'enc'}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={encrypted
              ? { background: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.3)', color: '#2d6a4f' }
              : { background: '#F5F5DC', border: '1px solid #D1BFA2', color: '#3d3020' }
            }>
            {busy === 'enc' ? <RefreshCw size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {encrypted ? 'Decrypt' : 'Encrypt'}
          </button>
          <button onClick={() => runAction('kill', api.preventRespond)}
            disabled={busy === 'kill'}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', color: '#c0392b' }}>
            {busy === 'kill' ? <RefreshCw size={16} className="animate-spin" /> : <Cpu size={16} />}
            Kill Process
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={simulate} disabled={simming}
          className="flex items-center justify-center gap-2 flex-1 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', color: '#c0392b' }}>
          {simming ? <RefreshCw size={12} className="animate-spin" /> : <Copy size={12} />}
          {simming ? 'Simulating...' : 'Simulate Exfil'}
        </button>
        {isAlert && (
          <button onClick={reset} disabled={resetting}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ color: '#6b5a45', border: '1px solid #D1BFA2' }}>
            <RotateCcw size={11} className={resetting ? 'animate-spin' : ''} /> Reset
          </button>
        )}
      </div>
    </div>
  )
}
