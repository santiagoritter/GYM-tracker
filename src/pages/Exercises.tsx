import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Search, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MUSCLE_STYLES, MuscleChip } from '@/components/gym/MuscleChip'
import ExerciseDetailSheet from '@/components/gym/ExerciseDetailSheet'
import EquipmentIcon from '@/components/gym/EquipmentIcon'
import { Card, EmptyState } from '@/components/ui/Card'
import { DIFFICULTY_DOT, DIFFICULTY_LABELS } from '@/lib/difficulty'
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

  // Virtualizada: 107 ejercicios sin virtualizar montaban ~500+ nodos DOM
  // (ícono + chips por fila) de una sola vez, lo que trababa el scroll en
  // Android de gama media. El documento entero scrollea (no hay contenedor
  // propio con overflow-y-auto, ver Layout.tsx), así que se mide contra la
  // ventana, no contra un div.
  const listRef = useRef<HTMLDivElement>(null)
  const virtualizer = useWindowVirtualizer({
    count: filtered.length,
    estimateSize: () => 112,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })

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

        {/* Lista virtualizada: solo se montan las filas visibles + overscan,
            no las 107. El hairline entre filas se dibuja a mano (border-t
            condicional al índice) porque el truco de Row basado en
            :not(:first-child) asume hijos DOM estables, y acá se montan y
            desmontan filas al scrollear. */}
        {filtered.length === 0 ? (
          <EmptyState title="Sin resultados" description="Probá con otro término o sacá algún filtro." />
        ) : (
          <Card>
            <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((vItem) => {
                const e = filtered[vItem.index]
                const pr = prMap.get(e.id)
                return (
                  <div
                    key={vItem.key}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vItem.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <button
                      onClick={() => setSelectedExercise(e)}
                      className={cn(
                        'flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2',
                        vItem.index !== 0 && 'border-t border-line-2'
                      )}
                    >
                      {/* Insignia de equipo, teñida con el color del músculo
                          primario — un solo elemento visual comunica equipo
                          (ícono) y grupo muscular (color), reusando la misma
                          paleta que ya usan los chips de abajo. */}
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                          MUSCLE_STYLES[e.musclePrimary[0]]
                        )}
                      >
                        <EquipmentIcon equipment={e.equipment} size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold leading-tight">{e.name}</p>
                            <p className="mt-0.5 truncate text-[12px] text-ink-3">{e.nameEn}</p>
                          </div>
                          <span
                            className="mt-1 flex shrink-0 items-center gap-1 text-[11px] text-ink-3"
                            title={DIFFICULTY_LABELS[e.difficulty]}
                          >
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DIFFICULTY_DOT[e.difficulty])} />
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
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
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
