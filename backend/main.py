import os
import sys
import shutil
import hashlib
import hmac
import time
from collections import defaultdict
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from config import (SANDBOX_DIR, BACKUP_DIR, QUARANTINE_DIR,
                    SECRET_KEY, ALLOWED_ORIGIN)
from db import get_threat_events, get_snapshots, log_threat_event
from engines.canary import deploy_canary
from engines.backup import create_snapshot, restore_snapshot, list_snapshots, list_quarantine
from monitor import state, start_monitoring, stop_monitoring, reset_threat_score, terminate_suspicious_processes
from simulator import run_simulation
from employees import authenticate, is_known_email, get_all_employees
from email_service import send_unauthorized_login, send_ransomware_alert, send_recovery_complete
from engines.exfiltration import deploy_honeypots, exfil_state, reset_exfil_state, record_file_read, handle_honeypot_access
from engines.integrity import register_quarantine, verify_integrity, get_manifest, remove_from_manifest
from engines.prevention import (prevention_state, run_exfil_response, lock_sandbox, unlock_sandbox,
                                 encrypt_sandbox, decrypt_sandbox, reset_prevention, kill_exfil_processes)
from engines.url_scanner import scan_url
from engines.rag_chatbot import rag_chat, compute_shap_explanation

# Track which files were accessed during exfiltration
_exfil_accessed_files: set = set()

app = FastAPI(title="SentinelShield AI", version="2.4.1-beta")

# ── CORS — only allow the configured frontend origin ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN, "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Session-Token"],
)

# ── Simple signed session token ───────────────────────────────────────────────
def _sign(user_id: str) -> str:
    return hmac.new(SECRET_KEY.encode(), user_id.encode(), hashlib.sha256).hexdigest()

def _make_token(user: dict) -> str:
    uid = user.get("id", user.get("email", ""))
    return f"{uid}:{_sign(uid)}"

def _verify_token(token: str) -> bool:
    try:
        uid, sig = token.rsplit(":", 1)
        return hmac.compare_digest(sig, _sign(uid))
    except Exception:
        return False

def require_auth(request: Request):
    token = request.headers.get("X-Session-Token", "")
    if not token or not _verify_token(token):
        raise HTTPException(status_code=401, detail="Unauthorised — invalid or missing session token")

# ── Login rate limiter — max 5 attempts per IP per minute ────────────────────
_login_attempts: dict = defaultdict(list)
_RATE_LIMIT = 5
_RATE_WINDOW = 60  # seconds

def _check_rate_limit(ip: str):
    now = time.time()
    attempts = [t for t in _login_attempts[ip] if now - t < _RATE_WINDOW]
    attempts.append(now)
    _login_attempts[ip] = attempts
    if len(attempts) > _RATE_LIMIT:
        log_threat_event("brute_force_attempt", 50, [ip], f"rate_limit_exceeded ip={ip}")
        raise HTTPException(status_code=429, detail="Too many login attempts — try again in 60 seconds")

# ── Startup: init sandbox and start monitoring ──────────────────────────────

