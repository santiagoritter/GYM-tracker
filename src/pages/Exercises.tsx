import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Search, SearchX, SlidersHorizontal, Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useRecentExerciseIds } from '@/hooks/useRecentExerciseIds'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { MUSCLE_LABELS, MUSCLE_STYLES } from '@/components/gym/MuscleChip'
import ExerciseDetailSheet from '@/components/gym/ExerciseDetailSheet'
import ExerciseFiltersSheet from '@/components/gym/ExerciseFiltersSheet'
import EquipmentIcon from '@/components/gym/EquipmentIcon'
import { Card, EmptyState, SectionHeader } from '@/components/ui/Card'
import { DIFFICULTY_DOT, DIFFICULTY_LABELS } from '@/lib/difficulty'
import { EQUIPMENT_LABELS } from '@/lib/exerciseFilters'
import { cn } from '@/lib/utils'

export default function Exercises() {
  const userId = useCurrentUserId()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []
  const prMap = useMemo(() => new Map(prs.map((p) => [p.exerciseId, p])), [prs])

  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const recentIds = useRecentExerciseIds(userId)
  const recentExercises = useMemo(
    () => recentIds.map((id) => exerciseMap.get(id)).filter((e): e is Exercise => Boolean(e)),
    [recentIds, exerciseMap]
  )

  const hasActiveFilter = query.trim() !== '' || muscle !== null || equipment !== null
  const activeFilterCount = (muscle ? 1 : 0) + (equipment ? 1 : 0)

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
    estimateSize: () => 84,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })

  return (
    <>
      <div className="mx-auto content-width space-y-4">
        {/* Header */}
        <h1 className="text-2xl font-bold">Ejercicios</h1>

        {/* Buscador + acceso a filtros. Antes había acá dos filas
            completas de pills (12 de músculo + 8 de equipo, 20 botones
            siempre visibles) — ocupaban ~25% del viewport en 393px
            antes de llegar a un solo ejercicio. Ahora viven en
            ExerciseFiltersSheet; acá solo queda el punto de entrada. */}
        <div className="flex gap-2">
          <div className="flex h-11 flex-1 items-center gap-2.5 rounded-sm bg-fill px-4">
            <Search size={16} className="shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicios…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="Filtros"
            className={cn(
              'flex h-11 shrink-0 items-center gap-1.5 rounded-sm px-3.5 text-[13px] font-semibold transition-colors',
              activeFilterCount > 0
                ? 'bg-accent text-bg'
                : 'bg-fill text-ink-2 active:bg-fill-2'
            )}
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && <span className="font-mono">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Recientes: mismo criterio que ya usa ExercisePicker.tsx (el
            sheet para elegir ejercicio desde una rutina) — le da a la
            pantalla un punto de entrada real en vez de arrancar directo
            en el scroll alfabético de 107 ejercicios. */}
        {!hasActiveFilter && recentExercises.length > 0 && (
          <section>
            <SectionHeader title="Recientes" />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {recentExercises.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExercise(e)}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-fill py-2 pl-2 pr-3.5 text-left active:bg-fill-2"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      MUSCLE_STYLES[e.musclePrimary[0]]
                    )}
                  >
                    <EquipmentIcon equipment={e.equipment} size={14} />
                  </span>
                  <span className="max-w-[140px] truncate text-[13px] font-medium">{e.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="px-1 text-[13px] text-ink-3">{filtered.length} ejercicios</p>

        {/* Lista virtualizada: solo se montan las filas visibles + overscan,
            no las 107. El hairline entre filas se dibuja a mano (border-t
            condicional al índice) porque el truco de Row basado en
            :not(:first-child) asume hijos DOM estables, y acá se montan y
            desmontan filas al scrollear. */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} />}
            title="Sin resultados"
            description="Probá con otro término o sacá algún filtro."
          />
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
                          (ícono) y grupo muscular (color). Más grande que
                          antes (48px, ícono 22px): son dibujo propio
                          (EquipmentIcon.tsx), vale la pena que se noten en
                          vez de quedar chicos. Vidrio, no relleno plano:
                          pedido explícito del usuario sobre la primera
                          versión — mismo backdrop-blur-xs ya sancionado
                          para la pastilla de la tab bar (Fase 46). */}
                      <span
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xs',
                          MUSCLE_STYLES[e.musclePrimary[0]]
                        )}
                      >
                        <EquipmentIcon equipment={e.equipment} size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* Un solo elemento dominante por fila: el nombre,
                            a ancho completo (sin nada compitiendo en la
                            misma línea). El nombre en inglés se saca de acá
                            (sigue en el header de ExerciseDetailSheet, y el
                            buscador lo sigue indexando aunque no se
                            muestre). */}
                        <p className="truncate font-semibold leading-tight">{e.name}</p>
                        {/* Una sola línea de metadatos, texto plano — sin
                            chip de color: la insignia ya dice el músculo
                            con su tinte, repetirlo en un pill aparte era
                            una capa decorativa de más. Mismo criterio que
                            las filas de Home.tsx (nombre + una línea muda,
                            sin badges). */}
                        <p
                          className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3"
                          title={DIFFICULTY_LABELS[e.difficulty]}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DIFFICULTY_DOT[e.difficulty])} />
                          <span className="truncate">
                            {EQUIPMENT_LABELS[e.equipment]} · {MUSCLE_LABELS[e.musclePrimary[0]]}
                          </span>
                        </p>
                        {pr && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-accent">
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

      {filtersOpen && (
        <ExerciseFiltersSheet
          muscle={muscle}
          equipment={equipment}
          resultCount={filtered.length}
          onMuscleChange={setMuscle}
          onEquipmentChange={setEquipment}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      <ExerciseDetailSheet
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  )
}
