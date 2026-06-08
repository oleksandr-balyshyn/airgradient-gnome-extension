// GJS adapter around Gio.FileMonitor for the shared desktop config file.
import Gio from "gi://Gio";
import GLib from "gi://GLib";

import { getConfigPath } from "./desktopConfig.js";

export class DesktopConfigMonitor {
    constructor(onChanged) {
        this._monitor = null;
        this._signalId = 0;
        this._idleId = 0;
        this._onChanged = onChanged;
    }

    start() {
        const file = Gio.File.new_for_path(getConfigPath());

        try {
            this._monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._signalId = this._monitor.connect("changed", () => {
                // File monitors may emit multiple events for one save. Moving
                // work to idle coalesces bursts and keeps the D-Bus callback tiny.
                if (this._idleId !== 0) return;

                this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this._idleId = 0;
                    this._onChanged();
                    return GLib.SOURCE_REMOVE;
                });
            });
        } catch (error) {
            logError(error, "AirGradient config monitor failed");
        }
    }

    stop() {
        if (this._idleId !== 0) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }

        if (this._signalId !== 0) {
            this._monitor.disconnect(this._signalId);
            this._signalId = 0;
        }

        this._monitor?.cancel();
        this._monitor = null;
    }
}
