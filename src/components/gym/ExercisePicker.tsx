import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X } from 'lucide-react'
import { db } from '@/db/schema'
import type { Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MuscleChip } from '@/components/gym/MuscleChip'
import { cn } from '@/lib/utils'

const MUSCLE_FILTERS = Object.keys(MUSCLE_LABELS) as MuscleGroup[]

interface Props {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
  excludeIds?: string[]
}

export function ExercisePicker({ onSelect, onClose, excludeIds = [] }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => !muscle || e.musclePrimary.includes(muscle))
      .filter(
        (e) =>
          !q || e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, query, muscle, excludeIds])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-3 py-2">
            <Search size={18} className="text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-2 active:bg-surface">
            <X size={22} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(muscle === m ? null : m)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                muscle === m
                  ? 'border-accent bg-accent text-bg'
                  : 'border-line-2 text-ink-2'
              )}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e)}
              className="flex w-full items-center justify-between border-b border-line py-3 text-left active:bg-surface"
            >
              <div>
                <p className="font-medium">{e.name}</p>
                <div className="mt-1 flex gap-1">
                  {e.musclePrimary.map((m) => (
                    <MuscleChip key={m} muscle={m} />
                  ))}
                </div>
              </div>
              <span className="text-xs uppercase text-ink-3">{e.equipment}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-ink-3">Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  )
}
