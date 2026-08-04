import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { HOME_MESSAGES, getRandomMessage } from '@/lib/motivational'
import { localDayKey } from '@/lib/stats'

const LAST_FIRED_KEY = 'gymtracker-reminder-last-fired'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

function fireNotification() {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const msg = getRandomMessage(HOME_MESSAGES)
  const notif = new Notification('Hora de entrenar', {
    body: msg.text,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'gymtracker-reminder',
  })
  notif.onclick = () => {
    window.focus()
    notif.close()
  }
}

/**
 * Programador de recordatorios locales. Mientras la app está abierta, revisa
 * cada minuto si toca recordar (día + hora configurados) y dispara una
 * notificación una sola vez por día.
 *
 * NOTA: las notificaciones locales sólo funcionan con la app abierta o como
 * PWA instalada en segundo plano según el SO. El envío de EMAILS reales
 * requiere backend (Supabase Edge Function + pg_cron) — ver docs/12.
 */
export function useReminderScheduler() {
  const userId = useCurrentUserId()
  const profile = useLiveQuery(() => (userId ? db.profile.get(userId) : undefined), [userId])

  useEffect(() => {
    if (!profile?.reminderEnabled || !profile.reminderTime) return
    if (!notificationsSupported() || Notification.permission !== 'granted') return

    const days = profile.reminderDays ?? [1, 2, 3, 4, 5]
    const [targetH, targetM] = profile.reminderTime.split(':').map(Number)

    const check = () => {
      const now = new Date()
      if (!days.includes(now.getDay())) return
      if (now.getHours() !== targetH || now.getMinutes() !== targetM) return

      const todayKey = localDayKey(now)
      if (localStorage.getItem(LAST_FIRED_KEY) === todayKey) return
      localStorage.setItem(LAST_FIRED_KEY, todayKey)
      fireNotification()
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [profile?.reminderEnabled, profile?.reminderTime, profile?.reminderDays])
}
