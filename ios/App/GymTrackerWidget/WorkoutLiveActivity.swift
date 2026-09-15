import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del entreno en curso: tiempo transcurrido, ejercicio
/// actual y series hechas / totales. Mismo criterio visual que
/// `RestLiveActivity.swift` — número grande, texto con `.lineLimit` +
/// `.minimumScaleFactor` en vez de truncar.
///
/// El timer usa `Text(timerInterval:countsDown:)` con rango hasta
/// `.distantFuture` (cuenta ARRIBA desde `startedAt`, sin techo real) — NO
/// `Text(date, style: .timer)`. Se probó primero con esa segunda forma y en
/// el compacto de la Dynamic Island (`compactTrailing`) renderizaba
/// **vacío** en el dispositivo real (bug reportado: "no muestra la hora,
/// ocupa todo el ancho en negro") — `Text(timerInterval:)` es la misma API
/// que ya funciona bien en el descanso, así que se unifica acá en vez de
/// mantener dos caminos distintos para lo mismo.
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutLockScreenView(context: context)
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .activityBackgroundTint(Color.black.opacity(0.45))
                .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            let range = workoutRange(context.attributes)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "figure.strengthtraining.traditional")
                        Text("Entreno")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.top, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: range, countsDown: false, showsHours: true)
                        .font(.system(size: 40, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .frame(alignment: .trailing)
                        .padding(.top, 2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(title(context))
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.75)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(setsLabel(context.state))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(timerInterval: range, countsDown: false, showsHours: false)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: 42, alignment: .trailing)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(gymAccent)
            }
            .keylineTint(gymAccent)
        }
    }

    private func title(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> String {
        let exercise = context.state.exerciseName?.trimmingCharacters(in: .whitespaces)
        if let exercise, !exercise.isEmpty { return exercise }
        return context.attributes.name
    }

    private func setsLabel(_ state: WorkoutActivityAttributes.ContentState) -> String {
        state.setsTotal > 0 ? "\(state.setsDone)/\(state.setsTotal) series" : "En curso"
    }
}

/// Rango desde que arrancó el entreno hasta "nunca" — `Text(timerInterval:)`
/// necesita un `ClosedRange<Date>`, no una fecha suelta. `countsDown: false`
/// lo hace contar para arriba sin importar el techo.
private func workoutRange(_ attributes: WorkoutActivityAttributes) -> ClosedRange<Date> {
    attributes.startedAt...Date.distantFuture
}

/// Pantalla de bloqueo / banner: texto a la izquierda (nombre del
/// ejercicio + series), tiempo transcurrido grande a la derecha — misma
/// fila, sin superponer. Ver el comentario largo en `RestLockScreenView`
/// (`RestLiveActivity.swift`): acá era el mismo `ZStack`-superpuesto y el
/// mismo bug de número tapando el texto, corregido con el mismo criterio.
private struct WorkoutLockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    private var title: String {
        let exercise = context.state.exerciseName?.trimmingCharacters(in: .whitespaces)
        if let exercise, !exercise.isEmpty { return exercise }
        return context.attributes.name
    }

    private var setsLabel: String {
        context.state.setsTotal > 0
            ? "\(context.state.setsDone)/\(context.state.setsTotal) series"
            : "En curso"
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Entreno")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(title)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .fixedSize(horizontal: false, vertical: true)
                Text(setsLabel)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 12)
            Text(timerInterval: workoutRange(context.attributes), countsDown: false, showsHours: true)
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(gymAccent)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(minWidth: 84, alignment: .trailing)
        }
    }
}
