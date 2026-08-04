import type { QRPayload } from '@/lib/qr'

/**
 * Rutinas clásicas listas para importar.
 *
 * Reutilizan el formato de payload del QR (`src/lib/qr.ts`), así que la
 * importación pasa por `importPayload`, que ya sabe crear rutina, días y
 * ejercicios, y saltear ids que no existan en el catálogo. Series y reps se
 * dejan sin fijar peso a propósito: lo calcula el recomendador al iniciar el
 * día, según perfil e historial.
 */

export interface RoutineTemplate {
  id: string
  name: string
  subtitle: string
  /** Días de entrenamiento por semana. */
  daysPerWeek: number
  level: 'Principiante' | 'Intermedio' | 'Avanzado'
  description: string
  payload: QRPayload
}

// Atajo: [idEjercicio, series, repMin, repMax, descansoSeg?]
type E = [string, number, number, number, number?]

const day = (name: string, exercises: E[]) => ({
  n: name,
  e: exercises.map(([id, s, min, max, rs]) => ({
    id,
    s,
    r: [min, max] as [number, number],
    ...(rs !== undefined && rs !== 90 ? { rs } : {}),
  })),
})

const rest = (name: string) => ({ n: name, r: true as const })

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    subtitle: 'Empuje · Tirón · Pierna',
    daysPerWeek: 6,
    level: 'Intermedio',
    description:
      'El split más popular para intermedios. Cada grupo se entrena dos veces por semana, que es la frecuencia con mejor evidencia para hipertrofia. Con 6 días es exigente; se puede hacer en 3 días alternando.',
    payload: {
      v: 1,
      n: 'Push / Pull / Legs',
      d: [
        day('Push A — Pecho, hombro, tríceps', [
          ['bench-press', 4, 6, 8, 150],
          ['db-incline-press', 3, 8, 12],
          ['overhead-press', 3, 6, 10, 120],
          ['lateral-raise', 4, 12, 15, 60],
          ['triceps-pushdown', 3, 10, 15, 60],
          ['overhead-triceps-ext', 3, 10, 15, 60],
        ]),
        day('Pull A — Espalda y bíceps', [
          ['pull-up', 4, 6, 10, 120],
          ['barbell-row', 4, 6, 10, 120],
          ['seated-cable-row', 3, 10, 12],
          ['face-pull', 3, 15, 20, 60],
          ['barbell-curl', 3, 8, 12, 60],
          ['hammer-curl', 3, 10, 15, 60],
        ]),
        day('Legs A — Cuádriceps dominante', [
          ['squat', 4, 5, 8, 180],
          ['romanian-deadlift', 3, 8, 12, 120],
          ['leg-press', 3, 10, 15],
          ['leg-curl', 3, 10, 15, 60],
          ['standing-calf-raise', 4, 12, 20, 60],
          ['plank', 3, 30, 60, 60],
        ]),
        day('Push B — Volumen', [
          ['db-bench-press', 4, 8, 12],
          ['incline-bench-press', 3, 8, 12],
          ['db-shoulder-press', 3, 8, 12],
          ['cable-lateral-raise', 4, 12, 20, 60],
          ['rope-pushdown', 3, 12, 15, 60],
          ['dips-triceps', 3, 8, 12, 90],
        ]),
        day('Pull B — Volumen', [
          ['lat-pulldown', 4, 8, 12],
          ['chest-supported-row', 4, 10, 12],
          ['straight-arm-pulldown', 3, 12, 15, 60],
          ['reverse-pec-deck', 3, 15, 20, 60],
          ['incline-db-curl', 3, 10, 12, 60],
          ['cable-curl', 3, 12, 15, 60],
        ]),
        day('Legs B — Cadena posterior', [
          ['deadlift', 3, 4, 6, 180],
          ['bulgarian-split-squat', 3, 8, 12],
          ['hip-thrust', 4, 8, 12],
          ['leg-extension', 3, 12, 15, 60],
          ['seated-calf-raise', 4, 15, 20, 60],
          ['hanging-leg-raise', 3, 8, 15, 60],
        ]),
        rest('Descanso'),
      ],
    },
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    subtitle: 'Tren superior · Tren inferior',
    daysPerWeek: 4,
    level: 'Intermedio',
    description:
      'Cuatro días con frecuencia 2 por grupo muscular. Es probablemente el mejor equilibrio entre resultados y tiempo: menos días que un PPL de 6 y la misma frecuencia semanal.',
    payload: {
      v: 1,
      n: 'Upper / Lower',
      d: [
        day('Upper A — Fuerza', [
          ['bench-press', 4, 5, 8, 150],
          ['barbell-row', 4, 6, 8, 150],
          ['overhead-press', 3, 6, 10, 120],
          ['lat-pulldown', 3, 8, 12],
          ['barbell-curl', 3, 8, 12, 60],
          ['close-grip-bench', 3, 8, 12, 90],
        ]),
        day('Lower A — Fuerza', [
          ['squat', 4, 5, 8, 180],
          ['romanian-deadlift', 3, 8, 10, 120],
          ['leg-press', 3, 10, 12],
          ['leg-curl', 3, 10, 15, 60],
          ['standing-calf-raise', 4, 12, 20, 60],
        ]),
        rest('Descanso'),
        day('Upper B — Hipertrofia', [
          ['db-incline-press', 4, 8, 12],
          ['seated-cable-row', 4, 10, 12],
          ['db-shoulder-press', 3, 10, 12],
          ['chest-supported-row', 3, 10, 15],
          ['lateral-raise', 4, 12, 20, 60],
          ['hammer-curl', 3, 10, 15, 60],
          ['rope-pushdown', 3, 12, 15, 60],
        ]),
        day('Lower B — Hipertrofia', [
          ['deadlift', 3, 4, 6, 180],
          ['bulgarian-split-squat', 3, 10, 12],
          ['hip-thrust', 4, 10, 12],
          ['leg-extension', 3, 12, 15, 60],
          ['seated-calf-raise', 4, 15, 20, 60],
          ['cable-crunch', 3, 12, 15, 60],
        ]),
        rest('Descanso'),
        rest('Descanso'),
      ],
    },
  },
  {
    id: 'arnold-split',
    name: 'Arnold Split',
    subtitle: 'Pecho+Espalda · Hombro+Brazo · Pierna',
    daysPerWeek: 6,
    level: 'Avanzado',
    description:
      'El split de Arnold Schwarzenegger: pecho y espalda juntos (agonista/antagonista), hombros con brazos, y pierna aparte. Mucho volumen por sesión — para gente con años de entrenamiento y buena recuperación.',
    payload: {
      v: 1,
      n: 'Arnold Split',
      d: [
        day('Pecho y espalda A', [
          ['bench-press', 4, 8, 10, 120],
          ['barbell-row', 4, 8, 10, 120],
          ['incline-bench-press', 3, 8, 12],
          ['pull-up', 3, 8, 12, 120],
          ['db-fly', 3, 12, 15, 60],
          ['db-pullover', 3, 12, 15, 60],
        ]),
        day('Hombros y brazos A', [
          ['overhead-press', 4, 8, 10, 120],
          ['lateral-raise', 4, 12, 15, 60],
          ['rear-delt-fly', 3, 15, 20, 60],
          ['barbell-curl', 4, 8, 12, 60],
          ['skull-crusher', 4, 8, 12, 60],
          ['concentration-curl', 3, 12, 15, 60],
        ]),
        day('Pierna A', [
          ['squat', 5, 8, 12, 150],
          ['leg-press', 4, 12, 15],
          ['leg-extension', 3, 15, 20, 60],
          ['leg-curl', 4, 12, 15, 60],
          ['standing-calf-raise', 5, 15, 20, 60],
        ]),
        day('Pecho y espalda B', [
          ['db-incline-press', 4, 10, 12],
          ['t-bar-row', 4, 10, 12, 120],
          ['dips-chest', 3, 10, 15, 90],
          ['lat-pulldown', 3, 10, 12],
          ['cable-fly', 3, 15, 20, 60],
          ['seated-cable-row', 3, 12, 15],
        ]),
        day('Hombros y brazos B', [
          ['arnold-press', 4, 10, 12],
          ['cable-lateral-raise', 4, 15, 20, 60],
          ['face-pull', 3, 15, 20, 60],
          ['preacher-curl', 4, 10, 12, 60],
          ['rope-pushdown', 4, 12, 15, 60],
          ['hammer-curl', 3, 12, 15, 60],
        ]),
        day('Pierna B', [
          ['romanian-deadlift', 4, 10, 12, 120],
          ['front-squat', 4, 8, 12, 150],
          ['bulgarian-split-squat', 3, 10, 12],
          ['hip-thrust', 4, 12, 15],
          ['seated-calf-raise', 5, 15, 25, 60],
        ]),
        rest('Descanso'),
      ],
    },
  },
  {
    id: 'full-body-3',
    name: 'Full Body 3 días',
    subtitle: 'Cuerpo completo, lunes/miércoles/viernes',
    daysPerWeek: 3,
    level: 'Principiante',
    description:
      'La mejor opción para empezar. Los básicos tres veces por semana: máxima práctica técnica y frecuencia alta, que es lo que más importa cuando recién arrancás. Menos volumen del que parece necesario, y alcanza.',
    payload: {
      v: 1,
      n: 'Full Body 3 días',
      d: [
        day('Día A', [
          ['squat', 3, 5, 8, 180],
          ['bench-press', 3, 5, 8, 150],
          ['barbell-row', 3, 6, 10, 120],
          ['plank', 3, 30, 45, 60],
        ]),
        rest('Descanso'),
        day('Día B', [
          ['deadlift', 3, 5, 5, 180],
          ['overhead-press', 3, 6, 10, 120],
          ['lat-pulldown', 3, 8, 12],
          ['hanging-leg-raise', 3, 8, 12, 60],
        ]),
        rest('Descanso'),
        day('Día C', [
          ['front-squat', 3, 6, 10, 150],
          ['db-incline-press', 3, 8, 12],
          ['seated-cable-row', 3, 8, 12],
          ['db-curl', 3, 10, 12, 60],
          ['triceps-pushdown', 3, 10, 15, 60],
        ]),
        rest('Descanso'),
        rest('Descanso'),
      ],
    },
  },
  {
    id: 'phul',
    name: 'PHUL',
    subtitle: 'Power Hypertrophy Upper Lower',
    daysPerWeek: 4,
    level: 'Intermedio',
    description:
      'Dos días de fuerza (rangos bajos, cargas altas) y dos de hipertrofia (rangos altos, más volumen), sobre un esquema upper/lower. Sirve si querés ganar fuerza y tamaño a la vez sin elegir uno.',
    payload: {
      v: 1,
      n: 'PHUL',
      d: [
        day('Upper Power', [
          ['bench-press', 4, 3, 5, 180],
          ['barbell-row', 4, 3, 5, 180],
          ['overhead-press', 3, 5, 8, 150],
          ['pull-up', 3, 5, 8, 150],
          ['close-grip-bench', 3, 6, 10, 90],
          ['ez-bar-curl', 3, 6, 10, 90],
        ]),
        day('Lower Power', [
          ['squat', 4, 3, 5, 180],
          ['deadlift', 3, 3, 5, 180],
          ['leg-press', 3, 8, 10],
          ['leg-curl', 3, 8, 10, 90],
          ['standing-calf-raise', 4, 8, 12, 60],
        ]),
        rest('Descanso'),
        day('Upper Hypertrophy', [
          ['incline-bench-press', 4, 10, 12],
          ['seated-cable-row', 4, 10, 12],
          ['db-fly', 3, 12, 15, 60],
          ['lat-pulldown', 3, 12, 15],
          ['lateral-raise', 4, 12, 20, 60],
          ['hammer-curl', 3, 12, 15, 60],
          ['rope-pushdown', 3, 12, 15, 60],
        ]),
        day('Lower Hypertrophy', [
          ['front-squat', 4, 10, 12, 120],
          ['romanian-deadlift', 3, 10, 12, 120],
          ['leg-extension', 3, 12, 15, 60],
          ['leg-curl', 3, 12, 15, 60],
          ['seated-calf-raise', 4, 15, 20, 60],
          ['cable-crunch', 3, 12, 15, 60],
        ]),
        rest('Descanso'),
        rest('Descanso'),
      ],
    },
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    subtitle: 'Un grupo muscular por día',
    daysPerWeek: 5,
    level: 'Intermedio',
    description:
      'Clásico de gimnasio: un grupo por día, mucho volumen por sesión y una semana entera de recuperación. La frecuencia 1 rinde menos que la 2 para hipertrofia, pero si te motiva sostenerla, la adherencia gana.',
    payload: {
      v: 1,
      n: 'Bro Split',
      d: [
        day('Lunes — Pecho', [
          ['bench-press', 4, 8, 10, 120],
          ['incline-bench-press', 4, 8, 12],
          ['db-fly', 3, 12, 15, 60],
          ['cable-fly', 3, 12, 15, 60],
          ['dips-chest', 3, 10, 15, 90],
        ]),
        day('Martes — Espalda', [
          ['deadlift', 3, 5, 8, 180],
          ['pull-up', 4, 8, 12, 120],
          ['barbell-row', 4, 8, 12, 120],
          ['seated-cable-row', 3, 12, 15],
          ['straight-arm-pulldown', 3, 12, 15, 60],
        ]),
        day('Miércoles — Hombros', [
          ['overhead-press', 4, 8, 10, 120],
          ['db-shoulder-press', 3, 10, 12],
          ['lateral-raise', 5, 12, 20, 60],
          ['rear-delt-fly', 4, 15, 20, 60],
          ['barbell-shrug', 4, 10, 15, 60],
        ]),
        day('Jueves — Brazos', [
          ['barbell-curl', 4, 8, 12, 60],
          ['skull-crusher', 4, 8, 12, 60],
          ['incline-db-curl', 3, 10, 12, 60],
          ['rope-pushdown', 3, 12, 15, 60],
          ['hammer-curl', 3, 12, 15, 60],
          ['overhead-triceps-ext', 3, 12, 15, 60],
        ]),
        day('Viernes — Pierna', [
          ['squat', 4, 8, 12, 150],
          ['leg-press', 4, 12, 15],
          ['romanian-deadlift', 3, 10, 12, 120],
          ['leg-extension', 3, 15, 20, 60],
          ['leg-curl', 3, 12, 15, 60],
          ['standing-calf-raise', 5, 15, 20, 60],
        ]),
        rest('Descanso'),
        rest('Descanso'),
      ],
    },
  },
]
