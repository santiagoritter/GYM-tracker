import { supabase } from '@/lib/supabaseClient'
import { db, SYNC_ORDER } from '@/db/schema'
import { useSyncStore } from '@/stores/syncStore'
import type { LocalProfile, SyncedTable } from '@/types'

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
  restLogs: 'rest_logs',
  notifications: 'notifications',
}

// Postgres guarda estos campos como boolean; local los guarda 0|1 (IndexedDB
// no indexa booleans). Todo lo que no está listado acá viaja tal cual.
const BOOLEAN_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  routines: ['isActive', 'isArchived'],
  routineDays: ['isRest'],
  workoutSets: ['isWarmup', 'completed'],
  profile: ['onboardingComplete', 'reminderEnabled', 'calorieTrackingEnabled'],
  restLogs: ['discarded'],
  notifications: ['read'],
}

// Bookkeeping puramente del cliente, sin columna en Postgres: la cola de
// push (`dirty`) y el blob/flag de subida de las fotos (ver nota de
// Storage arriba).
const LOCAL_ONLY_FIELDS: Partial<Record<SyncedTable, readonly string[]>> = {
  progressPhotos: ['blob', 'uploaded'],
  exercisePhotos: ['blob', 'uploaded'],
}

// Postgres NULL ↔ campo opcional local ausente: el modelo local representa
// "sin valor" con la clave en `undefined` (así se crean acá, ver
// `addExerciseToDay`/`toggleSupersetWithPrevious`), pero Postgres siempre
// devuelve la columna, con `null` explícito — y para el cliente Supabase-JS
// eso llega como `null`, no `undefined`. Sin esta conversión, un campo
// como `supersetGroup` volvía de un pull como `null`, y como TODO el
// código lo compara con `!== undefined` (nunca con `== null`), cualquier
// ejercicio que hubiera sincronizado una sola vez pasaba ese chequeo como
// si tuviera un grupo de superserie real — y como además `null === null`
// para dos filas distintas, terminaba emparejando CUALQUIER ejercicio con
// cualquier otro, bloqueando el descanso entre series (bug real, visto en
// producción: "todas las series son superseries y no descansan"). El
// upgrade de Dexie a v12 (schema.ts) limpia lo que ya había quedado mal
// localmente por este bug; esto evita que se repita.
function toRemoteRow(table: SyncedTable, row: Record<string, unknown>): Record<string, unknown> {
  const booleanFields = new Set(BOOLEAN_FIELDS[table] ?? [])
  const skip = new Set([...(LOCAL_ONLY_FIELDS[table] ?? []), 'dirty'])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue
    const remoteValue = value === undefined ? null : value
    out[camelToSnake(key)] = booleanFields.has(key) ? remoteValue === 1 : remoteValue
  }
  return out
}

/** Fila remota (snake_case, null) → modelo local (camelCase, undefined). Se usa
 * también para leer datos de un alumno en el modo coach (`coachClientData.ts`). */
export function toLocalRow(table: SyncedTable, row: Record<string, unknown>): Record<string, unknown> {
  const booleanFields = new Set(BOOLEAN_FIELDS[table] ?? [])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'server_updated_at' || key === 'deleted_at') continue
    const camelKey = snakeToCamel(key)
    const localValue = value === null ? undefined : value
    out[camelKey] = booleanFields.has(camelKey) ? (localValue ? 1 : 0) : localValue
  }
  return out
}

interface RowWithId {
  id: string
  dirty?: 0 | 1
  updatedAt?: string
}

/** Filas por página al bajar cambios: PostgREST corta en 1000 por defecto y
 * sin paginar un usuario con más historial quedaba con datos sin bajar. */
const PULL_PAGE_SIZE = 1000

/** Empuja todo lo `dirty` del usuario actual, tabla por tabla en el orden
 * de dependencia de SYNC_ORDER (el padre tiene que llegar antes que la
 * FK compuesta de la hija lo acepte). Devuelve `true` si algo falló (se
 * reintenta en el próximo sync) — `runSync` lo usa para no decir
 * "sincronizado" cuando no lo está. */
export async function pushDirtyRows(userId: string): Promise<boolean> {
  if (!supabase) return false
  let hadError = false

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
    if (error) {
      hadError = true // best-effort: se reintenta en el próximo sync
      continue
    }

    // Solo se marca limpia la fila que sigue igual a la que se mandó: si el
    // usuario la editó mientras viajaba el upsert, su `updatedAt` cambió y
    // tiene que volver a subirse — antes se marcaba limpia igual y el
    // cambio nuevo quedaba sin sincronizar.
    for (const row of dirtyRows) {
      await db.transaction('rw', t, async () => {
        const current = await t.get(row.id)
        if (current && current.updatedAt === row.updatedAt) {
          await t.update(row.id, { dirty: 0 } as never)
        }
      })
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
    if (error) hadError = true
    else await db.tombstones.delete(tomb.id)
  }

  return hadError
}

