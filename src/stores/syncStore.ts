import { create } from 'zustand'

interface SyncState {
  status: 'idle' | 'syncing' | 'error'
  lastSyncedAt: string | null
  /** Filas que el último push no pudo subir. `code` es el del servidor (p. ej.
   * `PGRST204`: columna inexistente); sin `code`, fue la red. Antes esto solo iba
   * a `console.warn` y un entreno que nunca subía no lo notaba nadie. */
  rejected: { count: number; code?: string }
  setRejected: (count: number, code?: string) => void
  setSyncing: () => void
  setSynced: () => void
  setError: () => void
}

/**
 * Estado efímero, no persistido (a diferencia de authStore/themeStore):
 * es solo para el indicador de Ajustes, no hace falta que sobreviva un
 * refresh — el próximo sync lo vuelve a poblar solo.
 */
export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  rejected: { count: 0 },
  setRejected: (count, code) => set({ rejected: { count, code } }),
  setSyncing: () => set({ status: 'syncing' }),
  setSynced: () => set({ status: 'idle', lastSyncedAt: new Date().toISOString() }),
  setError: () => set({ status: 'error' }),
}))
