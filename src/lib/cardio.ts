export type CardioMachineId = 'treadmill' | 'bike' | 'elliptical' | 'other'

export interface CardioMachine {
  id: CardioMachineId
  label: string
  /** Si el aparato tiene velocidad en km/h — habilita el paso de
   * velocidad, la distancia calculada y la inclinación (solo cinta). */
  hasSpeed: boolean
  hasIncline: boolean
}

export const CARDIO_MACHINES: CardioMachine[] = [
  { id: 'treadmill', label: 'Cinta', hasSpeed: true, hasIncline: true },
  { id: 'bike', label: 'Bicicleta', hasSpeed: true, hasIncline: false },
  { id: 'elliptical', label: 'Elíptica', hasSpeed: false, hasIncline: false },
  { id: 'other', label: 'Otra', hasSpeed: false, hasIncline: false },
]

export function cardioMachine(id: CardioMachineId): CardioMachine {
  return CARDIO_MACHINES.find((m) => m.id === id) ?? CARDIO_MACHINES[0]
}

/** Distancia recorrida hasta ahora, calculada desde el último "checkpoint"
 * (momento en que cambió la velocidad) — no acumulada tick a tick. Un
 * `setInterval` puede saltear ticks (pestaña en segundo plano, pantalla
 * bloqueada) y eso desviaría el total si se sumara de a poco; calculando
 * siempre desde `checkpointAt` con `Date.now()` real, el valor es exacto
 * sin importar cuántos re-renders se salteen (mismo criterio que
 * `useCountdown`, ver su comentario). */
export function currentDistanceKm(
  distanceAtCheckpointKm: number,
  speedKmh: number,
  checkpointAt: number
): number {
  const hoursSinceCheckpoint = (Date.now() - checkpointAt) / 3_600_000
  return distanceAtCheckpointKm + speedKmh * hoursSinceCheckpoint
}

function formatHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Resumen de la sesión para guardar en `Workout.notes` — sin migrar el
 * esquema: `notes` ya existe en Postgres y en Dexie, y es lo único que
 * hace falta para que la sesión quede legible en el historial (RecentWorkouts,
 * LogPastWorkout, etc. ya muestran `notes`). No se agregan columnas nuevas
 * para un solo texto de resumen. */
export function formatCardioNotes(
  machine: CardioMachine,
  distanceKm: number,
  durationSec: number
): string {
  if (!machine.hasSpeed) return `${machine.label} · ${formatHms(durationSec)}`
  const avgSpeed = durationSec > 0 ? distanceKm / (durationSec / 3600) : 0
  return `${machine.label} · ${distanceKm.toFixed(2)} km en ${formatHms(durationSec)} (${avgSpeed.toFixed(1)} km/h prom.)`
}
