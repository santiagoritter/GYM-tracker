import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * Preferencia de tema. Vive en localStorage vía zustand, no en
 * Dexie/LocalProfile: es una preferencia de chrome de la interfaz, no un
 * dato de entrenamiento, y hoy no hay sync funcionando igual (docs/13, sin
 * proyecto Supabase creado) para que viajara entre dispositivos.
 *
 * `applyTheme` es la única función que toca el DOM — se llama desde
 * src/main.tsx en el arranque y desde Ajustes.tsx al cambiar el toggle. El
 * script inline en index.html hace el mismo trabajo ANTES del primer paint,
 * leyendo localStorage directo (no puede importar este módulo).
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    { name: 'gymtracker-theme' }
  )
)

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : ''
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#F2F2F7' : '#0A0A0A')
}
