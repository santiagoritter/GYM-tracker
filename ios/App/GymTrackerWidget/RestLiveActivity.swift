import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del descanso entre series: cuenta regresiva en la pantalla
/// de bloqueo y en la Dynamic Island.
///
/// El timer lo dibuja iOS con `Text(timerInterval:countsDown:)` — la app no
/// actualiza cada segundo, solo crea/termina la actividad. El rango va de
/// `endsAt - totalSeconds` a `endsAt`, siempre válido (totalSeconds >= 1).
struct RestLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestActivityAttributes.self) { context in
            RestLockScreenView(state: context.state)
                .activityBackgroundTint(Color.black.opacity(0.45))
                .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            let range = restRange(context.state)
            let exercise = trimmed(context.state.exerciseName)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "dumbbell.fill")
                        Text("Descanso")
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: range, countsDown: true)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: 130, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let exercise {
                        Text(exercise)
                            .font(.headline)
                            .lineLimit(2)
                            .minimumScaleFactor(0.75)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(timerInterval: range, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: 48)
            } minimal: {
                Text(timerInterval: range, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: 36)
            }
            .keylineTint(gymAccent)
        }
    }
}

/// Pantalla de bloqueo / banner. "Descanso" arriba, el ejercicio abajo (hasta
/// 2 líneas, se achica si hace falta), y la cuenta regresiva grande a la
/// derecha.
private struct RestLockScreenView: View {
    let state: RestActivityAttributes.ContentState

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Descanso")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                if let exercise = trimmed(state.exerciseName) {
                    Text(exercise)
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 8)
            Text(timerInterval: restRange(state), countsDown: true)
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(gymAccent)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .layoutPriority(1)
                .frame(minWidth: 88, alignment: .trailing)
        }
        .padding(.vertical, 4)
    }
}

private func restRange(_ state: RestActivityAttributes.ContentState) -> ClosedRange<Date> {
    let start = state.endsAt.addingTimeInterval(-max(state.totalSeconds, 1))
    return start...state.endsAt
}

/// nil si el string es nil o solo espacios.
private func trimmed(_ value: String?) -> String? {
    guard let value, !value.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
    return value
}
