// Extension composition root. This class wires pure domain modules to GNOME
// Shell adapters and owns only lifecycle orchestration.
import GLib from "gi://GLib";
import GObject from "gi://GObject";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";

import { AirGradientHttpClient } from "./airgradientHttpClient.js";
import { AirGradientPopup, PanelStatusIcon } from "./airgradientPopup.js";
import { AlertMonitor } from "./airgradientAlerts.js";
import { overallStatus } from "./airgradientSensors.js";
import {
    DEFAULT_REFRESH_INTERVAL_SECS,
    MIN,
    readDesktopConfig,
} from "./desktopConfig.js";
import { DesktopConfigMonitor } from "./desktopConfigMonitor.js";

function currentTimeLabel() {
    return GLib.DateTime.new_now_local().format("%H:%M:%S");
}

const AirGradientIndicator = GObject.registerClass(
    class AirGradientIndicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, extension.metadata.name, false);

            this._extension = extension;
            this._config = readDesktopConfig();
            this._currentSnapshot = null;
            this._refreshTimerId = 0;
            this._cancellable = null;
            this._refreshInFlight = false;
            this._alerts = new AlertMonitor(this._config.notifications_enabled);
            this._client = new AirGradientHttpClient(extension.metadata);
            this._configMonitor = new DesktopConfigMonitor(() =>
                this._handleConfigChanged(),
            );

            this._panelIcon = new PanelStatusIcon();
            this.add_child(this._panelIcon.actor);
            this._popup = new AirGradientPopup({
                menu: this.menu,
                onOpenSettings: () => this._extension.openPreferences(),
                onRefresh: () => this._refresh(),
            });

            this._configMonitor.start();
            this._restartRefreshTimer();
            this._refresh();
        }

        destroy() {
            this._clearRefreshTimer();
            this._cancelActiveRequest();
            this._configMonitor.stop();
            this._client.destroy();

            super.destroy();
        }

        _handleConfigChanged() {
            if (this._reloadConfig()) this._restartRefreshTimer();
            this._refresh();
        }

        _reloadConfig() {
            const nextConfig = readDesktopConfig();
            const changed =
                JSON.stringify(nextConfig) !== JSON.stringify(this._config);

            this._config = nextConfig;
            this._alerts.setEnabled(nextConfig.notifications_enabled);
            return changed;
        }

        _restartRefreshTimer() {
            this._clearRefreshTimer();
            this._refreshTimerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                this._refreshIntervalSeconds(),
                () => {
                    this._refresh();
                    return GLib.SOURCE_CONTINUE;
                },
            );
        }

        _clearRefreshTimer() {
            if (this._refreshTimerId === 0) return;

            GLib.source_remove(this._refreshTimerId);
            this._refreshTimerId = 0;
        }

        _refreshIntervalSeconds() {
            return Math.max(
                MIN,
                this._config.refresh_interval_secs ??
                    DEFAULT_REFRESH_INTERVAL_SECS,
            );
        }

        _refresh() {
            const configChanged = this._reloadConfig();
            if (configChanged) this._restartRefreshTimer();

            if (!this._config.server_url) {
                this._cancelActiveRequest();
                this._showUnavailable(
                    "Configure an AirGradient local-server URL.",
                );
                return;
            }

            this._cancelActiveRequest();
            this._refreshInFlight = true;
            this._cancellable = this._client.createCancellable();
            this._popup.setStatus(
                "Fetching measurements...",
                "airgradient-refreshing",
            );

            this._client.fetchCurrentMeasurements(
                this._config.server_url,
                this._cancellable,
                (error, snapshot) => this._handleFetchResult(error, snapshot),
            );
        }

        _cancelActiveRequest() {
            if (!this._refreshInFlight) return;

            this._client.cancel(this._cancellable);
            this._cancellable = null;
            this._refreshInFlight = false;
        }

        _handleFetchResult(error, snapshot) {
            this._refreshInFlight = false;
            this._cancellable = null;

            if (error) {
                this._handleFetchError(error);
                return;
            }

            if (snapshot) this._handleFreshSnapshot(snapshot);
        }

        _handleFreshSnapshot(snapshot) {
            const previousSnapshot = this._currentSnapshot;
            this._currentSnapshot = snapshot;

            this._panelIcon.setStatus(overallStatus(snapshot));
            this._popup.updateSnapshot({
                previousSnapshot,
                serverUrl: this._config.server_url,
                snapshot,
                updatedAt: currentTimeLabel(),
            });

            for (const alert of this._alerts.evaluate(snapshot))
                this._sendAlert(alert);
        }

        _handleFetchError(error) {
            const message = error.message ?? String(error);
            this._showUnavailable(message);

            const alert = this._alerts.recordFetchError(message);
            if (alert) this._sendAlert(alert);
        }

        _showUnavailable(message) {
            this._panelIcon.setStatus("gray");
            this._popup.updateUnavailable(message);
        }

        _sendAlert(alert) {
            Main.notify(alert.title, alert.body);
        }
    },
);

export default class AirGradientExtension extends Extension {
    enable() {
        this._indicator = new AirGradientIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
