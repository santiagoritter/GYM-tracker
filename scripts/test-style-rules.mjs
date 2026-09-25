/**
 * Reglas de estilo no negociables de Redisenio.md, verificadas de forma
 * automática para que no vuelvan a colarse:
 *
 *   §0.4 — "Cero emojis en toda la UI y el código. Cero."
 *   §0.5 — "nada de glow/blur difuso alrededor de tarjetas o botones"
 *   §6   — criterios de aceptación
 *
 * Nota sobre backdrop-filter: NO se prohíbe. El "frosted glass" de una
 * cabecera fija sobre contenido que scrollea es el patrón nativo de iOS y
 * es justamente la referencia estética pedida (Apple). Lo que se prohíbe es
 * el halo de color alrededor de un elemento, que es otra cosa.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const SRC = new URL('../src/', import.meta.url).pathname
// `site/` es un proyecto aparte (deploy en Vercel) pero las mismas reglas de
// §0 de DESIGN.md aplican — nada de emojis ni auras de color tampoco ahí.
const SITE_SRC = new URL('../site/src/', import.meta.url).pathname
const fail = []

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (['.ts', '.tsx', '.css'].includes(extname(entry))) out.push(full)
  }
  return out
}

function relPath(file) {
  if (file.startsWith(SITE_SRC)) return file.replace(SITE_SRC, 'site/src/')
  return file.replace(SRC, 'src/')
}

const files = [...walk(SRC), ...walk(SITE_SRC)]

// ── Emojis ────────────────────────────────────────────────────────────────
// Rangos de pictogramas + dingbats + símbolos misceláneos + selector de
// variación emoji. Se excluyen flechas y símbolos matemáticos, que no lo son.
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2640}\u{2642}]/u

// ── Auras de color ────────────────────────────────────────────────────────
// box-shadow o drop-shadow con desenfoque y color de acento alrededor de un
// elemento. Las sombras neutras oscuras (elevación) sí están permitidas.
const GLOW = [
  /drop-shadow-\[[^\]]*rgba\(\s*23[0-9]/i, // drop-shadow lima en Tailwind
  /box-shadow:[^;]*rgba\(\s*23[0-9]\s*,\s*25[0-9]/i, // halo lima en CSS
  /shadow-accent/,
  /filter:\s*['"]?url\(#[a-z-]*glow/i, // filtros SVG de glow
  /feGaussianBlur/,
]

for (const file of files) {
  const rel = relPath(file)
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, i) => {
    if (EMOJI.test(line)) {
      fail.push(`${rel}:${i + 1} emoji — ${line.trim().slice(0, 80)}`)
    }
    for (const rule of GLOW) {
      if (rule.test(line)) {
        fail.push(`${rel}:${i + 1} aura/glow — ${line.trim().slice(0, 80)}`)
        break
      }
    }
  })
}

// ── Bug de scroll muerto en Android/PWA/PC (ver index.css) ─────────────────
// `overflow-x: hidden` sobre un elemento que también tiene `overscroll-
// behavior: none` (u otro overflow) lo convierte en su propio contenedor de
// scroll, casi siempre con 0px de contenido para scrollear — la cadena de
// scroll muere ahí. Dos reglas concretas para que no vuelva a colarse:
//   1. Toda declaración `overflow-x: hidden` en un bloque CSS tiene que
//      convivir con `overflow-x: clip` en el MISMO bloque (clip no arma
//      contenedor de scroll; hidden solo queda de fallback para iOS 15).
//   2. Un selector `body` (solo, sin `html` en el mismo selector) no puede
//      declarar `overscroll-behavior`.
const cssFiles = files.filter((f) => f.endsWith('.css'))
for (const file of cssFiles) {
  const rel = relPath(file)
  const content = readFileSync(file, 'utf8')
  const blockRe = /([^{};]+)\{([^{}]*)\}/g
  let m
  while ((m = blockRe.exec(content))) {
    const selector = m[1].trim()
    const body = m[2]
    if (!selector || /^@/.test(selector)) continue

    if (/overflow-x\s*:\s*hidden/.test(body) && !/overflow-x\s*:\s*clip/.test(body)) {
      fail.push(
        `${rel} selector "${selector}": overflow-x: hidden sin overflow-x: clip en el mismo bloque — convierte al elemento en su propio contenedor de scroll (ver index.css)`
      )
    }

    const selectors = selector.split(',').map((s) => s.trim())
    const isBareBody = selectors.includes('body') && !selectors.includes('html')
    if (isBareBody && /overscroll-behavior/.test(body)) {
      fail.push(
        `${rel} selector "${selector}": overscroll-behavior en un selector "body" sin "html" — corta la cadena de scroll si body vuelve a ser un contenedor con 0px (ver index.css)`
      )
    }
  }
}

console.log(`Archivos revisados: ${files.length}`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} violaciones de las reglas de estilo:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Sin emojis ni auras de color en la UI.')
