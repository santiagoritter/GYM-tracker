import { useEffect, useState } from 'react'
import { useThemeStore } from '@/stores/themeStore'

export interface ChartColors {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  cursor: string
  accent: string
  info: string
}

/** Los custom properties conviven en dos formatos en index.css: tripletas
 * "R G B" (pensadas para `rgb(var(--x) / <alpha>)` de Tailwind) y rgba()
 * completo para los tokens que ya llevan su propia opacidad. Acá se leen
 * resueltos y se normalizan a un string de color válido para Recharts. */
function readVar(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw.startsWith('rgb') ? raw : `rgb(${raw})`
}

function computeChartColors(): ChartColors {
  return {
    grid: readVar('--color-surface-3'),
    axis: readVar('--color-ink-3'),
    tooltipBg: readVar('--color-surface-3'),
    tooltipBorder: readVar('--color-line-2'),
    tooltipText: readVar('--color-ink-2'),
    cursor: readVar('--color-fill'),
    accent: readVar('--color-accent'),
    info: readVar('--color-info'),
  }
}

/**
 * Colores para gráficos de Recharts. Recharts recibe colores como props de
 * JS (stroke, fill, contentStyle) — no puede leer clases de Tailwind ni el
 * atributo `data-theme` como el resto de la UI, así que hace falta resolver
 * los custom properties a mano y recalcular cuando cambia el tema.
 */
export function useChartColors(): ChartColors {
  const theme = useThemeStore((s) => s.theme)
  const [colors, setColors] = useState<ChartColors>(computeChartColors)

  useEffect(() => {
    setColors(computeChartColors())
  }, [theme])

  return colors
}
