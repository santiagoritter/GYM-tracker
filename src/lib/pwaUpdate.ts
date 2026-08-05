import { registerSW } from 'virtual:pwa-register'

/** Cada cuánto se pide activamente `registration.update()` mientras la app
 * queda abierta en primer plano. El chequeo automático del navegador solo
 * corre al cargar la página — sin esto, una PWA abierta que no se recarga
 * puede tardar en enterarse de una versión nueva. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registra el service worker y agrega lo único que `registerType:
 * 'autoUpdate'` no cubre solo: un chequeo activo de versión nueva (al
 * volver a foreground + cada una hora), en vez de depender solo de que el
 * navegador la revise por su cuenta en la próxima carga completa de página.
 *
 * Con `autoUpdate`, vite-plugin-pwa ya recarga la página sola en cuanto
 * detecta una versión nueva (evento `activated` de Workbox) — no hace
 * falta (ni dispara) un callback `onNeedRefresh` acá, esa rama es solo
 * para `registerType: 'prompt'`.
 */
export function initPwaUpdate(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    },
  })
}
