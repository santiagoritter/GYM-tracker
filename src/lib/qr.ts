// Pipeline de QR según docs/07-COMPARTIR-QR.md:
// rutina → payload mínimo → JSON → lz-string → "GYMTR:<datos>" → imagen QR
// Sin servidor: todo el contenido viaja dentro del QR.
import LZString from 'lz-string'
import QRCode from 'qrcode'
import { db } from '@/db/schema'
import type { Routine, RoutineDay, RoutineExercise } from '@/types'

const PREFIX = 'GYMTR:'

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
      if (options.includeWeights) {
        // Último peso de trabajo usado en ese ejercicio
        const lastSet = await db.workoutSets
          .where('exerciseId')
          .equals(entry.exerciseId)
          .filter((s) => s.completed === 1 && s.isWarmup === 0 && s.weightKg > 0)
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
  payload: QRPayload,
  name?: string
): Promise<{ routineId: string; skipped: number }> {
  const { uid, nowIso } = await import('@/lib/utils')
  const knownIds = new Set((await db.exercises.toArray()).map((e) => e.id))
  let skipped = 0

  const routine: Routine = {
    id: uid(),
    name: name?.trim() || payload.n,
    color: '#60A5FA',
    isActive: 0,
    isArchived: 0,
    synced: 0,
    updatedAt: nowIso(),
  }

  const days: RoutineDay[] = []
  const entries: RoutineExercise[] = []

  payload.d.forEach((qrDay, dayIndex) => {
    const day: RoutineDay = {
      id: uid(),
      routineId: routine.id,
      name: qrDay.n,
      dayOrder: dayIndex + 1,
      isRest: qrDay.r ? 1 : 0,
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
        exerciseId: qrEx.id,
        exerciseOrder: exIndex + 1,
        setsTarget: qrEx.s,
        repsMin: qrEx.r[0],
        repsMax: qrEx.r[1],
        restSeconds: qrEx.rs ?? 90,
        notes: qrEx.w ? `Peso de referencia: ${qrEx.w} kg` : undefined,
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
