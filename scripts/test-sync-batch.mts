/**
 * Un upsert de PostgREST es todo o nada: una fila mala bloqueaba la tabla
 * entera en cada sync. upsertResilient tiene que subir las buenas igual.
 */
import { upsertResilient, type Upsert } from '@/lib/syncBatch'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

// Servidor falso: rechaza el lote entero si alguna fila no tiene exercise_id.
let calls = 0
const server: Upsert = async (rows) => {
  calls++
  const bad = rows.some((r) => r.exercise_id == null)
  return { error: bad ? { code: '23502', message: 'null value in column "exercise_id"' } : null }
}

const rows = [{ id: 'a', exercise_id: 'squat' }, { id: 'b', exercise_id: null }, { id: 'c', exercise_id: 'row' }]
const r1 = await upsertResilient(server, rows)
check(r1.okIndexes.join() === '0,2', 'una fila mala no debería bloquear a las buenas')
check(r1.failed.length === 1 && r1.failed[0]!.index === 1, 'la fila mala tiene que quedar como fallida')

calls = 0
const r2 = await upsertResilient(server, [rows[0]!, rows[2]!])
check(r2.okIndexes.length === 2 && calls === 1, 'un lote sano tiene que subir en un solo request')

// Error de red (sin code): no se reintenta fila por fila.
calls = 0
const offline: Upsert = async () => {
  calls++
  return { error: { message: 'TypeError: Failed to fetch' } }
}
const r3 = await upsertResilient(offline, rows)
check(r3.okIndexes.length === 0 && r3.failed.length === 3, 'offline: nada sube')
check(calls === 1, 'offline: no debería multiplicar requests que van a fallar igual')

if (fail.length) {
  console.error('❌ Sync por lotes:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Sync por lotes: una fila rechazada no bloquea al resto; offline no multiplica requests.')
