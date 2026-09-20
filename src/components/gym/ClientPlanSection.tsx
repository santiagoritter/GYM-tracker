import { useState } from 'react'
import { ClipboardList, Target } from 'lucide-react'
import type { ClientRoutine, Goal } from '@/lib/coachQueries'
import { assignRoutineToClient, setClientGoal, updateGoalStatus } from '@/lib/coachMutations'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { toast } from '@/stores/toastStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'

/**
 * Rutinas y metas del alumno (lo que el coach le ASIGNA), aparte de su
 * progreso. Las rutinas hoy se asignan desde plantillas; el constructor propio
 * (Bloque 8) reemplaza ese selector.
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
  const [assigning, setAssigning] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const handleAssign = async (templateId: string) => {
    const tpl = ROUTINE_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setAssigning(true)
    try {
      await assignRoutineToClient(clientId, tpl.payload)
      toast.success('Rutina asignada', `${tpl.name} — la va a ver en "Mis rutinas"`)
      setShowTemplates(false)
      onChanged()
    } catch (e) {
      toast.error('No se pudo asignar', e instanceof Error ? e.message : 'Error')
    } finally {
      setAssigning(false)
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
            onClick={() => setShowTemplates((s) => !s)}
            className="flex h-11 items-center gap-1.5 text-[13px] font-semibold text-accent"
          >
            <ClipboardList size={15} /> Asignar
          </button>
        </div>
        {showTemplates && (
          <Card className="mb-2">
            {ROUTINE_TEMPLATES.map((t) => (
              <Row key={t.id} onClick={() => !assigning && handleAssign(t.id)}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{t.name}</p>
                  <p className="text-[13px] text-ink-3">{t.subtitle} · {t.level}</p>
                </div>
              </Row>
            ))}
          </Card>
        )}
        {routines.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-ink-3">Sin rutinas todavía.</p>
        ) : (
          <Card>
            {routines.map((r) => (
              <Row key={r.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{r.name}</p>
                  <p className="text-[12px] text-ink-3">
                    {r.isActive && 'Activa · '}
                    {r.sourceCoachId ? 'asignada por vos' : 'propia del alumno'}
                  </p>
                </div>
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
                  onClick={() => updateGoalStatus(g.id, g.status === 'done' ? 'active' : 'done').then(onChanged)}
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
