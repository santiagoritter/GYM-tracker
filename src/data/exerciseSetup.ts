import type { Equipment } from '@/types'

/**
 * Ilustración de "cómo se ve el puesto" para cada ejercicio.
 *
 * No hay un dibujo por ejercicio (serían 107 y la mayoría se repetirían):
 * hay ~30 montajes reutilizables. Lo que el usuario necesita reconocer al
 * llegar al gimnasio es la máquina o el banco, no el gesto exacto — para eso
 * están la descripción, la técnica y su propia foto de referencia.
 */
export type SetupKind =
  | 'flat-bench'
  | 'incline-bench'
  | 'decline-bench'
  | 'pec-deck'
  | 'cable-station'
  | 'chest-press-machine'
  | 'smith-machine'
  | 'squat-rack'
  | 'leg-press'
  | 'hack-squat'
  | 'leg-extension'
  | 'leg-curl'
  | 'lat-pulldown'
  | 'seated-row'
  | 'row-machine'
  | 't-bar'
  | 'pull-up-bar'
  | 'dip-bars'
  | 'preacher-bench'
  | 'hyperextension-bench'
  | 'shoulder-press-machine'
  | 'barbell-floor'
  | 'dumbbells'
  | 'kettlebell'
  | 'calf-machine'
  | 'hip-machine'
  | 'treadmill'
  | 'rower'
  | 'air-bike'
  | 'jump-rope'
  | 'floor'
  | 'ab-wheel'

const SETUP: Record<string, SetupKind> = {
  // Pecho
  'bench-press': 'flat-bench',
  'db-bench-press': 'flat-bench',
  'db-fly': 'flat-bench',
  'db-pullover': 'flat-bench',
  'incline-bench-press': 'incline-bench',
  'db-incline-press': 'incline-bench',
  'decline-bench-press': 'decline-bench',
  'smith-bench-press': 'smith-machine',
  'chest-fly-machine': 'pec-deck',
  'chest-press-machine': 'chest-press-machine',
  'cable-fly': 'cable-station',
  'push-up': 'floor',
  'incline-push-up': 'flat-bench',
  'diamond-push-up': 'floor',
  'dips-chest': 'dip-bars',

  // Espalda
  deadlift: 'barbell-floor',
  'sumo-deadlift': 'barbell-floor',
  'rack-pull': 'squat-rack',
  'barbell-row': 'barbell-floor',
  'pendlay-row': 'barbell-floor',
  'chest-supported-row': 'incline-bench',
  'machine-row': 'row-machine',
  't-bar-row': 't-bar',
  'lat-pulldown': 'lat-pulldown',
  'neutral-grip-pulldown': 'lat-pulldown',
  'straight-arm-pulldown': 'cable-station',
  'seated-cable-row': 'seated-row',
  'db-row': 'flat-bench',
  'pull-up': 'pull-up-bar',
  'chin-up': 'pull-up-bar',
  'inverted-row': 'squat-rack',
  hyperextension: 'hyperextension-bench',
  'barbell-shrug': 'barbell-floor',

  // Hombros
  'overhead-press': 'squat-rack',
  'push-press': 'squat-rack',
  'db-shoulder-press': 'dumbbells',
  'arnold-press': 'dumbbells',
  'machine-shoulder-press': 'shoulder-press-machine',
  'lateral-raise': 'dumbbells',
  'front-raise': 'dumbbells',
  'rear-delt-fly': 'dumbbells',
  'cable-lateral-raise': 'cable-station',
  'face-pull': 'cable-station',
  'reverse-pec-deck': 'pec-deck',
  'upright-row': 'barbell-floor',

  // Brazos
  'barbell-curl': 'barbell-floor',
  'ez-bar-curl': 'barbell-floor',
  'db-curl': 'dumbbells',
  'hammer-curl': 'dumbbells',
  'reverse-curl': 'barbell-floor',
  'incline-db-curl': 'incline-bench',
  'preacher-curl': 'preacher-bench',
  'spider-curl': 'incline-bench',
  'concentration-curl': 'flat-bench',
  'cable-curl': 'cable-station',
  'triceps-pushdown': 'cable-station',
  'rope-pushdown': 'cable-station',
  'overhead-triceps-ext': 'cable-station',
  'skull-crusher': 'flat-bench',
  'close-grip-bench': 'flat-bench',
  'dips-triceps': 'dip-bars',
  'db-kickback': 'dumbbells',
  'wrist-curl': 'flat-bench',
  'farmers-walk': 'dumbbells',

  // Piernas
  squat: 'squat-rack',
  'front-squat': 'squat-rack',
  'smith-squat': 'smith-machine',
  'hack-squat': 'hack-squat',
  'goblet-squat': 'kettlebell',
  'leg-press': 'leg-press',
  'single-leg-press': 'leg-press',
  'leg-extension': 'leg-extension',
  'sissy-squat': 'floor',
  lunge: 'dumbbells',
  'walking-lunge': 'dumbbells',
  'bulgarian-split-squat': 'flat-bench',
  'step-up': 'flat-bench',
  'romanian-deadlift': 'barbell-floor',
  'stiff-leg-deadlift': 'barbell-floor',
  'good-morning': 'squat-rack',
  'leg-curl': 'leg-curl',
  'nordic-curl': 'floor',
  'hip-thrust': 'flat-bench',
  'glute-bridge': 'floor',
  'glute-kickback': 'cable-station',
  'hip-abduction': 'hip-machine',
  'standing-calf-raise': 'calf-machine',
  'seated-calf-raise': 'calf-machine',
  'db-calf-raise': 'dumbbells',

  // Core
  plank: 'floor',
  'side-plank': 'floor',
  crunch: 'floor',
  'v-up': 'floor',
  'dead-bug': 'floor',
  'mountain-climber': 'floor',
  'russian-twist': 'floor',
  'hanging-leg-raise': 'pull-up-bar',
  'cable-crunch': 'cable-station',
  'pallof-press': 'cable-station',
  'ab-wheel': 'ab-wheel',

  // Cardio y kettlebell
  'kb-swing': 'kettlebell',
  'kb-goblet-clean': 'kettlebell',
  burpee: 'floor',
  'jump-rope': 'jump-rope',
  'rowing-machine': 'rower',
  'assault-bike': 'air-bike',
  'treadmill-run': 'treadmill',
}

