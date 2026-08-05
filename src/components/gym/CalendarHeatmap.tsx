import { lazy, Suspense, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Repeat2 } from 'lucide-react'
import { workoutsFor, personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useTrainingStats } from '@/hooks/useTrainingStats'
import { useMuscleGroupLevels } from '@/hooks/useMuscleGroupLevels'
import { localDayKey } from '@/lib/stats'
import { cn } from '@/lib/utils'

// Lazy: recharts son ~112KB gzipped. Home no es una ruta lazy (a
// diferencia de Progress, donde vive el mismo radar en tamaño completo,
// ver App.tsx) — importar MuscleGroupRadar arriba de forma estática
// metería recharts entero en el bundle crítico de la home para TODOS,
// hayan tocado el reverso de esta card o no.
const MuscleGroupRadar = lazy(() =>
  import('@/components/gym/MuscleGroupRadar').then((m) => ({ default: m.MuscleGroupRadar }))
)

const WEEKS = 18
const DAY_MS = 86_400_000
const DOW_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Nivel de intensidad 0-4 según volumen del día. */
function level(volumeKg: number): number {
  if (volumeKg <= 0) return 0
  if (volumeKg < 2000) return 1
  if (volumeKg < 5000) return 2
  if (volumeKg < 10000) return 3
  return 4
}

const LEVEL_CLASS = [
  'bg-surface-2',
  'bg-accent/25',
  'bg-accent/50',
  'bg-accent/75',
  'bg-accent',
]

export default function CalendarHeatmap() {
  const userId = useCurrentUserId()
  const [flipped, setFlipped] = useState(false)
  // Sticky: una vez que se flippeó una vez, el radar (y su import lazy)
  // quedan montados — evita recargarlo cada vez que se vuelve a flippear
  // de un lado al otro.
  const [hasFlipped, setHasFlipped] = useState(false)
  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => Boolean(w.finishedAt)).toArray() : []),
    [userId]
  )
  const trainingStats = useTrainingStats()
  const { levels, profileComplete } = useMuscleGroupLevels()
  const withData = levels.filter((l) => l.result.level !== 'no_data')
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []
  const prsThisMonth = useMemo(() => {
    const now = new Date()
    return prs.filter((p) => {
      const d = new Date(p.achievedAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [prs])

  const { columns, monthLabels } = useMemo(() => {
    const volByDay = new Map<string, number>()
    for (const w of workouts ?? []) {
      const k = localDayKey(w.startedAt)
      volByDay.set(k, (volByDay.get(k) ?? 0) + (w.totalVolumeKg ?? 0))
    }

    // Arrancar en el lunes de hace WEEKS-1 semanas
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dow = (today.getDay() + 6) % 7
    const start = new Date(today.getTime() - (dow + (WEEKS - 1) * 7) * DAY_MS)

    const cols: { key: string; date: Date; vol: number; future: boolean }[][] = []
    const labels: { col: number; text: string }[] = []
    let lastMonth = -1

    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; date: Date; vol: number; future: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS)
        const key = localDayKey(date)
        col.push({
          key,
          date,
          vol: volByDay.get(key) ?? 0,
          future: date.getTime() > today.getTime(),
        })
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth()
          labels.push({
            col: w,
            text: date.toLocaleDateString('es-AR', { month: 'short' }),
          })
        }
      }
      cols.push(col)
    }

    return { columns: cols, monthLabels: labels }
  }, [workouts])

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => {
          setFlipped((f) => !f)
          setHasFlipped(true)
        }}
        aria-pressed={flipped}
        aria-label="Ver resumen del período"
        className={cn(
          'grid w-full grid-cols-1 grid-rows-1 text-left [transform-style:preserve-3d] transition-transform duration-500 ease-out',
          flipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
        )}
      >
        {/* Cara frontal: la grilla de actividad, sin cambios. */}
        <div className="col-start-1 row-start-1 rounded-xl bg-surface p-4 [backface-visibility:hidden]">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-ink-3">Actividad</span>
            <Repeat2 size={13} className="text-ink-3" />
          </div>
          <div className="overflow-x-auto [scrollbar-width:none]">
            <div className="inline-flex flex-col gap-1">
              {/* Etiquetas de mes */}
              <div className="ml-5 flex gap-1">
                {columns.map((_, i) => {
                  const label = monthLabels.find((m) => m.col === i)
                  return (
                    <span key={i} className="w-3 text-[9px] capitalize text-ink-3">
                      {label?.text ?? ''}
                    </span>
                  )
                })}
              </div>
              {/* Grilla con etiquetas de día */}
              <div className="flex gap-1">
                <div className="flex flex-col justify-between gap-1 pr-0.5">
                  {DOW_LABELS.map((d, i) => (
                    <span key={i} className="h-3 text-[8px] leading-3 text-ink-3">
                      {i % 2 === 1 ? d : ''}
                    </span>
                  ))}
                </div>
                {columns.map((col, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {col.map((cell) => (
                      <div
                        key={cell.key}
                        title={`${cell.date.toLocaleDateString('es-AR')}: ${Math.round(cell.vol)} kg`}
                        className={cn(
                          'h-3 w-3 rounded-sm',
                          cell.future ? 'opacity-0' : LEVEL_CLASS[level(cell.vol)]
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-ink-3">
            <span>menos</span>
            {LEVEL_CLASS.map((c, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-sm', c)} />
            ))}
            <span>más</span>
          </div>
        </div>

        {/* Cara trasera: el mismo radar de "puntos fuertes" que la
            pantalla de Niveles (useMuscleGroupLevels/MuscleGroupRadar
            compartidos), más los números que sí tienen sentido de un
            vistazo en Inicio — reemplaza los agregados de {WEEKS} semanas
            de antes, que quedaban redundantes con esto. */}
        <div className="col-start-1 row-start-1 rounded-xl bg-surface p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-3">Puntos fuertes</span>
            <Repeat2 size={13} className="text-ink-3" />
          </div>
          {profileComplete && withData.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="h-40 w-[52%] shrink-0">
                {hasFlipped && (
                  <Suspense fallback={null}>
                    <MuscleGroupRadar levels={levels} tickFontSize={8} />
                  </Suspense>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="font-mono text-xl font-bold leading-none tabular-nums">
                    {trainingStats.thisWeekCount}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">entrenos esta semana</p>
                </div>
                <div>
                  <p className="font-mono text-xl font-bold leading-none tabular-nums">
                    {trainingStats.currentStreak}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {trainingStats.currentStreak === 1 ? 'día de racha' : 'días de racha'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xl font-bold leading-none tabular-nums">
                    {prsThisMonth}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {prsThisMonth === 1 ? 'PR este mes' : 'PRs este mes'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-9 text-center text-[13px] text-ink-3">
              Completá tu perfil y registrá PRs para ver tus puntos fuertes.
            </p>
          )}
        </div>
      </button>
    </div>
  )
}
