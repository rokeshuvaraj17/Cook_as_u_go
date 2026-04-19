#!/usr/bin/env bash
# Dev checks: kitchen :5051, ScanAndSave :8000 (localhost + LAN). Run from repo any cwd.
set -uo pipefail
IP=""
for IF in en0 en1 en2; do IP=$(ipconfig getifaddr "$IF" 2>/dev/null || true); [[ -n "$IP" ]] && break; done

echo "== 1) Kitchen API (5051) =="
curl -sS -m 3 "http://127.0.0.1:5051/api/health" && echo "" || echo "FAIL: cd Backend && npm run dev"

echo ""
echo "== 2) ScanAndSave (8000) — required for receipt scan (app calls this directly) =="
if curl -sS -o /dev/null -m 2 -w "%{http_code}" http://127.0.0.1:8000/docs | grep -q "200"; then
  echo "OK http://127.0.0.1:8000/docs"
else
  echo "FAIL: start ScanAndSave:  bash ScanAndSave/scripts/start-dev.sh"
fi

if [[ -n "${IP:-}" ]]; then
  echo ""
  echo "== 3) ScanAndSave LAN (${IP}:8000) same URL family as the phone =="
  code=$(curl -sS -o /dev/null -m 3 -w "%{http_code}" "http://${IP}:8000/docs" 2>/dev/null || echo 000)
  echo "HTTP $code"
fi

echo ""
echo "== Expo =="
echo "Reload app after code changes: npx expo start --go --lan --clear --port 8083"
echo "When you scan, Metro must show: RECEIPT_SCAN_CLIENT=v2-direct"
echo "If the alert still says 'kitchen API at 127.0.0.1:8000', Expo Go is using an OLD bundle — force stop Expo Go, clear cache, reopen project."
