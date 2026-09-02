import { formatPace, SPLIT_DISTANCE_M, type Split } from '@/lib/run'
import { cn } from '@/lib/utils'

/**
 * Splits por kilómetro como barras horizontales — más rápido = barra más
 * larga. Sin Recharts: es una lista de barras `scaleX`, no vale un chart.
 * El mejor km se marca con el acento.
 */
export default function RunSplits({ splits }: { splits: Split[] }) {
  if (splits.length === 0) return null

  const paces = splits.map((s) => s.paceSecPerKm)
  const fastest = Math.min(...paces)
  const slowest = Math.max(...paces)
  const range = slowest - fastest || 1
  const fullSplits = splits.filter((s) => s.distanceM === SPLIT_DISTANCE_M)
  const bestPace = fullSplits.length > 0 ? Math.min(...fullSplits.map((s) => s.paceSecPerKm)) : null

  return (
    <div className="space-y-1.5">
      {splits.map((s) => {
        const isPartial = s.distanceM !== SPLIT_DISTANCE_M
        const isBest = !isPartial && s.paceSecPerKm === bestPace
        // Más rápido → más largo. 0.35..1 para que el más lento no quede vacío.
        const fill = 0.35 + 0.65 * (1 - (s.paceSecPerKm - fastest) / range)
        return (
          <div key={s.index} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-mono text-[12px] tabular-nums text-ink-3">
              {isPartial ? `${(s.distanceM / 1000).toFixed(1)}` : s.index}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-xs bg-fill">
              <div
                className={cn('h-full origin-left rounded-xs', isBest ? 'bg-accent' : 'bg-ink-4')}
                style={{ transform: `scaleX(${fill})`, transition: 'transform 400ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-2">
              {formatPace(s.paceSecPerKm)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
