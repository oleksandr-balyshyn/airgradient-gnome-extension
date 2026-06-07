project(
    'airgradient-gnome-extension',
    version: '0.1.0',
    meson_version: '>=1.3.0',
)

extension_uuid = 'airgradient@worxbend.dev'
extension_dir = join_paths(get_option('datadir'), 'gnome-shell', 'extensions', extension_uuid)

install_data(
    'airgradientAlerts.js',
    'airgradientHttpClient.js',
    'airgradientPopup.js',
    'airgradientPresentation.js',
    'airgradientSensors.js',
    'desktopConfigMonitor.js',
    'desktopConfig.js',
    'extension.js',
    'metadata.json',
    'prefs.js',
    'stylesheet.css',
    install_dir: extension_dir,
)
