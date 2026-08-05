import { supabase } from '@/lib/supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Necesario porque `PushManager.subscribe` pide la clave VAPID como
 * `Uint8Array`, no como el base64url que Supabase/`web-push` generan. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/** Gatea la opción en la UI: solo tiene sentido ofrecerla si el navegador
 * soporta Push, hay clave VAPID pública, y Supabase está desplegado. */
export function isPushAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(VAPID_PUBLIC_KEY) &&
    supabase !== null
  )
}

/**
 * Pide permiso, se suscribe al Push Manager del browser y guarda la
 * suscripción en `push_subscriptions` (Supabase) para que
 * `send-push-reminders` pueda encontrarla. Devuelve `false` si algo no
 * está disponible — nunca tira, para no romper el flujo de Ajustes.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushAvailable() || !supabase) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone,
    },
    { onConflict: 'user_id,endpoint' }
  )
  return !error
}

/** Cancela la suscripción tanto en el browser como en Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  if (supabase) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  }
  await subscription.unsubscribe()
}
