import { useSpotifyStore } from '@/stores/spotifyStore'
import { refreshSpotifyAccessToken } from '@/lib/spotifyAuth'

/**
 * Control remoto de lo que YA está sonando en algún dispositivo con
 * Spotify (celular, parlante) vía la Web API — no el Web Playback SDK.
 * El SDK necesitaría EME dentro del WebView de Capacitor (soporte poco
 * confiable) y haría sonar el audio desde la propia PWA en vez del
 * dispositivo donde el usuario ya lo tiene andando, que es el
 * escenario real en el gimnasio.
 */

/** Renueva el token si falta menos de 60s para que venza. Vive fuera
 * de React (se llama desde un poll con setInterval, no un componente),
 * por eso lee/escribe el store con getState()/las acciones directo. */
export async function getValidAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken, expiresAt, setTokens } = useSpotifyStore.getState()
  if (!accessToken || !refreshToken || !expiresAt) return null
  if (expiresAt - Date.now() > 60_000) return accessToken

  try {
    const result = await refreshSpotifyAccessToken(refreshToken)
    setTokens(result)
    return result.accessToken
  } catch {
    return null
  }
}

export interface PlaybackState {
  isPlaying: boolean
  trackName: string
  artistName: string
  albumArtUrl: string | null
  deviceName: string | null
}

export type PlaybackResult = PlaybackState | 'no-device' | 'reauth-required' | 'error'

export async function fetchPlaybackState(): Promise<PlaybackResult> {
  const token = await getValidAccessToken()
  if (!token) return 'reauth-required'

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 204) return 'no-device'
    if (res.status === 401) return 'reauth-required'
    if (!res.ok) return 'error'

    const data = (await res.json()) as {
      is_playing: boolean
      item: {
        name: string
        artists: { name: string }[]
        album: { images: { url: string }[] }
      } | null
      device: { name: string } | null
    }
    if (!data.item) return 'no-device'

    return {
      isPlaying: data.is_playing,
      trackName: data.item.name,
      artistName: data.item.artists.map((a) => a.name).join(', '),
      albumArtUrl: data.item.album.images[0]?.url ?? null,
      deviceName: data.device?.name ?? null,
    }
  } catch {
    return 'error'
  }
}

export type PlaybackCommandResult =
  | 'ok'
  | 'no-device'
  | 'premium-required'
  | 'reauth-required'
  | 'error'

const COMMAND_ENDPOINTS: Record<'play' | 'pause' | 'next' | 'previous', { method: string; path: string }> = {
  play: { method: 'PUT', path: 'play' },
  pause: { method: 'PUT', path: 'pause' },
  next: { method: 'POST', path: 'next' },
  previous: { method: 'POST', path: 'previous' },
}

export async function sendPlaybackCommand(
  action: 'play' | 'pause' | 'next' | 'previous'
): Promise<PlaybackCommandResult> {
  const token = await getValidAccessToken()
  if (!token) return 'reauth-required'

  const { method, path } = COMMAND_ENDPOINTS[action]
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/player/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 204) return 'ok'
    if (res.status === 401) return 'reauth-required'
    if (res.status === 404) return 'no-device'
    if (res.status === 403) {
      const body = (await res.json().catch(() => null)) as { error?: { reason?: string } } | null
      if (body?.error?.reason === 'PREMIUM_REQUIRED') return 'premium-required'
      return 'no-device'
    }
    return 'error'
  } catch {
    return 'error'
  }
}
