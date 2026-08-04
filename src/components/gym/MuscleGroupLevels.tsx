import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { getMuscleGroupLevels } from '@/lib/muscleGroupStrength'
import { LEVEL_LABELS, ageFromDob } from '@/lib/strengthStandards'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'
import { Card, EmptyState, Row } from '@/components/ui/Card'

/**
 * Nivel de fuerza por grupo muscular. Deliberadamente sobrio: texto y una
 * barra fina, sin colores por grupo ni iconos de trofeo — el brief pide
 * explícitamente evitar "badges tipo videojuego con emojis".
 */
export function MuscleGroupLevels() {
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

  const profileComplete = profile?.sex && profile?.bodyWeightKg && profile?.dob

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

  if (!profileComplete) return null

  const withData = levels.filter((l) => l.result.level !== 'no_data')
  if (withData.length === 0) {
    return (
      <EmptyState
        title="Sin datos todavía"
        description="A medida que registres PRs en más ejercicios, cada grupo muscular va a mostrar su nivel."
      />
    )
  }

  return (
    <Card>
      {levels.map(({ muscle, result }) => (
        <Row key={muscle} className="flex-col items-stretch gap-1.5">
          <div className="flex w-full items-center justify-between">
            <span className="text-[15px]">{MUSCLE_LABELS[muscle]}</span>
            <span
              className={result.level === 'no_data' ? 'text-[13px] text-ink-3' : 'text-[13px] font-medium text-ink'}
            >
              {LEVEL_LABELS[result.level]}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full origin-left rounded-full bg-ink-2 transition-transform duration-300"
              style={{ transform: `scaleX(${result.progress})` }}
            />
          </div>
        </Row>
      ))}
    </Card>
  )
}
