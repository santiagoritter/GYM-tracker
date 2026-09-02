import { useCallback, useEffect, useState } from 'react'
import { Unlink } from 'lucide-react'
import { fetchMyCoach, fetchMyGoals, type CoachPublic, type Goal } from '@/lib/coachQueries'
import { endBond } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * "Tu coach" en el perfil del alumno: quién es su coach (si tiene vínculo
 * activo), sus metas asignadas, y el botón para cortar el vínculo. No
 * renderiza nada si no hay coach — no ocupa lugar.
 */
export default function MyCoachCard({ userId }: { userId: string }) {
  const [coach, setCoach] = useState<(CoachPublic & { bondId: string }) | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    Promise.all([fetchMyCoach(userId), fetchMyGoals(userId)])
      .then(([c, g]) => {
        setCoach(c)
        setGoals(g)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [userId])

  useEffect(load, [load])

  if (!loaded || !coach) return null

  const activeGoals = goals.filter((g) => g.status === 'active')

  const cut = async () => {
    if (!confirm('¿Terminar el vínculo con tu coach? Va a dejar de ver tu progreso.')) return
    try {
      await endBond(coach.bondId)
      toast.info('Vínculo terminado')
      load()
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <section>
      <SectionHeader title="Tu coach" />
      <Card>
        <Row>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              {coach.displayName || 'Tu coach'}
              {coach.verified && <VerifiedBadge size={15} />}
            </p>
            {coach.experienceYears != null && (
              <p className="text-[13px] text-ink-3">{coach.experienceYears} años de experiencia</p>
            )}
          </div>
          <button onClick={cut} aria-label="Finalizar vínculo" className="flex h-11 w-11 items-center justify-center text-danger">
            <Unlink size={18} />
          </button>
        </Row>
        {activeGoals.length > 0 && (
          <Row className="flex-col items-stretch gap-1.5">
            <p className="text-[13px] font-medium text-ink-3">Metas</p>
            {activeGoals.map((g) => (
              <p key={g.id} className="text-[14px] text-ink-2">
                • {g.title}
              </p>
            ))}
          </Row>
        )}
      </Card>
    </section>
  )
}
