import type { MuscleGroup } from '@/types'
import { cn } from '@/lib/utils'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  quads: 'Cuádriceps',
  hamstrings: 'Femorales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  core: 'Core',
  cardio: 'Cardio',
}

const MUSCLE_STYLES: Record<MuscleGroup, string> = {
  chest: 'text-muscle-chest border-muscle-chest/40 bg-muscle-chest/10',
  back: 'text-muscle-back border-muscle-back/40 bg-muscle-back/10',
  shoulders: 'text-muscle-shoulders border-muscle-shoulders/40 bg-muscle-shoulders/10',
  biceps: 'text-muscle-arms border-muscle-arms/40 bg-muscle-arms/10',
  triceps: 'text-muscle-arms border-muscle-arms/40 bg-muscle-arms/10',
  forearms: 'text-muscle-arms border-muscle-arms/40 bg-muscle-arms/10',
  quads: 'text-muscle-legs border-muscle-legs/40 bg-muscle-legs/10',
  hamstrings: 'text-muscle-legs border-muscle-legs/40 bg-muscle-legs/10',
  glutes: 'text-muscle-glutes border-muscle-glutes/40 bg-muscle-glutes/10',
  calves: 'text-muscle-legs border-muscle-legs/40 bg-muscle-legs/10',
  core: 'text-muscle-core border-muscle-core/40 bg-muscle-core/10',
  cardio: 'text-muscle-cardio border-muscle-cardio/40 bg-muscle-cardio/10',
}

export function MuscleChip({ muscle, className }: { muscle: MuscleGroup; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        MUSCLE_STYLES[muscle],
        className
      )}
    >
      {MUSCLE_LABELS[muscle]}
    </span>
  )
}
