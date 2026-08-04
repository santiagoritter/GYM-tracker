import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Search, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MuscleChip } from '@/components/gym/MuscleChip'
import ExerciseDetailSheet from '@/components/gym/ExerciseDetailSheet'
import EquipmentIcon from '@/components/gym/EquipmentIcon'
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

export default function Exercises() {
  const userId = useCurrentUserId()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []
  const prMap = useMemo(() => new Map(prs.map((p) => [p.exerciseId, p])), [prs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => !muscle || e.musclePrimary.includes(muscle))
      .filter((e) => !equipment || e.equipment === equipment)
      .filter(
        (e) => !q || e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, query, muscle, equipment])

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <h1 className="text-2xl font-bold">Ejercicios</h1>

        {/* Buscador iOS */}
        <div className="flex items-center gap-2.5 rounded-2xl bg-fill px-4 py-3">
          <Search size={16} className="shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicios…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
        </div>

        {/* Filtros músculo */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {MUSCLE_FILTERS.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(muscle === m ? null : m)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
                muscle === m
                  ? 'bg-accent text-black'
                  : 'bg-fill text-ink-2 active:bg-fill-2'
              )}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Filtros equipo */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
            <button
              key={eq}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-150',
                equipment === eq
                  ? 'bg-info text-white'
                  : 'bg-fill text-ink-2 active:bg-fill-2'
              )}
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>

        <p className="text-[12px] font-medium text-ink-3">{filtered.length} ejercicios</p>

        {/* Lista */}
        <div className="space-y-1.5">
          {filtered.map((e) => {
            const pr = prMap.get(e.id)
            return (
              <button
                key={e.id}
                onClick={() => setSelectedExercise(e)}
                className="w-full rounded-2xl bg-surface p-4 text-left transition-all duration-150 active:scale-[0.98] active:bg-surface-2 card-shine"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{e.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">{e.nameEn}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-2">
                      <EquipmentIcon equipment={e.equipment} size={12} />
                      {EQUIPMENT_LABELS[e.equipment]}
                    </span>
                    <ChevronRight size={14} className="text-ink-4" />
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {e.musclePrimary.map((m) => (
                    <MuscleChip key={m} muscle={m} />
                  ))}
                  {e.muscleSecondary.slice(0, 2).map((m) => (
                    <MuscleChip key={m} muscle={m} secondary />
                  ))}
                </div>
                {pr && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-accent">
                    <Trophy size={12} />
                    <span className="font-mono font-bold">{pr.weightKg} kg × {pr.reps}</span>
                    <span className="text-ink-3">· 1RM {pr.oneRmKg} kg</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <ExerciseDetailSheet
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  )
}
