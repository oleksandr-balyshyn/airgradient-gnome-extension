// GNOME Shell popup adapter. It renders already-prepared view models and avoids
// owning sensor parsing, threshold, HTTP, or config policy.
import Clutter from "gi://Clutter";
import St from "gi://St";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import {
    PANEL_STATUS_CLASSES,
    buildAqiViewModel,
    buildMetricViewModels,
    panelStatusClass,
} from "./airgradientPresentation.js";

const GAUGE_WIDTH = 230;
const TEMPORARY_STATUS_CLASSES = [
    "airgradient-refreshing",
    "airgradient-error",
];
const TREND_CLASSES = [
    "airgradient-trend-improved",
    "airgradient-trend-worse",
    "airgradient-trend-neutral",
];

export class PanelStatusIcon {
    constructor() {
        this.actor = new St.Icon({
            icon_name: "weather-fog-symbolic",
            style_class:
                "system-status-icon airgradient-panel-icon airgradient-status-gray",
        });
    }

    setStatus(status) {
        for (const className of PANEL_STATUS_CLASSES)
            this.actor.remove_style_class_name(className);

        this.actor.add_style_class_name(panelStatusClass(status));
    }
}

export class AirGradientPopup {
    constructor({ menu, onRefresh, onOpenSettings }) {
        this._metricRows = [];
        this._build(menu, onRefresh, onOpenSettings);
    }

    updateSnapshot({ serverUrl, snapshot, previousSnapshot, updatedAt }) {
        this._titleLabel.text = serverUrl ?? "AirGradient";
        this._subtitleLabel.text = `Updated ${updatedAt}`;
        this._updateAqi(buildAqiViewModel(snapshot, previousSnapshot));

        const metricViews = buildMetricViewModels(snapshot, previousSnapshot);
        for (const [index, view] of metricViews.entries())
            this._metricRows[index].update(view);

        this.setStatus("Latest measurements loaded.");
    }

    updateUnavailable(message) {
        this._titleLabel.text = "AirGradient";
        this._subtitleLabel.text = "No fresh sensor data.";
        this.setStatus(`Fetch failed: ${message}`, "airgradient-error");
    }

    setStatus(message, className = null) {
        for (const statusClass of TEMPORARY_STATUS_CLASSES)
            this._statusLabel.remove_style_class_name(statusClass);

        if (className) this._statusLabel.add_style_class_name(className);
        this._statusLabel.text = message;
    }

    _build(menu, onRefresh, onOpenSettings) {
        menu.box.add_child(this._buildHeader());
        menu.addMenuItem(this._buildAqiCard());

        for (const metricRow of this._buildMetricRows()) {
            this._metricRows.push(metricRow);
            menu.addMenuItem(metricRow.item);
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu.addMenuItem(this._buildStatusItem());
        menu.addMenuItem(this._buildActionItem("Refresh now", onRefresh));
        menu.addMenuItem(
            this._buildActionItem("Open Settings", onOpenSettings),
        );
    }

    _buildHeader() {
        const header = new St.BoxLayout({
            vertical: true,
            style_class: "airgradient-popup-header",
        });

        this._titleLabel = new St.Label({
            text: "AirGradient",
            style_class: "airgradient-popup-title",
        });
        this._subtitleLabel = new St.Label({
            text: "Waiting for sensor data.",
            style_class: "airgradient-popup-subtitle",
        });

        header.add_child(this._titleLabel);
        header.add_child(this._subtitleLabel);
        return header;
    }

    _buildAqiCard() {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        item.add_style_class_name("airgradient-primary-card");

        const root = new St.BoxLayout({ vertical: true, x_expand: true });
        const top = new St.BoxLayout({ x_expand: true });
        this._aqiValueLabel = new St.Label({
            text: "--",
            style_class: "airgradient-aqi-value",
        });
        this._aqiLevelLabel = new St.Label({
            text: "Unknown",
            style_class: "airgradient-aqi-level",
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._aqiDescriptionLabel = new St.Label({
            text: "Waiting for a measurement.",
            style_class: "airgradient-aqi-description",
        });
        this._aqiTrendLabel = new St.Label({
            text: "No previous reading",
            style_class: "airgradient-trend-neutral airgradient-popup-subtitle",
        });

        top.add_child(this._aqiValueLabel);
        top.add_child(this._aqiLevelLabel);
        root.add_child(top);
        root.add_child(this._aqiDescriptionLabel);
        root.add_child(this._aqiTrendLabel);
        item.add_child(root);

        return item;
    }

    _buildMetricRows() {
        return buildMetricViewModels(null, null).map(
            (view) => new MetricGaugeRow(view),
        );
    }

    _buildStatusItem() {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this._statusLabel = new St.Label({
            text: "Not updated yet.",
            style_class: "airgradient-popup-subtitle",
        });
        item.add_child(this._statusLabel);
        return item;
    }

    _buildActionItem(label, onActivated) {
        const item = new PopupMenu.PopupMenuItem(label);
        item.connect("activate", onActivated);
        return item;
    }

    _updateAqi(view) {
        this._aqiValueLabel.text = view.value;
        this._aqiLevelLabel.text = view.level;
        this._aqiDescriptionLabel.text = view.description;
        this._aqiValueLabel.style = `color: ${view.color};`;
        applyTrend(this._aqiTrendLabel, view.trend);
    }
}

class MetricGaugeRow {
    constructor(initialView) {
        this.item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this.item.add_style_class_name("airgradient-metric-row");

        const root = new St.BoxLayout({ vertical: true, x_expand: true });
        const top = new St.BoxLayout({
            style_class: "airgradient-metric-top",
            x_expand: true,
        });

        this._nameLabel = new St.Label({
            style_class: "airgradient-metric-name",
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._valueLabel = new St.Label({
            style_class: "airgradient-metric-value",
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._unitLabel = new St.Label({
            style_class: "airgradient-metric-unit",
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._track = new St.Widget({ style_class: "airgradient-bar-track" });
        this._track.set_width(GAUGE_WIDTH);
        this._fill = new St.Widget({ style_class: "airgradient-bar-fill" });
        this._track.add_child(this._fill);
        this._trendLabel = new St.Label({
            style_class: "airgradient-trend-neutral airgradient-popup-subtitle",
            x_align: Clutter.ActorAlign.START,
        });

        top.add_child(this._nameLabel);
        top.add_child(this._valueLabel);
        top.add_child(this._unitLabel);
        root.add_child(top);
        root.add_child(this._track);
        root.add_child(this._trendLabel);
        this.item.add_child(root);

        this.update(initialView);
    }

    update(view) {
        this._nameLabel.text = view.name;
        this._valueLabel.text = view.value;
        this._unitLabel.text = view.unit;
        this._fill.set_width(Math.round(GAUGE_WIDTH * view.fillRatio));
        this._fill.style = `background-color: ${view.color};`;
        applyTrend(this._trendLabel, view.trend);
    }
}

function applyTrend(label, trendView) {
    for (const trendClass of TREND_CLASSES)
        label.remove_style_class_name(trendClass);

    label.text = trendView.label;
    label.add_style_class_name(`airgradient-${trendView.className}`);
}
