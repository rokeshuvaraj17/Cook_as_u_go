#!/usr/bin/env bash
# Build signed AAB + APK for Play / local install.
# Requires android/keystore.properties and android/app/<storeFile> (see credentials/keystore.properties.example).
#
# Optional: CLEAN_RELEASE=1 ./scripts/build-android-play-release.sh
#   runs ./gradlew clean first. Default skips clean because clean can fail on some
#   RN New Arch / CMake setups when codegen jni dirs are not present yet.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://cook-as-u-go.onrender.com}"

if [[ ! -f "$ROOT/android/keystore.properties" ]]; then
  echo "Missing $ROOT/android/keystore.properties" >&2
  echo "Copy from credentials/keystore.properties.example and place upload-keystore.jks under android/app/." >&2
  exit 1
fi

cd android
if [[ "${CLEAN_RELEASE:-0}" == "1" ]]; then
  ./gradlew clean
fi
exec ./gradlew bundleRelease assembleRelease
