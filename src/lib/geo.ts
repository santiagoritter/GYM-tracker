import { registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'
import { isNative } from '@/lib/native'

// El plugin de background NO trae entrypoint JS (solo código nativo + tipos):
// se registra así. En web cada método tira "not implemented" — lo cubre el
// try/catch de startWatch.
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

/**
 * Geolocalización para el modo running. Dos backends:
 *
 *  - **Nativo**: `@capacitor-community/background-geolocation` — sigue
 *    registrando puntos con la pantalla apagada y la app en segundo plano
 *    (foreground service en Android, con notificación persistente; permiso
 *    "Siempre"). Es la razón de ser de este bloque.
 *  - **Web / nativo sin ese plugin**: `@capacitor/geolocation` `watchPosition`
 *    (que en web envuelve `navigator.geolocation`). Solo con la app abierta.
 *
 * Todo lo de acá degrada sin romper: si no hay permiso o no hay backend,
 * `startWatch` devuelve un watch inerte y la UI muestra el estado.
 */

export interface GeoFix {
  lat: number
  lng: number
  t: number // epoch ms
  alt?: number
  acc?: number // precisión horizontal (m)
  speed?: number // m/s si el dispositivo lo da
}

export interface GeoWatch {
  clear: () => void
}

export type PermissionResult = 'granted' | 'denied' | 'unavailable'

// Si el watcher de background no entregó ningún fix en este tiempo, se
// arranca también el foreground como respaldo (ver comentario en
// startWatch). 10s alcanza para el primer fix GPS típico y no hace
// esperar tanto como para que el usuario piense que el mapa no funciona.
const BACKGROUND_FALLBACK_MS = 10_000

/** Camino foreground puro (@capacitor/geolocation, o navigator.geolocation
 * en web por debajo). Se usa como watcher único en web/sin plugin de
 * background, y también como respaldo cuando el de background no entrega
 * nada (ver startWatch). */
async function startForegroundWatch(onFix: (fix: GeoFix) => void): Promise<GeoWatch> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
      (position, err) => {
        if (err || !position) return
        onFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          t: position.timestamp,
          alt: position.coords.altitude ?? undefined,
          acc: position.coords.accuracy ?? undefined,
          speed: position.coords.speed ?? undefined,
        })
      }
    )
    return { clear: () => void Geolocation.clearWatch({ id }) }
  } catch {
    return { clear: () => {} }
  }
}

/** Pide permiso de ubicación (fina). En nativo con background, además pide
 * el permiso "Siempre" cuando se arranca el watcher — acá solo el de uso. */
export async function ensureLocationPermission(): Promise<PermissionResult> {
  if (isNative) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const status = await Geolocation.checkPermissions()
      if (status.location === 'granted') return 'granted'
      const asked = await Geolocation.requestPermissions({ permissions: ['location'] })
      return asked.location === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'unavailable'
    }
  }

  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unavailable'
  // La Permissions API no siempre está; si no, se resuelve al primer fix.
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (p?.state === 'granted') return 'granted'
    if (p?.state === 'denied') return 'denied'
  } catch {
    // sin Permissions API: seguimos, el permiso se pide al watchPosition
  }
  return new Promise<PermissionResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15_000 }
    )
  })
}

/**
 * Arranca el seguimiento. `onFix` se llama con cada punto nuevo.
 * `background: true` (default en nativo) usa el plugin de background.
 *
 * Fallback por timeout: `addWatcher` puede resolver bien (devuelve un `id`
 * válido) y sin embargo no llamar nunca a su callback — visto en el
 * dispositivo real, es la causa más probable de que el mapa de running
 * nunca aparezca (necesita >1 punto para montarse, ver Run.tsx). Eso NO
 * tira excepción, así que el `catch` de abajo no lo cubre. Si a los
 * `BACKGROUND_FALLBACK_MS` no entregó nada, se arranca también el
 * foreground en paralelo — el que entregue primero, entrega.
 */
export async function startWatch(
  onFix: (fix: GeoFix) => void,
  { background = isNative }: { background?: boolean } = {}
): Promise<GeoWatch> {
  if (isNative && background) {
    try {
      let gotFix = false
      const id = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Registrando tu salida',
          backgroundMessage: 'GymTracker está siguiendo tu recorrido',
          requestPermissions: true,
          stale: false,
          distanceFilter: 5,
        },
        (location, error) => {
          if (error || !location) return
          gotFix = true
          onFix({
            lat: location.latitude,
            lng: location.longitude,
            t: location.time ?? Date.now(),
            alt: location.altitude ?? undefined,
            acc: location.accuracy ?? undefined,
            speed: location.speed ?? undefined,
          })
        }
      )
      const bgWatch: GeoWatch = { clear: () => void BackgroundGeolocation.removeWatcher({ id }) }

      let fgWatch: GeoWatch | null = null
      const timer = setTimeout(() => {
        if (gotFix) return
        startForegroundWatch((fix) => {
          gotFix = true
          onFix(fix)
        }).then((w) => {
          fgWatch = w
        })
      }, BACKGROUND_FALLBACK_MS)

      return {
        clear: () => {
          clearTimeout(timer)
          bgWatch.clear()
          fgWatch?.clear()
        },
      }
    } catch {
      // addWatcher tiró: cae al camino foreground de una
    }
  }

  return startForegroundWatch(onFix)
}
