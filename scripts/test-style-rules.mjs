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

const files = walk(SRC)

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
  const rel = file.replace(SRC, 'src/')
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

console.log(`Archivos revisados: ${files.length}`)

if (fail.length) {
  console.error(`\n❌ ${fail.length} violaciones de las reglas de estilo:`)
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Sin emojis ni auras de color en la UI.')
