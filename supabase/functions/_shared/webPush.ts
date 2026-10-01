// Envío de Web Push compartido por las Edge Functions (recordatorios y chat
// de coach). Antes vivía adentro de send-push-reminders y no se podía reusar.
import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

let configured = false

function configure(): void {
  if (configured) return
  webpush.setVapidDetails(
    'mailto:santiagoritter26@gmail.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  )
  configured = true
}

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  /** Ruta de la app a abrir al tocar la notificación (relativa al scope del SW). */
  url?: string
}

/** Manda a una suscripción. Si el navegador la invalidó (404/410: desinstaló
 * la PWA, borró datos) se borra en vez de reintentar para siempre. */
export async function sendPush(
  supabase: SupabaseClient,
  sub: PushSubscriptionRow,
  payload: PushPayload
): Promise<boolean> {
  configure()
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return true
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    }
    return false
  }
}

/** Manda a todas las suscripciones de un usuario. Devuelve cuántas llegaron. */
export async function sendPushToUser(supabase: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  let sent = 0
  for (const sub of subs ?? []) {
    if (await sendPush(supabase, sub as PushSubscriptionRow, payload)) sent++
  }
  return sent
}
