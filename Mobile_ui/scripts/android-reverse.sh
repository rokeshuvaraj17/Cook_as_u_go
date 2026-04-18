#!/usr/bin/env bash
# Forward device localhost ports to this machine (USB or wireless adb).
# Respects ANDROID_SERIAL when set; otherwise uses adb's default device.
set -euo pipefail
ADB=(adb)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  ADB=(adb -s "${ANDROID_SERIAL}")
fi
for port in 8083 5051 8000; do
  "${ADB[@]}" reverse "tcp:${port}" "tcp:${port}"
done
