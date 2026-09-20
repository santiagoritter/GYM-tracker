import { readFileSync, writeFileSync } from 'node:fs'
import { PRIVACY, TERMS, LEGAL_UPDATED, type LegalDoc, type LegalSection } from '@/lib/legalText'

/**
 * Genera docs/legal/*.md desde src/lib/legalText.ts (la fuente de verdad).
 * `--check` no escribe: falla si los .md no coinciden (lo corre `npm test`, así
 * el doc no puede quedar mintiendo respecto de lo que muestra la app).
 * El markdown incluye TODAS las secciones, también las que dependen de un flag
 * (ads / purchases), marcadas — es el texto del producto completo.
 */

const HEADER = (name: string) =>
  `> Generado desde \`src/lib/legalText.ts\` — no editar a mano (\`npm run docs:legal\`).\n> Si cambiás algo relevante, subí \`LEGAL_VERSION\` en \`src/lib/legal.ts\`.\n\n# ${name} — GymTracker\n`

function section(s: LegalSection): string {
  const flag = s.when ? ` _(solo si ${s.when === 'ads' ? 'hay anuncios' : 'hay compras'} en el build)_` : ''
  return `## ${s.title}${flag}\n\n${s.body.join('\n\n')}\n`
}

function render(doc: LegalDoc): string {
  return (
    HEADER(doc.title) +
    '\n' +
    doc.intro.join('\n\n') +
    '\n\n' +
    doc.sections.map(section).join('\n') +
    `\n_Última actualización: ${LEGAL_UPDATED}._\n`
  )
}

const targets: [string, LegalDoc][] = [
  ['docs/legal/privacidad.md', PRIVACY],
  ['docs/legal/terminos.md', TERMS],
]

const check = process.argv.includes('--check')
const bad: string[] = []
for (const [path, doc] of targets) {
  const out = render(doc)
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
  console.error('❌ docs/legal desactualizado respecto de src/lib/legalText.ts:\n - ' + bad.join('\n - ') + '\n   Corré: npm run docs:legal')
  process.exit(1)
}
console.log(check ? '✅ docs/legal coincide con legalText.ts.' : '✅ docs/legal generado.')
