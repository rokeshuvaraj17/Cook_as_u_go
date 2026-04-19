#!/usr/bin/env bash
# Prints a line you can put in Mobile_ui/.env when auto-discovery fails (AP isolation, wrong interface, etc.).
set -euo pipefail
IP=""
for IF in en0 en1 en2; do
  IP=$(ipconfig getifaddr "$IF" 2>/dev/null || true)
  if [[ -n "$IP" ]]; then
    break
  fi
done
if [[ -z "$IP" ]]; then
  echo "Could not read a LAN IP from en0/en1/en2. Set EXPO_PUBLIC_API_URL manually to http://<your-mac-ip>:5051"
  exit 1
fi
echo "Current Mac LAN IP (first found): $IP"
echo ""
echo "Create Mobile_ui/.env with this line, then restart Metro (Ctrl+C, npm start):"
echo "EXPO_PUBLIC_API_URL=http://${IP}:5051"
