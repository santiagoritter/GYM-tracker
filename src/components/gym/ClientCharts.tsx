import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
import { SectionHeader } from '@/components/ui/Card'

export interface WeeklyVolumePoint {
  label: string
  kg: number
}

export interface WeightPoint {
  label: string
  kg: number
}

/**
 * Gráficos del panel del alumno (modo coach): volumen semanal y peso
 * corporal. Puramente presentacional — recibe los puntos ya calculados, no
 * lee Dexie (a diferencia de `WeightCharts`, que es de los datos propios).
 * Se importa con `lazy()`: recharts pesa ~400 KB y solo hace falta al abrir
 * la pestaña "Progreso".
 */
export default function ClientCharts({
  weeklyVolume,
  bodyWeight,
  units,
}: {
  weeklyVolume: WeeklyVolumePoint[]
  bodyWeight: WeightPoint[]
  units: 'kg' | 'lbs'
}) {
  const chartColors = useChartColors()
  const tooltip = {
    contentStyle: {
      backgroundColor: chartColors.tooltipBg,
      border: `1px solid ${chartColors.tooltipBorder}`,
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: chartColors.tooltipText },
  }

  return (
    <div className="space-y-5">
      <section>
        <SectionHeader title="Volumen semanal" />
        {weeklyVolume.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">
            Todavía no hay entrenos para graficar.
          </p>
        ) : (
          <div className="h-48 rounded-xl bg-surface p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolume} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.axis} fontSize={10} />
                <YAxis stroke={chartColors.axis} fontSize={11} />
                <Tooltip
                  cursor={{ fill: chartColors.cursor }}
                  {...tooltip}
                  formatter={(value) => [`${value} ${units}`, 'Volumen']}
                />
                <Bar dataKey="kg" fill={chartColors.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Peso corporal" />
        {bodyWeight.length < 2 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">
            Hacen falta al menos dos mediciones de peso para ver la evolución.
          </p>
        ) : (
          <div className="h-48 rounded-xl bg-surface p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyWeight} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke={chartColors.axis} fontSize={10} />
                <YAxis stroke={chartColors.axis} fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip {...tooltip} formatter={(value) => [`${value} ${units}`, 'Peso']} />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke={chartColors.info}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartColors.surface, stroke: chartColors.info, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
