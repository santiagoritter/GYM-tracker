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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ya no hay runtimeCaching de fuentes: la app usa las del sistema.
        // Cuando exista Supabase, su patrón va acá como NetworkOnly — Workbox
        // cachea por URL e ignora el header Authorization, así que cachear
        // PostgREST puede servir datos de otra sesión desde el caché.
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
