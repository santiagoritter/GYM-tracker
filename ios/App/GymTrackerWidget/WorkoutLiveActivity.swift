import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del entreno en curso: tiempo transcurrido (lo cuenta iOS),
/// nombre de la rutina, ejercicio actual y series hechas / totales.
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.exerciseName ?? context.attributes.name)
                        .font(.headline)
                        .lineLimit(1)
                    Text(setsLabel(context.state))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(.title3, design: .rounded).weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .frame(maxWidth: 84)
            }
            .padding()
            .activityBackgroundTint(Color.black.opacity(0.45))
            .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.state.exerciseName ?? context.attributes.name,
                          systemImage: "figure.strengthtraining.traditional")
                        .lineLimit(1)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startedAt, style: .timer)
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .frame(maxWidth: 96)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(setsLabel(context.state))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(gymAccent)
            }
            .keylineTint(gymAccent)
        }
    }

    private func setsLabel(_ state: WorkoutActivityAttributes.ContentState) -> String {
        state.setsTotal > 0 ? "\(state.setsDone)/\(state.setsTotal) series" : "En curso"
    }
}
