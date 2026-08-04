import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Los colores que se usan en el código con un modificador de opacidad
      // (bg-accent/15, bg-surface/60, text-danger/70...) tienen que ir en la
      // forma `rgb(var(--x) / <alpha-value>)`: es la única sintaxis con la
      // que Tailwind puede seguir aplicando esos modificadores sobre una
      // variable CSS. Los que NUNCA se usan con `/NN` (confirmado por grep)
      // van como `var(--x)` directo, con el alpha ya resuelto adentro —
      // agregarles un modificador después se rompe en silencio, así que no
      // se declaran ahí adentro por accidente.
      //
      // El valor real de cada variable vive en src/index.css, con un juego
      // por tema (:root = oscuro, [data-theme="light"] = claro). Este
      // archivo no sabe qué tema está activo — por diseño.
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
          3: 'rgb(var(--color-surface-3) / <alpha-value>)',
          glass: 'var(--color-surface-glass)',
        },
        line: {
          DEFAULT: 'var(--color-line)',
          2: 'var(--color-line-2)',
        },
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          2: 'var(--color-ink-2)',
          3: 'var(--color-ink-3)', // piso de contraste AA sobre surface
          4: 'var(--color-ink-4)',
        },
        // Acento de marca. Se mantiene el lima: no es ninguno de los tells
        // conocidos (violeta, cyan-sobre-oscuro) y ya es la identidad.
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          dim: 'rgb(var(--color-accent-dim) / <alpha-value>)',
          soft: 'var(--color-accent-soft)',
        },
        // Fill iOS (para estados hover/pressed sutiles)
        fill: {
          DEFAULT: 'var(--color-fill)',
          2: 'var(--color-fill-2)',
          3: 'var(--color-fill-3)',
        },
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        // Sin variantes de tema: son colores de dominio (grupo muscular),
        // no de chrome, y no forman parte del sistema claro/oscuro.
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
