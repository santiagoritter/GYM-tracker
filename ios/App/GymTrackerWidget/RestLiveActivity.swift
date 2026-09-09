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
            let range = restRange(context.state)
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Descanso")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(timerInterval: range, countsDown: true)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                }
                Spacer()
                Image(systemName: "dumbbell.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .activityBackgroundTint(Color.black.opacity(0.45))
            .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            let range = restRange(context.state)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Descanso", systemImage: "dumbbell.fill")
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: range, countsDown: true)
                        .font(.system(.title2, design: .rounded).weight(.bold))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .frame(maxWidth: 96)
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(timerInterval: range, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .frame(maxWidth: 44)
            } minimal: {
                Text(timerInterval: range, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .frame(maxWidth: 34)
            }
            .keylineTint(gymAccent)
        }
    }

    private func restRange(_ state: RestActivityAttributes.ContentState) -> ClosedRange<Date> {
        let start = state.endsAt.addingTimeInterval(-max(state.totalSeconds, 1))
        return start...state.endsAt
    }
}
