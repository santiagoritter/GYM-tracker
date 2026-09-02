// Supabase Edge Function: send-push-reminders
// Reemplaza al scaffold viejo send-reminders (por email, nunca desplegado,
// referenciaba columnas que no existían: profiles.timezone,
// profiles.reminder_email_enabled, una tabla reminder_log aparte — ver
// IDEAS.md). Este manda Web Push real a los navegadores suscriptos,
// cruzando profiles.reminder_* (las columnas reales) contra
// push_subscriptions (0005_push_subscriptions.sql).
//
// Pensada para correr cada 15 minutos vía pg_cron — ver
// docs/13-BACKEND-SUPABASE.md. Antes corría cada hora exacta con match solo
// por hora: alguien que configuraba, por ejemplo, "17:11" no recibía nada
// ese día si el cron ya había pasado las 17:00 — la ventana de una hora
// completa la perdía sin otra oportunidad hasta el día siguiente. Con
// ventanas de 15 minutos el aviso llega cerca del horario real, y probar en
// vivo no depende de pegarle al minuto exacto en que tira el cron.
//
// Desplegar (con --no-verify-jwt: la autenticación de abajo es propia, no
// la de la plataforma — quien llama es pg_cron, no un usuario con sesión):
//   supabase functions deploy send-push-reminders --no-verify-jwt
// Secrets:
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...
//
// CRON_SECRET es un secreto propio (cualquier string random), NO la
// service_role key — así el cron solo puede invocar esta función puntual
// en vez de tener el acceso total que da la service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

webpush.setVapidDetails('mailto:santiagoritter26@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// Tiene que coincidir con la frecuencia del cron (ver docs/13 §5). Si se
// redespliega esta función sin haber reprogramado el cron a */15 * * * *
// todavía, subir esto a 60 mientras tanto — con 15 y el cron en modo
// horario, cualquier reminder_time con minuto >= 15 dejaría de matchear.
const WINDOW_MINUTES = 15

// Frases por momento del día. Subconjunto de src/lib/quotes.ts — hay que
// mantenerlo en sync a mano (mismo criterio que la duplicación del literal
// de muscleColors). El cuerpo se elige con la hora LOCAL de cada
// suscripción, no la del servidor.
const QUOTES: Record<'dawn' | 'morning' | 'afternoon' | 'night', string[]> = {
  dawn: [
    'Al amanecer, cuando cueste levantarte: me despierto para hacer el trabajo de un ser humano. — Marco Aurelio',
    'En medio del invierno aprendí que había en mí un verano invencible. — Albert Camus',
  ],
  morning: [
    'Empezá de una vez a ser el que querés ser, y hacelo con lo que tenés ahora. — Epicteto',
    'La suerte es lo que pasa cuando la preparación se cruza con la oportunidad. — Séneca',
    'El obstáculo es el camino. — Marco Aurelio',
    'La disciplina es elegir entre lo que querés ahora y lo que querés más. — Abraham Lincoln',
  ],
  afternoon: [
    'Las dificultades fortalecen la mente igual que el trabajo fortalece el cuerpo. — Séneca',
    'Hay que imaginarse a Sísifo feliz. — Albert Camus',
    'Somos lo que hacemos repetidamente. La excelencia es un hábito. — Aristóteles',
    'Cuídate de la esterilidad de una vida ocupada. — Sócrates',
  ],
  night: [
    'Que ningún día se te vaya sin haber sumado una línea. — Plinio el Viejo',
    'No es que tengamos poco tiempo, es que perdemos mucho. — Séneca',
    'Lo que hacés todos los días importa más que lo que hacés de vez en cuando.',
  ],
}

function quoteForHour(hour: number): string {
  const part = hour < 6 ? 'dawn' : hour < 12 ? 'morning' : hour < 19 ? 'afternoon' : 'night'
  const list = QUOTES[part]
  return list[Math.floor(Math.random() * list.length)]
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

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
  let sent = 0

  for (const sub of subs ?? []) {
    const profile = profileById.get(sub.user_id)
    if (!profile?.reminder_time) continue

    // Hora local de ESTA suscripción, no la del servidor.
    const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: sub.timezone }))
    const [h, m] = (profile.reminder_time as string).split(':').map(Number)
    const targetMinutes = h * 60 + m
    const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes()
    // Ventana en vez de igualdad exacta: el cron no tira justo al minuto
    // configurado, tira cada WINDOW_MINUTES — esto lo cubre sin duplicar
    // envíos (cada horario cae en una sola ventana por día).
    if (targetMinutes < nowMinutes || targetMinutes >= nowMinutes + WINDOW_MINUTES) continue
    if (!(profile.reminder_days as number[] | null ?? [1, 2, 3, 4, 5]).includes(nowLocal.getDay())) continue

    const today = nowLocal.toISOString().slice(0, 10)
    if (sub.last_sent_on === today) continue // ya se le mandó hoy a esta suscripción

    const body = quoteForHour(nowLocal.getHours())

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
