import { isNative, platform } from '@/lib/native'
import { getQuoteForNow } from '@/lib/quotes'
import type { LocalProfile } from '@/types'

/**
 * Recordatorios de entrenar como notificaciones programadas con el SISTEMA
 * OPERATIVO — llegan con la app cerrada y la pantalla apagada, que es
 * exactamente cuando sirven.
 *
 * En web esto no existe (no se puede programar a futuro sin push): ahí el
 * aviso lo maneja `useReminderScheduler` (solo con la app abierta) + el push
 * real del servidor (`send-push-reminders`). En nativo, en cambio, el SO
 * mantiene el schedule aunque el proceso muera.
 *
 * IDs reservados: `REMINDER_ID_BASE + diaJS` (0=domingo … 6=sábado). Nadie
 * más del proyecto agenda notificaciones con IDs en ese rango, así que se
 * pueden cancelar todos de una sin tocar el aviso de fin de descanso
 * (`RestTimer.tsx`, que usa `Date.now() % 2147483647`).
 */

const REMINDER_ID_BASE = 4_200_000
const CHANNEL_ID = 'gymtracker-reminders'

/** getDay() 0=domingo … 6=sábado  →  Capacitor `weekday` 1=domingo … 7=sábado. */
const jsDayToCapacitorWeekday = (jsDay: number): number => jsDay + 1

/** Canal de Android para los recordatorios — separado del de fin de descanso
 * para que el usuario pueda silenciar uno sin el otro desde Ajustes del SO.
 * En iOS los canales no existen; la llamada es no-op. */
export async function ensureReminderChannel(): Promise<void> {
  if (!isNative || platform !== 'android') return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Recordatorios de entrenar',
      description: 'Aviso a la hora que elijas para no saltarte el gimnasio',
      importance: 4,
      visibility: 1,
    })
  } catch {
    // Sin plugin (build web) o versión sin createChannel: se ignora.
  }
}

/**
 * Sincroniza el schedule del SO con lo que dice el perfil. Cancela lo que
 * había y reprograma una repetición semanal por cada día elegido a la hora
 * configurada, con una frase del daypart correspondiente como cuerpo.
 *
 * Idempotente: se puede llamar en cada cambio de los campos `reminder*` del
 * perfil sin acumular duplicados. Seguro de llamar en web (no hace nada).
 */
export async function syncReminderSchedule(
  profile: Pick<LocalProfile, 'reminderEnabled' | 'reminderTime' | 'reminderDays'> | undefined
): Promise<void> {
  if (!isNative || !profile) return

  let LocalNotifications
  try {
    LocalNotifications = (await import('@capacitor/local-notifications')).LocalNotifications
  } catch {
    return
  }

  // Cancelar siempre lo agendado por nosotros antes de decidir si reprogramar.
  const allIds = Array.from({ length: 7 }, (_, i) => ({ id: REMINDER_ID_BASE + i }))
  try {
    await LocalNotifications.cancel({ notifications: allIds })
  } catch {
    // No había nada agendado: sigue.
  }

  if (profile.reminderEnabled !== 1 || !profile.reminderTime) return

  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') {
    const asked = await LocalNotifications.requestPermissions()
    if (asked.display !== 'granted') return
  }

  await ensureReminderChannel()

  const [hour, minute] = profile.reminderTime.split(':').map(Number)
  const days = profile.reminderDays ?? [1, 2, 3, 4, 5]
  // Fecha con la hora del recordatorio, solo para que `getQuoteForNow`
  // elija el daypart correcto (no importa el día concreto).
  const refDate = new Date()
  refDate.setHours(hour, minute, 0, 0)
  const quote = getQuoteForNow(refDate)
  const body = quote.author ? `${quote.text} — ${quote.author}` : quote.text

  await LocalNotifications.schedule({
    notifications: days.map((jsDay) => ({
      id: REMINDER_ID_BASE + jsDay,
      title: 'Hora de entrenar',
      body,
      channelId: CHANNEL_ID,
      schedule: {
        on: { weekday: jsDayToCapacitorWeekday(jsDay), hour, minute },
        allowWhileIdle: true,
      },
    })),
  })
}
