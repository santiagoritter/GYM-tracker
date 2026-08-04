import type { Equipment, Exercise, FitnessGoal, LocalProfile, WorkoutSet } from '@/types'
import { STANDARDS, getAgeMultiplier, ageFromDob } from '@/lib/strengthStandards'
import { MIN_LOAD_KG, WEIGHT_INCREMENT, isBodyweight, roundToLoadable } from '@/lib/loading'
import { calc1RM } from '@/lib/utils'

/**
 * Recomendador de series, repeticiones y peso.
 *
 * Dos caminos, en orden de preferencia:
 *
 *  1. Si hay historial, manda el historial. Se estima el 1RM con Epley sobre
 *     las mejores series recientes: es un dato real de esta persona en este
 *     ejercicio, y le gana a cualquier tabla.
 *  2. Si no hay historial, se estima desde los estándares de fuerza relativa
 *     (peso corporal × ratio del nivel × ajuste por edad) escalados al
 *     ejercicio concreto con un coeficiente relativo a su lift de referencia.
 *
 * Después, el %1RM y el rango de repeticiones salen del objetivo declarado
 * en el onboarding, y el peso se redondea al incremento real del equipo con
 * piso en el mínimo cargable — nunca devuelve 0 para un ejercicio con carga.
 *
 * Sobre la altura: el usuario la pidió como entrada, pero conviene ser
 * honesto — la literatura de estándares de fuerza usa peso corporal, sexo,
 * edad y nivel, no estatura. Acá se usa solo para detectar un peso corporal
 * implausible (ver `plausibleBodyWeight`), que es donde sí aporta.
 */

// ── Prescripción por objetivo ─────────────────────────────────────────────
// Porcentajes de la tabla de cargas de la NSCA: 1RM=100%, 4 reps=90%,
// 6=85%, 8=80%, 10=75%, 12=67%.

export interface Prescription {
  sets: number
  repsMin: number
  repsMax: number
  percent1RM: number
  restSeconds: number
  rationale: string
}

const BY_GOAL: Record<FitnessGoal, Prescription> = {
  strength: {
    sets: 4,
    repsMin: 4,
    repsMax: 6,
    percent1RM: 0.85,
    restSeconds: 180,
    rationale: 'Fuerza: cargas altas, pocas reps y descansos largos para recuperar el sistema nervioso.',
  },
  mass: {
    sets: 4,
    repsMin: 8,
    repsMax: 12,
    percent1RM: 0.75,
    restSeconds: 90,
    rationale: 'Hipertrofia: volumen moderado-alto cerca del fallo, con descansos medios.',
  },
  endurance: {
    sets: 3,
    repsMin: 15,
    repsMax: 20,
    percent1RM: 0.6,
    restSeconds: 60,
    rationale: 'Resistencia: repeticiones altas con carga baja y descansos cortos.',
  },
  health: {
    sets: 3,
    repsMin: 10,
    repsMax: 12,
    percent1RM: 0.7,
    restSeconds: 90,
    rationale: 'Salud general: rango cómodo, lejos del fallo, sostenible en el tiempo.',
  },
  general: {
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    percent1RM: 0.72,
    restSeconds: 90,
    rationale: 'Objetivo mixto: el rango 8–12 da un buen equilibrio entre fuerza y tamaño.',
  },
}

// ── Coeficientes relativos por ejercicio ──────────────────────────────────
// Cuánto se levanta en cada ejercicio respecto de su lift de referencia.
// Son aproximaciones de gimnasio, no constantes de laboratorio: sirven para
// arrancar en un peso sensato el primer día y se descartan en cuanto hay
// historial real.

// Exportados: src/lib/muscleGroupStrength.ts los reutiliza para derivar un
// nivel de fuerza por grupo muscular sin inventar una tabla de estándares
// nueva — convierte el PR de cualquier ejercicio al 1RM equivalente de su
// lift de referencia y lo pasa por getStrengthLevel.
export type RefLift = 'squat' | 'bench-press' | 'deadlift' | 'overhead-press' | 'barbell-row'

export interface Coefficient {
  ref: RefLift
  /** 1RM del ejercicio ÷ 1RM del lift de referencia. */
  factor: number
  /** El peso mostrado es por mancuerna, no el total de las dos. */
  perHand?: boolean
}

