import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * Nav y footer son idénticos en las 5 páginas — sin esto habría que
 * mantenerlos sincronizados a mano en 5 archivos (exactamente el tipo de
 * copia que se desincroniza sola, ver CLAUDE.md "verificar, no suponer").
 * Un comentario `<!--@include nombre-->` en el HTML se reemplaza en build
 * por `src/partials/nombre.html` — nada de SSR, el HTML final sigue siendo
 * estático de verdad, esto es solo un include-en-build.
 */
function includePartials(): Plugin {
  return {
    name: 'include-partials',
    transformIndexHtml(html) {
      return html.replace(/<!--@include (\w+)-->/g, (_, name: string) =>
        readFileSync(resolve(__dirname, 'src/partials', `${name}.html`), 'utf8')
      )
    },
  }
}

// Base configurable por env, mismo patrón que la app principal
// (vite.config.ts de la raíz): en Vercel el sitio se sirve desde la raíz
// del dominio (default '/'), pero un mirror en GitHub Pages (repo de
// proyecto) lo sirve bajo /<repo>/ — ver el workflow de ese repo. El resto
// de las rutas del sitio (nav, footer, links entre páginas, imágenes de
// `public/`) son todas relativas, no absolutas, así que no dependen de esto.
const BASE_PATH = process.env.VITE_BASE_PATH ?? '/'

// Multipágina con HTML estático de verdad (no una SPA con router): cada
// archivo es contenido visible sin JS, bueno para SEO/OG y para que Play
// Store / App Store puedan crawlear las páginas legales sin ejecutar nada.
export default defineConfig({
  base: BASE_PATH,
  plugins: [includePartials()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        privacidad: resolve(__dirname, 'privacidad.html'),
        terminos: resolve(__dirname, 'terminos.html'),
        soporte: resolve(__dirname, 'soporte.html'),
        'borrar-cuenta': resolve(__dirname, 'borrar-cuenta.html'),
      },
    },
  },
})
