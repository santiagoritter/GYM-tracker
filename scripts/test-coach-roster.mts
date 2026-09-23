import {
  daysSinceWorkout,
  filterRoster,
  isInactive,
  lastWorkoutLabel,
  sortRoster,
  type RosterClient,
} from '@/lib/coachRoster'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const NOW = new Date('2026-09-23T12:00:00Z').getTime()
const c = (over: Partial<RosterClient>): RosterClient => ({
  clientId: over.clientId ?? 'x',
  displayName: over.displayName ?? 'Alumno',
  email: over.email ?? 'a@a.com',
  bondedAt: '2026-01-01T00:00:00Z',
  weeklyGoal: over.weeklyGoal ?? 4,
  lastWorkoutAt: over.lastWorkoutAt ?? null,
  workouts7d: over.workouts7d ?? 0,
  prs7d: over.prs7d ?? 0,
  unread: over.unread ?? 0,
})

// daysSinceWorkout / isInactive / label
check(daysSinceWorkout(null, NOW) === null, 'sin entreno, días debería ser null')
check(daysSinceWorkout('2026-09-23T10:00:00Z', NOW) === 0, 'hoy debería dar 0 días')
check(daysSinceWorkout('2026-09-16T12:00:00Z', NOW) === 7, 'hace 7 días exactos')
check(isInactive(c({ lastWorkoutAt: null })), 'sin entreno debería marcar inactivo')
check(isInactive(c({ lastWorkoutAt: '2026-09-16T00:00:00Z' }), NOW), '7 días sin entrenar debería marcar inactivo')
check(!isInactive(c({ lastWorkoutAt: '2026-09-20T00:00:00Z' }), NOW), '3 días sin entrenar NO debería marcar inactivo')
check(lastWorkoutLabel(null) === 'Nunca entrenó', 'label sin entreno')
check(lastWorkoutLabel('2026-09-23T08:00:00Z', NOW) === 'Hoy', 'label hoy')
check(lastWorkoutLabel('2026-09-22T08:00:00Z', NOW) === 'Ayer', 'label ayer')
check(lastWorkoutLabel('2026-09-20T08:00:00Z', NOW) === 'Hace 3 días', 'label hace N días')

// sortRoster
const rows = [
  c({ clientId: 'a', displayName: 'Zoe', lastWorkoutAt: '2026-09-20T00:00:00Z', unread: 0 }),
  c({ clientId: 'b', displayName: 'Ana', lastWorkoutAt: '2026-09-23T00:00:00Z', unread: 3 }),
  c({ clientId: 'c', displayName: 'Bruno', lastWorkoutAt: null, unread: 1 }),
]
const byName = sortRoster(rows, 'name')
check(byName.map((r) => r.clientId).join() === 'b,c,a', 'orden por nombre (Ana, Bruno, Zoe)')

const byLast = sortRoster(rows, 'lastWorkout', -1)
check(byLast[0]!.clientId === 'b', 'el más reciente primero con dir -1')
check(byLast[2]!.clientId === 'c', 'sin entreno queda al final con dir -1')

const byUnread = sortRoster(rows, 'unread', -1)
check(byUnread[0]!.clientId === 'b', 'más no leídos primero')

// filterRoster
check(filterRoster(rows, 'unread').length === 2, 'filtro "con mensajes" trae 2')
check(filterRoster(rows, 'inactive', NOW).every((r) => isInactive(r, NOW)), 'filtro inactivos consistente con isInactive')
check(filterRoster(rows, 'all').length === 3, 'sin filtro, todos')

if (fail.length) {
  console.error('❌ Tablero de alumnos del coach:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Tablero de alumnos del coach: días/etiqueta, orden y filtros correctos.')
