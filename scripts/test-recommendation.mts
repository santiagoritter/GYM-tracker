/**
 * Verifica el recomendador de cargas sobre los 107 ejercicios del catálogo.
 *
 * El requisito explícito era "no tomes pesos nulos": ningún ejercicio con
 * carga puede devolver 0 kg, ni siquiera para un usuario recién registrado
 * sin una sola serie hecha.
 */
import { EXERCISES_SEED } from '../src/data/exercises'
import {
  recommend,
  estimate1RMFromProfile,
  estimate1RMFromHistory,
  estimate1RMFromRelatedHistory,
} from '../src/lib/recommendation'
import { MIN_LOAD_KG, WEIGHT_INCREMENT, isBodyweight } from '../src/lib/loading'
import { ROUTINE_TEMPLATES } from '../src/data/routineTemplates'
import type { LocalProfile } from '../src/types'

const fail: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) fail.push(msg) }

const profile = (over: Partial<LocalProfile> = {}): LocalProfile => ({
  id: 'u1',
  units: 'kg',
  restTimerDefault: 90,
  bodyWeightKg: 75,
  heightCm: 178,
  sex: 'male',
  dob: '2000-01-01',
  level: 'intermediate',
  goal: 'mass',
  dirty: 1,
  updatedAt: new Date().toISOString(),
  ...over,
})

// ── 1. Ningún peso nulo, ni con perfil completo ni con perfil vacío ────────
const emptyProfile = { id: 'u1', units: 'kg', restTimerDefault: 90, dirty: 1, updatedAt: '' } as LocalProfile

for (const label of ['perfil completo', 'perfil vacío'] as const) {
  const p = label === 'perfil completo' ? profile() : emptyProfile
  for (const ex of EXERCISES_SEED) {
    const r = recommend(ex, p, [])
    // Sin carga externa (peso corporal, bandas, soga, rueda abdominal): 0 kg
    // es la respuesta correcta, no el bug de sugerir 0 en un press.
    if (isBodyweight(ex.equipment) || MIN_LOAD_KG[ex.equipment] === 0) {
      check(r.weightKg === 0, `${ex.id}: sin carga externa debería sugerir 0 kg`)
      check(r.source === 'bodyweight', `${ex.id}: debería marcarse como sin carga`)
      continue
    }
    check(
      r.weightKg >= MIN_LOAD_KG[ex.equipment] && r.weightKg > 0,
      `${label} — ${ex.id} (${ex.equipment}): sugirió ${r.weightKg} kg, mínimo ${MIN_LOAD_KG[ex.equipment]}`
    )
    // Múltiplo del incremento del equipo (o el mínimo cargable exacto)
    const step = WEIGHT_INCREMENT[ex.equipment]
    const isMultiple = Math.abs(r.weightKg / step - Math.round(r.weightKg / step)) < 1e-6
    check(isMultiple, `${label} — ${ex.id}: ${r.weightKg} kg no es múltiplo de ${step}`)
    check(r.sets >= 2 && r.sets <= 6, `${ex.id}: ${r.sets} series fuera de rango`)
    check(r.repsMin >= 1 && r.repsMax >= r.repsMin, `${ex.id}: rango de reps inválido`)
  }
}

// ── 2. El objetivo cambia la prescripción como corresponde ─────────────────
const bench = EXERCISES_SEED.find((e) => e.id === 'bench-press')!
const strength = recommend(bench, profile({ goal: 'strength' }), [])
const mass = recommend(bench, profile({ goal: 'mass' }), [])
const endurance = recommend(bench, profile({ goal: 'endurance' }), [])

check(strength.weightKg > mass.weightKg, 'fuerza debería sugerir más peso que hipertrofia')
check(mass.weightKg > endurance.weightKg, 'hipertrofia debería sugerir más peso que resistencia')
check(strength.repsMax < mass.repsMax, 'fuerza debería sugerir menos reps que hipertrofia')
check(endurance.repsMin > mass.repsMin, 'resistencia debería sugerir más reps que hipertrofia')
check(strength.restSeconds > endurance.restSeconds, 'fuerza necesita descansos más largos')

