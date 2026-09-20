import { isNative } from '@/lib/native'

/**
 * URL pública de la PWA — la que se comparte en links de invitación y de
 * rutinas, y la que se declara como política de privacidad en App Store
 * Connect. En la app nativa `window.location.origin` es `capacitor://localhost`,
 * que no le sirve a nadie fuera de este teléfono, así que ahí se usa esta.
 * En web se usa el origen real (con su base path).
 */
export const PUBLIC_APP_URL: string = (
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ??
  'https://santiagoritter.github.io/GYM-tracker/'
).replace(/\/?$/, '/')

/** Link compartible a una ruta de la app (`path` sin barra inicial). */
export function publicLink(path: string): string {
  const base = isNative ? PUBLIC_APP_URL : `${window.location.origin}${import.meta.env.BASE_URL}`
  return `${base}${path}`
}
