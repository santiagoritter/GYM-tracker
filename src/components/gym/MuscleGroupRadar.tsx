import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'
import type { MuscleGroupStrength } from '@/lib/muscleGroupStrength'

/** El radar en sí, sin el contenedor ni la lista de detalle — compartido
 * entre MuscleGroupLevels.tsx (Niveles, tamaño completo) y
 * CalendarHeatmap.tsx (reverso de Inicio, versión chica). */
export function MuscleGroupRadar({
  levels,
  tickFontSize = 10,
}: {
  levels: MuscleGroupStrength[]
  tickFontSize?: number
}) {
  const chartColors = useChartColors()
  const radarData = levels.map(({ muscle, result }) => ({
    muscle: MUSCLE_LABELS[muscle],
    progress: result.progress,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radarData} outerRadius="70%">
        <PolarGrid stroke={chartColors.grid} />
        <PolarAngleAxis
          dataKey="muscle"
          stroke={chartColors.axis}
          tick={{ fill: chartColors.axis, fontSize: tickFontSize }}
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
  )
}
