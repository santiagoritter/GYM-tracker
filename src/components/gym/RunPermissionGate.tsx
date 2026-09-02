import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { ensureLocationPermission } from '@/lib/geo'
import { isNative } from '@/lib/native'

/**
 * Paso previo a arrancar una salida: explica para qué se usa la ubicación y
 * pide el permiso. El usuario dio a entender que quiere el pedido explícito
 * antes de nada, no un prompt del sistema a secas.
 */
export default function RunPermissionGate({
  onGranted,
  onCancel,
}: {
  onGranted: () => void
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  const ask = async () => {
    setBusy(true)
    const result = await ensureLocationPermission()
    setBusy(false)
    if (result === 'granted') onGranted()
    else setDenied(true)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
        <MapPin size={26} className="text-accent" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Permiso de ubicación</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Para trackear tu salida a correr, GymTracker usa el GPS del teléfono y calcula
          distancia, ritmo, parciales por kilómetro y el recorrido en el mapa.
        </p>
        {isNative && (
          <p className="text-[14px] leading-relaxed text-ink-3">
            Elegí <span className="font-medium text-ink-2">"Permitir todo el tiempo"</span> para
            que el registro siga aunque bloquees la pantalla. Los datos quedan en tu
            dispositivo.
          </p>
        )}
      </div>

      {denied ? (
        <div className="space-y-3">
          <p className="rounded-sm bg-warning/10 p-3 text-[14px] text-warning">
            El permiso está denegado. Habilitá la ubicación para GymTracker desde los ajustes
            del sistema y volvé a intentar.
          </p>
          <button
            onClick={onCancel}
            className="h-12 w-full rounded-sm border border-line-2 text-sm font-semibold text-ink-2 active:bg-surface"
          >
            Volver
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={ask}
            disabled={busy}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim disabled:opacity-60"
          >
            {busy ? 'Pidiendo permiso…' : 'Permitir ubicación'}
          </button>
          <button
            onClick={onCancel}
            className="h-11 w-full text-[13px] font-medium text-ink-3 active:text-ink-2"
          >
            Ahora no
          </button>
        </div>
      )}
    </div>
  )
}
