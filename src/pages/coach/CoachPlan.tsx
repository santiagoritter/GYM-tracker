import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { COACH_PRICE_USD, isCoachBillingEnabled } from '@/lib/coachSubscription'

/**
 * Plan del modo coach — MAQUETA. Hoy es gratis; el botón de pago está inerte
 * hasta que se prenda `VITE_COACH_BILLING`. Cuando se integre Mercado Pago,
 * solo cambia `coachSubscription.ts` y este botón.
 */
export default function CoachPlan() {
  const navigate = useNavigate()
  const billing = isCoachBillingEnabled()

  const perks = [
    'Alumnos ilimitados vinculados por link o QR',
    'Ver progreso, PRs y medidas de cada alumno en vivo',
    'Asignar rutinas y metas',
    'Chat con adjuntos de ejercicios y rutinas',
    'Perfil público con reseñas y verificado',
  ]

  return (
    <div className="mx-auto min-h-screen content-width pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/coach/perfil')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">Plan Coach</h1>
      </header>

      <div className="space-y-5 px-4 py-6">
        <div className="rounded-xl bg-surface p-5">
          <p className="text-[14px] font-semibold text-accent">Modo coach</p>
          <p className="mt-1 text-3xl font-bold">
            Gratis
            <span className="ml-2 align-middle text-[15px] font-medium text-ink-3">
              por ahora · después US${COACH_PRICE_USD}/mes
            </span>
          </p>
          <ul className="mt-4 space-y-2">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[15px] text-ink-2">
                <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <button
          disabled={!billing}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
        >
          {billing ? `Suscribirme — US$${COACH_PRICE_USD}/mes` : 'Suscripción disponible pronto'}
        </button>
        {!billing && (
          <p className="text-center text-[13px] text-ink-3">
            Mientras tanto el modo coach está habilitado sin costo.
          </p>
        )}
      </div>
    </div>
  )
}
