import { create } from 'zustand'

interface SyncState {
  status: 'idle' | 'syncing' | 'error'
  lastSyncedAt: string | null
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
  setSyncing: () => set({ status: 'syncing' }),
  setSynced: () => set({ status: 'idle', lastSyncedAt: new Date().toISOString() }),
  setError: () => set({ status: 'error' }),
}))
