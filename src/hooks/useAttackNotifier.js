import { useEffect, useRef } from 'react'

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const beep = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    beep(880, 0.0, 0.18)
    beep(660, 0.2, 0.18)
    beep(880, 0.4, 0.25)
  } catch (e) {
    console.warn('[SentinelShield] Audio alert failed:', e)
  }
}

function showBrowserNotification(title, body) {
  if (!('Notification' in window)) return
  const send = () => {
    try {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        tag: 'sentinelshield-alert',
        requireInteraction: true,
      })
    } catch (e) { console.warn('Notification failed', e) }
  }
  if (Notification.permission === 'granted') {
    send()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') send() })
  }
}

export function useAttackNotifier(status, threatScore, exfil) {
  // Start as null so first real status always triggers comparison
  const prevStatus = useRef(null)
  const prevScore  = useRef(0)
  const exfilNotified = useRef(false)

  useEffect(() => {
    const prev = prevStatus.current
    const prevSc = prevScore.current

    // Trigger on: first time going to warning/critical, OR score jumps significantly
    const statusEscalated =
      (prev !== 'warning' && prev !== 'critical') &&
      (status === 'warning' || status === 'critical')

    const scoreJumped = threatScore > 30 && threatScore > prevSc + 20

    if (statusEscalated || (scoreJumped && (status === 'warning' || status === 'critical'))) {
      playAlertSound()
      const isCritical = status === 'critical' || threatScore >= 70
      showBrowserNotification(
        isCritical ? '🔴 CRITICAL: Ransomware Detected!' : '⚠️ WARNING: Threat Detected',
        `Threat score: ${threatScore}/200. ${isCritical
          ? 'Files are being encrypted. Click Contain immediately.'
          : 'Suspicious activity detected in monitored directory.'}`
      )
    }

    // Exfiltration alert
    if (exfil?.honeypot_hit && !exfilNotified.current) {
      exfilNotified.current = true
      playAlertSound()
      showBrowserNotification(
        '🚨 Data Exfiltration Detected!',
        `Honeypot file accessed: ${exfil.honeypot_file ?? 'unknown'}. Attacker may be copying files.`
      )
    }

    if (status === 'secure' && threatScore === 0) {
      exfilNotified.current = false
    }

    prevStatus.current = status
    prevScore.current  = threatScore
  }, [status, threatScore, exfil?.honeypot_hit])
}
