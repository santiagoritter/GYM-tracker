import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del descanso entre series: cuenta regresiva en la pantalla
/// de bloqueo y en la Dynamic Island.
///
/// El timer lo dibuja iOS con `Text(timerInterval:countsDown:)` — la app no
/// actualiza cada segundo, solo crea/termina la actividad. Cuando el descanso
/// llega a 0 (`state.finished`) se muestra solo el próximo ejercicio, sin
/// timer, unos segundos antes de cerrarse.
struct RestLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestActivityAttributes.self) { context in
            RestLockScreenView(state: context.state)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .activityBackgroundTint(Color.black.opacity(0.45))
                .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            let range = restRange(context.state)
            let exercise = trimmed(context.state.exerciseName)
            let finished = context.state.finished
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "dumbbell.fill")
                        Text(finished ? "Ahora" : "Descanso")
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if !finished {
                        Text(timerInterval: range, countsDown: true)
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(gymAccent)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .frame(maxWidth: 150, alignment: .trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let exercise {
                        Text(exercise)
                            .font(finished ? .title3.weight(.semibold) : .headline)
                            .foregroundStyle(finished ? gymAccent : .primary)
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
                if finished {
                    Image(systemName: "arrow.right")
                        .foregroundStyle(gymAccent)
                } else {
                    Text(timerInterval: range, countsDown: true)
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: 48)
                }
            } minimal: {
                if finished {
                    Image(systemName: "dumbbell.fill").foregroundStyle(gymAccent)
                } else {
                    Text(timerInterval: range, countsDown: true)
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .frame(maxWidth: 36)
                }
            }
            .keylineTint(gymAccent)
        }
    }
}

/// Pantalla de bloqueo / banner. Texto a la izquierda, número grande a la
/// derecha. Cuando el descanso terminó, no hay número: solo el próximo
/// ejercicio.
private struct RestLockScreenView: View {
    let state: RestActivityAttributes.ContentState

    private var exercise: String? { trimmed(state.exerciseName) }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(state.finished ? "Ahora" : "Descanso")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                if let exercise {
                    Text(exercise)
                        .font(state.finished ? .title3.weight(.bold) : .headline)
                        .foregroundStyle(state.finished ? gymAccent : .primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            if !state.finished {
                Spacer(minLength: 8)
                Text(timerInterval: restRange(state), countsDown: true)
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .layoutPriority(1)
                    .frame(minWidth: 96, alignment: .trailing)
            }
        }
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
