/** Entreno fantasma: salir sin terminar y volver 5 h después no debe contar 5 h. */
import { inactiveLabel, isStaleWorkout, lastActivityAt, STALE_AFTER_MS } from '@/lib/staleWorkout'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const start = '2026-09-30T10:00:00.000Z'
const t = (h: number) => new Date(new Date(start).getTime() + h * 3600_000)
const w = { startedAt: start, updatedAt: start, finishedAt: undefined, kind: 'strength' as const }

check(!isStaleWorkout(w, [], t(1).getTime()), '1 h después de empezar no está vencido')
check(isStaleWorkout(w, [], t(5).getTime()), '5 h sin actividad tiene que estar vencido')

const sets = [{ updatedAt: t(0.5).toISOString() }, { updatedAt: t(2.5).toISOString() }]
check(lastActivityAt(w, sets) === t(2.5).toISOString(), 'la última actividad es la serie más reciente')
check(!isStaleWorkout(w, sets, t(5).getTime()), 'una serie a las 2.5 h: a las 5 h todavía no venció')
check(isStaleWorkout(w, sets, t(6).getTime()), 'una serie a las 2.5 h: a las 6 h ya venció')

check(!isStaleWorkout(w, [], t(5).getTime(), t(4.5).toISOString()), '"Seguir" cuenta como actividad')
check(!isStaleWorkout({ ...w, finishedAt: t(1).toISOString() }, [], t(9).getTime()), 'uno terminado nunca está vencido')
check(!isStaleWorkout({ ...w, kind: 'running' }, [], t(5).getTime()), 'correr no se vence (tiene su propio tracking)')
check(isStaleWorkout({ ...w, kind: undefined }, [], t(5).getTime()), 'un entreno viejo sin kind cuenta como fuerza')

check(inactiveLabel(t(0).toISOString(), t(5).getTime()) === 'hace 5 h', 'etiqueta en horas')
check(inactiveLabel(t(0).toISOString(), t(49).getTime()) === 'hace 2 días', 'etiqueta en días')
check(STALE_AFTER_MS === 3 * 3600_000, 'umbral de 3 h')

if (fail.length) {
  console.error('❌ Entreno vencido:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Entreno vencido: 3 h sin actividad real, "Seguir" cuenta, correr y terminados no se vencen.')
