import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SpotifyState {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  displayName: string | null
  connect: (token: { accessToken: string; refreshToken: string; expiresAt: number }, displayName: string | null) => void
  disconnect: () => void
}

/**
 * Credenciales de sesión de Spotify — vive en localStorage vía zustand,
 * no en Dexie: es un token de un servicio externo, no un dato de
 * entrenamiento que deba sincronizarse a Supabase ni viajar entre
 * dispositivos (cada dispositivo conecta su propia sesión de Spotify).
 * Mismo patrón que themeStore.ts.
 */
export const useSpotifyStore = create<SpotifyState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      displayName: null,
      connect: (token, displayName) =>
        set({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          displayName,
        }),
      disconnect: () =>
        set({ accessToken: null, refreshToken: null, expiresAt: null, displayName: null }),
    }),
    { name: 'gymtracker-spotify' }
  )
)