export const COEF: Record<string, Coefficient> = {
  // Pecho
  'bench-press': { ref: 'bench-press', factor: 1.0 },
  'incline-bench-press': { ref: 'bench-press', factor: 0.85 },
  'decline-bench-press': { ref: 'bench-press', factor: 1.05 },
  'close-grip-bench': { ref: 'bench-press', factor: 0.9 },
  'smith-bench-press': { ref: 'bench-press', factor: 1.0 },
  'db-bench-press': { ref: 'bench-press', factor: 0.4, perHand: true },
  'db-incline-press': { ref: 'bench-press', factor: 0.34, perHand: true },
  'chest-press-machine': { ref: 'bench-press', factor: 0.95 },
  'chest-fly-machine': { ref: 'bench-press', factor: 0.5 },
  'cable-fly': { ref: 'bench-press', factor: 0.2, perHand: true },
  'db-fly': { ref: 'bench-press', factor: 0.18, perHand: true },
  'db-pullover': { ref: 'bench-press', factor: 0.35 },

  // Espalda
  deadlift: { ref: 'deadlift', factor: 1.0 },
  'sumo-deadlift': { ref: 'deadlift', factor: 1.0 },
  'rack-pull': { ref: 'deadlift', factor: 1.2 },
  'romanian-deadlift': { ref: 'deadlift', factor: 0.7 },
  'stiff-leg-deadlift': { ref: 'deadlift', factor: 0.65 },
  'good-morning': { ref: 'deadlift', factor: 0.35 },
  'barbell-row': { ref: 'barbell-row', factor: 1.0 },
  'pendlay-row': { ref: 'barbell-row', factor: 0.9 },
  't-bar-row': { ref: 'barbell-row', factor: 1.05 },
  'machine-row': { ref: 'barbell-row', factor: 1.1 },
  'chest-supported-row': { ref: 'barbell-row', factor: 0.85 },
  'seated-cable-row': { ref: 'barbell-row', factor: 1.0 },
  'lat-pulldown': { ref: 'barbell-row', factor: 1.0 },
  'neutral-grip-pulldown': { ref: 'barbell-row', factor: 1.0 },
  'straight-arm-pulldown': { ref: 'barbell-row', factor: 0.4 },
  'db-row': { ref: 'barbell-row', factor: 0.45, perHand: true },
  'barbell-shrug': { ref: 'deadlift', factor: 0.6 },
  hyperextension: { ref: 'deadlift', factor: 0.15 },

  // Hombros
  'overhead-press': { ref: 'overhead-press', factor: 1.0 },
  'push-press': { ref: 'overhead-press', factor: 1.25 },
  'machine-shoulder-press': { ref: 'overhead-press', factor: 1.05 },
  'db-shoulder-press': { ref: 'overhead-press', factor: 0.4, perHand: true },
  'arnold-press': { ref: 'overhead-press', factor: 0.33, perHand: true },
  'lateral-raise': { ref: 'overhead-press', factor: 0.14, perHand: true },
  'cable-lateral-raise': { ref: 'overhead-press', factor: 0.13, perHand: true },
  'front-raise': { ref: 'overhead-press', factor: 0.16, perHand: true },
  'rear-delt-fly': { ref: 'overhead-press', factor: 0.13, perHand: true },
  'reverse-pec-deck': { ref: 'overhead-press', factor: 0.45 },
  'face-pull': { ref: 'overhead-press', factor: 0.5 },
  'upright-row': { ref: 'overhead-press', factor: 0.6 },

  // Brazos
  'barbell-curl': { ref: 'bench-press', factor: 0.38 },
  'ez-bar-curl': { ref: 'bench-press', factor: 0.4 },
  'reverse-curl': { ref: 'bench-press', factor: 0.28 },
  'preacher-curl': { ref: 'bench-press', factor: 0.3 },
  'cable-curl': { ref: 'bench-press', factor: 0.35 },
  'db-curl': { ref: 'bench-press', factor: 0.17, perHand: true },
  'hammer-curl': { ref: 'bench-press', factor: 0.19, perHand: true },
  'incline-db-curl': { ref: 'bench-press', factor: 0.14, perHand: true },
  'spider-curl': { ref: 'bench-press', factor: 0.14, perHand: true },
  'concentration-curl': { ref: 'bench-press', factor: 0.13, perHand: true },
  'triceps-pushdown': { ref: 'bench-press', factor: 0.45 },
  'rope-pushdown': { ref: 'bench-press', factor: 0.4 },
  'overhead-triceps-ext': { ref: 'bench-press', factor: 0.35 },
  'skull-crusher': { ref: 'bench-press', factor: 0.35 },
  'db-kickback': { ref: 'bench-press', factor: 0.1, perHand: true },
  'wrist-curl': { ref: 'bench-press', factor: 0.2 },
  'farmers-walk': { ref: 'deadlift', factor: 0.35, perHand: true },

  // Piernas
  squat: { ref: 'squat', factor: 1.0 },
  'front-squat': { ref: 'squat', factor: 0.8 },
  'smith-squat': { ref: 'squat', factor: 1.0 },
  'hack-squat': { ref: 'squat', factor: 1.1 },
  'leg-press': { ref: 'squat', factor: 1.8 },
  'single-leg-press': { ref: 'squat', factor: 0.9 },
  'leg-extension': { ref: 'squat', factor: 0.5 },
  'goblet-squat': { ref: 'squat', factor: 0.3 },
  'bulgarian-split-squat': { ref: 'squat', factor: 0.22, perHand: true },
  lunge: { ref: 'squat', factor: 0.2, perHand: true },
  'walking-lunge': { ref: 'squat', factor: 0.18, perHand: true },
  'step-up': { ref: 'squat', factor: 0.2, perHand: true },
  'leg-curl': { ref: 'squat', factor: 0.35 },
  'hip-thrust': { ref: 'squat', factor: 1.2 },
  'glute-bridge': { ref: 'squat', factor: 0.9 },
  'glute-kickback': { ref: 'squat', factor: 0.2 },
  'hip-abduction': { ref: 'squat', factor: 0.5 },
  'standing-calf-raise': { ref: 'squat', factor: 0.8 },
  'seated-calf-raise': { ref: 'squat', factor: 0.5 },
  'db-calf-raise': { ref: 'squat', factor: 0.25, perHand: true },

  // Core con carga
  'cable-crunch': { ref: 'squat', factor: 0.3 },
  'pallof-press': { ref: 'squat', factor: 0.12 },
  'russian-twist': { ref: 'squat', factor: 0.1 },

  // Kettlebell
  'kb-swing': { ref: 'deadlift', factor: 0.2 },
  'kb-goblet-clean': { ref: 'deadlift', factor: 0.15 },
}

