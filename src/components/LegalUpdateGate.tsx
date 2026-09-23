import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { LEGAL_VERSION } from '@/lib/legal'
import { nowIso } from '@/lib/utils'
import Portal from '@/components/ui/Portal'
import { toast } from '@/stores/toastStore'

/**
 * Pide aceptar de nuevo los términos y la política cuando `LEGAL_VERSION`
 * sube por encima de la que el usuario aceptó (`profile.legalVersion`). Se
 * monta en AppShell: solo aparece con la app ya usable, y no se puede cerrar
 * sin aceptar. Los links llevan a los textos completos; al volver, el aviso
 * sigue ahí hasta que se acepta.
 */
export default function LegalUpdateGate() {
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )

  if (!userId || !profile) return null
  if ((profile.legalVersion ?? 0) >= LEGAL_VERSION) return null

  const accept = () =>
    db.profile
      .update(userId, { legalAcceptedAt: nowIso(), legalVersion: LEGAL_VERSION })
      .catch(() => toast.error('No se pudo guardar', 'Probá de nuevo — el aviso sigue apareciendo hasta que se guarde.'))

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-gate-title"
          className="w-full max-w-sm space-y-4 rounded-lg bg-surface p-5"
        >
          <div className="space-y-1.5">
            <h2 id="legal-gate-title" className="text-lg font-bold">
              Actualizamos nuestros términos
            </h2>
            <p className="text-[14px] leading-relaxed text-ink-2">
              Agregamos información sobre el modo coach, el chat y los reportes, el borrado de
              cuenta y el uso de tus datos. Para seguir usando Repe, revisalos y aceptalos.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-[15px] font-medium text-accent">
            <Link to="/legal/terminos" className="flex h-11 items-center">
              Leer los términos de uso
            </Link>
            <Link to="/legal/privacidad" className="flex h-11 items-center">
              Leer la política de privacidad
            </Link>
          </div>
          <button
            onClick={accept}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
          >
            Aceptar y continuar
          </button>
        </div>
      </div>
    </Portal>
  )
}
