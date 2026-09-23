import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useCoachBillingEnabled } from '@/lib/coachSubscription'
import { purchasesAvailable } from '@/lib/purchases'
import { platform } from '@/lib/native'
import { useEntitlementsStore } from '@/stores/entitlementsStore'
import Paywall from '@/components/gym/Paywall'

/**
 * Estado de la suscripción de coach + botón para suscribirse. No renderiza
 * nada si el cobro está apagado del lado del servidor (el modo coach es
 * gratis). Lo usan el paso "Plan" del alta y la pantalla Plan Coach.
 *
 * El cobro ahora es una decisión del servidor (`useCoachBillingEnabled`,
 * `app_config`), no de la plataforma — pero comprar solo se puede desde
 * iOS con RevenueCat configurado (`purchasesAvailable()`). Con el cobro
 * exigido y esta plataforma sin poder comprar (web, Android sin key
 * todavía), no tiene sentido abrir el Paywall genérico (que solo diría
 * "no disponible, probá más tarde", confuso acá): se avisa directamente
 * que hay que suscribirse desde la app de iOS con la misma cuenta.
 */
export default function CoachSubscribeBlock() {
  const entitled = useEntitlementsStore((s) => s.coach)
  const [open, setOpen] = useState(false)
  const billingRequired = useCoachBillingEnabled()
  if (!billingRequired) return null

  if (!entitled && !purchasesAvailable()) {
    return (
      <p className="rounded-md bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
        {platform === 'ios'
          ? 'No se pudo cargar la suscripción ahora. Probá de nuevo más tarde.'
          : 'El modo coach se paga desde la app de iOS — suscribite ahí con esta misma cuenta y volvé acá.'}
      </p>
    )
  }

  return (
    <>
      {entitled ? (
        <p className="flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-[14px] font-medium text-success">
          <BadgeCheck size={18} /> Suscripción de coach activa
        </p>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
        >
          Suscribirme al modo coach
        </button>
      )}
      {open && <Paywall kind="coach" onClose={() => setOpen(false)} />}
    </>
  )
}
