#!/usr/bin/env bash
# Forward device localhost ports to this machine (USB or wireless adb).
# Respects ANDROID_SERIAL when set; otherwise uses adb's default device.
# Do not use set -e: one flaky "adb: protocol fault" must not skip remaining ports.
set -uo pipefail
ADB=(adb)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  ADB=(adb -s "${ANDROID_SERIAL}")
fi
for port in 8083 5051 8000; do
  if "${ADB[@]}" reverse "tcp:${port}" "tcp:${port}" 2>/dev/null; then
    echo "adb reverse: tcp:${port} -> tcp:${port} ok"
  else
    echo "adb reverse: tcp:${port} failed (Wi‑Fi dev URL still works; try: adb kill-server && adb start-server)" >&2
  fi
done
exit 0
