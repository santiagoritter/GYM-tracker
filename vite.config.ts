import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const BASE_PATH = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest en vez de generateSW (default): es la única forma de
      // meter código propio en el service worker — acá, el handler de
      // `push` de la Fase 26. Con generateSW, Workbox arma el SW solo y no
      // deja agregar nada. src/sw.ts es el service worker real; se bundlea
      // con Rollup en build.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Mismo patrón de precacheo que tenía el generateSW anterior — se
        // mueve acá tal cual, no cambia qué se cachea, solo cómo se arma.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        rollupFormat: 'iife',
      },
      manifest: {
        name: 'GymTracker',
        short_name: 'GymTracker',
        description: 'Registro de entrenamientos minimalista y offline-first',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        // vite-plugin-pwa NO antepone `base` a los src de icons (a diferencia de
        // start_url/scope, que sí resuelve solo) — hay que armarlos a mano o
        // quedan apuntando a la raíz del dominio en vez de /GYM-tracker/.
        icons: [
          { src: `${BASE_PATH}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE_PATH}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${BASE_PATH}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts (~250KB) solo lo usan Progreso/Medidas/Fotos, ya
        // lazy-loadeadas, pero sin chunk propio Rollup lo mezclaba con
        // cualquiera de esas páginas. React/react-dom/router cambian mucho
        // menos seguido que el código de la app — separarlos cachea mejor
        // entre deploys.
        manualChunks: {
          recharts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
