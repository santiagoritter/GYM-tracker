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

/** `deviceId`: fuerza el comando a un dispositivo puntual en vez del que
 * Spotify considera "activo" — hace falta para reanudar cuando Spotify
 * soltó esa marca por la pausa (ver `fetchAvailableDevices`) pero la app
 * sigue abierta ahí y puede volver a tomar la reproducción. */
export async function sendPlaybackCommand(
  action: 'play' | 'pause' | 'next' | 'previous',
  deviceId?: string
): Promise<PlaybackCommandResult> {
  const token = await getValidAccessToken()
  if (!token) return 'reauth-required'

  const { method, path } = COMMAND_ENDPOINTS[action]
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''
  try {
    const res = await fetch(`https://api.spotify.com/v1/me/player/${path}${query}`, {
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

export interface SpotifyDevice {
  id: string
  name: string
  isActive: boolean
}

/**
 * `/me/player` reporta 204 (sin dispositivo) bastante antes de que
 * Spotify realmente se haya "ido" — con solo pausar, algunos celulares
 * sueltan la marca de "dispositivo activo" en pocos segundos aunque la
 * app siga abierta y lista para retomar. Este endpoint lista los
 * dispositivos conocidos aunque ninguno esté activo — sirve para
 * ofrecer "reanudar acá" en vez de mandar al usuario a destrabarlo a
 * mano desde Spotify.
 */
export async function fetchAvailableDevices(): Promise<SpotifyDevice[] | null> {
  const token = await getValidAccessToken()
  if (!token) return null
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { devices: { id: string; name: string; is_active: boolean }[] }
    return data.devices.map((d) => ({ id: d.id, name: d.name, isActive: d.is_active }))
  } catch {
    return null
  }
}
