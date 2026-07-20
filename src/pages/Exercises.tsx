import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import type { Equipment, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MuscleChip } from '@/components/gym/MuscleChip'
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
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const prs = useLiveQuery(() => db.personalRecords.toArray(), []) ?? []
  const prMap = useMemo(() => new Map(prs.map((p) => [p.exerciseId, p])), [prs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((e) => !muscle || e.musclePrimary.includes(muscle))
      .filter((e) => !equipment || e.equipment === equipment)
      .filter(
        (e) =>
          !q || e.name.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, query, muscle, equipment])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ejercicios</h1>

      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
        <Search size={18} className="text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {MUSCLE_FILTERS.map((m) => (
          <button
            key={m}
            onClick={() => setMuscle(muscle === m ? null : m)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
              muscle === m ? 'border-accent bg-accent text-bg' : 'border-line-2 text-ink-2'
            )}
          >
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
          <button
            key={eq}
            onClick={() => setEquipment(equipment === eq ? null : eq)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium',
              equipment === eq
                ? 'border-info bg-info text-bg'
                : 'border-line-2 text-ink-2'
            )}
          >
            {EQUIPMENT_LABELS[eq]}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-3">{filtered.length} ejercicios</p>

      <div className="space-y-2">
        {filtered.map((e) => {
          const pr = prMap.get(e.id)
          return (
            <div key={e.id} className="rounded-xl bg-surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-ink-3">{e.nameEn}</p>
                </div>
                <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase text-ink-2">
                  {EQUIPMENT_LABELS[e.equipment]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {e.musclePrimary.map((m) => (
                  <MuscleChip key={m} muscle={m} />
                ))}
              </div>
              {pr && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                  <Trophy size={13} />
                  PR: <span className="font-mono font-bold">{pr.weightKg} kg × {pr.reps}</span>
                  <span className="text-ink-3">(1RM est. {pr.oneRmKg} kg)</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
