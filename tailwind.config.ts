import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: { DEFAULT: '#141414', 2: '#1C1C1C', 3: '#242424' },
        line: { DEFAULT: '#2A2A2A', 2: '#383838' },
        ink: { DEFAULT: '#F0F0F0', 2: '#A0A0A0', 3: '#606060' },
        accent: { DEFAULT: '#E8FF47', dim: '#B8CC30' },
        success: '#4ADE80',
        warning: '#FACC15',
        danger: '#F87171',
        info: '#60A5FA',
        muscle: {
          chest: '#F97316',
          back: '#3B82F6',
          shoulders: '#A855F7',
          arms: '#EC4899',
          legs: '#10B981',
          core: '#F59E0B',
          glutes: '#EF4444',
          cardio: '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
