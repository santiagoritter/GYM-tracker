import { supabase } from '@/lib/supabaseClient'
import { db, SYNC_ORDER } from '@/db/schema'
import { useSyncStore } from '@/stores/syncStore'
import type { SyncedTable } from '@/types'

/**
 * Motor de sync: push de filas `dirty` + pull incremental por cursor,
 * ambos best-effort (un fallo de red nunca debe romper la UI — offline-
 * first sin excepciones). Conflictos: last-write-wins, ya resuelto del
 * lado del servidor por el trigger `sync_stamp()` (0001_helpers.sql) —
 * acá no hace falta lógica de merge propia.
 *
 * Fuera de alcance de esta pasada: los BYTES de las fotos (Storage). Solo
 * viaja la metadata (`storage_path` incluido, pero nadie sube/baja el
 * archivo todavía) — mismo comportamiento ya documentado en ProgressPhoto
 * para "dispositivo nuevo, blob llega lazy después", solo que ese "lazy"
 * todavía no tiene con qué completarse. Una cola de Storage aparte es
 * trabajo genuinamente separado (bucket ya existe, ver 0004_indexes_rls_
 * storage.sql), no se mete de prepo acá.
 */

// Postgres usa snake_case; local (Dexie/TS) usa camelCase. Es una
// conversión regular en TODOS los campos de estas 12 tablas (verificado
// contra supabase/migrations/0002-0006), así que una función genérica
// alcanza — no hace falta un mapeo campo por campo.
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// El nombre de tabla SÍ tiene una irregularidad: local es "profile"
// (singular, PK = userId, relación 1:1) pero Postgres es "profiles"
// (plural, como el resto). El resto ya son plurales de los dos lados.
const REMOTE_TABLE: Record<SyncedTable, string> = {
  profile: 'profiles',
  routines: 'routines',
  routineDays: 'routine_days',
  routineExercises: 'routine_exercises',
  workouts: 'workouts',
  workoutSets: 'workout_sets',
  personalRecords: 'personal_records',
  bodyMeasurements: 'body_measurements',
  achievements: 'achievements',
  progressPhotos: 'progress_photos',
  exercisePhotos: 'exercise_photos',
  calorieEntries: 'calorie_entries',
}

// Postgres guarda estos campos como boolean; local los guarda 0|1 (IndexedDB
// no indexa booleans). Todo lo que no está listado acá viaja tal cual.
const BOOLEAN_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  routines: ['isActive', 'isArchived'],
  routineDays: ['isRest'],
  workoutSets: ['isWarmup', 'completed'],
  profile: ['onboardingComplete', 'reminderEnabled', 'calorieTrackingEnabled'],
}

// Bookkeeping puramente del cliente, sin columna en Postgres: la cola de
// push (`dirty`) y el blob/flag de subida de las fotos (ver nota de
// Storage arriba).
const LOCAL_ONLY_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  progressPhotos: ['blob', 'uploaded'],
  exercisePhotos: ['blob', 'uploaded'],
}

function toRemoteRow(table: SyncedTable, row: Record<string, unknown>): Record<string, unknown> {
  const booleanFields = new Set(BOOLEAN_FIELDS[table] ?? [])
  const skip = new Set([...(LOCAL_ONLY_FIELDS[table] ?? []), 'dirty'])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue
    out[camelToSnake(key)] = booleanFields.has(key) ? value === 1 : value
  }
  return out
}

function toLocalRow(table: SyncedTable, row: Record<string, unknown>): Record<string, unknown> {
  const booleanFields = new Set(BOOLEAN_FIELDS[table] ?? [])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'server_updated_at' || key === 'deleted_at') continue
    const camelKey = snakeToCamel(key)
    out[camelKey] = booleanFields.has(camelKey) ? (value ? 1 : 0) : value
  }
  return out
}

interface RowWithId {
  id: string
  dirty?: 0 | 1
}

