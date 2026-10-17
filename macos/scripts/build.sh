#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIGURATION="${1:-Debug}"
if [[ "$CONFIGURATION" != Debug && "$CONFIGURATION" != Release ]]; then
  echo "Usage: $0 [Debug|Release]" >&2
  exit 2
fi
xcodebuild \
  -project "$ROOT/TransightAI.xcodeproj" \
  -scheme TransightAI \
  -configuration "$CONFIGURATION" \
  -destination 'platform=macOS' \
  -derivedDataPath "$ROOT/build" \
  CODE_SIGNING_ALLOWED=NO build
printf '\nLocal unsigned app: %s/build/Build/Products/%s/Transight AI.app\n' "$ROOT" "$CONFIGURATION"
