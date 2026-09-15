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

/// Pantalla de bloqueo / banner. Texto a la izquierda; el número, grande y
/// centrado verticalmente, a la derecha. Cuando el descanso terminó no hay
/// número: solo el próximo ejercicio.
private struct RestLockScreenView: View {
    let state: RestActivityAttributes.ContentState

    private var exercise: String? { trimmed(state.exerciseName) }

    var body: some View {
        ZStack {
            // Texto a la izquierda, ocupando el ancho.
            HStack {
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
                Spacer(minLength: 84)
            }

            // Número centrado de arriba a abajo, pegado a la derecha.
            //
            // Mismo bug que el compacto (ver comentario en compactTrailing más
            // arriba), pero acá con un síntoma distinto: con .fixedSize() en
            // este Text, la CARD ENTERA de la pantalla de bloqueo renderizaba
            // angosta — se ve en la captura del usuario, el fondo oscuro corta
            // bastante antes del borde derecho de la pantalla — porque el
            // ZStack (la vista raíz de esta Live Activity) calculaba su ancho
            // ideal a partir de sus hijos, y un .fixedSize() que colapsa a 0
            // hace que todo el contenedor se achique con él. frame(minWidth:)
            // reserva el espacio sin depender de ese cálculo.
            if !state.finished {
                HStack {
                    Spacer()
                    Text(timerInterval: restRange(state), countsDown: true)
                        .font(.system(size: 54, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gymAccent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .frame(minWidth: 120, alignment: .trailing)
                }
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
