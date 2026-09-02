import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, MessageSquare, Target, Unlink } from 'lucide-react'
import {
  fetchClientGoals,
  fetchClientOverview,
  fetchClientRoutines,
  type ClientOverview,
  type ClientRoutine,
  type Goal,
} from '@/lib/coachQueries'
import {
  assignRoutineToClient,
  endBond,
  setClientGoal,
  updateGoalStatus,
} from '@/lib/coachMutations'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { fetchBondId, fetchMyClients } from '@/lib/coachQueries'
import { toast } from '@/stores/toastStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'

export default function CoachClientDetail() {
  const { id: clientId = '' } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [overview, setOverview] = useState<ClientOverview | null>(null)
  const [routines, setRoutines] = useState<ClientRoutine[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [bondId, setBondId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetchClientOverview(clientId),
      fetchClientRoutines(clientId),
      fetchClientGoals(clientId),
      fetchMyClients(),
    ])
      .then(([o, r, g, clients]) => {
        setOverview(o)
        setRoutines(r)
        setGoals(g)
        const me = clients.find((c) => c.clientId === clientId)
        setName(me?.displayName || me?.email || 'Alumno')
      })
      .catch((e: unknown) => toast.error('No se pudo cargar', e instanceof Error ? e.message : 'Error'))
  }, [clientId])

  useEffect(load, [load])

  // El bondId hace falta para cortar el vínculo.
  useEffect(() => {
    fetchBondId(clientId).then(setBondId).catch(() => setBondId(null))
  }, [clientId])

  const handleAssign = async (templateId: string) => {
    const tpl = ROUTINE_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setAssigning(true)
    try {
      await assignRoutineToClient(clientId, tpl.payload)
      toast.success('Rutina asignada', `${tpl.name} — la va a ver en "Mis rutinas"`)
      setShowTemplates(false)
      load()
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
      load()
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    }
  }

  const handleEndBond = async () => {
    if (!bondId || !confirm(`¿Terminar el vínculo con ${name}? Vas a dejar de ver su progreso.`)) return
    try {
      await endBond(bondId)
      toast.info('Vínculo terminado')
      navigate('/coach')
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="mx-auto min-h-screen content-width pb-24 lg:max-w-4xl">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/coach')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-semibold">{name}</h1>
        <button
          onClick={() => navigate(`/coach/alumno/${clientId}/chat`)}
          aria-label="Mensajes"
          className="flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <MessageSquare size={20} />
        </button>
      </header>

      <div className="space-y-5 px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Entrenos" value={String(overview?.sessions ?? 0)} />
          <Stat label="Volumen" value={`${Math.round((overview?.totalVolumeKg ?? 0) / 1000)}t`} />
          <Stat label="PRs" value={String(overview?.prs ?? 0)} />
          <Stat
            label="Último"
            value={
              overview?.lastWorkoutAt
                ? new Date(overview.lastWorkoutAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                : '—'
            }
          />
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionHeader title="Rutinas" />
            <button
              onClick={() => setShowTemplates((s) => !s)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-accent"
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
              className="flex items-center gap-1.5 text-[13px] font-semibold text-accent"
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
                    onClick={() => updateGoalStatus(g.id, g.status === 'done' ? 'active' : 'done').then(load)}
                    className="shrink-0 text-[13px] font-semibold text-accent"
                  >
                    {g.status === 'done' ? 'Reabrir' : 'Cumplida'}
                  </button>
                </Row>
              ))}
            </Card>
          )}
        </section>

        <button
          onClick={handleEndBond}
          disabled={!bondId}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-danger/30 text-sm font-semibold text-danger active:bg-danger/10 disabled:opacity-40"
        >
          <Unlink size={16} /> Finalizar vínculo
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface p-2.5 text-center">
      <p className="font-mono text-base font-bold tabular-nums text-accent">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-3">{label}</p>
    </div>
  )
}
