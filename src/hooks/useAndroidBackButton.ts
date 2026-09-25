import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isNative, platform } from '@/lib/native'
import { consumeBack } from '@/lib/backStack'

/**
 * Monta una sola vez (Layout.tsx / LayoutDesktop.tsx, junto con el resto de
 * los hooks singleton de la app). Antes el botón atrás de Android no hacía
 * nada útil: `MainActivity`/`App.java` del lado nativo intenta volver
 * atrás en el WebView (sin historial real página a página en una SPA) y,
 * si no puede, no hace nada — ni cierra un sheet, ni sale de la app.
 *
 * Orden de prioridad: 1) cerrar el overlay más reciente (`backStack.ts`,
 * cualquier `ResponsiveSheet` abierto), 2) si no estamos en la raíz,
 * navegar atrás en la SPA, 3) en la raíz, minimizar la app (nunca
 * `exitApp()`: eso mata el proceso de una, perdiendo lo que no llegó a
 * sincronizar — minimizar es lo que hace cualquier app de Android).
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate()
  const location = useLocation()
  // El listener se registra una sola vez (abajo); la ruta actual la lee de
  // acá en vez de estar en las deps del efecto — evitaba sacar y volver a
  // poner el listener nativo en cada navegación.
  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname

  useEffect(() => {
    if (!isNative || platform !== 'android') return
    let handle: { remove: () => void } | undefined
    let cancelled = false

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return
      App.addListener('backButton', () => {
        if (consumeBack()) return
        const atRoot = pathnameRef.current === import.meta.env.BASE_URL || pathnameRef.current === '/'
        if (!atRoot) {
          navigate(-1)
          return
        }
        void App.minimizeApp()
      }).then((h) => {
        if (cancelled) h.remove()
        else handle = h
      })
    })

    return () => {
      cancelled = true
      handle?.remove()
    }
  }, [navigate])
}
