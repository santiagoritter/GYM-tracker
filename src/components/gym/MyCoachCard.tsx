import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Star, Unlink } from 'lucide-react'
import { fetchMyCoach, fetchMyGoals, type CoachPublic, type Goal } from '@/lib/coachQueries'
import { endBond } from '@/lib/coachMutations'
import { fetchMyReviewFor, submitReview } from '@/lib/coachReviews'
import { toast } from '@/stores/toastStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import VerifiedBadge from '@/components/gym/VerifiedBadge'

/**
 * "Tu coach" en el perfil del alumno: quién es, sus metas, chat, reseña, y
 * cortar el vínculo. No renderiza nada si no hay coach activo.
 */
export default function MyCoachCard({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [coach, setCoach] = useState<(CoachPublic & { bondId: string }) | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loaded, setLoaded] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hasReview, setHasReview] = useState(false)

  const load = useCallback(() => {
    fetchMyCoach(userId)
      .then(async (c) => {
        setCoach(c)
        if (c) {
          const [g, mine] = await Promise.all([fetchMyGoals(userId), fetchMyReviewFor(c.coachId, userId)])
          setGoals(g)
          if (mine) {
            setHasReview(true)
            setRating(mine.rating)
            setComment(mine.comment ?? '')
          }
        }
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

  const sendReview = async () => {
    if (rating < 1) {
      toast.error('Elegí una puntuación', 'De 1 a 5 estrellas.')
      return
    }
    try {
      await submitReview(coach.coachId, { rating, comment })
      toast.success(hasReview ? 'Reseña actualizada' : 'Gracias por tu reseña')
      setHasReview(true)
      setReviewOpen(false)
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

        <Row onClick={() => navigate('/mi-coach/chat')}>
          <MessageSquare size={18} className="shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1 text-[15px]">Mensajes</span>
        </Row>

        <Row onClick={() => setReviewOpen((o) => !o)}>
          <Star size={18} className="shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1 text-[15px]">
            {hasReview ? 'Editar tu reseña' : 'Dejar una reseña'}
          </span>
        </Row>

        {reviewOpen && (
          <Row className="flex-col items-stretch gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} estrellas`}
                  className="flex h-9 w-9 items-center justify-center"
                >
                  <Star
                    size={22}
                    className={cn(n <= rating ? 'text-warning' : 'text-ink-4')}
                    fill={n <= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Comentario (opcional)"
              className="w-full rounded-sm bg-surface-2 p-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
            />
            <button onClick={sendReview} className="h-11 rounded-sm bg-accent text-sm font-bold text-bg">
              {hasReview ? 'Actualizar' : 'Enviar reseña'}
            </button>
          </Row>
        )}
      </Card>
    </section>
  )
}
