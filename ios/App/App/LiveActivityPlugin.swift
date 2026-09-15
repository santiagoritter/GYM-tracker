import ActivityKit
import Capacitor
import Foundation

/// Puente entre `src/lib/liveActivity.ts` y ActivityKit.
///
/// Plugin embebido en el target `App` (no es un paquete). Capacitor 8 en iOS
/// **no** escanea el runtime buscando `CAPBridgedPlugin`: los plugins de la
/// app se registran a mano en `MainViewController.capacitorDidLoad()`. El
/// nombre ObjC de la clase, `identifier`, `jsName` y el string de
/// `registerPlugin(...)` en el JS tienen que ser el mismo:
/// `GymTrackerLiveActivity`.
///
/// **Nunca se guarda la referencia a la `Activity`**: cuando iOS recicla la
/// webview (cerrar/reabrir la app) el plugin se reinstancia y una referencia
/// guardada quedaría muerta, dejando la Live Activity imposible de cerrar.
/// Siempre se opera sobre `Activity<T>.activities`, la lista viva del sistema.
///
/// El layout vive en la Widget Extension (`ios/App/GymTrackerWidget/`). Todo
/// método es no-op prolijo si el SO es < iOS 16.2 o si el usuario tiene las
/// Live Activities desactivadas.
@objc(GymTrackerLiveActivity)
public class GymTrackerLiveActivity: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GymTrackerLiveActivity"
    public let jsName = "GymTrackerLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endWorkout", returnType: CAPPluginReturnPromise),
    ]

    /// Cierra la Live Activity del descanso cuando su tiempo termina, aunque
    /// el JS nunca llame a `finishRest`/`endRest` (webview reciclada). Si la
    /// app está suspendida el `sleep` se congela y corre al volver.
    private var restEndTask: Task<Void, Never>?
    /// Está corriendo la ventana de "descanso terminado, mostrar próximo
    /// ejercicio": `endRest` la respeta en vez de cortarla de una.
    private var finishing = false

    private func activitiesEnabled() -> Bool {
        guard #available(iOS 16.2, *) else { return false }
        return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // MARK: - Descanso

    @objc func startRest(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), activitiesEnabled() else { call.resolve(); return }

        finishing = false
        let endsAtMs = call.getDouble("endsAt") ?? 0
        let totalSeconds = max(call.getDouble("totalSeconds") ?? 1, 1)
        let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000.0)
        let state = RestActivityAttributes.ContentState(
            endsAt: endsAt,
            totalSeconds: totalSeconds,
            exerciseName: call.getString("exerciseName"),
            finished: false
        )
        // relevanceScore alto: mientras hay un descanso corriendo, siempre
        // hay TAMBIÉN una Live Activity de entreno viva al mismo tiempo (se
        // descansa DURANTE un entreno) — con dos Live Activities compitiendo,
        // iOS elige una sola para el compacto de la Dynamic Island según
        // cuál sea más "relevante" ahora, no cuál se actualizó último. Sin
        // este puntaje, se quedaba mostrando el entreno y el descanso nunca
        // aparecía (bug reportado). Ver relevanceScore más bajo en
        // startWorkout/updateWorkout.
        let content = ActivityContent(state: state, staleDate: nil, relevanceScore: 100)

        Task {
            // `Activity<T>.activities` puede traer más de una: dos llamadas a
            // startRest muy seguidas (superserie, series rápidas) pueden pisarse
            // en la carrera de "¿existe ya una?" antes de que la primera
            // termine de crearla, y quedan dos activas al mismo tiempo. Con 2+
            // Live Activities del mismo tipo vivas, iOS muestra en el compacto
            // de la Dynamic Island una combinación rara — probablemente la
            // causa de "se agranda y no muestra el tiempo" reportada después de
            // varias sesiones seguidas. Se actualiza la primera y se cierran
            // las demás, así nunca queda más de una viva.
            let existing = Activity<RestActivityAttributes>.activities
            if let first = existing.first {
                await first.update(content)
                for extra in existing.dropFirst() {
                    await extra.end(nil, dismissalPolicy: .immediate)
                }
            } else {
                do {
                    _ = try Activity.request(
                        attributes: RestActivityAttributes(),
                        content: content,
                        pushType: nil
                    )
                } catch {
                    CAPLog.print("⚡️ GymTrackerLiveActivity startRest: \(error)")
                }
            }
        }

        // Red de seguridad: si el JS nunca llama a finishRest/endRest, cerrar
        // ~20 s después de que el descanso terminaba.
        restEndTask?.cancel()
        restEndTask = Task { [weak self] in
            let seconds = endsAt.timeIntervalSinceNow + 20
            if seconds > 0 {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            }
            if Task.isCancelled { return }
            self?.finishing = false
            await self?.endActivities(RestActivityAttributes.self)
        }

        call.resolve()
    }

    /// El descanso llegó a 0: se muestra solo el próximo ejercicio (sin timer)
    /// unos segundos y después se cierra.
    @objc func finishRest(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }

        finishing = true
        let exerciseName = call.getString("exerciseName")
        let holdSeconds: Double = 12

        Task {
            for activity in Activity<RestActivityAttributes>.activities {
                let state = RestActivityAttributes.ContentState(
                    endsAt: Date(),
                    totalSeconds: 1,
                    exerciseName: exerciseName,
                    finished: true
                )
                await activity.update(ActivityContent(state: state, staleDate: nil, relevanceScore: 100))
            }
        }

        restEndTask?.cancel()
        restEndTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(holdSeconds * 1_000_000_000))
            if Task.isCancelled { return }
            self?.finishing = false
            await self?.endActivities(RestActivityAttributes.self)
        }
        call.resolve()
    }

    @objc func endRest(_ call: CAPPluginCall) {
        // Si está en la ventana de "descanso terminado", dejar que esa cierre
        // sola — es lo que muestra el próximo ejercicio.
        if finishing {
            call.resolve()
            return
        }
        restEndTask?.cancel()
        restEndTask = nil
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task { await endActivities(RestActivityAttributes.self) }
        call.resolve()
    }

    // MARK: - Entreno

    @objc func startWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), activitiesEnabled() else { call.resolve(); return }

        let name = call.getString("name") ?? "Entreno"
        let startedAtMs = call.getDouble("startedAt") ?? Date().timeIntervalSince1970 * 1000
        let startedAt = Date(timeIntervalSince1970: startedAtMs / 1000.0)
        let state = WorkoutActivityAttributes.ContentState(exerciseName: nil, setsDone: 0, setsTotal: 0)
        // relevanceScore más bajo que el del descanso (100): con las dos
        // vivas a la vez, gana el descanso mientras esté corriendo; apenas
        // termina y se cierra, el entreno vuelve a ser la única y se ve solo.
        let content = ActivityContent(state: state, staleDate: nil, relevanceScore: 50)

        Task {
            for old in Activity<WorkoutActivityAttributes>.activities {
                await old.end(nil, dismissalPolicy: .immediate)
            }
            do {
                _ = try Activity.request(
                    attributes: WorkoutActivityAttributes(name: name, startedAt: startedAt),
                    content: content,
                    pushType: nil
                )
            } catch {
                CAPLog.print("⚡️ GymTrackerLiveActivity startWorkout: \(error)")
            }
        }
        call.resolve()
    }

    @objc func updateWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        let state = WorkoutActivityAttributes.ContentState(
            exerciseName: call.getString("exerciseName"),
            setsDone: call.getInt("setsDone") ?? 0,
            setsTotal: call.getInt("setsTotal") ?? 0
        )
        let content = ActivityContent(state: state, staleDate: nil, relevanceScore: 50)
        Task {
            for activity in Activity<WorkoutActivityAttributes>.activities {
                await activity.update(content)
            }
        }
        call.resolve()
    }

    @objc func endWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task { await endActivities(WorkoutActivityAttributes.self) }
        call.resolve()
    }

    // MARK: -

    @available(iOS 16.2, *)
    private func endActivities<T: ActivityAttributes>(_ type: T.Type) async {
        for activity in Activity<T>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