/** Empuja todo lo `dirty` del usuario actual, tabla por tabla en el orden
 * de dependencia de SYNC_ORDER (el padre tiene que llegar antes que la
 * FK compuesta de la hija lo acepte). */
export async function pushDirtyRows(userId: string): Promise<void> {
  if (!supabase) return

  for (const table of SYNC_ORDER) {
    const t = db.table<RowWithId>(table)
    const dirtyRows =
      table === 'profile'
        ? await t.get(userId).then((r) => (r && r.dirty === 1 ? [r] : []))
        : await t
            .where('userId')
            .equals(userId)
            .and((r) => (r as unknown as { dirty?: 0 | 1 }).dirty === 1)
            .toArray()

    if (dirtyRows.length === 0) continue

    const remoteRows = dirtyRows.map((r) => toRemoteRow(table, r as unknown as Record<string, unknown>))
    const { error } = await supabase.from(REMOTE_TABLE[table]).upsert(remoteRows)
    if (error) continue // best-effort: se reintenta en el próximo sync

    for (const row of dirtyRows) {
      await t.update(row.id, { dirty: 0 } as never)
    }
  }

  // Tombstones: un borrado local no es una fila que empujar, es un
  // `deleted_at` que setear en la fila que ya existe del otro lado.
  const dirtyTombstones = await db.tombstones
    .where('userId')
    .equals(userId)
    .and((tomb) => tomb.dirty === 1)
    .toArray()

  for (const tomb of dirtyTombstones) {
    const { error } = await supabase
      .from(REMOTE_TABLE[tomb.tableName])
      .update({ deleted_at: tomb.deletedAt })
      .eq('id', tomb.id)
    if (!error) await db.tombstones.delete(tomb.id)
  }
}

/** Baja lo que cambió del lado del servidor desde el último cursor guardado
 * (`db.syncState`, una fila por tabla). Las filas con `deleted_at` seteado
 * se traducen en un borrado físico local — así se propaga un borrado hecho
 * en otro dispositivo. */
export async function pullRemoteChanges(userId: string): Promise<void> {
  if (!supabase) return

  for (const table of SYNC_ORDER) {
    const cursorKey = `pull_${table}`
    const cursorRow = await db.syncState.get(cursorKey)
    const cursor = cursorRow?.value ?? '1970-01-01T00:00:00Z'

    const filterColumn = table === 'profile' ? 'id' : 'user_id'
    const { data, error } = await supabase
      .from(REMOTE_TABLE[table])
      .select('*')
      .eq(filterColumn, userId)
      .gt('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true })

    if (error || !data || data.length === 0) continue

    const t = db.table<RowWithId>(table)
    for (const remoteRow of data as Record<string, unknown>[]) {
      const id = remoteRow.id as string
      if (remoteRow.deleted_at) {
        await t.delete(id)
        continue
      }

      const local = toLocalRow(table, remoteRow)
      local.dirty = 0
      const existing = await t.get(id)
      if (existing) {
        // update() en vez de put(): en progressPhotos/exercisePhotos NO
        // pisa blob/uploaded, que no vienen del servidor (ver nota de
        // Storage arriba) — perderíamos una foto ya descargada local.
        await t.update(id, local as never)
      } else {
        if (table === 'progressPhotos' || table === 'exercisePhotos') {
          local.uploaded = 0
        }
        await t.put(local as never)
      }
    }

    const lastServerUpdatedAt = data[data.length - 1]!.server_updated_at as string
    await db.syncState.put({ key: cursorKey, value: lastServerUpdatedAt })
  }
}

/** Punto de entrada único para los disparadores (login, reconexión,
 * foreground, intervalo — ver main.tsx). Nunca deja escapar una excepción:
 * un fallo de red acá no puede tumbar nada de la UI. */
export async function runSync(userId: string): Promise<void> {
  if (!supabase) return
  useSyncStore.getState().setSyncing()
  try {
    await pushDirtyRows(userId)
    await pullRemoteChanges(userId)
    useSyncStore.getState().setSynced()
  } catch {
    useSyncStore.getState().setError()
  }
}
