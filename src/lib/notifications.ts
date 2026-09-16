import { db } from '@/db/schema'
import { nowIso, uid } from '@/lib/utils'
import type { NotificationType } from '@/types'

/**
 * Crea una notificación in-app, salvo que ya haya una **sin leer** del
 * mismo tipo + ejercicio para este usuario — no tiene sentido apilar "nuevo
 * peso recomendado para sentadilla" tres veces si la persona todavía no
 * abrió la anterior. Se llama desde los puntos donde ya se detecta el
 * evento (workoutStore: PR nuevo, recomendación de peso/descanso que
 * cambió) — ver esos call sites para el criterio de CUÁNDO llamarla.
 */
export async function pushNotification(params: {
  userId: string
  type: NotificationType
  title: string
  body: string
  exerciseId?: string
}): Promise<void> {
  const existing = await db.notifications
    .where('userId')
    .equals(params.userId)
    .filter((n) => n.read === 0 && n.type === params.type && n.exerciseId === params.exerciseId)
    .first()
  if (existing) return

  await db.notifications.add({
    id: uid(),
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    exerciseId: params.exerciseId,
    read: 0,
    createdAt: nowIso(),
    dirty: 1,
    updatedAt: nowIso(),
  })
}
