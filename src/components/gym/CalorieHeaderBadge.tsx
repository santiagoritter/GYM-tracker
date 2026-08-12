import { Suspense, lazy, useState } from 'react'
import { Flame } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { calorieEntriesFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { summarizeDay } from '@/lib/calories'
import { localDayKey } from '@/lib/stats'
import { nowIso } from '@/lib/utils'

const CalorieAddSheet = lazy(() => import('@/components/gym/CalorieAddSheet'))

/**
 * Versión compacta de CalorieSummaryRow para el header (junto al avatar,
 * mismo criterio de "opt-in, no ocupa lugar si no se activó" que la fila
 * completa que reemplaza en Home). Vive en Layout.tsx, no en Home.tsx —
 * así queda visible desde cualquier pantalla, no solo la de inicio.
 */
export default function CalorieHeaderBadge() {
  const userId = useCurrentUserId()
  const [adding, setAdding] = useState(false)
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const entries = useLiveQuery(
    () => (userId ? calorieEntriesFor(userId).toArray() : []),
    [userId]
  )

  if (!profile || profile.calorieTrackingEnabled !== 1) return null

  const today = localDayKey(nowIso())
  const summary = summarizeDay(entries ?? [], today, profile.calorieGoalKcal ?? 2200)

  return (
    <>
      <button
        onClick={() => setAdding(true)}
        aria-label={`Calorías hoy: ${summary.totalKcal} de ${summary.goalKcal}`}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill px-2.5 text-[12px] font-semibold text-ink-2 active:bg-fill-2"
      >
        <Flame size={13} className="text-ink-3" />
        <span className="font-mono tabular-nums">
          {summary.totalKcal.toLocaleString('es-AR')}
        </span>
      </button>

      <Suspense fallback={null}>
        {adding && userId && (
          <CalorieAddSheet userId={userId} onClose={() => setAdding(false)} />
        )}
      </Suspense>
    </>
  )
}