/** Baja lo que cambió del lado del servidor desde el último cursor guardado
 * (`db.syncState`, una fila por tabla). Las filas con `deleted_at` seteado
 * se traducen en un borrado físico local — así se propaga un borrado hecho
 * en otro dispositivo. */
export async function pullRemoteChanges(userId: string): Promise<boolean> {
  if (!supabase) return false
  let hadError = false

  for (const table of SYNC_ORDER) {
    const cursorKey = `pull_${table}`
    const cursorRow = await db.syncState.get(cursorKey)
    const cursor = cursorRow?.value ?? '1970-01-01T00:00:00Z'

    const filterColumn = table === 'profile' ? 'id' : 'user_id'
    const t = db.table<RowWithId>(table)
    let lastServerUpdatedAt: string | null = null

    // Paginado con el cursor fijo: las páginas se piden por `range` sobre un
    // orden estable (server_updated_at, id) — así un lote de filas con el
    // mismo timestamp (un upsert masivo comparte `now()`) no se parte ni se
    // pierde en el borde de la página.
    for (let from = 0; ; from += PULL_PAGE_SIZE) {
      const { data, error } = await supabase
        .from(REMOTE_TABLE[table])
        .select('*')
        .eq(filterColumn, userId)
        .gt('server_updated_at', cursor)
        .order('server_updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PULL_PAGE_SIZE - 1)

      if (error) {
        hadError = true
        lastServerUpdatedAt = null // no se avanza el cursor con una página incompleta
        break
      }
      if (!data || data.length === 0) break

      for (const remoteRow of data as Record<string, unknown>[]) {
        const id = remoteRow.id as string
        if (remoteRow.deleted_at) {
          await t.delete(id)
          continue
        }

        const existing = await t.get(id)
        // Una edición local todavía sin subir gana sobre lo que bajó: si se
        // pisara acá, el cambio del usuario se perdía en silencio (el push
        // corre antes, pero puede haber fallado o haberse editado después).
        if (existing?.dirty === 1) continue

        const local = toLocalRow(table, remoteRow)
        local.dirty = 0
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

      lastServerUpdatedAt = data[data.length - 1]!.server_updated_at as string
      if (data.length < PULL_PAGE_SIZE) break
    }

    if (lastServerUpdatedAt) {
      await db.syncState.put({ key: cursorKey, value: lastServerUpdatedAt })
    }
  }

  return hadError
}

/**
 * Trae el perfil remoto de este usuario en un solo fetch puntual, sin tocar
 * Dexie. Pensado para el momento del login: `finishAuth` (Login.tsx,
 * ForgotPassword.tsx) necesita saber SI YA EXISTE un perfil real en el
 * servidor antes de decidir si manda a onboarding — y no puede esperar al
 * `runSync()` completo de las 12 tablas, que corre en paralelo desde
 * `main.tsx` y en un dispositivo nuevo siempre llega tarde contra
 * `ensureProfile()` (puro IndexedDB, gana la carrera siempre). `null` si no
 * hay Supabase o no hay fila. Si falla la red, tira (ver abajo).
 */
export async function pullProfile(userId: string): Promise<LocalProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  // Un error de red NO es "no hay perfil": devolver null acá hacía que el
  // login creara un perfil en blanco (y lo mandara a onboarding) aunque el
  // usuario ya tuviera uno en el servidor.
  if (error) throw new Error('No pudimos traer tu perfil. Revisá tu conexión e intentá de nuevo.')
  if (!data) return null
  return toLocalRow('profile', data) as unknown as LocalProfile
}

let syncInFlight = false
let syncQueued = false

/** Punto de entrada único para los disparadores (login, reconexión,
 * foreground, intervalo — ver main.tsx). Nunca deja escapar una excepción:
 * un fallo de red acá no puede tumbar nada de la UI. Si ya hay un sync en
 * curso no arranca otro en paralelo (dos push simultáneos duplicaban
 * trabajo y pisaban el marcado de `dirty`); queda encolado uno más para
 * después, así un cambio hecho durante el sync no espera al próximo tick. */
export async function runSync(userId: string): Promise<void> {
  if (!supabase) return
  if (syncInFlight) {
    syncQueued = true
    return
  }
  syncInFlight = true
  try {
    do {
      syncQueued = false
      useSyncStore.getState().setSyncing()
      try {
        const pushFailed = await pushDirtyRows(userId)
        const pullFailed = await pullRemoteChanges(userId)
        if (pushFailed || pullFailed) useSyncStore.getState().setError()
        else useSyncStore.getState().setSynced()
      } catch {
        useSyncStore.getState().setError()
      }
    } while (syncQueued)
  } finally {
    syncInFlight = false
  }
}
