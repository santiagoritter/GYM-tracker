import { Capacitor } from '@capacitor/core'

/**
 * Capa fina sobre Capacitor.
 *
 * La app corre en tres contextos: navegador, PWA instalada y app nativa. El
 * código de dominio no debería enterarse: estas funciones eligen la mejor
 * implementación disponible y degradan sin romper. Todas son seguras de
 * llamar en el navegador.
 */

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

/**
 * Vibración corta de confirmación (completar una serie).
 *
 * En nativo usa el motor háptico, que en iOS es notablemente mejor que
 * `navigator.vibrate` — de hecho Safari en iOS ignora `vibrate` por completo,
 * así que hasta ahora el feedback táctil no existía en el dispositivo real
 * del usuario.
 */
export async function hapticTick(): Promise<void> {
  if (isNative) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      await Haptics.impact({ style: ImpactStyle.Light })
      return
    } catch {
      // Sin motor háptico disponible: se cae al camino web
    }
  }
  navigator.vibrate?.(40)
}

/** Vibración de logro (PR, entreno terminado). */
export async function hapticSuccess(): Promise<void> {
  if (isNative) {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics')
      await Haptics.notification({ type: NotificationType.Success })
      return
    } catch {
      // idem
    }
  }
  navigator.vibrate?.([40, 60, 40])
}

/**
 * Notificación local. En nativo se programa con el sistema operativo, así
 * que llega con la app cerrada — que es justamente lo que hace falta para
 * avisar el fin del descanso cuando el usuario apagó la pantalla.
 */
export async function notify(
  title: string,
  body: string,
  atSeconds?: number,
  id?: number
): Promise<void> {
  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const permission = await LocalNotifications.checkPermissions()
      if (permission.display !== 'granted') {
        const asked = await LocalNotifications.requestPermissions()
        if (asked.display !== 'granted') return
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id: id ?? Date.now() % 2147483647,
            title,
            body,
            schedule: atSeconds ? { at: new Date(Date.now() + atSeconds * 1000) } : undefined,
          },
        ],
      })
      return
    } catch {
      // Se cae a la Web Notifications API
    }
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  // En web no se puede programar a futuro sin un service worker con push:
  // el llamador se encarga del timing.
  if (atSeconds) return
  new Notification(title, { body, silent: false })
}

/** Id fijo de la notificación de fin de descanso. Rango propio: no pisa
 * `REMINDER_ID_BASE` (4_200_000) ni `MOTIV_ID_BASE` (4_300_000). */
export const REST_NOTIFICATION_ID = 4_100_000

/**
 * Cancela SOLO el aviso de fin de descanso (ej: al saltarlo). Antes cancelaba
 * todas las notificaciones pendientes — se llevaba puestos los recordatorios
 * diarios y las frases motivacionales cada vez que se salteaba un descanso.
 */
export async function cancelRestNotification(): Promise<void> {
  if (!isNative) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] })
  } catch {
    // sin plugin, nada que cancelar
  }
}

/**
 * Ajustes de arranque en nativo: barra de estado clara sobre fondo oscuro y
 * ocultar el splash recién cuando la app está lista para dibujar.
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative) return
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ])
    await StatusBar.setStyle({ style: Style.Dark })
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0B0B0C' })
    }
    await SplashScreen.hide()
  } catch {
    // Si algún plugin no está, la app arranca igual
  }
}
