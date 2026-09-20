/** Las sesiones de correr y de cardio sobreviven a salir de la pantalla y a
 * matar la app: se persisten en localStorage (Bloque 0d). Sin DOM: se usa un
 * localStorage falso instalado antes de importar los stores. */
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size
  },
} as Storage

const { useRunStore } = await import('@/stores/runStore')
const { useCardioStore } = await import('@/stores/cardioStore')

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

// ── Correr ───────────────────────────────────────────────────────────────
useRunStore.getState().start('w-run', null)
useRunStore.getState().addPoint({ lat: -34.6, lng: -58.4, t: 1000 })
useRunStore.getState().addPoint({ lat: -34.6, lng: -58.4, t: 1000 }) // duplicado
useRunStore.getState().addPoint({ lat: -34.601, lng: -58.4, t: 2000 })
const runRaw = mem.get('gymtracker-run')
check(!!runRaw, 'runStore no persistió la sesión')
const runSaved = JSON.parse(runRaw ?? '{}') as { state?: { session?: { workoutId: string; points: unknown[] } } }
check(runSaved.state?.session?.workoutId === 'w-run', 'runStore: workoutId no persistido')
check(runSaved.state?.session?.points.length === 2, `runStore: puntos persistidos ${runSaved.state?.session?.points.length} (esperado 2, sin duplicado)`)

// ── Cardio ───────────────────────────────────────────────────────────────
useCardioStore.getState().startSession('w-cardio', 'treadmill', 8, 2, 30)
useCardioStore.getState().setSpeed(10)
const cRaw = mem.get('gymtracker-cardio')
check(!!cRaw, 'cardioStore no persistió la sesión (antes se perdía al matar la app)')
const cSaved = JSON.parse(cRaw ?? '{}') as { state?: { session?: { speedKmh: number; inclinePct: number; workoutId: string } } }
check(cSaved.state?.session?.speedKmh === 10, 'cardioStore: velocidad no persistida')
check(cSaved.state?.session?.inclinePct === 2, 'cardioStore: inclinación no persistida')

const { distanceKm } = useCardioStore.getState().endSession()
check(distanceKm >= 0, 'endSession devolvió distancia inválida')
check(!JSON.parse(mem.get('gymtracker-cardio') ?? '{}').state?.session, 'cardioStore: la sesión terminada sigue persistida')

if (fail.length) {
  console.error('❌ Persistencia de sesiones:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Sesiones de correr y cardio: se persisten, sin duplicados, y se limpian al terminar.')
