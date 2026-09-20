import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import type { ClientRoutine, Goal } from '@/lib/coachQueries'
import { retireCoachRoutine, setClientGoal, updateGoalStatus } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'

/**
 * Rutinas y metas del alumno (lo que el coach le ASIGNA), aparte de su
 * progreso. Las rutinas se arman en el constructor (`CoachRoutineBuilder`); las
 * que asignó este coach se pueden editar o retirar, las propias del alumno solo
 * se ven.
 */
export default function ClientPlanSection({
  clientId,
  routines,
  goals,
  onChanged,
}: {
  clientId: string
  routines: ClientRoutine[]
  goals: Goal[]
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const meId = useCurrentUserId()
  const [goalTitle, setGoalTitle] = useState('')
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [retiringId, setRetiringId] = useState<string | null>(null)

  const handleRetire = async (routine: ClientRoutine) => {
    if (!confirm(`¿Retirar "${routine.name}"? El alumno deja de verla en sus rutinas.`)) return
    setRetiringId(routine.id)
    try {
      await retireCoachRoutine(clientId, routine.id)
      toast.info('Rutina retirada')
      onChanged()
    } catch (e) {
      toast.error('No se pudo retirar', e instanceof Error ? e.message : 'Error')
    } finally {
      setRetiringId(null)
    }
  }

  const handleAddGoal = async () => {
    if (!goalTitle.trim()) return
    try {
      await setClientGoal(clientId, { title: goalTitle, metric: 'custom', targetValue: null, dueDate: null })
      setGoalTitle('')
      setShowGoalForm(false)
      onChanged()
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionHeader title="Rutinas" />
          <button
            onClick={() => navigate(`/coach/alumno/${clientId}/rutina`)}
            className="flex h-11 items-center gap-1.5 text-[13px] font-semibold text-accent"
          >
            <Plus size={15} /> Nueva rutina
          </button>
        </div>
        {routines.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">
            Sin rutinas todavía. Armá la primera con "Nueva rutina".
          </p>
        ) : (
          <Card>
            {routines.map((r) => (
              <Row key={r.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{r.name}</p>
                  <p className="text-[12px] text-ink-3">
                    {r.isActive && 'Activa · '}
                    {r.sourceCoachId === meId
                      ? 'asignada por vos'
                      : r.sourceCoachId
                        ? 'asignada por otro coach'
                        : 'propia del alumno'}
                  </p>
                </div>
                {r.sourceCoachId === meId && (
                  <>
                    <button
                      onClick={() => navigate(`/coach/alumno/${clientId}/rutina/${r.id}`)}
                      aria-label={`Editar ${r.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      onClick={() => handleRetire(r)}
                      disabled={retiringId === r.id}
                      aria-label={`Retirar ${r.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-danger/80 disabled:opacity-40"
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                )}
              </Row>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionHeader title="Metas" />
          <button
            onClick={() => setShowGoalForm((s) => !s)}
            className="flex h-11 items-center gap-1.5 text-[13px] font-semibold text-accent"
          >
            <Target size={15} /> Nueva
          </button>
        </div>
        {showGoalForm && (
          <div className="mb-2 flex gap-2">
            <input
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Ej: sentadilla 100 kg"
              className="h-11 flex-1 rounded-sm bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
            />
            <button onClick={handleAddGoal} className="h-11 rounded-sm bg-accent px-4 text-sm font-bold text-bg">
              Agregar
            </button>
          </div>
        )}
        {goals.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">Sin metas asignadas.</p>
        ) : (
          <Card>
            {goals.map((g) => (
              <Row key={g.id}>
                <span className={g.status === 'done' ? 'min-w-0 flex-1 text-[15px] text-ink-3 line-through' : 'min-w-0 flex-1 text-[15px]'}>
                  {g.title}
                </span>
                <button
                  onClick={() =>
                    updateGoalStatus(g.id, g.status === 'done' ? 'active' : 'done')
                      .then(onChanged)
                      .catch((e: unknown) => toast.error('No se pudo', e instanceof Error ? e.message : 'Error'))
                  }
                  className="flex h-11 shrink-0 items-center text-[13px] font-semibold text-accent"
                >
                  {g.status === 'done' ? 'Reabrir' : 'Cumplida'}
                </button>
              </Row>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
