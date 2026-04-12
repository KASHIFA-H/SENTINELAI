"""
RAG Chatbot Engine — SentinelShield AI
Uses OpenRouter API with a security knowledge base for intelligent responses.
Includes SHAP-style explainability for ML decisions.
"""
import os
import math
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free models — tries each in order if one is rate-limited
FREE_MODELS = [
    "google/gemma-3-4b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
]

def _call_openrouter(system_prompt: str, user_message: str) -> str:
    """Call OpenRouter API — tries multiple free models until one works."""
    if not OPENROUTER_API_KEY:
        return None
    for model in FREE_MODELS:
        try:
            # Some models don't support system role — merge into user message
            messages = [{"role": "user", "content": f"{system_prompt}\n\nUser question: {user_message}"}]
            r = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "SentinelShield AI",
                },
                json={"model": model, "messages": messages, "max_tokens": 600},
                timeout=20,
            )
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
        except Exception:
            continue
    return None

# ── Security Knowledge Base (RAG context) ────────────────────────────────────
KNOWLEDGE_BASE = """
# SentinelShield AI — Security Knowledge Base

## System Overview
SentinelShield AI is a real-time ransomware detection, containment, and recovery platform for OT (Operational Technology) and industrial environments. It monitors file systems using behavioral analysis, Shannon entropy measurement, canary file traps, and honeypot-based exfiltration detection. When an attack is detected, it automatically contains the threat and recovers files from clean snapshots in under 30 seconds.

## Detection Engines
### Behavioral Analysis Engine
- Monitors file modification rate using a 5-second sliding window
- Threshold: 3+ modifications in 5 seconds = suspicious (+30 threat score)
- Detects rapid encryption activity before files are fully encrypted

### Shannon Entropy Engine
- Calculates H = -Σ p(x) log₂(p(x)) for each modified file
- Normal text files: 3.0–5.0 bits/byte
- Encrypted files: 7.5–8.0 bits/byte
- Threshold: H > 7.0 bits = likely encrypted (+40 threat score)

### Canary File Engine
- Deploys hidden trap file: _sentinelshield_do_not_touch.txt
- Any access = confirmed ransomware (+100 threat score, CRITICAL alert)
- Near-zero false positive rate

### Honeypot/Exfiltration Engine
- Deploys 4 fake credential files: _honeypot_passwords.txt, _honeypot_credit_cards.csv, _honeypot_ssh_keys.txt, _honeypot_api_secrets.env
- Any read access = exfiltration attempt (+100 threat score)
- Bulk read anomaly: 5+ reads in 10 seconds = +35 threat score

### Integrity Engine
- SHA-256 hashing of quarantined files
- Tamper detection before restore or delete

## Threat Scoring
- Score range: 0–200 points
- Threshold: 70 points → automated containment triggered
- Rapid modification: +30 per file
- High entropy: +40 per file
- Canary hit: +100 (instant critical)
- Honeypot hit: +100 (exfiltration alert)
- File rename (.locked): +50

## Automated Response
When score exceeds 70:
1. Terminate suspicious processes (psutil)
2. Lock sandbox to read-only mode
3. Send email alert to administrator
4. Restore files from latest clean snapshot
5. Reset threat score to 0
6. Redeploy canary files

## Recovery System
- Snapshots taken automatically on startup and every 30 minutes
- Snapshot = timestamped copy of all sandbox files (read-only)
- Restore: deletes .locked files, copies clean originals back
- RTO (Recovery Time Objective): under 30 seconds
- RPO (Recovery Point Objective): 30 minutes maximum

## OT Assets Monitored
- PLC-01: Production Line A (Allen-Bradley ControlLogix)
- PLC-02: Production Line B
- SCADA Server: Historian + Control (OSIsoft PI)
- HMI Terminal: Control Room (Wonderware InTouch)
- Safety SIS: Triconex SIL-2 (air-gapped, always protected)

## OT Data Files
- plc_ladder_logic.txt: PLC control program
- scada_historian.csv: Real-time sensor data (temperature, pressure, flow)
- hmi_screen_config.cfg: HMI display configuration
- production_schedule.xlsx: Factory floor schedule
- sensor_calibration.txt: Instrument calibration records
- dcs_alarm_log.csv: Alarm history
- safety_interlock_config.txt: SIS safety configuration
- asset_register.csv: Equipment inventory
- batch_recipe_v4.txt: Manufacturing recipe
- incident_report_ot.txt: Security incident log

## ML Threat Prediction
Weighted linear scoring model:
- Behavioral anomaly: weight 0.25
- Entropy spike: weight 0.30 (highest — most reliable)
- Exfiltration risk: weight 0.20
- Canary risk: weight 0.15
- Network anomaly: weight 0.10
Output: Attack probability 0–99%
Ransomware family classifier: LockBit 3.0 (72%), BlackCat/ALPHV (18%), Cl0p (10%)

## User Roles
- Administrator: Full access — simulate, contain, restore, manage users, admin report
- CISO: Full dashboard, approve containment, audit reports
- SOC Analyst: Threat monitoring, contain, snapshots, quarantine, logs
- IT Operations: Monitored folders, backups, hardening, logs
- Viewer: View dashboard and status only

## Security Features
- PBKDF2-SHA256 password hashing (260,000 iterations)
- HMAC-SHA256 signed session tokens
- Rate limiting: 5 login attempts per 60 seconds per IP
- CORS restricted to configured frontend origin
- Unauthorized login → immediate admin email alert

## Ransomware Types
- LockBit 3.0: XOR encryption + .locked rename, most active 2025
- BlackCat/ALPHV: Rust-based, double extortion
- Cl0p: MOVEit exploit, data theft focus
- WannaCry: SMB exploit, legacy systems
- NotPetya: Wiper disguised as ransomware

## Prevention Best Practices
1. Regular offline backups (SentinelShield automates this)
2. Patch OS and software immediately
3. Email filtering for malicious attachments
4. MFA on all accounts
5. Network segmentation (Purdue Model)
6. Employee phishing awareness training
7. Least-privilege access control
8. Canary files in every sensitive directory
9. Real-time entropy monitoring
10. Incident response plan

## MITRE ATT&CK Mapping
- T1486: Data Encrypted for Impact
- T1041: Exfiltration Over C2 Channel
- T1083: File and Directory Discovery
- T1059: Command and Scripting Interpreter
- T1490: Inhibit System Recovery

## Business Model
- SaaS: ₹1,200–2,000 per endpoint per month
- 90% cheaper than Dragos ($100,000+/year)
- Target: mid-size manufacturers, hospitals, utilities, logistics
- Break-even: 2 medium clients (100 endpoints each)
"""

