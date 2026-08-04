import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo: NO es negro puro. #000 con un acento saturado encima es la
        // firma del "dark mode con glow" generado por IA; un neutro apenas
        // tintado da profundidad sin necesidad de halos. Ver DESIGN.md §1.
        bg: '#0B0B0C',
        surface: {
          DEFAULT: '#16161A',
          2: '#1F1F25',
          3: '#2A2A32',
          glass: 'rgba(22,22,26,0.72)',
        },
        line: {
          DEFAULT: 'rgba(120,120,128,0.28)',
          2: 'rgba(120,120,128,0.16)',
        },
        ink: {
          DEFAULT: '#FFFFFF',
          2: 'rgba(235,235,245,0.62)',
          3: 'rgba(235,235,245,0.34)', // piso de contraste AA sobre surface
          4: 'rgba(235,235,245,0.18)',
        },
        // Acento de marca. Se mantiene el lima: no es ninguno de los tells
        // conocidos (violeta, cyan-sobre-oscuro) y ya es la identidad.
        accent: { DEFAULT: '#E8FF47', dim: '#C8E030', soft: 'rgba(232,255,71,0.12)' },
        // Fill iOS (para estados hover/pressed sutiles)
        fill: {
          DEFAULT: 'rgba(120,120,128,0.2)',
          2: 'rgba(120,120,128,0.16)',
          3: 'rgba(118,118,128,0.12)',
        },
        success: '#30D158',
        warning: '#FFD60A',
        danger: '#FF453A',
        info: '#0A84FF',
        muscle: {
          chest: '#FF6B35',
          back: '#0A84FF',
          shoulders: '#BF5AF2',
          arms: '#FF375F',
          legs: '#30D158',
          core: '#FFD60A',
          glutes: '#FF453A',
          cardio: '#32ADE6',
        },
      },
      fontFamily: {
        // Inter queda deliberadamente FUERA: está en tantos sitios que ya no
        // distingue nada, y en un iPhone la fuente del sistema se ve mejor
        // que cualquier webfont cargada por red. Android cae a Roboto, que
        // también es nativa.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'ui-monospace', '"JetBrains Mono"', 'monospace'],
      },
      // Escala con tope de 18px en contenedores. Redondear tarjetas a 24px+
      // convierte cada elemento en la misma mancha blanda (DESIGN.md §3).
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px', // default de tarjeta
        lg: '18px', // tope
        xl: '18px',
        '2xl': '18px',
        '3xl': '22px', // solo la parte superior de los sheets
      },
      backdropBlur: {
        ios: '20px',
        xs: '8px',
      },
      // Solo sombras neutras y solo para elevación real. Las de color son
      // el halo que estamos evitando; las de negro puro se ven sucias.
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.35)',
        float: '0 8px 28px rgba(8,8,10,0.55)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.25,0.46,0.45,0.94)',
        decel: 'cubic-bezier(0,0,0.58,1)',
        // Overshoot permitido en UN solo lugar: el check de serie completada.
        // En cualquier otro elemento de interfaz se ve anticuado.
        pop: 'cubic-bezier(0.34,1.56,0.64,1)',
        ios: 'cubic-bezier(0.25,0.46,0.45,0.94)',
      },
    },
  },
  plugins: [],
} satisfies Config
