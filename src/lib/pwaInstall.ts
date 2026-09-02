import { useSyncExternalStore } from 'react'

/**
 * Instalación de la PWA "a un tap". El navegador dispara
 * `beforeinstallprompt` cuando la app cumple los criterios de instalación
 * (manifest válido, SW, servida por HTTPS, no instalada ya) — hay que
 * capturarlo y guardarlo para poder mostrarlo cuando el usuario quiera, en
 * vez de dejar que el navegador decida el momento (que en Android suele ser
 * un mini-banner fácil de ignorar y en escritorio directamente no aparece).
 *
 * En iOS Safari este evento no existe: no hay instalación programática, se
 * hace desde "Compartir → Agregar a inicio". `canInstallPwa()` devuelve
 * false ahí y la UI ofrece esa instrucción en su lugar.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari expone esto en vez del media query
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Se llama una vez desde `main.tsx`. */
export function initPwaInstall(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // que no aparezca el banner del navegador por su cuenta
    deferredPrompt = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

export function canInstallPwa(): boolean {
  return deferredPrompt !== null && !isStandalone()
}

/** Muestra el diálogo nativo de instalación. Devuelve true si el usuario
 * aceptó. El evento es de un solo uso: después de llamarlo hay que esperar
 * a que el navegador dispare otro `beforeinstallprompt`. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  const evt = deferredPrompt
  deferredPrompt = null
  emit()
  await evt.prompt()
  const choice = await evt.userChoice
  return choice.outcome === 'accepted'
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Hook reactivo: re-renderiza cuando aparece/desaparece la posibilidad de
 * instalar. */
export function useCanInstallPwa(): boolean {
  return useSyncExternalStore(subscribe, canInstallPwa, () => false)
}
