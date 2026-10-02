/** Parte pura del consentimiento del tutor (sin red ni Capacitor), para probarla en node. */

/** Mensajes que levanta `accept_coach_invite` (0028) para menores. */
export const GUARDIAN_REQUIRED = 'GUARDIAN_CONSENT_REQUIRED'
export const COACH_NOT_VERIFIED = 'COACH_NOT_VERIFIED'

export type AcceptBlock = 'consent' | 'unverified' | null

/** ¿El error de aceptar la invitación es una regla de menores y no una falla? */
export function classifyAcceptError(message: string): AcceptBlock {
  if (message.includes(GUARDIAN_REQUIRED)) return 'consent'
  if (message.includes(COACH_NOT_VERIFIED)) return 'unverified'
  return null
}

/** Mensaje listo para WhatsApp (muy usado acá), con el enlace al final. */
export function guardianWhatsappUrl(link: string, coachName: string): string {
  const text =
    `Hola! Quiero entrenar con ${coachName || 'un entrenador'} usando la app Repe. ` +
    `Necesito que me autorices desde este enlace: ${link}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

