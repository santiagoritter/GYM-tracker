// Supabase Edge Function: send-reminders
// Envía emails de recordatorio de entrenamiento a los usuarios cuya hora local
// configurada coincide con la ejecución. Pensada para correr cada hora vía
// pg_cron (ver docs/12-RECORDATORIOS.md).
//
// Desplegar:  supabase functions deploy send-reminders
// Secrets:    supabase secrets set RESEND_API_KEY=re_xxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = 'GymTracker <recordatorios@tudominio.com>'

const MESSAGES = [
  'Tu yo del futuro te agradece cada sesión de hoy. ¡A entrenar!',
  'La consistencia vence al talento. No rompas la racha 🔥',
  'Hoy es un buen día para ser más fuerte.',
  '¿Listo para superar tu último entreno?',
]

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // Usuarios con email habilitado (el filtro fino por hora/zona horaria se hace
  // acá abajo comparando reminder_time contra la hora local del usuario).
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, email, reminder_time, reminder_days, timezone')
    .eq('reminder_email_enabled', true)

  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  for (const p of profiles ?? []) {
    const local = new Date(now.toLocaleString('en-US', { timeZone: p.timezone }))
    const [h] = (p.reminder_time as string).split(':').map(Number)
    if (local.getHours() !== h) continue
    if (!(p.reminder_days as number[]).includes(local.getDay())) continue

    // Anti-duplicado
    const { error: logErr } = await supabase
      .from('reminder_log')
      .insert({ user_id: p.user_id, sent_on: today })
    if (logErr) continue // ya se envió hoy

    const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: p.email,
        subject: '💪 Hora de entrenar',
        html: `<h2>Hora de entrenar</h2><p>${body}</p><p><a href="https://tudominio.com">Abrir GymTracker</a></p>`,
      }),
    })
    sent++
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
