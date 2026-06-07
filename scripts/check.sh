#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -d node_modules ]]; then
    npm run smoke
fi

gnome-extensions pack . \
    --force \
    --out-dir "$(mktemp -d)" \
    --extra-source airgradientAlerts.js \
    --extra-source airgradientHttpClient.js \
    --extra-source airgradientPopup.js \
    --extra-source airgradientPresentation.js \
    --extra-source airgradientSensors.js \
    --extra-source desktopConfig.js \
    --extra-source desktopConfigMonitor.js \
    --extra-source prefs.js \
    --extra-source stylesheet.css >/dev/null

if [[ -d node_modules ]]; then
    npm run lint
    npm run typecheck
fi
