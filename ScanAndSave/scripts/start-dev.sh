#!/usr/bin/env bash
# Run FastAPI so phones on Wi-Fi can reach port 8000 (bind all interfaces).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PY=python3
if [[ -x "$ROOT/ScanAndSave/venv/bin/python" ]]; then
  PY="$ROOT/ScanAndSave/venv/bin/python"
elif [[ -x "$ROOT/.venv/bin/python" ]]; then
  PY="$ROOT/.venv/bin/python"
fi
exec "$PY" -m uvicorn ScanAndSave.main:app --host 0.0.0.0 --port 8000 --reload
