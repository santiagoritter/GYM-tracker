import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity del entreno en curso: tiempo transcurrido (lo cuenta iOS
/// con `Text(_:style: .timer)`, sin que la app actualice nada), ejercicio
/// actual y series hechas / totales. Mismo criterio visual que
/// `RestLiveActivity.swift` — número grande a la derecha, texto con
/// `.lineLimit` + `.minimumScaleFactor` en vez de truncar, `.fixedSize()`
/// en vez de un frame fijo en el compacto (esto último causaba un hueco
/// muerto a la derecha del número, ya visto y corregido en el descanso).
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutLockScreenView(context: context)
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .activityBackgroundTint(Color.black.opacity(0.45))
                .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            DynamicIsland {
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
                    Text(context.attributes.startedAt, style: .timer)
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
                // .fixedSize(): mismo fix que en el descanso — sin esto el
                // texto queda centrado en un frame más ancho que su
                // contenido real y sobra hueco a la derecha.
                Text(context.attributes.startedAt, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .fixedSize()
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

/// Pantalla de bloqueo / banner: texto a la izquierda (nombre del
/// ejercicio + series), tiempo transcurrido grande y centrado verticalmente
/// a la derecha — mismo layout que `RestLockScreenView`.
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
        ZStack {
            HStack {
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
                Spacer(minLength: 84)
            }

            HStack {
                Spacer()
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .fixedSize()
            }
        }
    }
}