/** Respaldo por tipo de equipo para cualquier ejercicio custom que se cree. */
const FALLBACK: Record<Equipment, SetupKind> = {
  barbell: 'barbell-floor',
  dumbbell: 'dumbbells',
  machine: 'chest-press-machine',
  cable: 'cable-station',
  bodyweight: 'floor',
  band: 'floor',
  kettlebell: 'kettlebell',
  other: 'floor',
}

export function getExerciseSetup(exerciseId: string, equipment: Equipment): SetupKind {
  return SETUP[exerciseId] ?? FALLBACK[equipment]
}

export const SETUP_LABEL: Record<SetupKind, string> = {
  'flat-bench': 'Banco plano',
  'incline-bench': 'Banco inclinado',
  'decline-bench': 'Banco declinado',
  'pec-deck': 'Máquina de aperturas (peck deck)',
  'cable-station': 'Estación de poleas',
  'chest-press-machine': 'Máquina de press',
  'smith-machine': 'Multipower (Smith)',
  'squat-rack': 'Rack de sentadillas',
  'leg-press': 'Prensa de piernas',
  'hack-squat': 'Máquina de sentadilla hack',
  'leg-extension': 'Máquina de extensión de cuádriceps',
  'leg-curl': 'Máquina de curl femoral',
  'lat-pulldown': 'Máquina de jalón al pecho',
  'seated-row': 'Remo sentado en polea',
  'row-machine': 'Máquina de remo',
  't-bar': 'Barra en T',
  'pull-up-bar': 'Barra de dominadas',
  'dip-bars': 'Paralelas de fondos',
  'preacher-bench': 'Banco Scott',
  'hyperextension-bench': 'Banco romano',
  'shoulder-press-machine': 'Máquina de press de hombros',
  'barbell-floor': 'Barra libre',
  dumbbells: 'Mancuernas',
  kettlebell: 'Kettlebell',
  'calf-machine': 'Máquina de gemelos',
  'hip-machine': 'Máquina de abducción de cadera',
  treadmill: 'Cinta de correr',
  rower: 'Remo ergómetro',
  'air-bike': 'Bicicleta de aire',
  'jump-rope': 'Soga',
  floor: 'Suelo / colchoneta',
  'ab-wheel': 'Rueda abdominal',
}
