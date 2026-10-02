/**
 * Versión de los textos legales. Si sube, el usuario tiene que volver a
 * aceptar: `LegalUpdateGate` (montado en AppShell) lo detecta comparando con
 * `profile.legalVersion`. El contenido vive en `src/lib/legalText.ts`.
 *
 * v2: política y términos completos (coach, DNI, chat, reportes, borrado de
 * cuenta, suscripciones, anuncios).
 * v3: edad mínima 13, reglas para menores y tutor, Ley 25.326 / AAIP.
 */
export const LEGAL_VERSION = 3

export const SUPPORT_EMAIL = 'santiagoritter26@gmail.com'
