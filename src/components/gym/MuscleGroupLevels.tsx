import { Dumbbell } from 'lucide-react'
import { useMuscleGroupLevels } from '@/hooks/useMuscleGroupLevels'
import { MuscleGroupRadar } from '@/components/gym/MuscleGroupRadar'
import { LEVEL_LABELS } from '@/lib/strengthStandards'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'
import { Card, EmptyState, Row } from '@/components/ui/Card'

/**
 * Nivel de fuerza por grupo muscular. Deliberadamente sobrio: texto y una
 * barra fina, sin colores por grupo ni iconos de trofeo — el brief pide
 * explícitamente evitar "badges tipo videojuego con emojis".
 */
export function MuscleGroupLevels() {
  const { levels, profileComplete } = useMuscleGroupLevels()

  if (!profileComplete) return null

  const withData = levels.filter((l) => l.result.level !== 'no_data')
  if (withData.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={28} />}
        title="Sin datos todavía"
        description="A medida que registres PRs en más ejercicios, cada grupo muscular va a mostrar su nivel."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Vista de conjunto arriba de la lista — la lista sigue siendo el
          detalle exacto por músculo, esto es "dónde estoy parejo y dónde
          no" de un vistazo. Un solo acento: es una sola serie de datos (una
          persona), no hace falta color por grupo. */}
      <div className="h-64 rounded-xl bg-surface p-2">
        <MuscleGroupRadar levels={levels} />
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
