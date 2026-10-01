import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { getKeptAt, isStaleWorkout, lastActivityAt, markKept } from '@/lib/staleWorkout'
import type { Workout } from '@/types'

/** ¿El entreno en curso quedó abandonado? Ver lib/staleWorkout.ts. Se
 * reevalúa cada minuto: un entreno puede vencerse con la pantalla abierta. */
export function useStaleWorkout(workout: Workout | undefined): {
  stale: boolean
  lastActivity: string | null
  keep: () => void
} {
  const [now, setNow] = useState(() => Date.now())
  const [keptAt, setKeptAt] = useState<string | null>(null)
  const workoutId = workout?.id

  useEffect(() => {
    setKeptAt(workoutId ? getKeptAt(workoutId) : null)
  }, [workoutId])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const sets = useLiveQuery(
    () => (workoutId ? db.workoutSets.where('workoutId').equals(workoutId).toArray() : []),
    [workoutId]
  )

  if (!workout || !sets) return { stale: false, lastActivity: null, keep: () => undefined }
  return {
    stale: isStaleWorkout(workout, sets, now, keptAt),
    lastActivity: lastActivityAt(workout, sets, keptAt),
    keep: () => {
      const at = new Date()
      markKept(workout.id, at)
      setKeptAt(at.toISOString())
      setNow(at.getTime())
    },
  }
}