# ── SHAP-style explainability ─────────────────────────────────────────────────
def compute_shap_explanation(threat_score: int, status: str, exfil: dict) -> dict:
    """
    Compute SHAP-style feature contributions to the ML attack probability.
    Returns each feature's contribution and direction.
    """
    # Base value (expected output when all features are at baseline)
    base_value = 8.0  # ~8% probability when system is secure

    # Compute raw signal values
    behavioral = min(threat_score / 2, 50)
    entropy    = 90.0 if status == 'critical' else (45.0 if status == 'warning' else 15.0)
    exfil_risk = 85.0 if exfil.get('honeypot_hit') else (40.0 if exfil.get('read_anomaly') else 10.0)
    canary     = 95.0 if status == 'critical' else (30.0 if status == 'warning' else 5.0)
    network    = 30.0 if status == 'critical' else 10.0

    # Weighted contributions
    weights = {'behavioral': 0.25, 'entropy': 0.30, 'exfil': 0.20, 'canary': 0.15, 'network': 0.10}
    signals = {'behavioral': behavioral, 'entropy': entropy, 'exfil': exfil_risk, 'canary': canary, 'network': network}

    total_prob = sum(signals[k] * weights[k] for k in signals)

    # SHAP values = contribution above/below baseline
    baseline_signals = {'behavioral': 0, 'entropy': 15, 'exfil': 10, 'canary': 5, 'network': 10}
    baseline_prob = sum(baseline_signals[k] * weights[k] for k in baseline_signals)

    shap_values = {}
    for feature in signals:
        contribution = (signals[feature] - baseline_signals[feature]) * weights[feature]
        shap_values[feature] = {
            'value': round(signals[feature], 1),
            'contribution': round(contribution, 2),
            'direction': 'positive' if contribution > 0 else 'negative',
            'weight': weights[feature],
        }

    return {
        'base_probability': round(base_value, 1),
        'total_probability': round(min(total_prob, 99), 1),
        'shap_values': shap_values,
        'dominant_feature': max(shap_values, key=lambda k: abs(shap_values[k]['contribution'])),
        'explanation': _generate_shap_text(shap_values, total_prob),
    }

