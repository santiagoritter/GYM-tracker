import ActivityKit
import Foundation

/// Estado de la Live Activity del descanso entre series.
///
/// `endsAt` + `totalSeconds` alcanzan para que el widget dibuje la cuenta
/// regresiva solo (`Text(timerInterval:)`), sin que la app tenga que
/// actualizar cada segundo. Este archivo es miembro del target `App` y del
/// target de la Widget Extension.
struct RestActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Epoch (segundos) en que termina el descanso.
        var endsAt: Date
        /// Duración total del descanso, para el rango del timer.
        var totalSeconds: Double
        /// El ejercicio a hacer cuando termine el descanso (el próximo con
        /// series pendientes). Se muestra en la vista expandida.
        var exerciseName: String?
        /// El descanso ya terminó: se muestra solo el próximo ejercicio,
        /// sin el timer, durante unos segundos antes de cerrarse.
        var finished: Bool = false
    }
}

/// Estado de la Live Activity del entreno en curso.
///
/// `startedAt` no cambia durante la sesión → va en los atributos, no en el
/// `ContentState`. El tiempo transcurrido lo cuenta iOS con
/// `Text(_:style: .timer)`.
struct WorkoutActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var exerciseName: String?
        var setsDone: Int
        var setsTotal: Int
    }

    var name: String
    var startedAt: Date
}
