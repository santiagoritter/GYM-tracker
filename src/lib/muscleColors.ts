import { useEffect, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'
import type { MuscleGroup } from '@/types'

/**
 * Color de cada grupo muscular para contextos que necesitan un string de
 * color en JS (Recharts en MonthlyStats.tsx) en vez de una clase de
 * Tailwind. Desde B2 (modo claro) los valores viven como custom properties
 * `--muscle-*` en `src/index.css`, con un juego por tema — igual que el
 * resto de la paleta. `MUSCLE_HEX` de abajo es solo el fallback de modo
 * oscuro para el render inicial; lo vivo es `useMuscleColors()`.
 *
 * Los 12 `MuscleGroup` granulares se mapean a 8 "baldes" visuales
 * (bíceps/tríceps/antebrazos → "arms", cuádriceps/isquios/gemelos →
 * "legs"), mismo agrupamiento que `MUSCLE_STYLES` en MuscleChip.tsx.
 */

type Bucket = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'glutes' | 'cardio'

const BUCKET_OF: Record<MuscleGroup, Bucket> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  core: 'core',
  glutes: 'glutes',
  cardio: 'cardio',
}

/** Fallback de modo oscuro (mismos valores que `:root` en index.css). */
const DARK_BUCKET_HEX: Record<Bucket, string> = {
  chest: '#FF6B35',
  back: '#0A84FF',
  shoulders: '#BF5AF2',
  arms: '#FF375F',
  legs: '#30D158',
  core: '#FFD60A',
  glutes: '#FF453A',
  cardio: '#32ADE6',
}

export const MUSCLE_HEX: Record<MuscleGroup, string> = Object.fromEntries(
  (Object.keys(BUCKET_OF) as MuscleGroup[]).map((m) => [m, DARK_BUCKET_HEX[BUCKET_OF[m]]])
) as Record<MuscleGroup, string>

function readBucketColors(): Record<Bucket, string> {
  if (typeof document === 'undefined') return DARK_BUCKET_HEX
  const style = getComputedStyle(document.documentElement)
  const out = {} as Record<Bucket, string>
  for (const b of Object.keys(DARK_BUCKET_HEX) as Bucket[]) {
    const raw = style.getPropertyValue(`--muscle-${b}`).trim()
    out[b] = raw ? `rgb(${raw})` : DARK_BUCKET_HEX[b]
  }
  return out
}

/**
 * Colores de grupo muscular resueltos del tema activo. Recalcula al cambiar
 * de tema (mismo patrón que `useChartColors`).
 */
export function useMuscleColors(): Record<MuscleGroup, string> {
  const theme = useThemeStore((s) => s.theme)
  const [colors, setColors] = useState(readBucketColors)

  useEffect(() => {
    setColors(readBucketColors())
  }, [theme])

  return Object.fromEntries(
    (Object.keys(BUCKET_OF) as MuscleGroup[]).map((m) => [m, colors[BUCKET_OF[m]]])
  ) as Record<MuscleGroup, string>
}
