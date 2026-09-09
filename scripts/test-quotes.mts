import { getQuoteForNow, PHILOSOPHICAL_QUOTES } from '@/lib/quotes'
import { buildMotivationalNotifications, MOTIV_SLOTS } from '@/lib/motivationalNotifs'

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

// 4. Notificaciones motivacionales: 3 slots, daypart correcto por horario,
//    IDs propios y estables, cuerpo = autor.
const ref = new Date(2026, 5, 15, 12, 0)
const notifs = buildMotivationalNotifications(ref)
assert(notifs.length === 3 && MOTIV_SLOTS.length === 3, 'deben ser 3 franjas')
const ids = new Set(notifs.map((n) => n.id))
assert(ids.size === 3, 'los IDs de las 3 notificaciones deben ser distintos')
for (const n of notifs) {
  assert(n.id >= 4_300_000 && n.id < 4_300_100, `id ${n.id} fuera del rango reservado`)
  const expected = getQuoteForNow(new Date(2026, 5, 15, n.hour, n.minute))
  assert(n.title === expected.text, `slot ${n.hour}:00 no usa la frase de su daypart`)
  assert(Boolean(n.body), `slot ${n.hour}:00 sin cuerpo (autor)`)
}
assert(
  notifs[0].hour < 12 && notifs[1].hour >= 12 && notifs[1].hour < 19 && notifs[2].hour >= 19,
  'las franjas no cubren mañana / tarde / noche'
)

console.log(
  `✅ Frases: ${PHILOSOPHICAL_QUOTES.length} frases, daypart correcto en las 24 horas, estable por día, sin emojis; 3 notificaciones motivacionales por daypart.`
)