@app.on_event("startup")
def startup():
    for d in [SANDBOX_DIR, BACKUP_DIR, QUARANTINE_DIR]:
        os.makedirs(d, exist_ok=True)

    # Always reset read-only flags on startup so canary can be deployed
    import stat as st
    for fname in os.listdir(SANDBOX_DIR):
        fpath = os.path.join(SANDBOX_DIR, fname)
        try:
            os.chmod(fpath, st.S_IREAD | st.S_IWRITE | st.S_IRGRP | st.S_IROTH)
        except Exception:
            pass

    # Seed sandbox with OT/industrial data (only if file doesn't exist)
    from reseed_sandbox import REAL_FILES
    for fname, content in REAL_FILES.items():
        p = os.path.join(SANDBOX_DIR, fname)
        if not os.path.exists(p):
            with open(p, "w", encoding="utf-8") as f:
                f.write(content)

    # ── Seed subdirectories with categorised files ────────────────────────────
    subdir_files = {
        "Finance": {
            "budget_2025.xlsx":        "Q1: $1.2M\nQ2: $1.4M\nQ3: $1.6M\nQ4: $1.8M\n" * 10,
            "payroll_q1.csv":          "emp_id,name,gross,net\nEMP001,Alex,7916,6333\n" * 10,
            "invoice_log.csv":         "inv_id,vendor,amount\nINV001,TechCorp,12400\n" * 10,
            "tax_filing_2025.txt":     "Tax Year: 2025\nGross Income: $7.74M\nTax Paid: $1.93M\n" * 10,
            "expense_report_q1.csv":   "date,category,amount\n2025-01-10,Travel,450\n2025-01-15,Software,1200\n" * 10,
        },
        "HR": {
            "employee_records.csv":    "emp_id,name,role,dept\nEMP001,Alex,Admin,IT\n" * 10,
            "leave_tracker.csv":       "emp_id,type,days,status\nEMP001,Annual,5,approved\n" * 10,
            "performance_reviews.txt": "EMP001 — Q1 2025: Exceeds Expectations\nEMP002 — Q1 2025: Meets Expectations\n" * 10,
            "recruitment_pipeline.csv":"candidate,role,stage\nJohn Doe,DevOps,Interview\n" * 10,
            "org_chart.txt":           "CEO → CTO → IT Security → SOC Analyst\nCEO → CFO → Finance → Payroll\n" * 10,
        },
        "Legal": {
            "contracts.pdf":           "SERVICE AGREEMENT 2025\nParty A: SentinelShield\nParty B: Client Corp\n" * 10,
            "nda_signed.txt":          "NDA signed by: Alex Morgan\nDate: 2025-01-05\nExpiry: 2027-01-05\n" * 10,
            "compliance_checklist.txt":"GDPR: ✓\nISO 27001: ✓\nSOC 2: In Progress\nHIPAA: N/A\n" * 10,
            "patent_filings.txt":      "PAT-2025-001: AI Threat Detection Engine\nStatus: Filed\nDate: 2025-02-10\n" * 10,
        },
        "IT": {
            "network_config.txt":      "host=10.0.1.1\ngateway=10.0.0.1\ndns=8.8.8.8\n" * 10,
            "server_inventory.csv":    "hostname,ip,os\nweb-01,10.0.1.10,Ubuntu 22.04\n" * 10,
            "firewall_rules.txt":      "RULE 001: ALLOW 10.0.1.0/24 TCP 443\nRULE 002: DENY * TCP 22\n" * 10,
            "ssl_certs.txt":           "CERT: *.sentinelshield.ai\nExpiry: 2026-08-15\n" * 10,
            "patch_log.txt":           "2025-03-01: KB5034441 applied\n2025-03-10: OpenSSL 3.2.1 patched\n" * 10,
            "vpn_config.txt":          "server=vpn.sentinelshield.ai\nprotocol=WireGuard\nport=51820\n" * 10,
        },
        "R&D": {
            "project_roadmap.txt":     "Q1: Dashboard v2.4\nQ2: AI prediction\nQ3: Cloud module\n" * 10,
            "research_notes.txt":      "Entropy threshold testing: 7.0 bits optimal\nFalse positive rate: 0.3%\n" * 10,
            "model_training_log.txt":  "Epoch 1/50: loss=0.842\nEpoch 10/50: loss=0.341\nEpoch 50/50: loss=0.089\n" * 10,
            "api_docs.txt":            "GET /status → system health\nPOST /simulate-attack → run demo\n" * 10,
        },
        "Operations": {
            "incident_log.txt":        "INC-2025-0847: Ransomware detected — RESOLVED in 17s\n" * 10,
            "deployment_runbook.txt":  "Step 1: Pull main\nStep 2: Run tests\nStep 3: Deploy staging\n" * 10,
            "meeting_notes.txt":       "2025-03-15: Security review — deploy canary to all dirs\n" * 10,
            "sla_report.txt":          "Uptime: 99.97%\nMTTR: 4.2 min\nMTTD: 8.1 sec\n" * 10,
            "vendor_contacts.csv":     "vendor,contact,email\nCloudSvc,John Smith,john@cloudsvc.com\n" * 10,
        },
    }
    for subdir, files in subdir_files.items():
        dpath = os.path.join(SANDBOX_DIR, subdir)
        os.makedirs(dpath, exist_ok=True)
        for fname, content in files.items():
            p = os.path.join(dpath, fname)
            if not os.path.exists(p):
                with open(p, "w", encoding="utf-8") as f:
                    f.write(content)
        deploy_canary(dpath)

    deploy_canary(SANDBOX_DIR)
    deploy_honeypots(SANDBOX_DIR)
    start_monitoring([SANDBOX_DIR])
    create_snapshot(SANDBOX_DIR)

    # Auto-snapshot every 30 minutes in background
    import threading, time as _time
    def _auto_snapshot():
        while True:
            _time.sleep(1800)
            create_snapshot(SANDBOX_DIR)
            print("[Backup] Auto-snapshot taken (30-min schedule)")
    threading.Thread(target=_auto_snapshot, daemon=True).start()

    print("[SentinelShield] Backend ready.")

# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str
    ip: Optional[str] = "Unknown"

@app.post("/auth/login")
def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    user = authenticate(req.email, req.password)
    if user:
        token = _make_token(user)
        log_threat_event("user_login", 0, [], f"{user['name']} ({user['role']}) logged in from {ip}")
        return {"success": True, "user": user, "token": token}
    # Unknown email → send alert to admin
    if not is_known_email(req.email):
        send_unauthorized_login(req.email, ip)
        log_threat_event("unauthorized_login_attempt", 0, [req.email], f"unknown_email={req.email} ip={ip}")
    else:
        log_threat_event("failed_login", 0, [req.email], f"wrong_password ip={ip}")
    return {"success": False, "error": "Invalid credentials"}

@app.get("/auth/employees")
def employees():
    return get_all_employees()

# ── Active session store (in-memory for demo) ─────────────────────────────────
_active_user: dict = {}

@app.post("/auth/session")
def set_session(user: dict):
    """Store the currently logged-in user for email targeting."""
    global _active_user
    _active_user = user
    return {"ok": True}

@app.get("/auth/session")
def get_session():
    return _active_user

@app.get("/status")
def get_status():
    from engines.canary import CANARY_FILENAME, CANARY_CONTENT
    canary_path = os.path.join(SANDBOX_DIR, CANARY_FILENAME)
    canary_intact = False
    if os.path.exists(canary_path):
        try:
            with open(canary_path, "r") as f:
                content = f.read()
            canary_intact = content.strip() == CANARY_CONTENT.strip()
        except Exception:
            canary_intact = False

    return {
        "status": state["status"],
        "threat_score": state["threat_score"],
        "canary_hit": state["canary_hit"],
        "canary_intact": canary_intact,
        "monitored_paths": state["monitored_paths"],
        "recent_events": state["recent_events"][:20],
        "exfiltration": {
            "honeypot_hit":  exfil_state["honeypot_hit"],
            "honeypot_file": exfil_state["honeypot_file"],
            "read_anomaly":  exfil_state["read_anomaly"],
            "read_count":    exfil_state["read_count"],
            "score":         exfil_state["score"],
            "events":        exfil_state["events"][:5],
        },
    }

# ── Threat Events ─────────────────────────────────────────────────────────────

@app.get("/threat-events")
def threat_events(limit: int = 50):
    return get_threat_events(limit)

# ── Monitored Paths ───────────────────────────────────────────────────────────

class PathRequest(BaseModel):
    path: str

@app.post("/paths/add")
def add_path(req: PathRequest):
    if not os.path.exists(req.path):
        raise HTTPException(400, f"Path does not exist: {req.path}")
    deploy_canary(req.path)
    start_monitoring(state["monitored_paths"] + [req.path])
    return {"added": req.path, "monitored": state["monitored_paths"]}

@app.get("/paths")
def get_paths():
    return {"paths": state["monitored_paths"]}

# ── Snapshots ─────────────────────────────────────────────────────────────────

@app.post("/snapshot")
def take_snapshot():
    result = create_snapshot(SANDBOX_DIR)
    return result

@app.get("/snapshots")
def snapshots():
    db_snaps = get_snapshots()
    local = list_snapshots()
    return {"db": db_snaps, "local": local}

# ── List files inside a specific snapshot ─────────────────────────────────────

@app.get("/snapshots/{snapshot_id}/files")
def snapshot_files(snapshot_id: str):
    snap_dir = os.path.join(BACKUP_DIR, snapshot_id)
    if not os.path.exists(snap_dir):
        raise HTTPException(404, f"Snapshot {snapshot_id} not found")
    files = []
    for fname in sorted(os.listdir(snap_dir)):
        fpath = os.path.join(snap_dir, fname)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            is_locked = fname.endswith(".locked")
            is_canary = fname.startswith("_sentinelshield")
            files.append({
                "name":      fname,
                "size":      stat.st_size,
                "is_locked": is_locked,
                "is_canary": is_canary,
                "status":    "encrypted" if is_locked else ("canary" if is_canary else "clean"),
            })
    clean = [f for f in files if f["status"] == "clean"]
    return {
        "snapshot_id": snapshot_id,
        "files":       files,
        "clean_count": len(clean),
        "total":       len(files),
    }

