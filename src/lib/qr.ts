// Pipeline de QR: rutina → payload mínimo → se sube a Supabase
// (shared_routines) → el QR lleva solo un código corto (o la URL de
// importación con ese código) → el que escanea resuelve el código contra
// el servidor. Antes (ver docs/07-COMPARTIR-QR.md) el payload entero
// viajaba comprimido adentro del QR — para una rutina con varios días y
// ejercicios eso generaba un QR de alta densidad que muchos celulares no
// leían bien. `decodePayload`/`encodePayload` (el formato viejo
// "GYMTR:<datos>") se mantienen solo para poder seguir leyendo códigos ya
// impresos/guardados de antes de este cambio.
import LZString from 'lz-string'
import QRCode from 'qrcode'
import { db } from '@/db/schema'
import { workoutsFor } from '@/db/scoped'
import { supabase } from '@/lib/supabaseClient'
import type { Routine, RoutineDay, RoutineExercise } from '@/types'

const PREFIX = 'GYMTR:'
// Sin 0/O/1/I/L: se puede transcribir a mano sin ambigüedad si hace falta.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 8

export interface QRExercise {
  id: string
  s: number // sets
  r: [number, number] // reps [min, max]
  w?: number // peso kg (opcional)
  rs?: number // rest seconds (opcional)
}

export interface QRDay {
  n: string
  r?: true // día de descanso
  e?: QRExercise[]
}

export interface QRPayload {
  v: 1
  n: string
  d: QRDay[]
}

interface BuildOptions {
  includeWeights: boolean
}

export async function buildPayload(
  routine: Routine,
  options: BuildOptions
): Promise<QRPayload> {
  const days = (
    await db.routineDays.where('routineId').equals(routine.id).toArray()
  ).sort((a, b) => a.dayOrder - b.dayOrder)

  // Solo entrenos propios del dueño de la rutina: workoutSets no tiene
  // userId directo, se filtra por los workoutId que ya sabemos que son suyos.
  const ownWorkoutIds = options.includeWeights
    ? new Set((await workoutsFor(routine.userId).toArray()).map((w) => w.id))
    : null

  const qrDays: QRDay[] = []
  for (const day of days) {
    if (day.isRest === 1) {
      qrDays.push({ n: day.name, r: true })
      continue
    }
    const entries = (
      await db.routineExercises.where('dayId').equals(day.id).toArray()
    ).sort((a, b) => a.exerciseOrder - b.exerciseOrder)

    const exercises: QRExercise[] = []
    for (const entry of entries) {
      const ex: QRExercise = {
        id: entry.exerciseId,
        s: entry.setsTarget,
        r: [entry.repsMin, entry.repsMax],
      }
      if (entry.restSeconds !== 90) ex.rs = entry.restSeconds
      if (ownWorkoutIds) {
        // Último peso de trabajo usado en ese ejercicio (solo entrenos propios)
        const lastSet = await db.workoutSets
          .where('exerciseId')
          .equals(entry.exerciseId)
          .filter(
            (s) => s.completed === 1 && s.isWarmup === 0 && s.weightKg > 0 && ownWorkoutIds.has(s.workoutId)
          )
          .last()
        if (lastSet) ex.w = lastSet.weightKg
      }
      exercises.push(ex)
    }
    qrDays.push({ n: day.name, e: exercises })
  }

  return { v: 1, n: routine.name, d: qrDays }
}

export function encodePayload(payload: QRPayload): string {
  const json = JSON.stringify(payload)
  return PREFIX + LZString.compressToEncodedURIComponent(json)
}

