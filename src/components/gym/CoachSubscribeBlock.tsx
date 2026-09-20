import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { isCoachBillingEnabled } from '@/lib/coachSubscription'
import { useEntitlementsStore } from '@/stores/entitlementsStore'
import Paywall from '@/components/gym/Paywall'

/**
 * Estado de la suscripción de coach + botón para suscribirse. No renderiza nada
 * si el cobro está apagado en este build (el modo coach es gratis). Lo usan el
 * paso "Plan" del alta y la pantalla Plan Coach.
 */
export default function CoachSubscribeBlock() {
  const entitled = useEntitlementsStore((s) => s.coach)
  const [open, setOpen] = useState(false)
  if (!isCoachBillingEnabled()) return null

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
