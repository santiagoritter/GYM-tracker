import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useChartColors } from '@/hooks/useChartColors'
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
  const chartColors = useChartColors()
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

  const radarData = levels.map(({ muscle, result }) => ({
    muscle: MUSCLE_LABELS[muscle],
    progress: result.progress,
  }))

  return (
    <div className="space-y-3">
      {/* Vista de conjunto arriba de la lista — la lista sigue siendo el
          detalle exacto por músculo, esto es "dónde estoy parejo y dónde
          no" de un vistazo. Un solo acento: es una sola serie de datos (una
          persona), no hace falta color por grupo. */}
      <div className="h-64 rounded-xl bg-surface p-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid stroke={chartColors.grid} />
            <PolarAngleAxis
              dataKey="muscle"
              stroke={chartColors.axis}
              tick={{ fill: chartColors.axis, fontSize: 10 }}
            />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar
              dataKey="progress"
              stroke={chartColors.accent}
              fill={chartColors.accent}
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
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
    </div>
  )
}
