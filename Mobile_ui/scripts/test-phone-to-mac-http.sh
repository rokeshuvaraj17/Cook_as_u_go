#!/usr/bin/env bash
# Run HTTP checks *from the connected Android device* (adb) to your Mac (LAN + optional reverse).
set -euo pipefail
if ! adb devices 2>/dev/null | grep -qE '\tdevice$'; then
  echo "No Android device in adb devices. Connect phone with USB debugging, or use Wi-Fi pairing."
  exit 1
fi
IP=""
for IF in en0 en1 en2; do
  IP=$(ipconfig getifaddr "$IF" 2>/dev/null || true)
  if [[ -n "$IP" ]]; then
    break
  fi
done
if [[ -z "$IP" ]]; then
  echo "Could not detect Mac LAN IP (en0/en1/en2)."
  exit 1
fi
echo "Mac LAN IP: $IP"
echo "--- curl from phone -> http://${IP}:5051/api/health ---"
adb shell "curl -sS -m 10 http://${IP}:5051/api/health" && echo ""
echo "--- curl from phone -> http://127.0.0.1:5051/api/health (needs: adb reverse tcp:5051 tcp:5051) ---"
adb shell "curl -sS -m 10 http://127.0.0.1:5051/api/health" && echo "" || echo "(failed — run: npm run reverse:android)"
echo "--- curl from phone -> http://${IP}:8083/status (Metro) ---"
adb shell "curl -sS -m 10 http://${IP}:8083/status" && echo ""
echo "--- curl from phone -> http://${IP}:8000/docs (ScanAndSave; start: bash ScanAndSave/scripts/start-dev.sh) ---"
adb shell "curl -sS -o /dev/null -m 10 -w 'HTTP %{http_code}\n' http://${IP}:8000/docs" && echo ""