@app.post("/restore/{snapshot_id}")
def restore(snapshot_id: str, _auth=Depends(require_auth)):
    result = restore_snapshot(snapshot_id, SANDBOX_DIR)
    reset_threat_score()
    log_threat_event("recovery_complete", 0, result.get("restored_files", []), "system_restored")
    user = _active_user
    if user:
        send_recovery_complete(
            user_email=user.get("email", "sahackathon123@gmail.com"),
            user_name=user.get("name", "User"),
            restored_files=result.get("restored_files", []),
            snapshot_id=snapshot_id,
        )
    return result

# ── Quarantine ────────────────────────────────────────────────────────────────

@app.get("/quarantine")
def quarantine():
    return {"files": list_quarantine()}

# ── Simulate Attack ───────────────────────────────────────────────────────────

@app.post("/simulate-attack")
def simulate_attack(_auth=Depends(require_auth)):
    def _after_attack():
        import time; time.sleep(6)
        attacked = [f for f in os.listdir(SANDBOX_DIR) if f.endswith(".locked")]
        user = _active_user if _active_user else {"email": "sahackathon123@gmail.com", "name": "System User"}
        send_ransomware_alert(
            user_email=user.get("email", "sahackathon123@gmail.com"),
            user_name=user.get("name", "User"),
            attacked_files=attacked,
        )
    import threading
    run_simulation()
    threading.Thread(target=_after_attack, daemon=True).start()
    return {"status": "simulation_started", "sandbox": SANDBOX_DIR}

# ── Containment ───────────────────────────────────────────────────────────────

@app.post("/contain")
def contain(_auth=Depends(require_auth)):
    # Stop watchdog so file events don't re-trigger score after reset
    stop_monitoring()
    killed = terminate_suspicious_processes()
    reset_threat_score()
    # Redeploy canary
    deploy_canary(SANDBOX_DIR)
    log_threat_event("containment_complete", 0, [], "threat_score_reset_canary_redeployed")
    # Restart watchdog cleanly with score already at 0
    import time
    time.sleep(0.3)
    start_monitoring([SANDBOX_DIR])
    return {"contained": True, "processes_killed": killed}

# ── Reset (manual) ────────────────────────────────────────────────────────────

@app.post("/reset")
def reset():
    """Manually reset threat score and redeploy canary."""
    reset_threat_score()
    deploy_canary(SANDBOX_DIR)
    return {"reset": True}

@app.post("/factory-reset")
def factory_reset():
    """Full reset — restore sandbox to clean state, wipe all threat state, reseed files."""
    import stat as st
    from reseed_sandbox import REAL_FILES
    from engines.exfiltration import reset_exfil_state, deploy_honeypots
    from engines.prevention import reset_prevention

    # 1. Stop watchdog so file writes don't trigger detections
    stop_monitoring()

    # 2. Remove all .locked and .enc files
    for fname in os.listdir(SANDBOX_DIR):
        if fname.endswith(".locked") or fname.endswith(".enc"):
            fpath = os.path.join(SANDBOX_DIR, fname)
            try:
                os.chmod(fpath, st.S_IWRITE | st.S_IREAD)
                os.remove(fpath)
            except Exception:
                pass

    # 3. Restore all sandbox files to read-write
    for fname in os.listdir(SANDBOX_DIR):
        fpath = os.path.join(SANDBOX_DIR, fname)
        if os.path.isfile(fpath):
            try:
                os.chmod(fpath, st.S_IWRITE | st.S_IREAD)
            except Exception:
                pass

    # 4. Reseed with clean OT data
    for fname, content in REAL_FILES.items():
        p = os.path.join(SANDBOX_DIR, fname)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)

    # 5. Reset ALL threat state to zero
    reset_threat_score()
    reset_exfil_state()
    reset_prevention()
    _exfil_accessed_files.clear()

    # 6. Redeploy canary and honeypots
    deploy_canary(SANDBOX_DIR)
    deploy_honeypots(SANDBOX_DIR)

    # 7. Take a fresh clean snapshot
    snap = create_snapshot(SANDBOX_DIR)

    # 8. Restart watchdog cleanly — score is already 0 before it starts
    import time; time.sleep(0.5)
    start_monitoring([SANDBOX_DIR])

    log_threat_event("factory_reset", 0, [], "full_system_reset_clean_state")
    return {"reset": True, "snapshot": snap["snapshot_id"], "files_restored": len(REAL_FILES)}

