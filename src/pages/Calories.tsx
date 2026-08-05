import { Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Flame, Plus, Trash2 } from 'lucide-react'
import { db } from '@/db/schema'
import { softDelete } from '@/db/mutations'
import { calorieEntriesFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import { GOAL_TYPE_LABELS, summarizeDay } from '@/lib/calories'
import { localDayKey } from '@/lib/stats'
import { cn, nowIso } from '@/lib/utils'
import type { LocalProfile } from '@/types'

const CalorieAddSheet = lazy(() => import('@/components/gym/CalorieAddSheet'))

const GOAL_TYPES: LocalProfile['calorieGoalType'][] = ['maintenance', 'deficit', 'surplus']

export default function Calories() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [adding, setAdding] = useState(false)

  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const entries = useLiveQuery(
    () =>
      userId
        ? calorieEntriesFor(userId)
            .toArray()
            .then((es) => es.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)))
        : [],
    [userId]
  )

  const update = (patch: Partial<LocalProfile>) => {
    if (userId) db.profile.update(userId, patch)
  }

  if (!profile) return null

  const enabled = profile.calorieTrackingEnabled === 1
  const goalType = profile.calorieGoalType ?? 'maintenance'
  const goalKcal = profile.calorieGoalKcal ?? 2200

  const today = localDayKey(nowIso())
  const todayEntries = (entries ?? []).filter((e) => localDayKey(e.loggedAt) === today)
  const summary = summarizeDay(entries ?? [], today, goalKcal)

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/ajustes')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-accent" />
          <h1 className="font-semibold">Calorías</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        <Card>
          <Row onClick={() => update({ calorieTrackingEnabled: enabled ? 0 : 1 })}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Contador de calorías</p>
              <p className="text-[13px] text-ink-3">Registro manual, opcional</p>
            </div>
            <span
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                enabled ? 'bg-accent' : 'bg-surface-3'
              )}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
                  enabled ? 'left-6' : 'left-1'
                )}
              />
            </span>
          </Row>
        </Card>

        {enabled && (
          <>
            <section>
              <SectionHeader title="Meta diaria" />
              <Card className="p-4">
                <div className="flex gap-2">
                  {GOAL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => update({ calorieGoalType: t })}
                      className={cn(
                        'h-11 flex-1 rounded-xs border text-[13px] font-semibold',
                        goalType === t
                          ? 'border-accent bg-accent text-bg'
                          : 'border-line-2 text-ink-2'
                      )}
                    >
                      {GOAL_TYPE_LABELS[t!]}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-[13px] font-medium text-ink-2">
                    Meta (kcal/día)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goalKcal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => update({ calorieGoalKcal: Number(e.target.value) || 0 })}
                    className="h-11 w-full rounded-xs bg-surface-2 px-3 font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </Card>
            </section>

            <section>
              <SectionHeader title="Hoy" />
              <Card className="p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[28px] font-bold leading-none tabular-nums">
                    {summary.totalKcal.toLocaleString('es-AR')}
                    <span className="ml-1.5 text-[15px] font-normal text-ink-3">
                      / {summary.goalKcal.toLocaleString('es-AR')} kcal
                    </span>
                  </p>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn(
                      'h-full origin-left rounded-full transition-transform duration-300',
                      summary.progress > 1 ? 'bg-warning' : 'bg-accent'
                    )}
                    style={{ transform: `scaleX(${Math.min(1, summary.progress)})` }}
                  />
                </div>
                <p className="mt-2 text-[13px] text-ink-3">
                  {summary.progress > 1
                    ? 'Superaste la meta de hoy'
                    : `Quedan ${summary.remainingKcal.toLocaleString('es-AR')} kcal`}
                </p>
              </Card>
            </section>

            <section>
              <SectionHeader title="Agregar" />
              <Card>
                <Row onClick={() => setAdding(true)}>
                  <Plus size={20} className="shrink-0 text-accent" />
                  <span className="flex-1 font-semibold">Agregar calorías</span>
                </Row>
              </Card>
            </section>

            <section>
              <SectionHeader title="Registrado hoy" />
              {todayEntries.length === 0 ? (
                <EmptyState title="Nada registrado todavía" />
              ) : (
                <Card>
                  {todayEntries.map((e) => (
                    <Row key={e.id}>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[15px] font-semibold tabular-nums">
                          {e.kcal.toLocaleString('es-AR')} kcal
                        </p>
                        {e.label && <p className="truncate text-[13px] text-ink-3">{e.label}</p>}
                      </div>
                      <button
                        onClick={() => softDelete('calorieEntries', e.id)}
                        aria-label="Eliminar"
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-danger/70 active:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Row>
                  ))}
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      <Suspense fallback={null}>
        {adding && userId && (
          <CalorieAddSheet userId={userId} onClose={() => setAdding(false)} />
        )}
      </Suspense>
    </div>
  )
}
