import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { getMuscleGroupLevels, type MuscleGroupStrength } from '@/lib/muscleGroupStrength'
import { ageFromDob } from '@/lib/strengthStandards'

/** Compartido entre MuscleGroupLevels.tsx (lista completa en Niveles) y
 * CalendarHeatmap.tsx (radar chico en el reverso de Inicio) — antes vivía
 * duplicado solo en el primero. */
export function useMuscleGroupLevels(): {
  levels: MuscleGroupStrength[]
  profileComplete: boolean
} {
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []
  const prByExerciseId = useMemo(() => new Map(prs.map((p) => [p.exerciseId, p])), [prs])

  const profileComplete = Boolean(profile?.sex && profile?.bodyWeightKg && profile?.dob)

  const levels = useMemo(() => {
    if (!profileComplete) return []
    return getMuscleGroupLevels(
      exercises,
      prByExerciseId,
      profile!.bodyWeightKg!,
      profile!.sex!,
      ageFromDob(profile!.dob!)
    )
  }, [profileComplete, exercises, prByExerciseId, profile])

  return { levels, profileComplete }
}
