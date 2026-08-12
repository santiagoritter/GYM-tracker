import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const BASE_PATH = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig(({ mode }) => {
  // loadEnv (no process.env a secas) porque en dev local las credenciales
  // viven en .env, mientras que en GitHub Actions las pasa el workflow como
  // variables de entorno reales — esto mergea las dos fuentes, igual que ve
  // el bundle final.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // El build "de producción" (el que corre GitHub Actions, con VITE_BASE_PATH
  // seteado) tiene que fallar fuerte si faltan los secrets de Supabase — sin
  // esto, un secret mal cargado en el repo se resuelve a "" (no a undefined,
  // GitHub Actions no omite la variable) y el build sale igual, solo que con
  // auth/sync rotos en silencio hasta que un usuario real intenta loguearse.
  // En dev local (BASE_PATH === '/') no se exige nada: Supabase acá también
  // es una integración opcional, mismo criterio que Spotify/EmailJS.
  if (BASE_PATH !== '/') {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    const missing = required.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Faltan secrets de GitHub Actions: ${missing.join(', ')}. ` +
          'Sin esto el build de producción sale "bien" pero con auth/sync rotos.'
      )
    }
  }

  return {
    base: BASE_PATH,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // El script que vite-plugin-pwa inyecta solo (registerSW.js) registra
        // el SW y nada más — sin chequeo periódico, la única vez que el
        // navegador revisa si hay versión nueva es en la carga de página.
        // Con `injectRegister: false` se registra a mano en main.tsx vía
        // `virtual:pwa-register`, para poder pedir el chequeo activamente
        // (al volver a foreground) y avisar cuando hay una versión lista.
        injectRegister: false,
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
      modulePreload: {
        // El radar de puntos fuertes del reverso de CalendarHeatmap (Home)
        // usa lazy() para no importar recharts de forma estática — pero
        // Home no es una ruta lazy (a diferencia de Progress, donde vive el
        // mismo radar en tamaño completo), así que Vite igual metía un
        // <link rel="modulepreload"> a recharts en el index.html apenas por
        // ser alcanzable desde ahí, descargando los ~112KB gzipped en TODA
        // carga de Inicio así nunca se flippee la card. Se saca del
        // preload; sigue cargando bien on-demand cuando el lazy() dispara,
        // solo que sin el prefetch adelantado.
        resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes('recharts')),
      },
      rollupOptions: {
        output: {
          // Recharts (~250KB) solo lo usan Progreso/Medidas/Fotos, ya
          // lazy-loadeadas, pero sin chunk propio Rollup lo mezclaba con
          // cualquiera de esas páginas. React/react-dom/router cambian mucho
          // menos seguido que el código de la app — separarlos cachea mejor
          // entre deploys. `motion` (Fase 28) entra desde ExerciseDetailSheet,
          // que NO está lazy (se abre desde Exercises.tsx) — sin chunk propio
          // infla el bundle principal a ~540KB.
          manualChunks: {
            recharts: ['recharts'],
            vendor: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion'],
          },
        },
      },
    },
  }
})
