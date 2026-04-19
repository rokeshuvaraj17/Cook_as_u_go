#!/usr/bin/env bash
# Render: PYTHONPATH must be the *monorepo root* (parent of this folder) so
# `import ScanAndSave` resolves to the ./ScanAndSave/ package. Using only
# `PYTHONPATH=.` fails when Render Root Directory is set to `ScanAndSave`.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PYTHONPATH="${REPO_ROOT}${PYTHONPATH:+:${PYTHONPATH}}"
exec uvicorn ScanAndSave.main:app --host 0.0.0.0 --port "${PORT:-8000}"
