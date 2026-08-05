import { Suspense, lazy, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { calorieEntriesFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, Row } from '@/components/ui/Card'
import { summarizeDay } from '@/lib/calories'
import { localDayKey } from '@/lib/stats'
import { nowIso } from '@/lib/utils'

const CalorieAddSheet = lazy(() => import('@/components/gym/CalorieAddSheet'))

/**
 * Una sola fila, solo visible si el usuario activó el contador (opt-in). Va
 * en color neutro (ink-2), no accent: el acento de Home ya lo tiene el CTA
 * de "Iniciar entrenamiento" y DESIGN.md pide un solo acento por pantalla.
 *
 * Tocar la fila abre el sheet de carga directo desde Inicio (Fase 38) — antes
 * navegaba a /calorias (Ajustes) solo para llegar al mismo formulario. Esa
 * pantalla sigue existiendo para meta/historial/activar-desactivar, pero
 * cargar una comida no debería requerir salir de Inicio.
 */
export default function CalorieSummaryRow() {
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
      <Card>
        <Row onClick={() => setAdding(true)}>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-ink-2">
              Calorías hoy ·{' '}
              <span className="font-mono tabular-nums">
                {summary.totalKcal.toLocaleString('es-AR')}
              </span>
              {' / '}
              <span className="font-mono tabular-nums">
                {summary.goalKcal.toLocaleString('es-AR')}
              </span>{' '}
              kcal
            </p>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full origin-left rounded-full bg-ink-2 transition-transform duration-300"
                style={{ transform: `scaleX(${Math.min(1, summary.progress)})` }}
              />
            </div>
          </div>
        </Row>
      </Card>

      <Suspense fallback={null}>
        {adding && userId && (
          <CalorieAddSheet userId={userId} onClose={() => setAdding(false)} />
        )}
      </Suspense>
    </>
  )
}
