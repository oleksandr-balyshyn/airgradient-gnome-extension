#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="airgradient@worxbend.dev"
ZIP="$ROOT_DIR/dist/$UUID.shell-extension.zip"

"$ROOT_DIR/scripts/pack.sh"
gnome-extensions install --force "$ZIP"

cat <<EOF
Installed $UUID.

Restart GNOME Shell or start a nested session, then enable it with:
  gnome-extensions enable $UUID
EOF

