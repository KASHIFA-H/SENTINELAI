import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader, Shield, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'

const KB = {
  about: `SentinelShield AI is a real-time ransomware detection, containment, and recovery platform for OT and industrial environments. It uses behavioral analysis, Shannon entropy, canary traps, and honeypots to detect attacks in under 3 seconds and recover files in under 30 seconds.`,
  features: `Key features:\n1. Real-time file monitoring (Python watchdog)\n2. Shannon entropy analysis — detects encryption above 7.0 bits\n3. Canary file traps — catch ransomware instantly (+100 pts)\n4. Honeypot files — detect data theft (+100 pts)\n5. Automated containment — kills malicious processes\n6. Snapshot recovery — restores files in under 30 seconds\n7. ML threat prediction — classifies ransomware families\n8. AI chatbot — explains attacks in plain language\n9. OT asset monitoring — PLCs, SCADA, HMI status\n10. Email alerts — instant admin notification`,
  entropy: `Shannon entropy measures file randomness (0-8 bits/byte). Normal text = 3-5 bits. Encrypted files = 7.5-8.0 bits. SentinelShield flags files above 7.0 bits as likely encrypted. Formula: H = -Σ p(x) log₂ p(x)`,
  canary: `A canary file (_sentinelshield_do_not_touch.txt) is a hidden trap deployed in every monitored directory. No legitimate process should touch it. When ransomware scans files indiscriminately, it triggers the canary — giving early warning before all files are encrypted. Adds +100 to threat score.`,
  honeypot: `Honeypot files are fake credentials placed to attract attackers: _honeypot_passwords.txt, _honeypot_credit_cards.csv, _honeypot_ssh_keys.txt, _honeypot_api_secrets.env. Any read access adds +100 to threat score and triggers an exfiltration alert.`,
  ransomware: `Ransomware encrypts your files and demands payment. Modern ransomware like LockBit 3.0 first exfiltrates data, then rapidly encrypts all files with .locked extension. SentinelShield detects this at the behavioral stage using rapid modification detection, entropy analysis, and canary traps.`,
  recovery: `To recover files:\n1. Click Contain on the dashboard\n2. Go to Backups in the sidebar\n3. Select the latest clean snapshot\n4. Click Restore — files recovered automatically\nFull recovery takes under 30 seconds. No data is lost.`,
  contain: `Containment stops an active attack:\n1. Terminates suspicious processes (psutil)\n2. Locks sandbox to read-only mode\n3. Resets threat score to zero\n4. Redeploys canary files\n5. Sends email alert to admin`,
  snapshot: `A snapshot is a timestamped copy of all files. SentinelShield creates one automatically on startup and after every recovery. Stored in backups/ with IDs like snap_1774737650_935895. Click Snapshot button to create one manually anytime.`,
  ot: `OT (Operational Technology) controls physical industrial processes — PLCs, SCADA servers, HMI terminals, historian databases. Ransomware on OT systems stops physical operations like factory lines, power generation, and water treatment — not just data loss.`,
  threat_score: `Threat score (0-200 pts) accumulates from detections:\n+30 — Rapid file modification\n+40 — High entropy (encryption detected)\n+100 — Canary file accessed\n+100 — Honeypot accessed\nAbove 70 pts → automated containment triggered. Resets to 0 after recovery.`,
  ml: `ML Threat Prediction uses 5 weighted signals: behavioral anomaly (25%), entropy spike (30%), exfiltration risk (20%), canary risk (15%), network anomaly (10%). Produces attack probability % and classifies ransomware family — LockBit 3.0, BlackCat/ALPHV, or Cl0p.`,
  prevention: `Prevention strategies:\n1. Regular offline backups (SentinelShield does this automatically)\n2. Patch OS and software immediately\n3. Email filtering to block malicious attachments\n4. MFA on all accounts\n5. Deploy canary files in every directory\n6. Network segmentation\n7. Employee phishing awareness training\n8. Least-privilege access control\n9. Real-time entropy monitoring\n10. Incident response plan`,
  email: `Three automated email alerts:\n1. Unauthorized login — unknown email tries to log in → admin notified with IP\n2. Attack detected — encrypted files list sent to user + admin\n3. Recovery complete — restored files list sent after snapshot restoration`,
  roles: `User roles:\n• Administrator — full access, simulate/contain/restore, manage users\n• CISO — full dashboard, approve containment, audit reports\n• SOC Analyst — threat monitoring, contain, snapshots, quarantine\n• IT Operations — folders, backups, hardening, logs\n• Viewer — view dashboard and status only`,
  rto: `RTO (Recovery Time Objective) = maximum acceptable recovery time. SentinelShield achieves under 30 seconds vs industry average of 4+ hours for manual recovery. Automated snapshot restoration runs immediately after containment.`,
  mitre: `MITRE ATT&CK mappings:\n• T1486 — Data Encrypted for Impact (ransomware)\n• T1041 — Exfiltration Over C2 (honeypot detection)\n• T1083 — File and Directory Discovery (canary)\n• T1059 — Command and Scripting Interpreter (behavioral)\n• T1490 — Inhibit System Recovery (snapshot protection)`,
  cost: `Enterprise OT security (Dragos, Claroty) costs $100,000+/year. SentinelShield provides equivalent detection and recovery at a fraction of the cost — making enterprise-grade OT protection accessible to mid-size manufacturers, hospitals, utilities, and logistics operators.`,
  port: `Port 8000 is the default for Python ASGI servers (FastAPI/Uvicorn). Port 5173 is Vite's default (5=V, 1=I, 7=T, 3=E on a phone keypad). In production both are hidden behind Nginx on port 443 (HTTPS) — end users never see these port numbers.`,
}

