import type { MuscleGroup } from '@/types'

/**
 * Misma paleta que `tailwind.config.ts` (`colors.muscle`) — se duplica acá
 * como valores literales porque Recharts (MonthlyStats.tsx) necesita
 * strings de color en JS, no clases de Tailwind, y esos colores no viven
 * como custom property en `index.css` (a diferencia de `--color-accent` y
 * el resto, que sí resuelve `useChartColors.ts`) — son literales
 * hardcodeados directo en la config de Tailwind. Si se tocan los valores
 * en `tailwind.config.ts`, hay que actualizar esto también (Fase 7,
 * auditoría de diseño: antes de esto, MonthlyStats.tsx tenía su propia
 * paleta inventada, con colores distintos para el mismo músculo según la
 * pantalla).
 */
const MUSCLE_GROUP_HEX: Record<'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'glutes' | 'cardio', string> = {
  chest: '#FF6B35',
  back: '#0A84FF',
  shoulders: '#BF5AF2',
  arms: '#FF375F',
  legs: '#30D158',
  core: '#FFD60A',
  glutes: '#FF453A',
  cardio: '#32ADE6',
}

/** Mapea los 12 `MuscleGroup` granulares al color de su "balde" visual —
 * mismo agrupamiento que ya usa `MUSCLE_STYLES` en MuscleChip.tsx
 * (bíceps/tríceps/antebrazos comparten "arms", cuádriceps/isquios/
 * gemelos comparten "legs"). */
export const MUSCLE_HEX: Record<MuscleGroup, string> = {
  chest: MUSCLE_GROUP_HEX.chest,
  back: MUSCLE_GROUP_HEX.back,
  shoulders: MUSCLE_GROUP_HEX.shoulders,
  biceps: MUSCLE_GROUP_HEX.arms,
  triceps: MUSCLE_GROUP_HEX.arms,
  forearms: MUSCLE_GROUP_HEX.arms,
  quads: MUSCLE_GROUP_HEX.legs,
  hamstrings: MUSCLE_GROUP_HEX.legs,
  calves: MUSCLE_GROUP_HEX.legs,
  core: MUSCLE_GROUP_HEX.core,
  glutes: MUSCLE_GROUP_HEX.glutes,
  cardio: MUSCLE_GROUP_HEX.cardio,
}
