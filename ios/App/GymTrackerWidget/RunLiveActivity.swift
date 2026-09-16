import ActivityKit
import SwiftUI
import WidgetKit

/// Live Activity de running/cardio: tiempo transcurrido, distancia y
/// velocidad promedio. Mismo criterio visual y las mismas correcciones ya
/// aplicadas esta sesión en `RestLiveActivity.swift`/`WorkoutLiveActivity.swift`:
/// `Text(timerInterval:countsDown:)` (nunca `Text(date, style: .timer)`, que
/// renderizaba vacío en compacto), `.frame(width:/minWidth:)` en vez de
/// `.fixedSize()` en los compactos (mismo bug: `.fixedSize()` podía
/// renderizar el Text vacío ahí), y un solo `HStack` sin superponer en la
/// pantalla de bloqueo (no el `ZStack` superpuesto que causó el bug de
/// número tapando texto, ya corregido en las otras dos).
struct RunLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RunActivityAttributes.self) { context in
            RunLockScreenView(context: context)
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .activityBackgroundTint(Color.black.opacity(0.45))
                .activitySystemActionForegroundColor(gymAccent)
        } dynamicIsland: { context in
            let range = context.attributes.startedAt...Date.distantFuture
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: "figure.run")
                        Text(context.attributes.label)
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
                    HStack(spacing: 14) {
                        if let distanceM = context.state.distanceM {
                            Stat(label: "Distancia", value: formatKm(distanceM))
                        }
                        if let pace = context.state.avgPaceSecPerKm {
                            Stat(label: "Ritmo prom.", value: "\(formatPace(pace)) /km")
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: "figure.run")
                    .foregroundStyle(gymAccent)
            } compactTrailing: {
                Text(timerInterval: range, countsDown: false, showsHours: false)
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: 42, alignment: .trailing)
            } minimal: {
                Image(systemName: "figure.run")
                    .foregroundStyle(gymAccent)
            }
            .keylineTint(gymAccent)
        }
    }
}

private struct Stat: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(.primary)
        }
    }
}

/// Pantalla de bloqueo / banner: label + tiempo arriba, distancia y ritmo
/// abajo — un solo HStack/VStack por fila, sin superponer nada (mismo
/// criterio ya fijado en RestLiveActivity/WorkoutLiveActivity).
private struct RunLockScreenView: View {
    let context: ActivityViewContext<RunActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.label)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 12)
                Text(
                    timerInterval: context.attributes.startedAt...Date.distantFuture,
                    countsDown: false,
                    showsHours: true
                )
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(gymAccent)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(minWidth: 84, alignment: .trailing)
            }
            if context.state.distanceM != nil || context.state.avgPaceSecPerKm != nil {
                HStack(spacing: 18) {
                    if let distanceM = context.state.distanceM {
                        Stat(label: "Distancia", value: formatKm(distanceM))
                    }
                    if let pace = context.state.avgPaceSecPerKm {
                        Stat(label: "Ritmo prom.", value: "\(formatPace(pace)) /km")
                    }
                }
            }
        }
    }
}

private func formatKm(_ meters: Double) -> String {
    String(format: "%.2f km", meters / 1000)
}

private func formatPace(_ secPerKm: Double) -> String {
    guard secPerKm.isFinite, secPerKm > 0 else { return "—" }
    let m = Int(secPerKm) / 60
    let s = Int(secPerKm) % 60
    return "\(m):\(String(format: "%02d", s))"
}
