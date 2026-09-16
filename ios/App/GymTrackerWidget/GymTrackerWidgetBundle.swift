import SwiftUI
import WidgetKit

/// Widget Extension de GymTracker. Solo Live Activities (descanso, entreno
/// y running/cardio); no hay widgets de pantalla de inicio.
///
/// El deployment target de este target tiene que ser iOS 16.2 o más
/// (`ActivityConfiguration`).
@main
struct GymTrackerWidgetBundle: WidgetBundle {
    var body: some Widget {
        RestLiveActivity()
        WorkoutLiveActivity()
        RunLiveActivity()
    }
}

/// Lima de acento de la app (`DESIGN.md §1`, `#E8FF47`). Compartido por las
/// dos Live Activities.
let gymAccent = Color(red: 232 / 255, green: 255 / 255, blue: 71 / 255)
