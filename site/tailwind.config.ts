import type { Config } from 'tailwindcss'

/**
 * Tokens copiados de `../DESIGN.md` (fuente de verdad real, en el repo
 * principal). El sitio es un proyecto autónomo (`site/`, deploy en Vercel,
 * no forma parte del bundle de la app), así que no puede importar el
 * `tailwind.config.ts` de la app — pero usa los mismos valores. Si
 * `DESIGN.md` cambia, actualizar acá a mano en el mismo commit.
 *
 * A diferencia de la app, el sitio no tiene modo claro (es una landing,
 * siempre oscura, sin toggle de tema) — así que los colores van directo en
 * hex, sin la indirección de variables CSS que la app necesita para poder
 * cambiar de tema en runtime.
 */
export default {
  content: ['./*.html', './src/**/*.{ts,css}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0B0C',
        surface: '#16161A',
        'surface-2': '#1F1F25',
        'surface-3': '#2A2A32',
        accent: '#E8FF47',
        'accent-dim': '#C8E030',
        'accent-soft': 'rgba(232,255,71,0.12)',
        ink: '#FFFFFF',
        'ink-2': 'rgba(235,235,245,0.62)',
        'ink-3': 'rgba(235,235,245,0.34)',
        'ink-4': 'rgba(235,235,245,0.18)',
        line: 'rgba(120,120,128,0.28)',
        'line-2': 'rgba(120,120,128,0.16)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'SF Pro Display',
          'SF Pro Text',
          'system-ui',
          'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '18px',
      },
      maxWidth: {
        copy: '38rem',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        decel: 'cubic-bezier(0, 0, 0.58, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