def _generate_shap_text(shap_values: dict, total_prob: float) -> str:
    dominant = max(shap_values, key=lambda k: abs(shap_values[k]['contribution']))
    top = sorted(shap_values.items(), key=lambda x: abs(x[1]['contribution']), reverse=True)[:3]

    lines = [f"Attack probability: {min(total_prob, 99):.1f}%\n"]
    lines.append("Feature contributions (SHAP):")
    for name, data in top:
        arrow = "↑" if data['direction'] == 'positive' else "↓"
        lines.append(f"  {arrow} {name.capitalize()}: {data['contribution']:+.1f}% (signal={data['value']}, weight={data['weight']})")

    lines.append(f"\nDominant factor: {dominant.upper()} — this feature is driving the prediction most.")
    return "\n".join(lines)

# ── RAG Chat ──────────────────────────────────────────────────────────────────
def rag_chat(user_message: str, system_state: dict) -> dict:
    """RAG chatbot using OpenRouter with security knowledge base."""

    state_context = f"""
Current System State:
- Status: {system_state.get('status', 'unknown')}
- Threat Score: {system_state.get('threat_score', 0)}/200
- Canary Hit: {system_state.get('canary_hit', False)}
- Honeypot Hit: {system_state.get('exfil', {}).get('honeypot_hit', False)}
- Attacked Files: {', '.join([f['name'] for f in system_state.get('attacked_files', [])[:5]]) or 'None'}
- Attack Steps: {'; '.join(system_state.get('attack_steps', [])) or 'No attack in progress'}
"""

    shap = compute_shap_explanation(
        system_state.get('threat_score', 0),
        system_state.get('status', 'secure'),
        system_state.get('exfil', {})
    )

    system_prompt = f"""You are SentinelShield AI Security Assistant — an expert cybersecurity chatbot embedded in an industrial OT ransomware defense platform.

Knowledge Base:
{KNOWLEDGE_BASE}

{state_context}

ML Explainability (SHAP):
{shap['explanation']}

Instructions:
- Answer ANY question — cybersecurity, general knowledge, OT systems, or anything else
- Use the current system state for contextually accurate security answers
- Be concise but thorough
- Use bullet points for lists
- Explain technical concepts in plain language
- If asked about the current attack, reference the actual threat score and affected files
"""

    response_text = _call_openrouter(system_prompt, user_message)

    if response_text:
        return {'response': response_text, 'shap': shap, 'source': 'openrouter'}

    return {
        'response': _fallback_response(user_message, system_state),
        'shap': shap,
        'source': 'rule-based'
    }

def _fallback_response(q: str, state: dict) -> str:
    """Simple fallback when Gemini is unavailable."""
    t = q.lower()
    score = state.get('threat_score', 0)
    status = state.get('status', 'secure')

    if any(w in t for w in ['what happened', 'attack', 'status']):
        if status in ('critical', 'warning'):
            return f"🔴 System is {status.upper()}. Threat score: {score}/200. Ransomware detected — files are being encrypted. Click Contain to stop the attack, then restore from Backups."
        return f"✅ System is PROTECTED. Threat score: {score}/200. No active threats detected."

    if any(w in t for w in ['recover', 'restore', 'backup']):
        return "💾 Go to Backups in the sidebar → select the latest snapshot → click Restore. Recovery completes in under 30 seconds."

    if any(w in t for w in ['contain', 'stop']):
        return "🔒 Click Contain on the dashboard to terminate suspicious processes, lock the sandbox, and reset the threat score."

    if any(w in t for w in ['entropy', 'shannon']):
        return "📊 Shannon entropy measures file randomness (0-8 bits/byte). Normal files: 3-5 bits. Encrypted files: 7.5-8.0 bits. SentinelShield flags files above 7.0 bits as likely encrypted."

    if any(w in t for w in ['canary']):
        return "🪤 A canary file is a hidden trap. Any ransomware that touches it triggers an immediate +100 threat score alert. It catches attacks before all files are encrypted."

    if any(w in t for w in ['shap', 'explain', 'why', 'ml', 'model']):
        shap = compute_shap_explanation(score, status, state.get('exfil', {}))
        return f"🧠 ML Explanation:\n{shap['explanation']}"

    return "🤖 I'm your SentinelShield AI Assistant. Ask me about the current attack, how detection works, OT security, recovery steps, or any cybersecurity question."