# ── System Hardening Info (Layer 2) ──────────────────────────────────────────

@app.get("/exfiltration/status")
def exfiltration_status():
    return {
        "honeypot_hit":  exfil_state["honeypot_hit"],
        "honeypot_file": exfil_state["honeypot_file"],
        "read_anomaly":  exfil_state["read_anomaly"],
        "read_count":    exfil_state["read_count"],
        "score":         exfil_state["score"],
        "events":        exfil_state["events"][:20],
        "accessed_files": list(_exfil_accessed_files),
    }

@app.post("/simulate-exfiltration")
def simulate_exfiltration():
    """
    Simulate an attacker silently copying files without modifying them.
    Reads sandbox files rapidly + touches a honeypot file.
    """
    import threading, time

    def _exfil():
        files = [f for f in os.listdir(SANDBOX_DIR)
                 if os.path.isfile(os.path.join(SANDBOX_DIR, f))
                 and not f.startswith("_honeypot")]

        # Step 1: Rapidly read normal files (volume anomaly)
        for fname in files[:6]:
            fpath = os.path.join(SANDBOX_DIR, fname)
            try:
                with open(fpath, "rb") as f:
                    _ = f.read()
                record_file_read(fpath)
                _exfil_accessed_files.add(fname)
                exfil_state["events"].insert(0, f"File read (copied): {fname}")
                time.sleep(0.3)
            except Exception:
                pass

        # Step 2: Access honeypot — this is what catches the attacker
        time.sleep(0.5)
        honeypot_path = os.path.join(SANDBOX_DIR, "_honeypot_passwords.txt")
        if os.path.exists(honeypot_path):
            with open(honeypot_path, "rb") as f:
                _ = f.read()
            handle_honeypot_access(honeypot_path)
            _exfil_accessed_files.add("_honeypot_passwords.txt")

        log_threat_event("exfiltration_simulated", exfil_state["score"],
                         list(_exfil_accessed_files), "attacker_copied_files_detected")

    threading.Thread(target=_exfil, daemon=True).start()
    return {"status": "exfiltration_simulation_started", "sandbox": SANDBOX_DIR}

@app.post("/exfiltration/reset")
def reset_exfiltration():
    reset_exfil_state()
    _exfil_accessed_files.clear()
    return {"reset": True}

# ── Prevention endpoints ──────────────────────────────────────────────────────

@app.get("/prevention/status")
def prevention_status():
    return prevention_state

@app.post("/prevention/respond")
def prevention_respond():
    """Full automated response: lock folder + kill processes."""
    result = run_exfil_response()
    return {"status": "response_executed", **result}

@app.post("/prevention/lock")
def prevention_lock():
    locked = lock_sandbox()
    return {"locked": True, "files": locked}

@app.post("/prevention/unlock")
def prevention_unlock():
    unlock_sandbox()
    return {"unlocked": True}

@app.post("/prevention/encrypt")
def prevention_encrypt():
    """Encrypt all sandbox files at rest with AES."""
    encrypted = encrypt_sandbox()
    return {"encrypted": encrypted, "count": len(encrypted)}

@app.post("/prevention/decrypt")
def prevention_decrypt():
    """Decrypt all .enc files back to readable."""
    decrypted = decrypt_sandbox()
    return {"decrypted": decrypted, "count": len(decrypted)}

@app.post("/prevention/reset")
def prevention_reset():
    reset_prevention()
    return {"reset": True}

@app.get("/system-hardening")
def system_hardening():
    import datetime
    return {
        "last_os_update_check": datetime.datetime.utcnow().isoformat() + "Z",
        "antivirus_status": "active",
        "email_filtering": "protected",
        "firewall": "enabled",
    }

# ── RAG Chatbot + SHAP Explainability ────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    threat_score: Optional[int] = 0
    status: Optional[str] = "secure"
    exfil: Optional[dict] = {}
    attacked_files: Optional[list] = []
    attack_steps: Optional[list] = []

@app.post("/chat")
def chat(req: ChatRequest):
    """RAG chatbot with Gemini + SHAP explainability."""
    system_state = {
        "threat_score": req.threat_score,
        "status": req.status,
        "exfil": req.exfil or {},
        "attacked_files": req.attacked_files or [],
        "attack_steps": req.attack_steps or [],
        "canary_hit": state.get("canary_hit", False),
    }
    result = rag_chat(req.message, system_state)
    return result