/** Nivel del onboarding → escalón de la tabla de estándares. */
const LEVEL_KEY = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
} as const

export interface Recommendation {
  sets: number
  repsMin: number
  repsMax: number
  weightKg: number
  restSeconds: number
  /** 'history' = calculado sobre tus propias series; 'estimate' = tabla. */
  source: 'history' | 'estimate' | 'bodyweight'
  /** Explicación en una línea, para mostrar en la UI. */
  note: string
}

/**
 * Peso corporal por defecto si el perfil está incompleto. Es un último
 * recurso para no devolver 0: en cuanto el usuario complete el onboarding o
 * haga una serie, el número se corrige solo.
 */
const FALLBACK_BODY_WEIGHT_KG = 70

/**
 * Único uso legítimo de la altura: descartar un peso corporal cargado mal
 * (un dedo de más al tipear). Fuera de un IMC de 13 a 50 el dato no se usa.
 */
function plausibleBodyWeight(profile?: LocalProfile): number {
  const kg = profile?.bodyWeightKg
  if (!kg || kg <= 0) return FALLBACK_BODY_WEIGHT_KG
  const cm = profile?.heightCm
  if (cm && cm > 100) {
    const bmi = kg / (cm / 100) ** 2
    if (bmi < 13 || bmi > 50) return FALLBACK_BODY_WEIGHT_KG
  }
  return kg
}

/** 1RM estimado a partir de las mejores series recientes del usuario. */
export function estimate1RMFromHistory(sets: WorkoutSet[]): number {
  let best = 0
  for (const s of sets) {
    if (s.completed !== 1 || s.isWarmup === 1) continue
    if (s.weightKg <= 0 || s.reps <= 0) continue
    // Epley se vuelve muy optimista por encima de ~12 reps; se capa el
    // exponente en vez de descartar la serie.
    const reps = Math.min(s.reps, 12)
    best = Math.max(best, calc1RM(s.weightKg, reps))
  }
  return best
}

