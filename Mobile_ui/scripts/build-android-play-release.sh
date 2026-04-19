#!/usr/bin/env bash
# Build signed AAB + APK for Play / local install.
# Option A — properties file (recommended):
#   cp credentials/upload-keystore.properties.example credentials/upload-keystore.properties
#   # edit with real storePassword, keyPassword, keyAlias
#   ./scripts/build-android-play-release.sh
#
# Option B — Gradle -P (no file; careful with shell history):
#   export UPLOAD_STORE_PASSWORD=... UPLOAD_KEY_PASSWORD=... UPLOAD_KEY_ALIAS=upload
#   ./scripts/build-android-play-release.sh --gradle-props
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://cook-as-u-go.onrender.com}"

USE_PROPS=0
if [[ "${1:-}" == "--gradle-props" ]]; then
  USE_PROPS=1
fi

if [[ "$USE_PROPS" -eq 1 ]]; then
  if [[ -z "${UPLOAD_STORE_PASSWORD:-}" || -z "${UPLOAD_KEY_PASSWORD:-}" || -z "${UPLOAD_KEY_ALIAS:-}" ]]; then
    echo "Set UPLOAD_STORE_PASSWORD, UPLOAD_KEY_PASSWORD, UPLOAD_KEY_ALIAS (and optional UPLOAD_STORE_FILE)." >&2
    exit 1
  fi
  STORE_FILE="${UPLOAD_STORE_FILE:-../credentials/upload-keystore.jks}"
  cd android
  exec ./gradlew bundleRelease assembleRelease \
    -PuploadStorePassword="$UPLOAD_STORE_PASSWORD" \
    -PuploadKeyPassword="$UPLOAD_KEY_PASSWORD" \
    -PuploadKeyAlias="$UPLOAD_KEY_ALIAS" \
    -PuploadStoreFile="$STORE_FILE"
fi

if [[ ! -f "$ROOT/credentials/upload-keystore.properties" ]]; then
  echo "Missing $ROOT/credentials/upload-keystore.properties" >&2
  echo "Copy from credentials/upload-keystore.properties.example and fill passwords + keyAlias." >&2
  exit 1
fi

cd android
exec ./gradlew bundleRelease assembleRelease
