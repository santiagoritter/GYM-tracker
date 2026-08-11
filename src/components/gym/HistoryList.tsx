import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown } from 'lucide-react'
import { db } from '@/db/schema'
import { cn, formatDate, formatDuration } from '@/lib/utils'
import { EmptyState } from '@/components/ui/Card'

export function HistoryList() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const workouts = useLiveQuery(
    () =>
      db.workouts
        .orderBy('startedAt')
        .reverse()
        .filter((w) => Boolean(w.finishedAt))
        .toArray(),
    []
  )
  // Solo los sets del entreno expandido, vía índice workoutId
  const expandedSets =
    useLiveQuery(
      () =>
        expanded ? db.workoutSets.where('workoutId').equals(expanded).toArray() : [],
      [expanded]
    ) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  return (
    <div className="space-y-3">
      {(workouts ?? []).map((w) => {
        const isOpen = expanded === w.id
        const sets = isOpen ? expandedSets.filter((s) => s.completed === 1) : []
        // Agrupar por ejercicio para el detalle
        const byExercise = new Map<string, typeof sets>()
        for (const s of sets.sort((a, b) => a.setNumber - b.setNumber)) {
          const list = byExercise.get(s.exerciseId) ?? []
          list.push(s)
          byExercise.set(s.exerciseId, list)
        }

        return (
          <div key={w.id} className="overflow-hidden rounded-xl bg-surface">
            <button
              onClick={() => setExpanded(isOpen ? null : w.id)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-ink-2">
                  {formatDate(w.startedAt)} · {formatDuration(w.startedAt, w.finishedAt)} ·{' '}
                  <span className="font-mono">{Math.round(w.totalVolumeKg ?? 0)}</span> kg
                </p>
              </div>
              <ChevronDown
                size={20}
                className={cn('text-ink-3 transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="border-t border-line px-4 py-3">
                {[...byExercise.entries()].map(([exerciseId, exSets]) => (
                  <div key={exerciseId} className="mb-3 last:mb-0">
                    <p className="mb-1 text-sm font-semibold">
                      {exerciseMap.get(exerciseId)?.name ?? 'Ejercicio'}
                    </p>
                    {exSets.map((s) => (
                      <p key={s.id} className="font-mono text-sm text-ink-2">
                        {s.setNumber}. {s.weightKg} kg × {s.reps}
                        {s.isWarmup === 1 && (
                          <span className="ml-2 text-xs text-ink-3">(calent.)</span>
                        )}
                      </p>
                    ))}
                  </div>
                ))}
                {byExercise.size === 0 && (
                  <p className="text-sm text-ink-3">Sin series completadas</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {workouts?.length === 0 && (
        <EmptyState
          title="Sin historial todavía"
          description="Tu historial va a aparecer acá cuando termines tu primer entreno."
        />
      )}
    </div>
  )
}
