import { db, SYNC_ORDER } from '@/db/schema'
import type { SyncedTable } from '@/types'
import { nowIso } from '@/lib/utils'

/**
 * Backup manual para cambiar de dispositivo. No hay sync a Supabase todavía
 * (Redisenio.md §2.5, bloqueado) — esto es el único camino real para no
 * perder el historial al reinstalar en otro teléfono.
 *
 * Se exportan las mismas 12 tablas de SYNC_ORDER (todo lo que es del
 * usuario) menos nada — se recorre esa lista en vez de listarlas a mano
 * para que un futuro cambio de esquema no desincronice este archivo.
 * Quedan afuera `exercises` (catálogo compartido, se re-seedea solo en
 * cualquier instalación) y `tombstones`/`syncState` (bookkeeping de sync
 * sin valor en un dispositivo nuevo).
 */

interface BackupFile {
  v: 1
  exportedAt: string
  tables: Partial<Record<SyncedTable, Record<string, unknown>[]>>
}

const BLOB_FIELD = 'blob'

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** `progressPhotos`/`exercisePhotos` llevan un Blob — JSON no lo serializa
 * solo, así que se codifica a base64 acá y se decodifica en el import. */
async function serializeRow(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const blob = row[BLOB_FIELD]
  if (!(blob instanceof Blob)) return row
  const buf = await blob.arrayBuffer()
  const { [BLOB_FIELD]: _omit, ...rest } = row
  return { ...rest, blobBase64: arrayBufferToBase64(buf), blobType: blob.type }
}

function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const { blobBase64, blobType, ...rest } = row
  if (typeof blobBase64 !== 'string') return rest
  return { ...rest, [BLOB_FIELD]: base64ToBlob(blobBase64, typeof blobType === 'string' ? blobType : '') }
}

export async function exportBackup(userId: string): Promise<Blob> {
  const tables: BackupFile['tables'] = {}
  for (const name of SYNC_ORDER) {
    const rows =
      name === 'profile'
        ? await db.profile.get(userId).then((r) => (r ? [r as unknown as Record<string, unknown>] : []))
        : ((await db.table(name).where('userId').equals(userId).toArray()) as Record<string, unknown>[])
    tables[name] = await Promise.all(rows.map(serializeRow))
  }
  const payload: BackupFile = { v: 1, exportedAt: nowIso(), tables }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

/** `personalRecords` y `exercisePhotos` tienen un id compuesto que embebe
 * el userId (`${userId}_${exerciseId}`) — hay que reconstruirlo con el
 * userId de la sesión actual, no el que trae el archivo. */
function remapOwner(table: SyncedTable, row: Record<string, unknown>, newUserId: string): Record<string, unknown> {
  const out = deserializeRow(row)
  if (table === 'profile') return { ...out, id: newUserId }
  const withUser = { ...out, userId: newUserId }
  if (table === 'personalRecords' || table === 'exercisePhotos') {
    return { ...withUser, id: `${newUserId}_${out.exerciseId as string}` }
  }
  return withUser
}

export async function importBackup(userId: string, json: string): Promise<void> {
  let payload: BackupFile
  try {
    payload = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (payload.v !== 1 || !payload.tables || typeof payload.tables !== 'object') {
    throw new Error('No es un archivo de backup de GymTracker.')
  }

  await db.transaction('rw', SYNC_ORDER.map((name) => db.table(name)), async () => {
    for (const name of SYNC_ORDER) {
      const rows = payload.tables[name]
      if (!rows || rows.length === 0) continue
      const remapped = rows.map((r) => remapOwner(name, r, userId))
      if (name === 'profile') {
        await db.profile.put(remapped[0] as never)
      } else {
        await db.table(name).bulkPut(remapped)
      }
    }
  })
}
