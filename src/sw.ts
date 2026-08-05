/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// `__WB_MANIFEST` lo inyecta vite-plugin-pwa (injectManifest) en build time
// con la lista real de assets a precachear — no existe en el tipo base de
// ServiceWorkerGlobalScope, hay que declararlo a mano.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
self.skipWaiting()
clientsClaim()

// Sin runtime caching de red todavía: la app no pide nada a un backend
// (Dexie es local). Cuando exista Supabase, su patrón va acá con
// `registerRoute` de `workbox-routing` en NetworkOnly — Workbox cachea por
// URL e ignora el header Authorization, así que cachear PostgREST podría
// servir datos de otra sesión desde el caché.

/**
 * Fase 26 — Web Push real. El resto de este archivo reemplaza al service
 * worker autogenerado (antes `generateSW`) solo para poder agregar este
 * handler: Workbox en modo generateSW no deja inyectar código propio.
 *
 * El payload lo arma `supabase/functions/send-push-reminders` — mientras
 * ese backend no esté desplegado, este evento simplemente nunca se
 * dispara (no hay nada roto, solo sin uso).
 */
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return
  let payload: { title?: string; body?: string }
  try {
    payload = event.data.json()
  } catch {
    return
  }
  const title = payload.title ?? 'GymTracker'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: `${self.registration.scope}icons/icon-192.png`,
      badge: `${self.registration.scope}icons/icon-192.png`,
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const scope = self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(scope))
      if (existing) return existing.focus()
      return self.clients.openWindow(scope)
    })
  )
})
