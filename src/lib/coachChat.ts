import { supabase } from '@/lib/supabaseClient'

/**
 * Chat coach↔alumno. El hilo es el par `(coachId, clientId)`; `senderId`
 * dice quién escribió. Entrega en tiempo real vía Supabase Realtime, con
 * fallback a polling si el websocket no engancha (ver `subscribeThread`).
 * Solo se puede ESCRIBIR con vínculo activo (lo fuerza la RLS de 0013); un
 * hilo de un vínculo terminado se lee pero no se responde.
 */

export interface ChatMessage {
  id: string
  coachId: string
  clientId: string
  senderId: string
  body: string
  attachmentKind: 'exercise' | 'routine' | null
  attachmentRef: string | null
  createdAt: string
  readAt: string | null
}

function mapRow(r: Record<string, unknown>): ChatMessage {
  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    clientId: r.client_id as string,
    senderId: r.sender_id as string,
    body: (r.body as string) ?? '',
    attachmentKind: (r.attachment_kind as ChatMessage['attachmentKind']) ?? null,
    attachmentRef: (r.attachment_ref as string | null) ?? null,
    createdAt: r.created_at as string,
    readAt: (r.read_at as string | null) ?? null,
  }
}

export async function fetchThread(coachId: string, clientId: string): Promise<ChatMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function sendMessage(
  coachId: string,
  clientId: string,
  input: { body: string; attachmentKind?: 'exercise' | 'routine'; attachmentRef?: string }
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const senderId = session.user?.id
  if (!senderId) throw new Error('Sin sesión.')
  const { error } = await supabase.from('coach_messages').insert({
    coach_id: coachId,
    client_id: clientId,
    sender_id: senderId,
    body: input.body.trim(),
    attachment_kind: input.attachmentKind ?? null,
    attachment_ref: input.attachmentRef ?? null,
  })
  if (error) throw error
}

/** Marca como leídos los mensajes del hilo que NO mandó el que llama. */
export async function markThreadRead(coachId: string, clientId: string): Promise<void> {
  if (!supabase) return
  const { data: session } = await supabase.auth.getUser()
  const me = session.user?.id
  if (!me) return
  await supabase
    .from('coach_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .neq('sender_id', me)
    .is('read_at', null)
}

export interface ThreadSubscription {
  close: () => void
}

/**
 * Suscribe al hilo. Llama `onMessage` con cada mensaje nuevo. Intenta
 * Realtime; si no llega a `SUBSCRIBED` en ~3 s (websocket bloqueado, etc.),
 * cae a un polling de 4 s que refetchea el hilo y emite los que falten.
 */
export function subscribeThread(
  coachId: string,
  clientId: string,
  onMessage: (msg: ChatMessage) => void
): ThreadSubscription {
  if (!supabase) return { close: () => {} }

  let pollTimer: ReturnType<typeof setInterval> | undefined
  const seen = new Set<string>()
  let usingPoll = false

  const startPolling = () => {
    if (usingPoll) return
    usingPoll = true
    pollTimer = setInterval(async () => {
      const msgs = await fetchThread(coachId, clientId).catch(() => [] as ChatMessage[])
      for (const m of msgs) {
        if (!seen.has(m.id)) {
          seen.add(m.id)
          onMessage(m)
        }
      }
    }, 4000)
  }

  const channel = supabase
    .channel(`coach-msg-${coachId}-${clientId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'coach_messages', filter: `coach_id=eq.${coachId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>
        if (row.client_id !== clientId) return
        const msg = mapRow(row)
        if (seen.has(msg.id)) return
        seen.add(msg.id)
        onMessage(msg)
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        startPolling()
      }
    })

  const fallbackTimer = setTimeout(() => {
    // Si en 3 s no quedó SUBSCRIBED, arrancamos el polling igual (idempotente).
    startPolling()
  }, 3000)

  return {
    close: () => {
      clearTimeout(fallbackTimer)
      if (pollTimer) clearInterval(pollTimer)
      supabase?.removeChannel(channel)
    },
  }
}

/** Para el badge de "sin leer": mensajes recibidos por el usuario sin `read_at`. */
export async function fetchUnreadCount(coachId: string, clientId: string, meId: string): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .neq('sender_id', meId)
    .is('read_at', null)
  if (error) return 0
  return count ?? 0
}
