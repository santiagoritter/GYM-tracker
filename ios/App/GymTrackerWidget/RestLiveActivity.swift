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
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
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
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.top, 2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if !finished {
                        Text(timerInterval: range, countsDown: true)
                            .font(.system(size: 44, weight: .heavy, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(gymAccent)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .frame(alignment: .trailing)
                            .padding(.top, 2)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if let exercise {
                        Text(exercise)
                            .font(finished ? .title2.weight(.bold) : .title3.weight(.semibold))
                            .foregroundStyle(finished ? gymAccent : .primary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.7)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 4)
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
                    // frame(width:) en vez de .fixedSize(): con .fixedSize() acá
                    // este texto renderizaba VACÍO en el dispositivo real (mismo
                    // bug ya visto y corregido en el compacto del entreno —
                    // ahí quedó claro que .fixedSize() es lo que fallaba, no la
                    // API de timer). Ancho fijo + alineado a la derecha logra lo
                    // mismo que se buscaba (sin hueco muerto a la derecha) sin
                    // ese riesgo.
                    Text(timerInterval: range, countsDown: true)
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(width: 42, alignment: .trailing)
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
                        .frame(maxWidth: 34)
                }
            }
            .keylineTint(gymAccent)
        }
    }
}

/// Pantalla de bloqueo / banner. Una sola fila: texto a la izquierda, número
/// a la derecha, uno al lado del otro — NO superpuestos.
///
/// Antes esto era un `ZStack` con dos `HStack` independientes (uno para el
/// texto, otro para el número) pensado para centrar el número contra el
/// alto de TODA la card, sin importar cuántas líneas tuviera el texto. Se
/// sacó: un `ZStack` superpone sus hijos por diseño, y sin `.fixedSize()`
/// conteniendo el tamaño del número (ver el bug de más abajo), las dos
/// mitades terminaban dibujándose una encima de la otra — visto en el
/// dispositivo real: el número gigante tapando el nombre del ejercicio.
/// Un solo `HStack` (texto, `Spacer`, número) es el layout de toda la vida:
/// no hay forma de que se superpongan porque nunca comparten el mismo lugar.
private struct RestLockScreenView: View {
    let state: RestActivityAttributes.ContentState

    private var exercise: String? { trimmed(state.exerciseName) }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(state.finished ? "Ahora" : "Descanso")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                if let exercise {
                    Text(exercise)
                        .font(state.finished ? .title3.weight(.bold) : .title3.weight(.semibold))
                        .foregroundStyle(state.finished ? gymAccent : .primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 12)
            // frame(minWidth:) en vez de .fixedSize(): con .fixedSize() este
            // Text renderizaba VACÍO en el compacto de la Dynamic Island (bug
            // ya visto y corregido ahí) — se evita el mismo riesgo acá.
            if !state.finished {
                Text(timerInterval: restRange(state), countsDown: true)
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(gymAccent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .frame(minWidth: 84, alignment: .trailing)
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
