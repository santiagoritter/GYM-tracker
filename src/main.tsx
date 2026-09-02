import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import { db, seedIfEmpty } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabaseClient'
import { runSync } from '@/lib/sync'
import type { UserRole } from '@/types'
import { initNativeShell } from '@/lib/native'
import { initPwaUpdate } from '@/lib/pwaUpdate'
import { initPwaInstall } from '@/lib/pwaInstall'
import { ensureReminderChannel } from '@/lib/nativeReminders'
import { applyTheme, useThemeStore } from '@/stores/themeStore'
import '@/index.css'

// No-op en el navegador; en nativo ajusta la barra de estado y oculta el
// splash cuando la app ya puede dibujar.
initNativeShell()

// No-op si no hay service worker (nativo, navegadores sin soporte). En web
// registra el SW y pide activamente si hay versión nueva — ver el comentario
// en pwaUpdate.ts sobre por qué el registro automático de vite-plugin-pwa no
// alcanza solo.
initPwaUpdate()

// Captura `beforeinstallprompt` para poder ofrecer "Instalar la app" desde
// Ajustes en el momento que el usuario quiera (ver pwaInstall.ts).
initPwaInstall()

// Canal de Android para los recordatorios (no-op en web y en iOS).
void ensureReminderChannel()

// El script inline de index.html ya setea data-theme antes del primer
// paint (lee localStorage directo, sin poder importar este módulo). Esto
// sincroniza el store en memoria con lo que quedó en el DOM y cubre el
// caso de que la rehidratación de zustand complete después del mount.
applyTheme(useThemeStore.getState().theme)
useThemeStore.subscribe((state) => applyTheme(state.theme))

// Antes de cualquier escritura: los hooks sellan updatedAt/dirty en todas
// las tablas sincronizadas. Se instalan acá y no dentro de schema.ts para no
// crear un ciclo de imports (syncHooks necesita SYNC_ORDER de schema).
installSyncHooks(db)

// Los hooks son síncronos y no pueden leer el store, así que se les espeja
// el usuario activo. La suscripción es a nivel de módulo para que valga
// también fuera del árbol de React (stores, helpers de db).
setSyncUser(useAuthStore.getState().userId)
useAuthStore.subscribe((state) => setSyncUser(state.userId))

// Fuente de verdad de la sesión: Supabase, no cada pantalla de login por
// separado. Dispara también con la sesión restaurada al recargar la
// página (evento inicial de onAuthStateChange), así que reemplaza
// también lo que antes hacía persist() de authStore para ese caso.
//
// El mismo listener dispara el sync: al loguearse, al recuperar conexión,
// al volver a foreground, y cada 5 minutos mientras haya sesión — todo
// silencioso (runSync nunca tira, ver sync.ts). Sin esto los cambios
// locales nunca suben solos, habría que forzarlo a mano.
const SYNC_INTERVAL_MS = 5 * 60 * 1000
let syncInterval: ReturnType<typeof setInterval> | undefined

const triggerSync = () => {
  const userId = useAuthStore.getState().userId
  if (userId && !document.hidden && navigator.onLine) runSync(userId)
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const role = (session.user.app_metadata?.role as UserRole | undefined) ?? 'user'
      const name = (session.user.user_metadata?.name as string | undefined) ?? ''
      useAuthStore.getState().setSession(session.user.id, role, name, session.user.email ?? '')
      triggerSync()
      if (!syncInterval) syncInterval = setInterval(triggerSync, SYNC_INTERVAL_MS)
    } else {
      useAuthStore.getState().clearSession()
      if (syncInterval) {
        clearInterval(syncInterval)
        syncInterval = undefined
      }
    }
  })

  window.addEventListener('online', triggerSync)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) triggerSync()
  })
} else {
  // Sin Supabase (modo 100% local): no hay sesión viva que esperar, la
  // persistida es la única fuente. AdminRoute puede decidir ya.
  useAuthStore.getState().markSessionChecked()
}

seedIfEmpty()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* basename: en producción la app vive en /GYM-tracker/. Sin esto ninguna
        ruta matchea, el catch-all de App.tsx reescribe la URL a la raíz del
        dominio y al recargar GitHub Pages devuelve su propio 404. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