@app.get("/shap")
def shap_explanation():
    """Get SHAP-style ML explanation for current system state."""
    return compute_shap_explanation(
        state["threat_score"],
        state["status"],
        exfil_state,
    )

# ── URL Scanner ───────────────────────────────────────────────────────────────

class URLScanRequest(BaseModel):
    url: str
    scanned_by: Optional[str] = "user"

@app.post("/scan-url")
def scan_url_endpoint(req: URLScanRequest):
    result = scan_url(req.url, req.scanned_by)
    # Send alert email if malicious
    if result["verdict"] == "MALICIOUS":
        from email_service import _send, _base, _row
        body = f"""
        <div style="background:#c0392b18;border:1px solid #c0392b40;border-radius:10px;padding:16px;margin-bottom:20px">
          <p style="color:#c0392b;font-weight:700;margin:0 0 4px">⚠ Malicious URL Detected</p>
          <p style="color:#8ba0b8;font-size:13px;margin:0">An employee scanned a dangerous link.</p>
        </div>
        {_row("URL", req.url, "#c0392b")}
        {_row("Risk Score", f"{result['risk_score']}/100", "#c0392b")}
        {_row("Scanned By", req.scanned_by)}
        <div style="margin-top:16px">
          <p style="color:#4a6080;font-size:12px;margin:0 0 8px">Reasons flagged:</p>
          {"".join(f'<div style="padding:6px 10px;background:#c0392b10;border-left:3px solid #c0392b;margin:4px 0;border-radius:4px"><span style="color:#c0392b;font-size:12px">{r}</span></div>' for r in result["reasons"])}
        </div>"""
        html = _base("Malicious URL Scanned by Employee", "#c0392b", body)
        from email_service import ADMIN_EMAIL
        _send([ADMIN_EMAIL], f"🚨 [SentinelShield] Malicious URL Detected — {result['domain']}", html)
    return result

# ── List sandbox files ────────────────────────────────────────────────────────