function respond(q, status, score, exfil, detail) {
  const t = q.toLowerCase()
  const files = detail?.attacked_files ?? []
  const attacking = status === 'critical' || status === 'warning'

  if (t.match(/^(hi|hello|hey|howdy|sup|good)\b/))
    return `👋 Hi! I'm **SentinelShield AI Assistant**.\n\nAsk me anything — current attack status, how ransomware works, OT security, recovery steps, user roles, or any cybersecurity topic. What would you like to know?`

  if (t.match(/help|what can you|capabilities|what do you know/))
    return `🤖 I can answer questions about:\n\n**Current System:** attack status, affected files, how to recover, containment\n**SentinelShield:** entropy detection, canary files, honeypots, snapshots, ML prediction\n**Cybersecurity:** ransomware types, OT/SCADA/PLC security, prevention, MITRE ATT&CK\n**Product:** user roles, pricing, authentication, ports\n\nJust ask anything!`

  if (t.match(/status|current|right now|happening|going on/))
    return attacking
      ? `🔴 **System: ${status.toUpperCase()}** — Threat score: **${score}/200**\n\n${files.length > 0 ? `**${files.length} files encrypted:**\n${files.slice(0,5).map(f=>`• \`${f.name}\``).join('\n')}${files.length>5?`\n...and ${files.length-5} more`:''}` : 'Attack in progress.'}\n\n→ Click **Contain** then go to **Backups** to restore.`
      : `✅ **System: PROTECTED** — Threat score: **${score}/200**\n\nAll canary files intact. No suspicious activity detected. Monitoring is active.`

  if (t.match(/what.*(happen|attack|occur|detect|wrong)|attack detail/))
    return !attacking && files.length === 0
      ? `✅ **No attack detected.** System is secure. Threat score: **${score}**.\n\nClick **Simulate Attack** on the dashboard to see a live demo.`
      : `🔴 **Ransomware Attack Detected**\n\n${KB.ransomware}\n\n**Steps observed:**\n${(detail?.steps ?? ['1. Rapid file modification','2. Entropy spike above 7.0 bits','3. Canary file accessed','4. Containment triggered']).join('\n')}\n\nThreat score: **${score}**`

  if (t.match(/which file|affected file|encrypt|\.locked|file.*attack/))
    return files.length === 0
      ? `✅ No files are currently encrypted. System is ${attacking ? 'under threat but files intact' : 'secure'}.`
      : `📁 **${files.length} Affected Files:**\n\n${files.slice(0,10).map(f=>`• \`${f.name ?? f}\``).join('\n')}${files.length>10?`\n...and ${files.length-10} more`:''}\n\nXOR-encrypted and renamed with \`.locked\`. Open in File Explorer to see garbled content. Use **Backups → Restore** to recover.`

  if (t.match(/recover|restore|backup|snapshot|get.*back|fix.*file/))
    return `💾 **Recovery Steps:**\n\n${KB.recovery}`

  if (t.match(/contain|stop.*attack|kill.*process|isolate/))
    return `🔒 **Containment:**\n\n${KB.contain}`

  if (t.match(/snapshot|what.*backup/))
    return `📸 **Snapshots:**\n\n${KB.snapshot}`

  if (t.match(/prevent|protect|avoid|best practice|secure/))
    return `🛡️ **Prevention:**\n\n${KB.prevention}`

  if (t.match(/entropy|shannon|7\.0|bits|how.*detect.*encrypt/))
    return `📊 **Shannon Entropy:**\n\n${KB.entropy}`

  if (t.match(/canary|trap.*file|sentinel.*file|do.not.touch/))
    return `🪤 **Canary Files:**\n\n${KB.canary}`

  if (t.match(/honeypot|honey.pot|fake.*file|exfil/))
    return `🍯 **Honeypot Files:**\n\n${KB.honeypot}`

  if (t.match(/what.*ransomware|how.*ransomware|ransomware.*work/))
    return `🦠 **Ransomware:**\n\n${KB.ransomware}`

  if (t.match(/lockbit|blackcat|alphv|cl0p|family|classify/))
    return `🏷️ **Ransomware Families:**\n\n${KB.ml}`

  if (t.match(/ot|operational.tech|industrial|factory|plant/))
    return `🏭 **OT Security:**\n\n${KB.ot}`

  if (t.match(/plc|programmable.logic|ladder/))
    return `⚙️ **PLC:** A Programmable Logic Controller controls physical processes like conveyor belts, motors, and valves. SentinelShield monitors PLC config files — if ransomware encrypts them, the production line stops.`

  if (t.match(/scada|historian|supervisory/))
    return `🖥️ **SCADA:** Supervisory Control and Data Acquisition systems monitor industrial processes in real time. The historian server stores sensor data every few seconds. Ransomware targeting SCADA can cause physical equipment damage.`

  if (t.match(/threat.*score|score.*mean|why.*score|why.*100|why.*200/))
    return `📈 **Threat Score:**\n\n${KB.threat_score}`

  if (t.match(/ml|machine.learn|predict|ai.*detect/))
    return `🧠 **ML Prediction:**\n\n${KB.ml}`

  if (t.match(/email|alert|notif|gmail/))
    return `📧 **Email Alerts:**\n\n${KB.email}`

  if (t.match(/role|permission|access|who.*see|admin.*report|employee.*access/))
    return `👥 **User Roles:**\n\n${KB.roles}`

  if (t.match(/what.*sentinelshield|about.*this|what.*system|what.*tool/))
    return `🛡️ **SentinelShield AI:**\n\n${KB.about}\n\n${KB.features}`

  if (t.match(/feature|capabilit|what.*can/))
    return `⚡ **Features:**\n\n${KB.features}`

  if (t.match(/cost|price|afford|how much|expensive/))
    return `💰 **Pricing:**\n\n${KB.cost}`

  if (t.match(/mitre|att.?ck|t1486|framework/))
    return `🎯 **MITRE ATT&CK:**\n\n${KB.mitre}`

  if (t.match(/rto|recovery.time|how.*fast.*recover|30.*second/))
    return `⏱️ **RTO:**\n\n${KB.rto}`

  if (t.match(/port|8000|5173|localhost/))
    return `🔌 **Ports:**\n\n${KB.port}`

  if (t.match(/auth|login|password|token|rate.limit/))
    return `🔐 **Authentication:**\n\nPasswords: PBKDF2-SHA256 (260,000 iterations). Sessions: HMAC-SHA256 signed tokens. Login: rate-limited to 5 attempts/60s per IP. Destructive endpoints require valid session token. CORS restricted to frontend origin only.`

  if (t.match(/hmi|human.machine|interface|terminal/))
    return `📟 **HMI (Human-Machine Interface):** The operator screen in a control room that displays process data and allows operators to control equipment. SentinelShield monitors HMI config files — ransomware encrypting these blinds operators to the physical process.`

  if (t.match(/xor|encrypt.*method|how.*encrypt/))
    return `🔑 **XOR Encryption:** The ransomware simulator uses XOR encryption with key 0xAB. Every byte of the file is XOR'd with 0xAB, producing garbled binary content. This is why encrypted files look like random characters when opened. Real ransomware uses AES-256 or RSA, but the detection method is the same — entropy spikes above 7.0 bits.`

  if (t.match(/supabase|database|db|storage/))
    return `🗄️ **Database:** SentinelShield uses Supabase (PostgreSQL) to store threat events, backup snapshot metadata, and monitored paths. The system works without Supabase too — it falls back gracefully and stores data locally.`

  if (t.match(/thank|thanks|great|awesome|good job|well done/))
    return `😊 You're welcome! Stay secure. If you have more questions about the attack or SentinelShield, just ask!`

  return `🤖 I'm not sure about "${q.length > 40 ? q.slice(0,40)+'...' : q}" — try asking:\n\n• "What happened?" — current attack status\n• "How to recover?" — file restoration\n• "What is entropy?" — detection method\n• "What are user roles?" — access permissions\n• "How does ML prediction work?"\n• "What is OT security?"\n• "How to prevent ransomware?"`
}

