import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import {
    MAX as MAX_REFRESH_INTERVAL_SECS,
    MIN as MIN_REFRESH_INTERVAL_SECS,
    getConfigPath,
    normalizeServerUrl,
    readDesktopConfig,
    writeDesktopConfig,
} from "./desktopConfig.js";

function boolText(value) {
    return value ? "enabled" : "disabled";
}

export default class AirGradientPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let config = readDesktopConfig();

        const page = new Adw.PreferencesPage({
            title: "AirGradient",
            icon_name: "weather-fog-symbolic",
        });

        const deviceGroup = new Adw.PreferencesGroup({
            title: "Device",
            description:
                "Configure the AirGradient local-server endpoint shared with Air Monitor.",
        });

        const urlRow = new Adw.EntryRow({
            title: "Local-server Base URL",
        });
        urlRow.text = config.server_url ?? "";

        const refreshRow = new Adw.SpinRow({
            title: "Refresh Interval",
            subtitle: "Seconds between automatic measurement updates.",
            adjustment: new Gtk.Adjustment({
                lower: MIN_REFRESH_INTERVAL_SECS,
                upper: MAX_REFRESH_INTERVAL_SECS,
                step_increment: 1,
                page_increment: 30,
            }),
            digits: 0,
            numeric: true,
        });
        refreshRow.value = config.refresh_interval_secs;

        const notificationsRow = new Adw.SwitchRow({
            title: "Air Quality Notifications",
            subtitle:
                "Notify when CO2, AQI, particles, VOC, NOx, or humidity need attention.",
        });
        notificationsRow.active = config.notifications_enabled;

        const startMinimizedRow = new Adw.SwitchRow({
            title: "Start Minimized",
            subtitle:
                "Kept for compatibility with Air Monitor; GNOME Shell extensions always run in the shell.",
        });
        startMinimizedRow.active = config.start_minimized;

        deviceGroup.add(urlRow);
        deviceGroup.add(refreshRow);
        deviceGroup.add(notificationsRow);
        deviceGroup.add(startMinimizedRow);

        const statusGroup = new Adw.PreferencesGroup({
            title: "Shared Configuration",
            description: getConfigPath(),
        });

        const statusRow = new Adw.ActionRow({
            title: "Status",
            subtitle: this._configSummary(config),
        });

        const saveRow = new Adw.ActionRow({
            title: "Save Settings",
            subtitle: "Write the desktop-compatible config.json file.",
            activatable: true,
        });
        const saveButton = new Gtk.Button({
            icon_name: "document-save-symbolic",
            valign: Gtk.Align.CENTER,
        });
        saveButton.add_css_class("suggested-action");
        saveRow.add_suffix(saveButton);
        saveRow.activatable_widget = saveButton;

        const save = () => {
            const rawUrl = urlRow.text.trim();
            const serverUrl = normalizeServerUrl(rawUrl);

            if (rawUrl && serverUrl === null) {
                statusRow.subtitle =
                    "Invalid URL. Use http, https, a bare host, or leave it empty.";
                return;
            }

            try {
                config = writeDesktopConfig({
                    server_url: serverUrl,
                    refresh_interval_secs: Math.round(refreshRow.value),
                    notifications_enabled: notificationsRow.active,
                    start_minimized: startMinimizedRow.active,
                });
                urlRow.text = config.server_url ?? "";
                refreshRow.value = config.refresh_interval_secs;
                notificationsRow.active = config.notifications_enabled;
                startMinimizedRow.active = config.start_minimized;
                statusRow.subtitle = `Saved. ${this._configSummary(config)}`;
            } catch (error) {
                statusRow.subtitle = `Failed to save: ${error.message ?? String(error)}`;
            }
        };

        saveButton.connect("clicked", save);
        saveRow.connect("activated", save);

        const reloadRow = new Adw.ActionRow({
            title: "Reload From Disk",
            subtitle: "Read the current Air Monitor config file again.",
            activatable: true,
        });
        const reloadButton = new Gtk.Button({
            icon_name: "view-refresh-symbolic",
            valign: Gtk.Align.CENTER,
        });
        reloadRow.add_suffix(reloadButton);
        reloadRow.activatable_widget = reloadButton;
        const reload = () => {
            config = readDesktopConfig();
            urlRow.text = config.server_url ?? "";
            refreshRow.value = config.refresh_interval_secs;
            notificationsRow.active = config.notifications_enabled;
            startMinimizedRow.active = config.start_minimized;
            statusRow.subtitle = `Reloaded. ${this._configSummary(config)}`;
        };
        reloadButton.connect("clicked", reload);
        reloadRow.connect("activated", reload);

        statusGroup.add(statusRow);
        statusGroup.add(saveRow);
        statusGroup.add(reloadRow);

        page.add(deviceGroup);
        page.add(statusGroup);
        window.add(page);

        return Promise.resolve();
    }

    _configSummary(config) {
        const server = config.server_url ?? "not configured";
        return `Server: ${server}; refresh: ${config.refresh_interval_secs}s; notifications: ${boolText(config.notifications_enabled)}.`;
    }
}
