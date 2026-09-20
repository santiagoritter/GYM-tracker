import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import CoachPlanCard from '@/components/gym/CoachPlanCard'
import { leaveCoach } from '@/lib/coachSelfSignup'
import { toast } from '@/stores/toastStore'

/**
 * Plan del modo coach: precio y beneficios (`CoachPlanCard`, los mismos del alta)
 * y la baja del modo coach. Con el cobro apagado el modo coach es gratis y no
 * hay botón de compra; el paywall real vive en `Paywall.tsx` (compras dentro de
 * la app, Guideline 3.1.1) cuando `VITE_PURCHASES_ENABLED=on`.
 */
export default function CoachPlan() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  const handleLeave = async () => {
    if (
      !confirm(
        '¿Salir del modo coach? Termina el vínculo con todos tus alumnos — no van a poder verte como coach hasta que vuelvas a activarlo.'
      )
    ) {
      return
    }
    setLeaving(true)
    try {
      await leaveCoach()
      toast.info('Saliste del modo coach')
      navigate('/')
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen content-width pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/coach/perfil')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">Plan Coach</h1>
      </header>

      <div className="space-y-5 px-4 py-6">
        <CoachPlanCard />

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-line-2 text-sm font-semibold text-danger disabled:opacity-50"
        >
          <LogOut size={16} />
          {leaving ? 'Saliendo…' : 'Salir del modo coach'}
        </button>
      </div>
    </div>
  )
}
