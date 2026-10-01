// Supabase Edge Function: notify-coach-message
// Push al otro integrante del vínculo cuando llega un mensaje del chat de
// coach. Antes el aviso existía solo con la app abierta (Realtime), y un
// mensaje con la app cerrada no llegaba a ningún lado (reportado por testers).
//
// El cliente la llama después de insertar el mensaje, pasando SOLO su id.
// Quién manda y a quién se resuelve acá, del lado del servidor, desde el JWT
// (CLAUDE.md §5: nunca un userId que mande el cliente):
// - el que llama tiene que ser el `sender_id` del mensaje;
// - el destinatario es la otra parte del vínculo;
// - solo mensajes recién creados (2 min): reinvocar la función con un id
//   viejo no sirve para mandarle avisos repetidos a nadie;
// - si el destinatario bloqueó al remitente, no se avisa.
//
// Desplegar (con verificación de JWT de la plataforma):
//   supabase functions deploy notify-coach-message
// Secrets: los mismos VAPID_* que send-push-reminders.
//
// Solo Web Push (PWA). El push nativo (APNs/FCM) falta: ver docs/21-COACH.md.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendPushToUser } from '../_shared/webPush.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FRESH_MS = 2 * 60 * 1000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Sin sesión' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: caller, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !caller.user) return json({ error: 'Sesión inválida' }, 401)
  const me = caller.user.id

  let messageId: unknown
  try {
    messageId = (await req.json())?.messageId
  } catch {
    return json({ error: 'Cuerpo inválido' }, 400)
  }
  if (typeof messageId !== 'string') return json({ error: 'Falta messageId' }, 400)

  const { data: msg } = await admin
    .from('coach_messages')
    .select('id, coach_id, client_id, sender_id, body, attachment_kind, created_at')
    .eq('id', messageId)
    .maybeSingle()
  if (!msg || msg.sender_id !== me) return json({ error: 'Mensaje inválido' }, 403)
  if (Date.now() - new Date(msg.created_at).getTime() > FRESH_MS) return json({ sent: 0, reason: 'viejo' })

  const recipient = msg.sender_id === msg.coach_id ? msg.client_id : msg.coach_id
  const { data: blocked } = await admin
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', recipient)
    .eq('blocked_id', me)
    .maybeSingle()
  if (blocked) return json({ sent: 0, reason: 'bloqueado' })

  const fromCoach = msg.sender_id === msg.coach_id
  const metaName = (caller.user.user_metadata?.name as string | undefined)?.trim()
  const title = fromCoach ? metaName || 'Tu coach' : metaName ? `${metaName} (alumno)` : 'Tu alumno'
  const text = (msg.body as string).trim()
  const body = text
    ? text.length > 120
      ? `${text.slice(0, 117)}…`
      : text
    : msg.attachment_kind === 'routine'
      ? 'Te mandó una rutina'
      : 'Te mandó un ejercicio'
  const sent = await sendPushToUser(admin, recipient, {
    title,
    body,
    url: fromCoach ? 'mi-coach/chat' : `coach/alumno/${msg.client_id}/chat`,
  })
  return json({ sent })
})
