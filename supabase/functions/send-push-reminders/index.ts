// Supabase Edge Function: send-push-reminders
// Reemplaza al scaffold viejo send-reminders (por email, nunca desplegado,
// referenciaba columnas que no existían: profiles.timezone,
// profiles.reminder_email_enabled, una tabla reminder_log aparte — ver
// IDEAS.md). Este manda Web Push real a los navegadores suscriptos,
// cruzando profiles.reminder_* (las columnas reales) contra
// push_subscriptions (0005_push_subscriptions.sql).
//
// Pensada para correr cada hora vía pg_cron — ver docs/13-BACKEND-SUPABASE.md.
//
// Desplegar: supabase functions deploy send-push-reminders
// Secrets:   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails('mailto:santiagoritter26@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const MESSAGES = [
  'Tu yo del futuro te agradece cada sesión de hoy. A entrenar.',
  'La consistencia vence al talento. No rompas la racha.',
  'Hoy es un buen día para ser más fuerte.',
  '¿Listo para superar tu último entreno?',
]

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, reminder_time, reminder_days')
    .eq('reminder_enabled', true)

  if (error) return new Response(error.message, { status: 500 })
  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, timezone, last_sent_on')
    .in('user_id', profiles.map((p) => p.id))

  if (subsError) return new Response(subsError.message, { status: 500 })

  const profileById = new Map(profiles.map((p) => [p.id, p]))
  const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  let sent = 0

  for (const sub of subs ?? []) {
    const profile = profileById.get(sub.user_id)
    if (!profile?.reminder_time) continue

    // Hora local de ESTA suscripción, no la del servidor.
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: sub.timezone }))
    const [h] = (profile.reminder_time as string).split(':').map(Number)
    if (nowLocal.getHours() !== h) continue
    if (!(profile.reminder_days as number[] | null ?? [1, 2, 3, 4, 5]).includes(nowLocal.getDay())) continue

    const today = nowLocal.toISOString().slice(0, 10)
    if (sub.last_sent_on === today) continue // ya se le mandó hoy a esta suscripción

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'Hora de entrenar', body })
      )
      await supabase.from('push_subscriptions').update({ last_sent_on: today }).eq('id', sub.id)
      sent++
    } catch (err) {
      // 404/410 = el navegador invalidó la suscripción (desinstaló la PWA,
      // limpió datos, etc.) — se borra en vez de reintentar para siempre.
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
