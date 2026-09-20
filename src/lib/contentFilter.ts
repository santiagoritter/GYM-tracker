/**
 * Filtro básico de lenguaje ofensivo para el contenido escrito por usuarios
 * (chat, reseñas). Guideline 1.2 de la App Store pide "un método para filtrar
 * material objetable" — esto es la primera capa, no la única: además hay
 * reportar, bloquear y una bandeja de reportes que resuelve el admin.
 *
 * Enmascara (`p***`) en vez de bloquear el envío: un coach y su alumno se
 * hablan con confianza y una puteada suelta no es abuso; lo que se corta es el
 * insulto discriminatorio o el hostigamiento. La lista es a propósito corta y
 * de términos inequívocamente ofensivos — se amplía a medida que aparezcan
 * casos en los reportes.
 */

const BLOCKED_TERMS = [
  'hijo de puta',
  'hija de puta',
  'hdp',
  'mogolico',
  'mongolico',
  'retrasado',
  'retrasada',
  'sudaca',
  'negro de mierda',
  'puto de mierda',
  'te voy a matar',
  'matate',
  'suicidate',
  'violador',
  'nigger',
  'faggot',
  'kill yourself',
  'retard',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Reemplaza cada término bloqueado por asteriscos, conservando el largo. */
export function maskProfanity(text: string): string {
  const flat = normalize(text)
  // NFD puede cambiar el largo si el original traía acentos precompuestos:
  // normalize() los descompone y los quita de nuevo, así que el largo coincide.
  if (flat.length !== text.length) return text
  const chars = text.split('')
  for (const term of BLOCKED_TERMS) {
    let from = 0
    for (;;) {
      const at = flat.indexOf(term, from)
      if (at === -1) break
      for (let i = at; i < at + term.length; i++) chars[i] = chars[i] === ' ' ? ' ' : '*'
      from = at + term.length
    }
  }
  return chars.join('')
}

/** ¿El texto contiene algún término bloqueado? (para avisar antes de enviar). */
export function hasProfanity(text: string): boolean {
  const flat = normalize(text)
  return BLOCKED_TERMS.some((t) => flat.includes(t))
}
