import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Unlink } from 'lucide-react'
import { fetchClientProgress, type ClientProgress } from '@/lib/coachClientData'
import {
  fetchBondId,
  fetchClientGoals,
  fetchClientRoutines,
  fetchMyClients,
  type ClientRoutine,
  type Goal,
} from '@/lib/coachQueries'
import { endBond } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import ClientProgressView from '@/components/gym/ClientProgressView'
import ClientPlanSection from '@/components/gym/ClientPlanSection'
import ChatThread from '@/components/gym/ChatThread'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'

type Section = 'progreso' | 'plan' | 'mensajes'

/**
 * Todo lo que el coach ve y hace con UN alumno: su progreso completo y el plan
 * que le asigna (rutinas + metas). Recibe el `clientId` por prop — así lo monta
 * tanto la pantalla de detalle (mobile) como el panel derecho del master-detail
 * (desktop), sin depender de `useParams`.
 */
export default function ClientDetailPanel({
  clientId,
  onOpenChat,
  onEnded,
  inlineChat = false,
  initialSection = 'progreso',
}: {
  clientId: string
  /** Mobile: abre el chat a pantalla completa. Se ignora con `inlineChat`. */
  onOpenChat: () => void
  onEnded: () => void
  /** Desktop: el chat es una pestaña más del panel, no una pantalla aparte. */
  inlineChat?: boolean
  initialSection?: Section
}) {
  const meId = useCurrentUserId()
  const [section, setSection] = useState<Section>(initialSection)
  const [name, setName] = useState('')
  const [progress, setProgress] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: ClientProgress }
  >({ status: 'loading' })
  const [routines, setRoutines] = useState<ClientRoutine[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [bondId, setBondId] = useState<string | null>(null)

  const load = useCallback(() => {
    setProgress({ status: 'loading' })
    fetchClientProgress(clientId)
      .then((data) => setProgress({ status: 'ok', data }))
      .catch((e: unknown) =>
        setProgress({ status: 'error', message: e instanceof Error ? e.message : 'No se pudo cargar.' })
      )
  }, [clientId])

  const loadPlan = useCallback(() => {
    Promise.all([fetchClientRoutines(clientId), fetchClientGoals(clientId)])
      .then(([r, g]) => {
        setRoutines(r)
        setGoals(g)
      })
      .catch((e: unknown) => toast.error('No se pudo cargar el plan', e instanceof Error ? e.message : 'Error'))
  }, [clientId])

  useEffect(() => {
    load()
    loadPlan()
    fetchMyClients()
      .then((clients) => {
        const me = clients.find((c) => c.clientId === clientId)
        setName(me?.displayName || me?.email || 'Alumno')
      })
      .catch(() => setName('Alumno'))
    fetchBondId(clientId).then(setBondId).catch(() => setBondId(null))
  }, [clientId, load, loadPlan])

  const handleEndBond = async () => {
    if (!bondId || !confirm(`¿Terminar el vínculo con ${name}? Vas a dejar de ver su progreso.`)) return
    try {
      await endBond(bondId)
      toast.info('Vínculo terminado')
      onEnded()
    } catch (e) {
      toast.error('No se pudo', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{name}</h2>
        {!inlineChat && (
          <button
            onClick={onOpenChat}
            className="flex h-11 shrink-0 items-center gap-2 rounded-sm bg-fill px-3.5 text-[14px] font-semibold text-ink-2 active:bg-fill-2"
          >
            <MessageSquare size={17} /> Mensajes
          </button>
        )}
      </div>

      <div className="flex gap-1.5 rounded-full bg-surface p-1" role="tablist" aria-label="Sección">
        {(inlineChat ? (['progreso', 'plan', 'mensajes'] as const) : (['progreso', 'plan'] as const)).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={section === s}
            onClick={() => setSection(s)}
            className={cn(
              'h-11 flex-1 rounded-full text-[14px] font-semibold transition-colors',
              section === s ? 'bg-accent text-bg' : 'text-ink-2'
            )}
          >
            {s === 'progreso' ? 'Progreso' : s === 'plan' ? 'Rutinas y metas' : 'Mensajes'}
          </button>
        ))}
      </div>

      {section === 'progreso' && (
        <>
          {progress.status === 'loading' && (
            <p className="py-12 text-center text-sm text-ink-3">Cargando progreso…</p>
          )}
          {progress.status === 'error' && (
            <div className="space-y-3 rounded-md bg-danger/10 p-4">
              <p className="text-sm text-danger">{progress.message}</p>
              <button onClick={load} className="h-11 rounded-sm bg-fill px-4 text-sm font-semibold text-ink-2">
                Reintentar
              </button>
            </div>
          )}
          {progress.status === 'ok' && <ClientProgressView clientId={clientId} data={progress.data} />}
        </>
      )}

      {section === 'mensajes' && inlineChat && meId && (
        <ChatThread
          embedded
          coachId={meId}
          clientId={clientId}
          title={name}
          onBack={() => setSection('progreso')}
        />
      )}

      {section === 'plan' && (
        <ClientPlanSection clientId={clientId} routines={routines} goals={goals} onChanged={loadPlan} />
      )}

      <button
        onClick={handleEndBond}
        disabled={!bondId}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-danger/30 text-sm font-semibold text-danger active:bg-danger/10 disabled:opacity-40"
      >
        <Unlink size={16} /> Finalizar vínculo
      </button>
    </div>
  )
}
