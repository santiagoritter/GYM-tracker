import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Repeat2 } from 'lucide-react'
import { workoutsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { localDayKey } from '@/lib/stats'
import { cn } from '@/lib/utils'

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
  const workouts = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => Boolean(w.finishedAt)).toArray() : []),
    [userId]
  )

  const { columns, monthLabels, stats } = useMemo(() => {
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

    // Agregados del período mostrado (no de todo el historial): son los
    // que la cara trasera puede mostrar sin mentir sobre lo que se ve.
    let sessions = 0
    let totalVol = 0
    let best: { date: Date; vol: number } | null = null
    for (const col of cols) {
      for (const cell of col) {
        if (cell.future || cell.vol <= 0) continue
        sessions += 1
        totalVol += cell.vol
        if (!best || cell.vol > best.vol) best = { date: cell.date, vol: cell.vol }
      }
    }

    return { columns: cols, monthLabels: labels, stats: { sessions, totalVol, best } }
  }, [workouts])

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
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

        {/* Cara trasera: agregados del mismo período que no se muestran
            en ningún otro lado — no repite el anillo semanal de
            Progreso, que es solo esta semana. */}
        <div className="col-start-1 row-start-1 rounded-xl bg-surface p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] text-ink-3">Últimas {WEEKS} semanas</span>
            <Repeat2 size={13} className="text-ink-3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-2xl font-bold leading-none tabular-nums">
                {stats.sessions}
              </p>
              <p className="mt-1 text-[12px] text-ink-3">entrenos</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold leading-none tabular-nums">
                {Math.round(stats.totalVol).toLocaleString('es-AR')}
              </p>
              <p className="mt-1 text-[12px] text-ink-3">kg movidos</p>
            </div>
          </div>
          <div className="mt-4 border-t border-line-2 pt-3">
            <p className="text-[12px] text-ink-3">Mejor día</p>
            <p className="mt-0.5 text-[14px] font-medium">
              {stats.best
                ? `${stats.best.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} · ${Math.round(stats.best.vol).toLocaleString('es-AR')} kg`
                : 'Todavía sin datos'}
            </p>
          </div>
        </div>
      </button>
    </div>
  )
}
