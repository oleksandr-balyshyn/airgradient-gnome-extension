// Shared config compatibility layer for airgradient-desktop. The extension uses
// this file instead of GSettings so both applications edit the same device URL
// and refresh preferences.
export const DEFAULT_REFRESH_INTERVAL_SECS = 30;
export const MIN = 5;
export const MAX = 3600;

const CONFIG_DIR_NAME = "airgradient-desktop";
const CONFIG_FILE_NAME = "config.json";

function nonEmptyText(value) {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    return text.length === 0 ? null : text;
}

function getGjsGLib() {
    return globalThis.imports?.gi?.GLib ?? null;
}

function getNodeFs() {
    return globalThis.process?.getBuiltinModule?.("fs") ?? null;
}

function getEnv(name) {
    const GLib = getGjsGLib();
    const value = GLib ? GLib.getenv(name) : globalThis.process?.env?.[name];

    return nonEmptyText(value);
}

function trimTrailingSlashes(path) {
    if (path === "/") return path;

    return path.replace(/\/+$/u, "");
}

function appendPath(base, leaf) {
    const cleanedBase = trimTrailingSlashes(base);

    if (!cleanedBase || cleanedBase === ".") return leaf;
    if (cleanedBase === "/") return `/${leaf}`;

    return `${cleanedBase}/${leaf}`;
}

function configDirPath() {
    const base =
        getEnv("XDG_CONFIG_HOME") ??
        (getEnv("HOME") ? appendPath(getEnv("HOME"), ".config") : ".");

    return appendPath(base, CONFIG_DIR_NAME);
}

function parseServerCandidate(raw) {
    const trimmed = nonEmptyText(raw);
    if (trimmed === null) return null;

    const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\/(.*)$/iu);
    const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "http";
    const rest = schemeMatch ? schemeMatch[2] : trimmed;

    if (scheme !== "http" && scheme !== "https") return null;

    const hostEnd = rest.search(/[/?#]/u);
    const host = nonEmptyText(hostEnd === -1 ? rest : rest.slice(0, hostEnd));

    if (host === null || /\s/u.test(host)) return null;

    return `${scheme}://${host.replace(/\/+$/u, "")}`;
}

function normalizedConfig(config) {
    const source = config && typeof config === "object" ? config : {};

    return {
        server_url: normalizeServerUrl(source.server_url),
        refresh_interval_secs: normalizeRefreshInterval(
            source.refresh_interval_secs,
        ),
        notifications_enabled:
            source.notifications_enabled === undefined
                ? true
                : Boolean(source.notifications_enabled),
        start_minimized:
            source.start_minimized === undefined
                ? false
                : Boolean(source.start_minimized),
    };
}

function readFileText(path) {
    const GLib = getGjsGLib();
    if (GLib) {
        const [, contents] = GLib.file_get_contents(path);
        return new TextDecoder().decode(contents);
    }

    const fs = getNodeFs();
    if (fs) return fs.readFileSync(path, "utf8");

    return null;
}

function ensureDirectory(path) {
    const GLib = getGjsGLib();
    if (GLib) {
        GLib.mkdir_with_parents(path, 0o700);
        return;
    }

    const fs = getNodeFs();
    if (fs) fs.mkdirSync(path, { recursive: true, mode: 0o700 });
}

function writeFileText(path, contents) {
    const GLib = getGjsGLib();
    if (GLib) {
        GLib.file_set_contents(path, contents);
        return;
    }

    const fs = getNodeFs();
    if (fs) fs.writeFileSync(path, contents, "utf8");
}

export function getConfigPath() {
    return appendPath(configDirPath(), CONFIG_FILE_NAME);
}

export function normalizeServerUrl(raw) {
    return parseServerCandidate(raw);
}

export function normalizeRefreshInterval(secs) {
    if (secs === null || secs === undefined || secs === "")
        return DEFAULT_REFRESH_INTERVAL_SECS;

    const value = Number(secs);

    if (!Number.isFinite(value)) return DEFAULT_REFRESH_INTERVAL_SECS;

    return Math.round(Math.min(MAX, Math.max(MIN, value)));
}

export function defaultConfig() {
    return {
        server_url: null,
        refresh_interval_secs: DEFAULT_REFRESH_INTERVAL_SECS,
        notifications_enabled: true,
        start_minimized: false,
    };
}

export function readDesktopConfig() {
    try {
        const raw = readFileText(getConfigPath());
        if (raw === null) return defaultConfig();

        return normalizedConfig(JSON.parse(raw));
    } catch {
        return defaultConfig();
    }
}

export function writeDesktopConfig(config) {
    const nextConfig = normalizedConfig(config);
    const path = getConfigPath();

    ensureDirectory(configDirPath());
    writeFileText(path, `${JSON.stringify(nextConfig, null, 2)}\n`);

    return nextConfig;
}
