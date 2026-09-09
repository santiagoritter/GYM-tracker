import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del entreno en curso: tiempo transcurrido (lo cuenta iOS),
/// nombre de la rutina, ejercicio actual y series hechas / totales.
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title(context))
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(setsLabel(context.state))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(size: 26, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .layoutPriority(1)
                    .frame(minWidth: 76, alignment: .trailing)
            }
            .padding(.vertical, 4)
            .activityBackgroundTint(Color.black.opacity(0.45))
            .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "figure.strengthtraining.traditional")
                        Text("Entreno")
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startedAt, style: .timer)
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(maxWidth: 120, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title(context))
                            .font(.headline)
                            .lineLimit(2)
                            .minimumScaleFactor(0.75)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(setsLabel(context.state))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: 52)
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