// ── 3. El nivel escala la carga ───────────────────────────────────────────
const beg = recommend(bench, profile({ level: 'beginner' }), []).weightKg
const int = recommend(bench, profile({ level: 'intermediate' }), []).weightKg
const adv = recommend(bench, profile({ level: 'advanced' }), []).weightKg
check(beg < int && int < adv, `la carga debería crecer con el nivel: ${beg} / ${int} / ${adv}`)

// ── 4. El sexo y la edad ajustan ──────────────────────────────────────────
const male = recommend(bench, profile({ sex: 'male' }), []).weightKg
const female = recommend(bench, profile({ sex: 'female' }), []).weightKg
check(female < male, `el estándar femenino debería ser menor: ${female} vs ${male}`)

const young = recommend(bench, profile({ dob: '2000-01-01' }), []).weightKg
const older = recommend(bench, profile({ dob: '1955-01-01' }), []).weightKg
check(older < young, `el ajuste por edad debería bajar la carga: ${older} vs ${young}`)

// ── 5. El historial le gana a la estimación ───────────────────────────────
const set = (weightKg: number, reps: number) => ({
  id: 'x', workoutId: 'w', userId: 'u1', exerciseId: 'bench-press',
  setNumber: 1, reps, weightKg, isWarmup: 0 as const, completed: 1 as const,
  dirty: 1 as const, updatedAt: '',
})
const withHistory = recommend(bench, profile(), [set(100, 5)])
check(withHistory.source === 'history', 'con historial la fuente debería ser "history"')
// 1RM Epley de 100x5 = 116.7 -> 75% = 87.5 kg redondeado a 2.5
check(
  withHistory.weightKg > 80 && withHistory.weightKg < 95,
  `con 100kg x5 debería sugerir ~87.5 kg, sugirió ${withHistory.weightKg}`
)
check(
  withHistory.weightKg !== recommend(bench, profile(), []).weightKg,
  'el historial debería cambiar la sugerencia respecto de la estimación'
)

// Las series de calentamiento y las no completadas no cuentan
const ignored = recommend(bench, profile(), [
  { ...set(200, 5), isWarmup: 1 },
  { ...set(300, 5), completed: 0 },
])
check(ignored.source === 'estimate', 'calentamiento y series sin completar no deberían contar')

// ── 5b. El historial reciente le gana a un outlier viejo ──────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const oldOutlier = { ...set(300, 5), updatedAt: daysAgo(400) }
const recentReal = { ...set(80, 8), updatedAt: daysAgo(10) }
const recencyRec = estimate1RMFromHistory([oldOutlier, recentReal])
const recentOnlyRec = estimate1RMFromHistory([recentReal])
check(
  Math.abs(recencyRec - recentOnlyRec) < 0.5,
  `un outlier viejo (300kg hace 400 días) no debería inflar el 1RM: con outlier ${recencyRec}, sin outlier ${recentOnlyRec}`
)
check(recencyRec < 300, `el outlier viejo no debería ganarle a lo reciente: dio ${recencyRec}`)

// ── 5c. El % de grasa corporal baja la estimación ─────────────────────────
const noBodyFat = estimate1RMFromProfile('bench-press', profile())
const withBodyFat = estimate1RMFromProfile('bench-press', profile({ bodyFatPct: 25 }))
check(
  withBodyFat < noBodyFat,
  `25% de grasa corporal debería bajar el 1RM estimado: sin dato ${noBodyFat}, con 25% ${withBodyFat}`
)

// ── 5d. Historial de un ejercicio emparentado informa uno sin marcas ──────
const inclineBench = EXERCISES_SEED.find((e) => e.id === 'incline-bench-press')!
const benchHistory = [{ ...set(100, 5), updatedAt: daysAgo(5) }]
const relatedOnly1RM = estimate1RMFromRelatedHistory(inclineBench, benchHistory)
check(
  relatedOnly1RM > 0,
  `estimate1RMFromRelatedHistory debería estimar un 1RM a partir de banca, dio ${relatedOnly1RM}`
)
const relatedRec = recommend(inclineBench, profile(), [], benchHistory)
check(
  relatedRec.source === 'related',
  `sin marcas propias pero con historial de banca, la fuente debería ser "related", fue "${relatedRec.source}"`
)
const noHistoryRec = recommend(inclineBench, profile(), [], [])
check(
  relatedRec.weightKg !== noHistoryRec.weightKg || relatedRec.source !== noHistoryRec.source,
  'el historial emparentado debería cambiar la sugerencia respecto de la estimación pura'
)

