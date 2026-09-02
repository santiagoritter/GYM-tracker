import { getQuoteForNow, PHILOSOPHICAL_QUOTES } from '@/lib/quotes'

/** Frases filosóficas por hora del día (B4). Verifica que:
 *  - cada hora devuelve una frase del daypart correcto (o sin daypart),
 *  - la elección es estable dentro del mismo día y cambia entre días,
 *  - toda frase tiene texto y ninguna trae emojis. */

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ ${msg}`)
    process.exit(1)
  }
}

const daypartOf = (h: number) =>
  h < 6 ? 'dawn' : h < 12 ? 'morning' : h < 19 ? 'afternoon' : 'night'

// 1. Daypart correcto en cada hora
for (let h = 0; h < 24; h++) {
  const d = new Date(2026, 5, 15, h, 30)
  const q = getQuoteForNow(d)
  assert(Boolean(q.text && q.text.trim()), `hora ${h}: frase vacía`)
  assert(
    !q.daypart || q.daypart.includes(daypartOf(h) as never),
    `hora ${h}: daypart ${q.daypart} no incluye ${daypartOf(h)}`
  )
}

// 2. Estable dentro del día, cambia entre días
const morningA1 = getQuoteForNow(new Date(2026, 5, 15, 8, 0))
const morningA2 = getQuoteForNow(new Date(2026, 5, 15, 10, 30))
assert(morningA1.text === morningA2.text, 'misma frase para dos horas del mismo daypart y día')

let changed = false
for (let day = 15; day < 45; day++) {
  const q = getQuoteForNow(new Date(2026, 5, day, 8, 0))
  if (q.text !== morningA1.text) {
    changed = true
    break
  }
}
assert(changed, 'la frase de la mañana nunca cambió en 30 días')

// 3. Sin emojis (mismo criterio que test:style)
const emoji = /\p{Extended_Pictographic}/u
for (const q of PHILOSOPHICAL_QUOTES) {
  assert(!emoji.test(q.text), `frase con emoji: "${q.text}"`)
}

console.log(
  `✅ Frases: ${PHILOSOPHICAL_QUOTES.length} frases, daypart correcto en las 24 horas, estable por día, sin emojis.`
)
