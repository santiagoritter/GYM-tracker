import { useState } from 'react'
import { X } from 'lucide-react'
import { deleteAccount } from '@/lib/deleteAccount'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'

const CONFIRM_WORD = 'BORRAR'

/**
 * Confirmación de borrado de cuenta. Es irreversible, así que no alcanza con
 * un botón: hay que escribir la palabra de confirmación (nunca perder la
 * cuenta por un tap mal dado). Al terminar recarga la app, que cae en el
 * login.
 */
export default function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await deleteAccount()
      window.location.reload()
    } catch (e) {
      toast.error('No se pudo borrar la cuenta', e instanceof Error ? e.message : 'Probá de nuevo.')
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet onClose={busy ? () => undefined : onClose} panelClassName="flex max-h-[88vh] flex-col">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-lg font-bold">Borrar mi cuenta</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Esta acción no se puede deshacer</p>
        </div>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2 disabled:opacity-40"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2 text-[14px] leading-relaxed text-ink-2">
        <p>
          Se borran tu cuenta y todo lo que está guardado en la nube: entrenamientos, rutinas,
          medidas, récords, calorías, mensajes con tu coach o tus alumnos, y tu perfil. También
          se borran los datos de este dispositivo.
        </p>
        <p>
          Si sos coach, tus alumnos quedan sin coach y se pierde el historial de chat con ellos.
        </p>
        <p>
          Si tenés una suscripción, borrar la cuenta <strong className="text-ink">no la cancela</strong>:
          hacelo desde Ajustes de tu iPhone → tu nombre → Suscripciones.
        </p>
        <p>
          Antes de seguir podés guardar una copia en Ajustes → Datos → Exportar mis datos.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">
            Para confirmar, escribí {CONFIRM_WORD}
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-sm bg-surface-2 px-4 text-[15px] outline-none focus:ring-1 focus:ring-danger"
          />
        </div>
      </div>

      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={submit}
          disabled={!ready || busy}
          className="h-12 w-full rounded-sm border border-danger/40 bg-danger/10 text-sm font-bold text-danger active:bg-danger/20 disabled:opacity-40"
        >
          {busy ? 'Borrando…' : 'Borrar mi cuenta definitivamente'}
        </button>
      </div>
    </ResponsiveSheet>
  )
}
