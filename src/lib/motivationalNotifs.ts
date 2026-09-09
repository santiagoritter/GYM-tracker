import { isNative, platform } from '@/lib/native'
import { getQuoteForNow } from '@/lib/quotes'
import type { LocalProfile } from '@/types'

/**
 * Frases filosóficas como notificaciones programadas con el SISTEMA
 * OPERATIVO, tres veces al día. Distinto del recordatorio de entrenar
 * (`nativeReminders.ts`), que es a la hora que el usuario elige y en los días
 * que elige: esto es un goteo fijo de frases con peso, mañana / tarde /
 * noche, con la app cerrada.
 *
 * Solo nativo. En web no hay forma confiable de disparar algo periódico con
 * la app cerrada sin push, y no vale la pena un `setInterval` que solo corre
 * con la pestaña abierta para esto.
 *
 * IDs reservados: `MOTIV_ID_BASE + slot` (0, 1, 2). Rango propio, sin
 * solaparse con `REMINDER_ID_BASE` (4_200_000) ni con el aviso de fin de
 * descanso (`RestTimer.tsx`, `Date.now() % 2147483647`).
 */

const MOTIV_ID_BASE = 4_300_000
const CHANNEL_ID = 'gymtracker-quotes'

/**
 * Horarios fijos, uno por daypart de `quotes.ts`:
 *  - 09:00 → `morning`   (hour < 12)
 *  - 15:00 → `afternoon` (hour < 19)
 *  - 20:00 → `night`     (hour >= 19)
 * No se guardan en el perfil: es una decisión de producto, no un ajuste.
 */
export const MOTIV_SLOTS: readonly { hour: number; minute: number }[] = [
  { hour: 9, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 20, minute: 0 },
]

export interface MotivationalNotification {
  id: number
  title: string
  body: string
  hour: number
  minute: number
}

/**
 * Las 3 notificaciones a agendar, con la frase del daypart de cada horario.
 * Pura y testeable: `refDate` fija el día para `getQuoteForNow` (la frase es
 * estable por día). El `title` es el propio texto de la frase y el `body` el
 * autor — se lee mejor en la notificación que "Frase del día" arriba.
 */
export function buildMotivationalNotifications(refDate = new Date()): MotivationalNotification[] {
  return MOTIV_SLOTS.map((slot, i) => {
    const at = new Date(refDate)
    at.setHours(slot.hour, slot.minute, 0, 0)
    const quote = getQuoteForNow(at)
    return {
      id: MOTIV_ID_BASE + i,
      title: quote.text,
      body: quote.author ?? 'GymTracker',
      hour: slot.hour,
      minute: slot.minute,
    }
  })
}

/** Canal de Android propio para poder silenciar las frases sin tocar los
 * otros avisos. No-op en iOS y en web. */
export async function ensureQuotesChannel(): Promise<void> {
  if (!isNative || platform !== 'android') return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Frases motivacionales',
      description: 'Una frase con peso a la mañana, a la tarde y a la noche',
      importance: 3,
      visibility: 1,
    })
  } catch {
    // Sin plugin (build web) o versión sin createChannel: se ignora.
  }
}

/**
 * Sincroniza el schedule del SO con `profile.motivationalNotifsEnabled`.
 * Cancela lo que había y, si está activado y hay permiso, reprograma las 3
 * repeticiones diarias. Idempotente y seguro de llamar en web (no hace nada).
 */
export async function syncMotivationalSchedule(
  profile: Pick<LocalProfile, 'motivationalNotifsEnabled'> | undefined
): Promise<void> {
  if (!isNative || !profile) return

  let LocalNotifications
  try {
    LocalNotifications = (await import('@capacitor/local-notifications')).LocalNotifications
  } catch {
    return
  }

  const ourIds = MOTIV_SLOTS.map((_, i) => ({ id: MOTIV_ID_BASE + i }))
  try {
    await LocalNotifications.cancel({ notifications: ourIds })
  } catch {
    // No había nada agendado: sigue.
  }

  if (profile.motivationalNotifsEnabled !== 1) return

  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') {
    const asked = await LocalNotifications.requestPermissions()
    if (asked.display !== 'granted') return
  }

  await ensureQuotesChannel()

  await LocalNotifications.schedule({
    notifications: buildMotivationalNotifications().map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: CHANNEL_ID,
      schedule: {
        on: { hour: n.hour, minute: n.minute },
        allowWhileIdle: true,
      },
    })),
  })
}
