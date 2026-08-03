import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X } from 'lucide-react'
import { db } from '@/db/schema'
import { workoutsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MuscleChip } from '@/components/gym/MuscleChip'
import EquipmentIcon from '@/components/gym/EquipmentIcon'
import Portal from '@/components/ui/Portal'
import { cn } from '@/lib/utils'

const MUSCLE_FILTERS = Object.keys(MUSCLE_LABELS) as MuscleGroup[]

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  band: 'Banda',
  kettlebell: 'Kettlebell',
  other: 'Otro',
}
const EQUIPMENT_FILTERS = Object.keys(EQUIPMENT_LABELS) as Equipment[]

interface Props {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
  excludeIds?: string[]
}

export function ExercisePicker({ onSelect, onClose, excludeIds = [] }: Props) {
  const userId = useCurrentUserId()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []

  // Últimos ejercicios distintos entrenados por este usuario, más reciente primero.
  const recentIds = useLiveQuery(async () => {
    if (!userId) return []
    const ownWorkoutIds = new Set((await workoutsFor(userId).toArray()).map((w) => w.id))
    const allSets = await db.workoutSets.toArray()
    const ordered = allSets
      .filter((s) => ownWorkoutIds.has(s.workoutId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const seen = new Set<string>()
    const ids: string[] = []
    for (const s of ordered) {
      if (seen.has(s.exerciseId)) continue
      seen.add(s.exerciseId)
      ids.push(s.exerciseId)
      if (ids.length >= 6) break
    }
    return ids
  }, [userId]) ?? []

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const recentExercises = useMemo(
    () =>
      recentIds
        .map((id) => exerciseMap.get(id))
        .filter((e): e is Exercise => Boolean(e) && !excludeIds.includes(e!.id)),
    [recentIds, exerciseMap, excludeIds]
  )

  const hasActiveFilter = query.trim() !== '' || muscle !== null || equipment !== null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => !muscle || e.musclePrimary.includes(muscle))
      .filter((e) => !equipment || e.equipment === equipment)
      .filter(
        (e) =>
          !q || e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, query, muscle, equipment, excludeIds])

  const renderRow = (e: Exercise) => (
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
      <span className="flex items-center gap-1 text-xs uppercase text-ink-3">
        <EquipmentIcon equipment={e.equipment} size={14} />
      </span>
    </button>
  )

  return (
    <Portal>
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
              className="w-full bg-transparent text-base outline-none placeholder:text-ink-3"
            />
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-2 active:bg-surface">
            <X size={22} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
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

        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {EQUIPMENT_FILTERS.map((eq) => (
            <button
              key={eq}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                equipment === eq
                  ? 'border-info bg-info text-white'
                  : 'border-line-2 text-ink-2'
              )}
            >
              <EquipmentIcon equipment={eq} size={13} />
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {!hasActiveFilter && recentExercises.length > 0 && (
            <div className="mb-2">
              <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Recientes
              </p>
              {recentExercises.map(renderRow)}
              <p className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                Todos
              </p>
            </div>
          )}

          {filtered.map(renderRow)}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-ink-3">Sin resultados</p>
          )}
        </div>
        </div>
      </div>
    </Portal>
  )
}
