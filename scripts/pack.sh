#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
mkdir -p dist

gnome-extensions pack . \
    --force \
    --out-dir dist \
    --extra-source airgradientAlerts.js \
    --extra-source airgradientHttpClient.js \
    --extra-source airgradientPopup.js \
    --extra-source airgradientPresentation.js \
    --extra-source airgradientSensors.js \
    --extra-source desktopConfig.js \
    --extra-source desktopConfigMonitor.js \
    --extra-source prefs.js \
    --extra-source stylesheet.css