@app.get("/files")
def list_files():
    """List all files currently in the sandbox with metadata."""
    files = []
    for fname in sorted(os.listdir(SANDBOX_DIR)):
        fpath = os.path.join(SANDBOX_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        stat = os.stat(fpath)
        is_locked   = fname.endswith(".locked")
        is_canary   = fname.startswith("_sentinelshield")
        is_attacked = is_locked
        files.append({
            "name":       fname,
            "path":       fpath,
            "size":       stat.st_size,
            "modified":   stat.st_mtime,
            "is_locked":  is_locked,
            "is_canary":  is_canary,
            "is_attacked": is_attacked,
            "status":     "encrypted" if is_locked else ("canary" if is_canary else "normal"),
        })
    return {"files": files, "sandbox": SANDBOX_DIR}

# ── Read file content ─────────────────────────────────────────────────────────

@app.get("/files/{filename}/content")
def file_content(filename: str):
    """Return readable content. For .locked files, also returns the original from latest snapshot."""
    fpath = os.path.join(SANDBOX_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "File not found")

    is_locked = filename.endswith(".locked")
    original_name = filename.replace(".locked", "") if is_locked else filename

    # Current (possibly encrypted) content
    try:
        with open(fpath, "rb") as f:
            raw = f.read(8192)
        if is_locked:
            # Show raw encrypted bytes as garbled latin-1 — visually shows destruction
            current_content = raw[:4096].decode("latin-1")
            current_readable = False
        else:
            current_content = raw.decode("utf-8", errors="replace")
            current_readable = True
    except Exception as e:
        current_content = f"[Error reading file: {e}]"
        current_readable = False

    # Original content — find the OLDEST snapshot that has a clean (non-encrypted) version
    original_content = None
    original_snapshot = None
    snapshots_local = list_snapshots()
    # Sort ascending (oldest first) — we want the pre-attack clean snapshot
    for snap_id in sorted(snapshots_local):
        snap_path = os.path.join(BACKUP_DIR, snap_id, original_name)
        if os.path.exists(snap_path):
            try:
                with open(snap_path, "rb") as f:
                    snap_raw = f.read(8192)
                # Check if this snapshot copy is clean (low entropy = not encrypted)
                if len(snap_raw) > 0:
                    counts = [0] * 256
                    for b in snap_raw[:2048]:
                        counts[b] += 1
                    total = min(len(snap_raw), 2048)
                    import math as _math
                    h = -sum((c/total)*_math.log2(c/total) for c in counts if c > 0)
                    if h < 7.0:  # clean file — use this snapshot
                        original_content = snap_raw.decode("utf-8", errors="replace")
                        original_snapshot = snap_id
                        break
            except Exception:
                pass
    # Fallback: use oldest snapshot regardless
    if not original_content:
        for snap_id in sorted(snapshots_local):
            snap_path = os.path.join(BACKUP_DIR, snap_id, original_name)
            if os.path.exists(snap_path):
                try:
                    with open(snap_path, "r", errors="replace") as f:
                        original_content = f.read(8192)
                    original_snapshot = snap_id
                    break
                except Exception:
                    pass

    return {
        "filename":          filename,
        "original_name":     original_name,
        "is_locked":         is_locked,
        "current_content":   current_content,
        "current_readable":  current_readable,
        "original_content":  original_content,
        "original_snapshot": original_snapshot,
        "truncated":         os.path.getsize(fpath) > 8192,
        "size":              os.path.getsize(fpath),
    }

# ── File diff: compare current vs snapshot ────────────────────────────────────

@app.get("/files/{filename}/diff/{snapshot_id}")
def file_diff(filename: str, snapshot_id: str):
    """Compare current sandbox file vs snapshot version. Handles .locked files."""
    import difflib

    original_name = filename.replace(".locked", "")
    current_path  = os.path.join(SANDBOX_DIR, filename)

    # Find snapshot file — try original name (pre-encryption)
    snapshot_path = os.path.join(BACKUP_DIR, snapshot_id, original_name)
    if not os.path.exists(snapshot_path):
        snapshot_path = os.path.join(BACKUP_DIR, snapshot_id, filename)

    before_lines, after_lines = [], []
    before_content, after_content = "", ""

    if os.path.exists(snapshot_path):
        with open(snapshot_path, "r", errors="replace") as f:
            before_content = f.read(8192)
            before_lines = before_content.splitlines(keepends=True)[:100]

    if os.path.exists(current_path):
        if filename.endswith(".locked"):
            # Show the RAW encrypted bytes as latin-1 — garbled, unreadable, visually shocking
            with open(current_path, "rb") as f:
                raw = f.read(8192)
            # Render as garbled characters — this is what ransomware actually does to your files
            after_content = raw[:4096].decode("latin-1")
            after_lines = after_content.splitlines(keepends=True)[:100]
        else:
            with open(current_path, "r", errors="replace") as f:
                after_content = f.read(8192)
            after_lines = after_content.splitlines(keepends=True)[:100]

    diff = list(difflib.unified_diff(
        before_lines, after_lines,
        fromfile=f"BEFORE (snapshot) / {original_name}",
        tofile=f"AFTER (attacked) / {filename}",
        lineterm=""
    ))

    return {
        "filename":       filename,
        "original_name":  original_name,
        "snapshot_id":    snapshot_id,
        "before_lines":   before_lines,
        "after_lines":    after_lines,
        "before_content": before_content,
        "after_content":  after_content,
        "diff":           diff,
        "changed":        len(diff) > 0,
        "before_size":    os.path.getsize(snapshot_path) if os.path.exists(snapshot_path) else 0,
        "after_size":     os.path.getsize(current_path)  if os.path.exists(current_path)  else 0,
        "is_locked":      filename.endswith(".locked"),
    }

# ── Attack detail ─────────────────────────────────────────────────────────────

@app.get("/attack-detail")
def attack_detail():
    """Return details about the current/last attack: what happened, where, how."""
    attacked_files = []
    for fname in os.listdir(SANDBOX_DIR):
        if fname.endswith(".locked"):
            fpath = os.path.join(SANDBOX_DIR, fname)
            attacked_files.append({
                "name":     fname,
                "original": fname.replace(".locked", ""),
                "path":     fpath,
                "size":     os.path.getsize(fpath),
            })

    quarantined = list_quarantine()

    return {
        "attack_vector":    "Behavioral ransomware simulation via XOR encryption + .locked rename",
        "attack_location":  SANDBOX_DIR,
        "method":           "Rapid file modification → entropy spike → file encryption → rename",
        "steps": [
            "1. Malicious process rapidly modified target files (4x writes in <2s)",
            "2. File entropy spiked above 7.5 bits (XOR encryption applied)",
            "3. Files renamed with .locked extension",
            "4. Canary file access triggered critical alert",
            "5. Threat score exceeded threshold → containment triggered",
        ],
        "attacked_files":   attacked_files,
        "quarantined_files": quarantined,
        "total_affected":   len(attacked_files) + len(quarantined),
    }

# ── Quarantine ALL attacked (.locked) files at once ──────────────────────────

@app.post("/quarantine-attacked")
def quarantine_attacked():
    from engines.backup import quarantine_file
    moved = []
    for fname in os.listdir(SANDBOX_DIR):
        if fname.endswith(".locked"):
            fpath = os.path.join(SANDBOX_DIR, fname)
            quarantine_file(fpath)
            register_quarantine(fname)
            moved.append(fname)
    log_threat_event("bulk_quarantine", 0, moved, f"quarantined {len(moved)} attacked files with integrity hashes")
    return {"quarantined": moved, "count": len(moved)}

# ── Quarantine a specific file ────────────────────────────────────────────────

@app.post("/quarantine/{filename}")
def quarantine_file_endpoint(filename: str):
    from engines.backup import quarantine_file
    fpath = os.path.join(SANDBOX_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "File not found in sandbox")
    dest = quarantine_file(fpath)
    record = register_quarantine(filename)
    return {"quarantined": filename, "moved_to": dest, "sha256": record.get("sha256", "")[:16] + "..."}

# ── Delete quarantine file (integrity-verified) ───────────────────────────────

@app.delete("/quarantine/{filename}")
def delete_quarantine_file(filename: str):
    check = verify_integrity(filename)
    if check.get("tampered"):
        raise HTTPException(403, f"Delete blocked — file tampered: {check['details']}")
    fpath = os.path.join(QUARANTINE_DIR, filename)
    if os.path.exists(fpath):
        try:
            import stat as st
            os.chmod(fpath, st.S_IWRITE | st.S_IREAD)
        except Exception:
            pass
        os.remove(fpath)
        remove_from_manifest(filename)
        log_threat_event("file_deleted", 0, [filename], "permanently_deleted_integrity_verified")
    return {"deleted": filename, "integrity_verified": check.get("ok", True)}

# ── Restore quarantine file (integrity-verified) ──────────────────────────────

@app.post("/quarantine/{filename}/restore")
def restore_quarantine_file(filename: str):
    check = verify_integrity(filename)
    if check.get("tampered"):
        raise HTTPException(403, f"Restore blocked — file tampered: {check['details']}")
    src = os.path.join(QUARANTINE_DIR, filename)
    if not os.path.exists(src):
        raise HTTPException(404, "File not found in quarantine")

    # Get the original clean filename (strip .locked if present)
    original_name = filename.replace(".locked", "")

    # Try to find clean version in latest snapshot
    restored_from_snapshot = False
    for snap_id in sorted(list_snapshots(), reverse=True):
        snap_path = os.path.join(BACKUP_DIR, snap_id, original_name)
        if os.path.exists(snap_path):
            dst = os.path.join(SANDBOX_DIR, original_name)
            import stat as st
            try:
                os.chmod(snap_path, st.S_IWRITE | st.S_IREAD)
            except Exception:
                pass
            shutil.copy2(snap_path, dst)
            try:
                os.chmod(dst, st.S_IWRITE | st.S_IREAD)
            except Exception:
                pass
            # Remove the encrypted quarantine file
            try:
                os.chmod(src, st.S_IWRITE | st.S_IREAD)
                os.remove(src)
            except Exception:
                pass
            restored_from_snapshot = True
            remove_from_manifest(filename)
            log_threat_event("file_restored_from_quarantine", 0, [filename],
                             f"decrypted_from_snapshot restored_as={original_name}")
            return {"restored": original_name, "to": dst,
                    "integrity_verified": check.get("ok", True),
                    "decrypted": True, "source": snap_id}

    # Fallback: move encrypted file back if no snapshot found
    dst = os.path.join(SANDBOX_DIR, filename)
    try:
        import stat as st
        os.chmod(src, st.S_IWRITE | st.S_IREAD)
    except Exception:
        pass
    shutil.move(src, dst)
    remove_from_manifest(filename)
    log_threat_event("file_restored_from_quarantine", 0, [filename], "restored_encrypted_no_snapshot")
    return {"restored": filename, "to": dst, "integrity_verified": check.get("ok", True), "decrypted": False}

# ── Quarantine integrity status ───────────────────────────────────────────────

@app.get("/quarantine/integrity")
def quarantine_integrity_status():
    files = list_quarantine()
    results = {f: verify_integrity(f) for f in files}
    return {"files": results, "manifest": get_manifest()}
