import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { fetchUnreadByClient } from '@/lib/coachChat'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'

/**
 * Mapa `clientId → no leídos`, con una suscripción Realtime que lo
 * mantiene al día — antes se cargaba una sola vez al montar `CoachHome` y
 * quedaba desactualizado hasta la próxima navegación completa a la
 * pestaña (ver `docs/21-COACH.md`, quedaba anotado como límite conocido).
 */
export function useCoachUnread(): { unread: Map<string, number>; markRead: (clientId: string) => void } {
  const coachId = useCurrentUserId()
  const [unread, setUnread] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!coachId || !supabase) return
    let cancelled = false
    fetchUnreadByClient()
      .then((m) => {
        if (!cancelled) setUnread(m)
      })
      .catch(() => undefined)

    const channel = supabase
      .channel(`coach-unread-${coachId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coach_messages', filter: `coach_id=eq.${coachId}` },
        (payload) => {
          const row = payload.new as { client_id: string; sender_id: string }
          if (row.sender_id === coachId) return // el propio coach escribiendo no suma
          setUnread((prev) => {
            const next = new Map(prev)
            next.set(row.client_id, (next.get(row.client_id) ?? 0) + 1)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase?.removeChannel(channel)
    }
  }, [coachId])

  const markRead = (clientId: string) => {
    setUnread((prev) => {
      if (!prev.has(clientId)) return prev
      const next = new Map(prev)
      next.delete(clientId)
      return next
    })
  }

  return { unread, markRead }
}
