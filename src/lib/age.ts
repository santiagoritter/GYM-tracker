/**
 * Edad y reglas para menores — un solo lugar. La presentación promete que la
 * app cuida a los usuarios de 13 a 17: todo lo que dependa de la edad (chat con
 * coach, anuncios, calorías) consulta acá en vez de calcularla por su cuenta.
 *
 * Regla de seguridad: una fecha de nacimiento ausente o inválida cuenta como
 * MENOR. Sin edad no se puede aplicar ninguna regla, y el fallo caro es tratar
 * a un chico como adulto.
 */

export const MIN_AGE = 13
export const ADULT_AGE = 18
export const MAX_AGE = 100

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` → fecha local (sin el corrimiento de zona horaria de `new Date(iso)`). */
export function parseDob(dob: string | undefined | null): Date | null {
  const m = typeof dob === 'string' ? ISO_DATE.exec(dob) : null
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

/** Edad cumplida en `now`, o `null` si la fecha no es válida o es futura. */
export function ageOn(dob: string | undefined | null, now: Date = new Date()): number | null {
  const date = parseDob(dob)
  if (!date || date.getTime() > now.getTime()) return null
  let age = now.getFullYear() - date.getFullYear()
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age--
  return age
}

/** Mensaje de error para un formulario, o `null` si la fecha sirve para usar la app. */
export function dobError(dob: string, now: Date = new Date()): string | null {
  if (!dob) return 'Ingresá tu fecha de nacimiento.'
  if (!parseDob(dob)) return 'La fecha de nacimiento no es válida.'
  const age = ageOn(dob, now)
  if (age === null) return 'La fecha de nacimiento no puede ser futura.'
  if (age < MIN_AGE) return `Repe es para mayores de ${MIN_AGE} años.`
  if (age > MAX_AGE) return 'Revisá la fecha de nacimiento.'
  return null
}

/** `true` para menores de 18 y también cuando no hay una edad confiable. */
export function isMinor(dob: string | undefined | null, now: Date = new Date()): boolean {
  const age = ageOn(dob, now)
  return age === null || age < ADULT_AGE
}

/** Fecha mínima y máxima para el `<input type="date">`. */
export function dobBounds(now: Date = new Date()): { min: string; max: string } {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    min: iso(new Date(now.getFullYear() - MAX_AGE, now.getMonth(), now.getDate())),
    max: iso(new Date(now.getFullYear() - MIN_AGE, now.getMonth(), now.getDate())),
  }
}
