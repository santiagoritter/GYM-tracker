import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { pushNotification } from '@/lib/notifications'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { isGuestUserId } from '@/lib/guest'

/**
 * Un mensaje nuevo del chat de coach deja una notificación in-app (campana)
 * si no se está mirando ese hilo. Antes el único aviso era el chat abierto.
 * Escucha los dos lados: como alumno (client_id = yo) y como coach
 * (coach_id = yo). Montado una sola vez en el layout. El push con la app
 * cerrada lo manda el servidor (notify-coach-message).
 */
/** Se emite en `window` con cada mensaje recibido (para refrescar contadores). */
export const COACH_MESSAGE_EVENT = 'repe:coach-message'

export function useCoachMessageNotifier(): void {
  const me = useCurrentUserId()
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    if (!supabase || !me || isGuestUserId(me)) return
    const client = supabase
    const onInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as { client_id: string; coach_id: string; sender_id: string; body: string; attachment_kind: string | null }
      if (row.sender_id === me) return
      // Cada mensaje, aunque la campana deduplique: los contadores escuchan esto.
      window.dispatchEvent(new CustomEvent(COACH_MESSAGE_EVENT))
      const threadPath = row.client_id === me ? '/mi-coach/chat' : `/coach/alumno/${row.client_id}/chat`
      if (pathRef.current.startsWith(threadPath)) return
      const text = (row.body ?? '').trim()
      void pushNotification({
        userId: me,
        type: 'coach_message',
        title: row.client_id === me ? 'Mensaje de tu coach' : 'Mensaje de un alumno',
        body: text ? (text.length > 120 ? `${text.slice(0, 117)}…` : text) : 'Te mandó un adjunto',
        exerciseId: row.client_id,
      }).catch(() => undefined)
    }
    const channel = client
      .channel(`coach-msg-notify-${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coach_messages', filter: `client_id=eq.${me}` }, onInsert)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coach_messages', filter: `coach_id=eq.${me}` }, onInsert)
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [me])
}
