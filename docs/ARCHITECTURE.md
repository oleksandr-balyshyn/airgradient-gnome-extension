# Architecture

This extension follows a small Clean Architecture split. GNOME Shell is treated
as an outer framework adapter, not the center of the design.

## Dependency Direction

```text
extension.js
  -> airgradientHttpClient.js
  -> airgradientPopup.js
  -> desktopConfigMonitor.js
  -> airgradientAlerts.js
  -> desktopConfig.js
  -> airgradientPresentation.js
  -> airgradientSensors.js
```

The innermost modules are plain JavaScript and have no GNOME Shell imports:

- `airgradientSensors.js` owns domain behavior: payload parsing, thresholds,
  AQI fallback, and trends.
- `airgradientAlerts.js` owns notification policy: consecutive bad readings,
  cooldown, severity escalation, and offline alerts.
- `airgradientPresentation.js` turns snapshots into display view models:
  labels, colors, gauge ratios, AQI copy, and metric definitions.
- `desktopConfig.js` owns shared config shape and URL normalization.

Outer adapter modules depend on GNOME APIs:

- `airgradientHttpClient.js` wraps Soup/Gio HTTP fetches and maps responses into
  parsed snapshots.
- `desktopConfigMonitor.js` wraps `Gio.FileMonitor` for shared config changes.
- `airgradientPopup.js` renders Shell `St` and `PopupMenu` widgets from view
  models.
- `extension.js` owns lifecycle orchestration: timers, refresh flow, config
  reloads, alert dispatch, and Shell enable/disable.

## Shared Config Contract

The extension deliberately uses the same JSON file as `airgradient-desktop`:

```text
$XDG_CONFIG_HOME/airgradient-desktop/config.json
```

Fallback:

```text
$HOME/.config/airgradient-desktop/config.json
```

The stable JSON shape is:

```json
{
  "server_url": "http://192.168.1.201",
  "refresh_interval_secs": 30,
  "notifications_enabled": true,
  "start_minimized": false
}
```

`start_minimized` is preserved for compatibility even though a Shell extension
does not use it.

## Testing Strategy

Fast smoke tests cover the inner layers:

- `tests/sensors-smoke.mjs` verifies parsing, thresholds, trends, and alert
  policy.
- `tests/config-smoke.mjs` verifies shared config normalization and file IO.
- `tests/presentation-smoke.mjs` verifies view-model output for popup rendering.

The GNOME Shell adapter is validated by:

- `gjs -m <module>` parse checks for GJS modules.
- `gnome-extensions pack` to verify installable bundle composition.
- Manual nested Shell testing through `npm run dev:shell`.
