import { readFileSync, writeFileSync } from 'node:fs'
import { PRIVACY, TERMS, LEGAL_UPDATED, type LegalDoc, type LegalSection } from '@/lib/legalText'

/**
 * Genera `site/privacidad.html` y `site/terminos.html` desde
 * `src/lib/legalText.ts` — la MISMA fuente de verdad que usa la app
 * (`Legal.tsx`) y `docs/legal/*.md` (`gen-legal-docs.mts`). Play Store y App
 * Store exigen una URL pública con esto, y no puede haber dos versiones del
 * mismo texto legal desincronizándose solas.
 *
 * `--check` no escribe: falla si el HTML no coincide (lo corre `npm test`,
 * igual que `test:legal`).
 *
 * Incluye TODAS las secciones, también las que dependen de un flag
 * (ads/purchases) — mismo criterio que `gen-legal-docs.mts`: es la página
 * legal del producto completo, no de este build puntual.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function section(s: LegalSection): string {
  const flag = s.when
    ? `<p class="mt-1 text-[13px] text-ink-3">(solo si ${s.when === 'ads' ? 'hay anuncios' : 'hay compras'} activados en el build)</p>`
    : ''
  return `<h2>${escapeHtml(s.title)}</h2>${flag}${s.body.map((p) => `<p>${inline(p)}</p>`).join('')}`
}

function page(doc: LegalDoc, description: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(doc.title)} — Repe</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="icon" href="/icons/icon-192.png" />
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <!--@include nav-->
    <main class="mx-auto max-w-copy px-5 pb-20 pt-28">
      <h1 class="text-[34px] font-bold tracking-[-0.02em] text-ink">${escapeHtml(doc.title)}</h1>
      <p class="mt-3 text-[13px] text-ink-3">Última actualización: ${escapeHtml(LEGAL_UPDATED)}</p>
      <div class="legal-prose">
        ${doc.intro.map((p) => `<p>${inline(p)}</p>`).join('')}
        ${doc.sections.map(section).join('\n        ')}
      </div>
    </main>
    <!--@include footer-->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
}

const targets: [string, LegalDoc, string][] = [
  ['site/privacidad.html', PRIVACY, 'Qué datos guarda Repe, para qué los usa y cómo los controlás.'],
  ['site/terminos.html', TERMS, 'Condiciones de uso de Repe: cuenta, modo coach, suscripciones y anuncios.'],
]

const check = process.argv.includes('--check')
const bad: string[] = []
for (const [path, doc, description] of targets) {
  const out = page(doc, description)
  if (check) {
    let current = ''
    try {
      current = readFileSync(path, 'utf8')
    } catch {
      // no existe
    }
    if (current !== out) bad.push(path)
  } else {
    writeFileSync(path, out)
  }
}
if (bad.length) {
  console.error(
    '❌ site/*.html desactualizado respecto de src/lib/legalText.ts:\n - ' +
      bad.join('\n - ') +
      '\n   Corré: npm run docs:legal-site'
  )
  process.exit(1)
}
console.log(check ? '✅ site/*.html coincide con legalText.ts.' : '✅ site/privacidad.html y site/terminos.html generados.')
