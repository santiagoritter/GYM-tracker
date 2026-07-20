import { useEffect, useState } from 'react'
import { FastForward, Plus } from 'lucide-react'
import { useWorkoutStore } from '@/stores/workoutStore'

export function RestTimer() {
  const { restTimer, skipRest, extendRest } = useWorkoutStore()
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!restTimer.endsAt) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((restTimer.endsAt! - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        navigator.vibrate?.(200)
        skipRest()
      }
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [restTimer.endsAt, skipRest])

  if (!restTimer.endsAt) return null

  const progress = restTimer.totalSeconds > 0 ? remaining / restTimer.totalSeconds : 0
  const min = Math.floor(remaining / 60)
  const sec = remaining % 60

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-line-2 bg-surface-2 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-4xl font-bold tabular-nums text-accent">
          {min}:{String(sec).padStart(2, '0')}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => extendRest(30)}
            className="flex items-center gap-1 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink-2 active:bg-surface-3"
          >
            <Plus size={16} /> 30s
          </button>
          <button
            onClick={skipRest}
            className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg active:bg-accent-dim"
          >
            <FastForward size={16} /> Saltar
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
