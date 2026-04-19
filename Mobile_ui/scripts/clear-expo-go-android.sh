#!/usr/bin/env bash
# Wipe Expo Go app data on a connected Android device (all cached projects / bundles).
set -u
if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found; skip Android Expo Go clear"
  exit 0
fi
if ! adb devices 2>/dev/null | grep -qE '\tdevice$'; then
  echo "No Android device in adb devices; skip Expo Go clear"
  exit 0
fi
adb shell am force-stop host.exp.exponent 2>/dev/null || true
if adb shell pm clear host.exp.exponent 2>/dev/null; then
  echo "Expo Go (host.exp.exponent) storage cleared"
else
  echo "pm clear Expo Go failed (not installed or no permission); continuing"
fi
exit 0