export function decodePayload(raw: string): QRPayload | null {
  try {
    if (!raw.startsWith(PREFIX)) return null
    const json = LZString.decompressFromEncodedURIComponent(raw.slice(PREFIX.length))
    if (!json) return null
    const payload = JSON.parse(json) as QRPayload
    if (payload.v !== 1 || typeof payload.n !== 'string' || !Array.isArray(payload.d)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function generateShareCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/** Sube el payload a `shared_routines` y devuelve el código corto que lleva
 * el QR — reintenta si el código sorteado ya existe (colisión, altamente
 * improbable con 8 caracteres de este alfabeto, pero barato de cubrir). */
export async function shareRoutine(routine: Routine, options: BuildOptions): Promise<string> {
  if (!supabase) throw new Error('Hace falta conexión para compartir una rutina.')
  const payload = await buildPayload(routine, options)

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShareCode()
    const { error } = await supabase
      .from('shared_routines')
      .insert({ code, payload, created_by: routine.userId })
    if (!error) return code
    if (error.code !== '23505') throw new Error(error.message) // no es choque de PK
  }
  throw new Error('No se pudo generar un código único, probá de nuevo.')
}

/** URL que abre directamente la importación — sirve para que cualquier
 * cámara (no solo la de la app) pueda escanear el QR y llegar acá. */
export function buildShareUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}importar/${code}`
}

/** Saca el código de lo que se escaneó/pegó: puede ser la URL de share, un
 * código pelado, o (formato viejo) un payload "GYMTR:" ya local. */
export function extractShareCode(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/\/importar\/([2-9A-HJ-KM-NP-Z]{8})\b/i)
  if (match) return match[1].toUpperCase()
  if (/^[2-9A-HJ-KM-NP-Z]{8}$/i.test(trimmed)) return trimmed.toUpperCase()
  return null
}

/** Resuelve un código contra `shared_routines`. `null` si no existe, no hay
 * conexión, o no está configurado Supabase. */
export async function resolveShareCode(code: string): Promise<QRPayload | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('shared_routines')
    .select('payload')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error || !data) return null
  return data.payload as QRPayload
}

export async function generateQRDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#0A0A0A', light: '#F0F0F0' },
  })
}

/** Importa un payload como rutina nueva. Devuelve id de la rutina y ejercicios omitidos. */
export async function importPayload(
  userId: string,
  payload: QRPayload,
  name?: string
): Promise<{ routineId: string; skipped: number }> {
  const { uid, nowIso } = await import('@/lib/utils')
  const knownIds = new Set((await db.exercises.toArray()).map((e) => e.id))
  let skipped = 0

  const routine: Routine = {
    id: uid(),
    userId,
    name: name?.trim() || payload.n,
    color: '#60A5FA',
    isActive: 0,
    isArchived: 0,
    dirty: 1,
    updatedAt: nowIso(),
  }

  const days: RoutineDay[] = []
  const entries: RoutineExercise[] = []

  payload.d.forEach((qrDay, dayIndex) => {
    const day: RoutineDay = {
      id: uid(),
      routineId: routine.id,
      userId,
      name: qrDay.n,
      dayOrder: dayIndex + 1,
      isRest: qrDay.r ? 1 : 0,
      dirty: 1,
      updatedAt: nowIso(),
    }
    days.push(day)
    qrDay.e?.forEach((qrEx, exIndex) => {
      if (!knownIds.has(qrEx.id)) {
        skipped++
        return
      }
      entries.push({
        id: uid(),
        dayId: day.id,
        userId,
        exerciseId: qrEx.id,
        exerciseOrder: exIndex + 1,
        setsTarget: qrEx.s,
        repsMin: qrEx.r[0],
        repsMax: qrEx.r[1],
        restSeconds: qrEx.rs ?? 90,
        notes: qrEx.w ? `Peso de referencia: ${qrEx.w} kg` : undefined,
        dirty: 1,
        updatedAt: nowIso(),
      })
    })
  })

  await db.transaction('rw', [db.routines, db.routineDays, db.routineExercises], async () => {
    await db.routines.add(routine)
    await db.routineDays.bulkAdd(days)
    await db.routineExercises.bulkAdd(entries)
  })

  return { routineId: routine.id, skipped }
}
