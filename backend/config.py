import os
from dotenv import load_dotenv

# Load .env file — secrets never hardcoded in source
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", "")
SMTP_SENDER_PASS  = os.getenv("SMTP_SENDER_PASS", "")
ADMIN_EMAIL       = os.getenv("ADMIN_EMAIL", "")

SECRET_KEY     = os.getenv("SECRET_KEY", "change-me-in-production")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:5174")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Safe sandbox directories — never touch real user files outside these
SANDBOX_DIR    = os.path.join(os.path.dirname(__file__), "sandbox")
BACKUP_DIR     = os.path.join(os.path.dirname(__file__), "backups")
QUARANTINE_DIR = os.path.join(os.path.dirname(__file__), "quarantine")

THREAT_SCORE_THRESHOLD = 70

# Scoring weights
SCORE_RAPID_MODIFY = 30
SCORE_HIGH_ENTROPY = 40
SCORE_CANARY_HIT   = 100
