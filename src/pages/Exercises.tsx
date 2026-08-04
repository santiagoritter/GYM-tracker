import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MuscleChip } from '@/components/gym/MuscleChip'
import ExerciseDetailSheet from '@/components/gym/ExerciseDetailSheet'
import EquipmentIcon from '@/components/gym/EquipmentIcon'
import { Card, EmptyState, Row } from '@/components/ui/Card'
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
        <div className="flex h-11 items-center gap-2.5 rounded-sm bg-fill px-4">
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
                'flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-medium transition-colors',
                muscle === m
                  ? 'bg-accent text-bg'
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
                'flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-medium transition-colors',
                equipment === eq
                  ? 'bg-info text-white'
                  : 'bg-fill text-ink-2 active:bg-fill-2'
              )}
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>

        <p className="px-1 text-[13px] text-ink-3">{filtered.length} ejercicios</p>

        {/* Lista: una Card, filas separadas por hairline — antes cada
            ejercicio era su propia tarjeta flotante apilada. */}
        {filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Probá con otro término o sacá algún filtro." />
        ) : (
          <Card>
            {filtered.map((e) => {
              const pr = prMap.get(e.id)
              return (
                <Row key={e.id} onClick={() => setSelectedExercise(e)} className="flex-col items-stretch">
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{e.name}</p>
                      <p className="mt-0.5 text-[12px] text-ink-3">{e.nameEn}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-ink-3">
                      <EquipmentIcon equipment={e.equipment} size={13} />
                      {EQUIPMENT_LABELS[e.equipment]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.musclePrimary.map((m) => (
                      <MuscleChip key={m} muscle={m} />
                    ))}
                    {e.muscleSecondary.slice(0, 2).map((m) => (
                      <MuscleChip key={m} muscle={m} secondary />
                    ))}
                  </div>
                  {pr && (
                    <div className="mt-2 flex items-center gap-1.5 text-[12px] text-accent">
                      <Trophy size={12} />
                      <span className="font-mono font-bold tabular-nums">
                        {pr.weightKg} kg × {pr.reps}
                      </span>
                      <span className="text-ink-3">
                        · 1RM <span className="tabular-nums">{pr.oneRmKg}</span> kg
                      </span>
                    </div>
                  )}
                </Row>
              )
            })}
          </Card>
        )}
      </div>

      <ExerciseDetailSheet
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  )
}