function Message({ msg }) {
  const isBot = msg.role === 'bot'
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>
      if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="px-1 rounded text-xs" style={{background:'#1a2d4a',color:'#00c8e0'}}>{p.slice(1,-1)}</code>
      return p
    })
  }
  return (
    <div className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{background: isBot ? '#1a3a5c' : '#C2A68D'}}>
        {isBot ? <Bot size={14} color="#00c8e0"/> : <User size={14} color="#1a1a1a"/>}
      </div>
      <div className="max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
        style={{background: isBot ? '#0a1628' : '#F5F5DC', color: isBot ? '#c8d8e8' : '#1a1a1a',
          border: isBot ? '1px solid #1a2d4a' : '1px solid #D1BFA2'}}>
        {msg.text.split('\n').map((line, i) => <span key={i}>{renderText(line)}<br/></span>)}
      </div>
    </div>
  )
}

export default function AIChatbot({ status, threatScore, exfil }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I\'m SentinelShield AI Assistant.\n\nAsk me anything — attack status, how ransomware works, OT security, recovery steps, user roles, or any cybersecurity question!' }
  ])
  const [thinking, setThinking] = useState(false)
  const [detail, setDetail] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { if (open) api.attackDetail().then(d => d && setDetail(d)) }, [open, status])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setThinking(true)

    // Try RAG backend first, fall back to local KB
    try {
      const result = await api.chat(text, {
        threat_score: threatScore,
        status,
        exfil: exfil ?? {},
        attacked_files: detail?.attacked_files ?? [],
        attack_steps: detail?.steps ?? [],
      })
      if (result?.response) {
        let reply = result.response
        // Append SHAP explanation if available and relevant
        if (result.shap && text.toLowerCase().match(/ml|model|predict|explain|shap|why.*score|how.*detect/)) {
          reply += `\n\n🧠 **ML Explainability (SHAP):**\n${result.shap.explanation}`
        }
        setMessages(m => [...m, { role: 'bot', text: reply, source: result.source }])
      } else {
        setMessages(m => [...m, { role: 'bot', text: respond(text, status, threatScore, exfil, detail) }])
      }
    } catch {
      setMessages(m => [...m, { role: 'bot', text: respond(text, status, threatScore, exfil, detail) }])
    }
    setThinking(false)
  }

  const isAlert = status === 'critical' || status === 'warning'
  const quickPrompts = isAlert
    ? ['What happened?', 'How to recover?', 'Contain attack']
    : ['What is SentinelShield?', 'How does detection work?', 'User roles']

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{background: isAlert ? '#c0392b' : '#1a3a5c', border: '2px solid', borderColor: isAlert ? '#ff6b6b' : '#00c8e0'}}>
        {open ? <X size={22} color="#fff"/> : <MessageCircle size={22} color="#fff"/>}
        {isAlert && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center animate-pulse"
            style={{background:'#ff3b3b',color:'#fff',fontSize:9}}>!</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{background:'#050d1a', border:'1px solid #1a2d4a', height:480}}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{borderColor:'#1a2d4a',background:'#0a1628'}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#1a3a5c'}}>
              <Shield size={16} color="#00c8e0"/>
            </div>
            <div>
              <p className="text-xs font-bold" style={{color:'#e8eef4'}}>SentinelShield AI</p>
              <p className="text-xs" style={{color:'#4a6080'}}>Security Assistant</p>
            </div>
            {isAlert && (
              <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs animate-pulse"
                style={{background:'#c0392b20',border:'1px solid #c0392b',color:'#ff6b6b'}}>
                <AlertTriangle size={10}/> ALERT
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {messages.map((m, i) => <Message key={i} msg={m}/>)}
            {thinking && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{background:'#1a3a5c'}}>
                  <Bot size={14} color="#00c8e0"/>
                </div>
                <div className="px-3 py-2 rounded-xl flex items-center gap-1" style={{background:'#0a1628',border:'1px solid #1a2d4a'}}>
                  <Loader size={12} color="#00c8e0" className="animate-spin"/>
                  <span className="text-xs" style={{color:'#4a6080'}}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div className="px-3 pb-2 flex gap-1 flex-wrap">
            {quickPrompts.map(q => (
              <button key={q} onClick={() => setInput(q)}
                className="text-xs px-2 py-1 rounded-full transition-colors"
                style={{background:'#0a1628',border:'1px solid #1a2d4a',color:'#4a6080'}}
                onMouseEnter={e => {e.currentTarget.style.borderColor='#00c8e0';e.currentTarget.style.color='#00c8e0'}}
                onMouseLeave={e => {e.currentTarget.style.borderColor='#1a2d4a';e.currentTarget.style.color='#4a6080'}}>
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2 px-3 pb-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything..."
              className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{background:'#0a1628',border:'1px solid #1a2d4a',color:'#c8d8e8'}}/>
            <button onClick={send} disabled={!input.trim() || thinking}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
              style={{background:'#1a3a5c'}}>
              <Send size={13} color="#00c8e0"/>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
