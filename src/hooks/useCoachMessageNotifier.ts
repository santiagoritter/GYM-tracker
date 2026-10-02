import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { isGuestUserId } from '@/lib/guest'

/**
 * Avisa a los contadores (badge de "Mensajes") de que llegó un mensaje nuevo
 * del chat de coach, escuchando los dos lados: como alumno (client_id = yo) y
 * como coach (coach_id = yo). NO crea notificación en la campana: los
 * mensajes no van ahí. El aviso con la app cerrada es el push del servidor
 * (notify-coach-message). Montado una sola vez en el layout.
 */
/** Se emite en `window` con cada mensaje recibido (para refrescar contadores). */
export const COACH_MESSAGE_EVENT = 'repe:coach-message'

export function useCoachMessageNotifier(): void {
  const me = useCurrentUserId()

  useEffect(() => {
    if (!supabase || !me || isGuestUserId(me)) return
    const client = supabase
    const onInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as { client_id: string; coach_id: string; sender_id: string; body: string; attachment_kind: string | null }
      if (row.sender_id === me) return
      window.dispatchEvent(new CustomEvent(COACH_MESSAGE_EVENT))
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