/** 1RM estimado desde los estándares de fuerza, sin historial. */
export function estimate1RMFromProfile(exerciseId: string, profile?: LocalProfile): number {
  const coef = COEF[exerciseId]
  if (!coef) return 0

  const standard = STANDARDS[coef.ref]
  if (!standard) return 0

  const bodyWeight = plausibleBodyWeight(profile)
  const sex = profile?.sex === 'female' ? 'female' : 'male'
  const level = LEVEL_KEY[profile?.level ?? 'beginner']
  const ratio = standard[sex][level]
  const ageMultiplier = profile?.dob ? getAgeMultiplier(ageFromDob(profile.dob)) : 1

  const ref1RM = bodyWeight * ratio * ageMultiplier
  return ref1RM * coef.factor
}

/**
 * Recomendación completa para un ejercicio. `history` son las series
 * completadas de ESE ejercicio por ESE usuario (las más recientes primero no
 * hace falta: se toma la mejor).
 */
export function recommend(
  exercise: Exercise,
  profile: LocalProfile | undefined,
  history: WorkoutSet[] = []
): Recommendation {
  const goal = profile?.goal ?? 'general'
  const rx = BY_GOAL[goal]

  const noLoad = (note: string): Recommendation => ({
    sets: rx.sets,
    repsMin: rx.repsMin,
    repsMax: rx.repsMax,
    weightKg: 0,
    restSeconds: rx.restSeconds,
    source: 'bodyweight',
    note,
  })

  // Peso corporal y bandas: no hay carga que sugerir, solo repeticiones.
  if (isBodyweight(exercise.equipment)) {
    return noLoad('Peso corporal: enfocate en el rango de repeticiones y en la técnica.')
  }

  const historic1RM = estimate1RMFromHistory(history)
  const oneRm = historic1RM > 0 ? historic1RM : estimate1RMFromProfile(exercise.id, profile)

  if (oneRm <= 0) {
    // Sin coeficiente y con un equipo que no tiene mínimo cargable: es un
    // ejercicio sin carga externa (rueda abdominal, soga, cardio). Devolver
    // "0 kg" acá es correcto, no es el bug de sugerir 0 en un press.
    if (MIN_LOAD_KG[exercise.equipment] === 0) {
      return noLoad('Sin carga externa: medí el progreso por repeticiones o tiempo.')
    }
    // Ejercicio custom con equipo cargable: el mínimo real del equipo, que
    // sigue sin ser 0.
    return {
      sets: rx.sets,
      repsMin: rx.repsMin,
      repsMax: rx.repsMax,
      weightKg: MIN_LOAD_KG[exercise.equipment],
      restSeconds: rx.restSeconds,
      source: 'estimate',
      note: 'Sin datos todavía: arrancá liviano y ajustá según cómo se sienta.',
    }
  }

  const raw = oneRm * rx.percent1RM
  const weightKg = roundToLoadable(raw, exercise.equipment)

  return {
    sets: rx.sets,
    repsMin: rx.repsMin,
    repsMax: rx.repsMax,
    weightKg,
    restSeconds: rx.restSeconds,
    source: historic1RM > 0 ? 'history' : 'estimate',
    note:
      historic1RM > 0
        ? `Según tus marcas: 1RM estimado ${Math.round(oneRm)} kg, al ${Math.round(rx.percent1RM * 100)}%.`
        : `Estimado por tu perfil (${Math.round(oneRm)} kg de 1RM). Ajustalo en la primera serie.`,
  }
}

/**
 * Progresión entre sesiones: si la última vez completaste todas las series
 * llegando al tope de repeticiones, subí un escalón del equipo. Reemplaza al
 * "+2.5 kg" fijo, que era el mismo salto para elevaciones laterales que para
 * peso muerto.
 */
export function progressWeight(
  lastTopWeightKg: number,
  metTarget: boolean,
  equipment: Equipment
): number {
  if (!metTarget || lastTopWeightKg <= 0) return lastTopWeightKg
  return roundToLoadable(lastTopWeightKg + WEIGHT_INCREMENT[equipment], equipment)
}
