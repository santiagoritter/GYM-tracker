/**
 * Login con Spotify vía Authorization Code + PKCE — pensado para apps
 * sin backend seguro donde guardar un `client_secret` (a diferencia del
 * flujo clásico "Authorization Code", PKCE no lo necesita: el
 * intercambio de código por token se autentica con el `code_verifier`
 * que solo existió en este dispositivo). Por eso todo esto vive en el
 * cliente, sin depender de la Edge Function que se había anotado como
 * necesaria en una fase anterior del roadmap — esa suposición asumía el
 * flujo clásico, no PKCE.
 *
 * `SPOTIFY_CLIENT_ID` puede venir vacío (todavía no se registró la app
 * en developer.spotify.com) — mismo criterio que `supabaseClient.ts`:
 * el resto de la app no debe romperse por una integración opcional que
 * no está configurada. `isSpotifyConfigured()` es lo que consulta
 * Ajustes.tsx para decidir si la fila está habilitada o "pendiente de
 * configurar".
 */

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined

const SCOPES = 'user-read-email user-read-private'
const VERIFIER_STORAGE_KEY = 'spotify_pkce_verifier'

export function isSpotifyConfigured(): boolean {
  return Boolean(SPOTIFY_CLIENT_ID)
}

/** Misma URL para armar el authorize request y para registrarla en el
 * dashboard de Spotify — tiene que coincidir EXACTO (Spotify no acepta
 * wildcards), por eso se deriva de `window.location`/`BASE_URL` en vez
 * de hardcodearla, así funciona igual en dev y en producción sin tocar
 * código (solo hay que cargar las dos URLs resultantes en el dashboard). */
export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}spotify/callback`
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes.buffer)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(digest)
}

/**
 * Arranca el login: genera el par verifier/challenge, guarda el
 * verifier en sessionStorage (sobrevive el round-trip a Spotify y
 * vuelta, no hace falta que sobreviva más que eso) y redirige. No
 * devuelve nada — la respuesta llega por navegación a
 * SpotifyCallback.tsx, no por promesa.
 */
export async function startSpotifyLogin(): Promise<void> {
  if (!SPOTIFY_CLIENT_ID) return
  const verifier = generateCodeVerifier()
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSpotifyRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export interface SpotifyTokenResult {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/** Llamado desde SpotifyCallback.tsx con el `code` de la URL de vuelta. */
export async function exchangeCodeForToken(code: string): Promise<SpotifyTokenResult> {
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY)
  if (!SPOTIFY_CLIENT_ID || !verifier) {
    throw new Error('Falta el code_verifier o el Client ID — reintentá el login desde Ajustes.')
  }
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getSpotifyRedirectUri(),
      code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    throw new Error(`Spotify rechazó el login (${res.status})`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/** Nombre para mostrar ("Conectado como X") — un solo llamado extra a
 * la API, no vale la pena cachearlo en el store aparte del token. */
export async function fetchSpotifyDisplayName(accessToken: string): Promise<string | null> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { display_name?: string }
  return data.display_name ?? null
}
