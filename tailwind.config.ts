import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base — puro negro iOS
        bg: '#000000',
        // Superficies con opacidad para glass
        surface: {
          DEFAULT: '#1C1C1E',
          2: '#2C2C2E',
          3: '#3A3A3C',
          glass: 'rgba(28,28,30,0.72)',
        },
        // Separadores iOS
        line: {
          DEFAULT: 'rgba(84,84,88,0.65)',
          2: 'rgba(84,84,88,0.45)',
        },
        // Labels iOS
        ink: {
          DEFAULT: '#FFFFFF',
          2: 'rgba(235,235,245,0.6)',
          3: 'rgba(235,235,245,0.3)',
          4: 'rgba(235,235,245,0.18)',
        },
        // Acento de marca (lima)
        accent: { DEFAULT: '#E8FF47', dim: '#C8E030', muted: 'rgba(232,255,71,0.15)' },
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
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"SF Mono"', '"Geist Mono"', '"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      backdropBlur: {
        ios: '20px',
        xs: '8px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.4)',
        float: '0 8px 32px rgba(0,0,0,0.6)',
        accent: '0 4px 20px rgba(232,255,71,0.25)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34,1.56,0.64,1)',
        ios: 'cubic-bezier(0.25,0.46,0.45,0.94)',
        'ios-in': 'cubic-bezier(0.42,0,1,1)',
        'ios-out': 'cubic-bezier(0,0,0.58,1)',
      },
    },
  },
  plugins: [],
} satisfies Config
