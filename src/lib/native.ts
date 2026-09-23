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
 * Notificación web (fuera de nativo): por el service worker si hay uno
 * activo, si no por el constructor directo. Chrome Android (y otros
 * navegadores mobile) tiran "Illegal constructor" con `new Notification()`
 * — ahí SOLO anda vía `ServiceWorkerRegistration.showNotification()`. El
 * click de una notificación mostrada por el SW ya lo maneja el propio SW
 * (`notificationclick` en src/sw.ts), no hace falta duplicarlo acá.
 */
export async function showWebNotification(
  title: string,
  options: NotificationOptions
): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ])
      if (reg) {
        await reg.showNotification(title, options)
        return
      }
    } catch {
      // Sigue al fallback de abajo.
    }
  }
  try {
    const notif = new Notification(title, options)
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch {
    // Constructor no soportado (mobile) y sin SW disponible: no hay más
    // nada que hacer acá, no es un error del usuario.
  }
}

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
            // `allowWhileIdle`: sin esto, en Doze (Android 6+, pantalla
            // apagada un rato) el SO puede demorar el aviso de fin de
            // descanso varios minutos. Con esto, como mucho una vez cada
            // 9 min según el propio límite de Doze — no es instantáneo al
            // 100%, pero es lo más cerca que se puede llegar sin el
            // permiso de alarma exacta (SCHEDULE_EXACT_ALARM, ya declarado
            // en el manifest, pero el usuario lo puede tener denegado).
            schedule: atSeconds
              ? { at: new Date(Date.now() + atSeconds * 1000), allowWhileIdle: true }
              : undefined,
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
  await showWebNotification(title, { body, silent: false })
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
 * Ajustes de arranque en nativo: ocultar el splash recién cuando la app
 * está lista para dibujar. La barra de estado la sincroniza
 * `syncStatusBarStyle` (llamada desde `applyTheme` en main.tsx, justo
 * después de esto) — antes se seteaba acá una sola vez, fija en
 * `Style.Dark` (texto claro), y quedaba ilegible si el usuario tenía o
 * pasaba a tema claro (texto claro sobre fondo ahora claro).
 */
export async function initNativeShell(): Promise<void> {
  if (!isNative) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    // Si el plugin no está, la app arranca igual
  }
}

/**
 * Sincroniza la barra de estado nativa con el tema actual. Se llama desde
 * `applyTheme` (themeStore.ts) — el único lugar que ya aplica un cambio de
 * tema — tanto al arrancar como en cada toggle desde Ajustes.
 */
export async function syncStatusBarStyle(theme: 'light' | 'dark'): Promise<void> {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark })
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'light' ? '#F2F2F5' : '#0B0B0C' })
    }
  } catch {
    // Sin el plugin disponible, no hay nada más que hacer acá.
  }
}
