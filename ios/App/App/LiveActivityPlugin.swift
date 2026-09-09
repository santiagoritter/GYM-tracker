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
        CAPPluginMethod(name: "endRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endWorkout", returnType: CAPPluginReturnPromise),
    ]

    /// Cierra la Live Activity del descanso cuando su tiempo termina, aunque
    /// el JS nunca llame a `endRest` (webview reciclada). Si la app está
    /// suspendida el `sleep` se congela y corre al volver a primer plano.
    private var restEndTask: Task<Void, Never>?

    private func activitiesEnabled() -> Bool {
        guard #available(iOS 16.2, *) else { return false }
        return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // MARK: - Descanso

    @objc func startRest(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), activitiesEnabled() else { call.resolve(); return }

        let endsAtMs = call.getDouble("endsAt") ?? 0
        let totalSeconds = max(call.getDouble("totalSeconds") ?? 1, 1)
        let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000.0)
        let state = RestActivityAttributes.ContentState(
            endsAt: endsAt,
            totalSeconds: totalSeconds,
            exerciseName: call.getString("exerciseName")
        )
        let content = ActivityContent(state: state, staleDate: endsAt.addingTimeInterval(3))

        Task {
            if let existing = Activity<RestActivityAttributes>.activities.first {
                await existing.update(content)
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

        restEndTask?.cancel()
        restEndTask = Task { [weak self] in
            let seconds = endsAt.timeIntervalSinceNow + 2
            if seconds > 0 {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            }
            if Task.isCancelled { return }
            await self?.endActivities(RestActivityAttributes.self)
        }

        call.resolve()
    }

    @objc func endRest(_ call: CAPPluginCall) {
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
        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            // Solo puede haber una: si quedó alguna vieja, cerrarla.
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
        let content = ActivityContent(state: state, staleDate: nil)
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