// ── 6. Peso corporal implausible se descarta vía IMC ──────────────────────
// 750 kg con 178 cm es un dedo de más al tipear: IMC 236.
const typo = estimate1RMFromProfile('bench-press', profile({ bodyWeightKg: 750 }))
const normal = estimate1RMFromProfile('bench-press', profile({ bodyWeightKg: 70 }))
check(
  Math.abs(typo - normal) < 1,
  `un peso corporal implausible debería caer al valor por defecto: ${typo} vs ${normal}`
)

// ── 7. Sanidad de los números para un caso concreto ───────────────────────
// Hombre, 75 kg, intermedio, hipertrofia. Estándar de banca intermedio = 1.25x
// -> 1RM 93.75 kg -> 75% = 70.3 -> redondeado a 70 kg.
const concrete = recommend(bench, profile(), [])
check(
  concrete.weightKg >= 60 && concrete.weightKg <= 80,
  `75kg/intermedio/masa debería sugerir ~70 kg en banca, sugirió ${concrete.weightKg}`
)
const squat = EXERCISES_SEED.find((e) => e.id === 'squat')!
const squatRec = recommend(squat, profile(), [])
check(
  squatRec.weightKg >= 85 && squatRec.weightKg <= 115,
  `75kg/intermedio/masa debería sugerir ~98 kg en sentadilla, sugirió ${squatRec.weightKg}`
)
const lateral = EXERCISES_SEED.find((e) => e.id === 'lateral-raise')!
const lateralRec = recommend(lateral, profile(), [])
check(
  lateralRec.weightKg >= 4 && lateralRec.weightKg <= 14,
  `elevaciones laterales deberían sugerir un peso por mano razonable, sugirió ${lateralRec.weightKg}`
)

// ── 8. Las plantillas solo usan ejercicios que existen ────────────────────
// importPayload saltea en silencio los ids desconocidos, así que un typo en
// una plantilla se traduce en un día con menos ejercicios y nadie se entera.
const catalogIds = new Set(EXERCISES_SEED.map((e) => e.id))
for (const t of ROUTINE_TEMPLATES) {
  const trainingDays = t.payload.d.filter((d) => !d.r)
  check(trainingDays.length > 0, `${t.name}: no tiene días de entrenamiento`)
  check(
    trainingDays.length === t.daysPerWeek,
    `${t.name}: dice ${t.daysPerWeek} días/semana pero tiene ${trainingDays.length}`
  )
  for (const d of t.payload.d) {
    for (const ex of d.e ?? []) {
      check(catalogIds.has(ex.id), `${t.name} / ${d.n}: "${ex.id}" no existe en el catálogo`)
      check(ex.s >= 1 && ex.s <= 6, `${t.name} / ${ex.id}: ${ex.s} series fuera de rango`)
      check(ex.r[0] <= ex.r[1], `${t.name} / ${ex.id}: rango de reps invertido`)
    }
  }
}
const totalTemplateExercises = ROUTINE_TEMPLATES.reduce(
  (n, t) => n + t.payload.d.reduce((m, d) => m + (d.e?.length ?? 0), 0),
  0
)

console.log(`Ejercicios evaluados: ${EXERCISES_SEED.length}`)
console.log(
  `Plantillas: ${ROUTINE_TEMPLATES.length}, con ${totalTemplateExercises} ejercicios en total`
)
console.log(`Banca (75kg, intermedio, masa): ${concrete.weightKg} kg x ${concrete.repsMin}-${concrete.repsMax} x ${concrete.sets}`)
console.log(`Sentadilla: ${squatRec.weightKg} kg · Laterales: ${lateralRec.weightKg} kg/mano`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} FALLOS:`)
  fail.slice(0, 20).forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Recomendador correcto: ningún peso nulo en 107 ejercicios.')
