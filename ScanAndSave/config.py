import os
from pathlib import Path

from dotenv import load_dotenv

# Load ScanAndSave/.env even when uvicorn is started from the repo root (cwd ≠ this package).
_SCAN_ROOT = Path(__file__).resolve().parent
load_dotenv(_SCAN_ROOT / ".env")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = (os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1").rstrip("/")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
# Old default meta-llama/...:free returns 404 "No endpoints found" on OpenRouter; use a current free slug.
OPENROUTER_FALLBACK_MODEL = os.getenv(
    "OPENROUTER_FALLBACK_MODEL",
    "google/gemma-3-4b-it:free",
)
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "800"))
OPENROUTER_HTTP_REFERER = os.getenv("OPENROUTER_HTTP_REFERER", "https://localhost")
OPENROUTER_APP_TITLE = os.getenv("OPENROUTER_APP_TITLE", "Cook As You Go")

# Optional legacy fallback for local dev only. Production / app flow passes the key per request
# from the kitchen API (user row in database) via X-LLM-Api-Key.
# Do not rely on .env for user keys.

MODEL_NAME = OPENROUTER_MODEL