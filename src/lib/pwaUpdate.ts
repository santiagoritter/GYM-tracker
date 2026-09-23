import { registerSW } from 'virtual:pwa-register'
import { isNative } from '@/lib/native'
import { toast } from '@/stores/toastStore'

/** Cada cuánto se pide activamente `registration.update()` mientras la app
 * queda abierta en primer plano. El chequeo automático del navegador solo
 * corre al cargar la página — sin esto, una PWA abierta que no se recarga
 * puede tardar en enterarse de una versión nueva. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/** El usuario está en medio de algo que un reload interrumpiría a mitad de
 * camino: un entreno, una salida a correr o una sesión de cardio. Se
 * revisa por ruta (no por estado de store) para cubrir las tres pantallas
 * con un solo chequeo simple, sin acoplar este módulo a esos stores. */
function hasActiveSession(): boolean {
  const p = window.location.pathname
  return p.includes('/entreno/') || p.includes('/correr') || p.includes('/cardio')
}

/**
 * Registra el service worker. Dos casos totalmente distintos:
 *
 * - **Nativo (iOS/Android)**: la app no sirve nada por red — los assets
 *   están empaquetados en el bundle. Capacitor en Android sí registra su
 *   propio service worker para poder interceptar `fetch()` (`Bridge.java`);
 *   si quedó uno de una versión vieja de la web, puede seguir sirviendo un
 *   bundle desactualizado después de actualizar la app desde Play o
 *   GitHub. Acá no se registra nada nuevo y se desarma lo que hubiera.
 * - **Web**: `registerType: 'prompt'` (vite.config.ts) deja el SW nuevo en
 *   estado "waiting" en vez de tomar control solo. Se aplica recién cuando
 *   no hay un entreno/correr/cardio en curso — al detectar la versión
 *   nueva, al volver a foreground, o al cambiar de ruta.
 */
export function initPwaUpdate(): void {
  if (isNative) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister())
      })
    }
    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    }
    return
  }

  let pendingUpdate: (() => Promise<void>) | null = null
  let notified = false

  const tryApply = () => {
    if (!pendingUpdate || hasActiveSession()) return
    const apply = pendingUpdate
    pendingUpdate = null
    void apply() // dispara SKIP_WAITING; el propio registerSW recarga al tomar control
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pendingUpdate = () => updateSW(true)
      if (!notified) {
        notified = true
        toast.info('Hay una versión nueva', 'Se aplica sola apenas termines lo que estés haciendo.')
      }
      tryApply()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update()
          tryApply()
        }
      })
    },
  })

  // Cambios de ruta dentro de la SPA (salir del entreno, por ejemplo) no
  // disparan visibilitychange — pushState/replaceState sí, así que se
  // engancha ahí para no depender de que el usuario minimice la app.
  window.addEventListener('popstate', tryApply)
  const origPushState = history.pushState.bind(history)
  history.pushState = (...args) => {
    origPushState(...args)
    tryApply()
  }

  // Un deploy nuevo invalida los nombres de archivo con hash de los chunks
  // lazy — si alguien tenía la pestaña abierta desde antes, el próximo
  // `import()` de una ruta lazy (React.lazy) puede pedir un archivo que ya
  // no existe. Vite emite este evento en ese caso; se recarga una sola vez
  // (sessionStorage corta el loop si el reload no alcanza, ej. offline).
  window.addEventListener('vite:preloadError', () => {
    const key = 'pwa-chunk-reload'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    window.location.reload()
  })
}
