import Capacitor

/// Bridge view controller propio, solo para registrar el plugin embebido
/// `GymTrackerLiveActivity`.
///
/// Capacitor 8 en iOS registra plugins únicamente desde `packageClassList`
/// (paquetes Swift con su `Package.swift`) o built-in; un plugin que vive en
/// el target `App` hay que registrarlo a mano en `capacitorDidLoad()`, cuando
/// el `bridge` ya existe pero la webview todavía no cargó.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GymTrackerLiveActivity())
    }
}
