import ActivityKit
import Capacitor
import Foundation

/// Puente entre `src/lib/liveActivity.ts` y ActivityKit.
///
/// Plugin embebido en el target `App` (no es un paquete): Capacitor lo
/// descubre por conformar `CAPBridgedPlugin` con la clase `@objc`. El layout
/// de las actividades vive en la Widget Extension (`ios/App/GymTrackerWidget/`).
///
/// Todo método es no-op prolijo si el SO es < iOS 16.2 o si el usuario tiene
/// las Live Activities desactivadas: resuelve la promesa igual, el lado JS ya
/// asume que puede no pasar nada.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endWorkout", returnType: CAPPluginReturnPromise),
    ]

    /// `Activity<...>` guardado como `Any?` para no arrastrar `@available` a
    /// una property stored. El cast concreto ocurre dentro de cada método.
    private var restActivity: Any?
    private var workoutActivity: Any?

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
        let state = RestActivityAttributes.ContentState(endsAt: endsAt, totalSeconds: totalSeconds)
        let content = ActivityContent(state: state, staleDate: endsAt.addingTimeInterval(10))

        if let existing = restActivity as? Activity<RestActivityAttributes> {
            Task { await existing.update(content) }
            call.resolve()
            return
        }

        do {
            restActivity = try Activity.request(
                attributes: RestActivityAttributes(),
                content: content,
                pushType: nil
            )
            call.resolve()
        } catch {
            call.reject("No se pudo iniciar la Live Activity del descanso: \(error.localizedDescription)")
        }
    }

    @objc func endRest(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        if let activity = restActivity as? Activity<RestActivityAttributes> {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
            restActivity = nil
        }
        call.resolve()
    }

    // MARK: - Entreno

    @objc func startWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *), activitiesEnabled() else { call.resolve(); return }

        let name = call.getString("name") ?? "Entreno"
        let startedAtMs = call.getDouble("startedAt") ?? Date().timeIntervalSince1970 * 1000
        let startedAt = Date(timeIntervalSince1970: startedAtMs / 1000.0)

        // Cerrar cualquier actividad de entreno previa antes de abrir otra.
        if let existing = workoutActivity as? Activity<WorkoutActivityAttributes> {
            Task { await existing.end(nil, dismissalPolicy: .immediate) }
            workoutActivity = nil
        }

        let state = WorkoutActivityAttributes.ContentState(exerciseName: nil, setsDone: 0, setsTotal: 0)
        let content = ActivityContent(state: state, staleDate: nil)

        do {
            workoutActivity = try Activity.request(
                attributes: WorkoutActivityAttributes(name: name, startedAt: startedAt),
                content: content,
                pushType: nil
            )
            call.resolve()
        } catch {
            call.reject("No se pudo iniciar la Live Activity del entreno: \(error.localizedDescription)")
        }
    }

    @objc func updateWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        guard let activity = workoutActivity as? Activity<WorkoutActivityAttributes> else {
            call.resolve()
            return
        }
        let state = WorkoutActivityAttributes.ContentState(
            exerciseName: call.getString("exerciseName"),
            setsDone: call.getInt("setsDone") ?? 0,
            setsTotal: call.getInt("setsTotal") ?? 0
        )
        Task { await activity.update(ActivityContent(state: state, staleDate: nil)) }
        call.resolve()
    }

    @objc func endWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        if let activity = workoutActivity as? Activity<WorkoutActivityAttributes> {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
            workoutActivity = nil
        }
        call.resolve()
    }
}
