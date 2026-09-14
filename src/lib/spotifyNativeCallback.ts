import { isNative } from '@/lib/native'
import { exchangeCodeForToken, fetchSpotifyDisplayName } from '@/lib/spotifyAuth'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { toast } from '@/stores/toastStore'

/**
 * Captura el redirect de Spotify en nativo. `startSpotifyLogin` (nativo)
 * abre el login con `@capacitor/browser` (`Browser.open`) en vez de navegar
 * el webview de la app afuera — el webview sigue vivo todo el tiempo, así
 * que acá se resuelve el login DIRECTO (exchange + store), sin pasar por
 * SpotifyCallback.tsx ni recargar nada. Esa pantalla sigue siendo el camino
 * en web, donde sí hay una navegación real de por medio.
 */
const CALLBACK_PREFIX = 'gymtracker://spotify-callback'

async function handleSpotifyRedirect(url: string): Promise<void> {
  if (!url.startsWith(CALLBACK_PREFIX)) return

  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch {
    // Puede que ya se haya cerrado solo (Spotify a veces lo hace) — no es
    // un error real.
  }

  const parsed = new URL(url)
  const code = parsed.searchParams.get('code')
  const spotifyError = parsed.searchParams.get('error')

  if (spotifyError) {
    toast.error(
      'No se pudo conectar con Spotify',
      spotifyError === 'access_denied' ? 'Cancelaste el login en Spotify.' : spotifyError
    )
    return
  }
  if (!code) return // el usuario cerró el browser sin autorizar: silencioso

  try {
    const token = await exchangeCodeForToken(code)
    const displayName = await fetchSpotifyDisplayName(token.accessToken)
    useSpotifyStore.getState().connect(token, displayName)
    toast.success('Spotify conectado', displayName ?? undefined)
  } catch (e) {
    toast.error('No se pudo conectar con Spotify', e instanceof Error ? e.message : undefined)
  }
}

/** Se llama una vez desde main.tsx. No-op fuera de iOS/Android. */
export function initSpotifyNativeCallback(): void {
  if (!isNative) return
  import('@capacitor/app')
    .then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => void handleSpotifyRedirect(url))
    })
    .catch(() => {
      // Sin @capacitor/app disponible: no hay forma de recibir el
      // redirect, el login de Spotify en nativo queda inerte (mismo
      // criterio best-effort que el resto de las integraciones opcionales).
    })
}
