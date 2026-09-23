import { Check } from 'lucide-react'
import { COACH_PERKS, COACH_PRICE_USD, useCoachBillingEnabled } from '@/lib/coachSubscription'

/**
 * Tarjeta del plan de coach: precio + beneficios. La usan el paso "Plan" del
 * alta y la pantalla Plan Coach, para que el precio y la lista no se desincronicen.
 * Con el cobro apagado muestra que el modo coach es gratis (sin botones muertos).
 */
export default function CoachPlanCard() {
  const billing = useCoachBillingEnabled()
  return (
    <div className="rounded-xl bg-surface p-5">
      <p className="text-[14px] font-semibold text-accent">Modo coach</p>
      <p className="mt-1 text-3xl font-bold">
        {billing ? (
          <>
            US${COACH_PRICE_USD}
            <span className="ml-1 align-middle text-[15px] font-medium text-ink-3">/ mes</span>
          </>
        ) : (
          <>
            Gratis
            <span className="ml-2 align-middle text-[15px] font-medium text-ink-3">
              por ahora
            </span>
          </>
        )}
      </p>
      <ul className="mt-4 space-y-2">
        {COACH_PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[15px] text-ink-2">
            <Check size={16} className="mt-0.5 shrink-0 text-accent" />
            {p}
          </li>
        ))}
      </ul>
      {billing && (
        <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
          Suscripción mensual con renovación automática. Se cobra a tu cuenta de Apple y podés
          cancelarla cuando quieras desde Ajustes → tu nombre → Suscripciones.
        </p>
      )}
    </div>
  )
}
