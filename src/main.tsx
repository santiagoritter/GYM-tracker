import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { db, seedIfEmpty } from '@/db/schema'
import { installSyncHooks, setSyncUser } from '@/db/syncHooks'
import { useAuthStore } from '@/stores/authStore'
import { initNativeShell } from '@/lib/native'
import { applyTheme, useThemeStore } from '@/stores/themeStore'
import '@/index.css'

// No-op en el navegador; en nativo ajusta la barra de estado y oculta el
// splash cuando la app ya puede dibujar.
initNativeShell()

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

seedIfEmpty()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* basename: en producción la app vive en /GYM-tracker/. Sin esto ninguna
        ruta matchea, el catch-all de App.tsx reescribe la URL a la raíz del
        dominio y al recargar GitHub Pages devuelve su propio 404. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
