import { create } from 'zustand'
import { uid } from '@/lib/utils'

export type ToastKind = 'success' | 'error' | 'info' | 'pr'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  message?: string
  /** ms antes de auto-cerrar. 0 = no cerrar solo. */
  duration: number
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ kind, title, message, duration = 3200 }) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { id, kind, title, message, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Helpers para disparar toasts desde cualquier lado sin hook. */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'error', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'info', title, message }),
  pr: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'pr', title, message, duration: 4500 }),
}
