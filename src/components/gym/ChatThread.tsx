import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Dumbbell, ListChecks, Paperclip, Send, X } from 'lucide-react'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import {
  fetchThread,
  markThreadRead,
  sendMessage,
  subscribeThread,
  type ChatMessage,
} from '@/lib/coachChat'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { importPayload } from '@/lib/qr'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { cn } from '@/lib/utils'

/**
 * Hilo de chat coach↔alumno. Lo montan las dos partes con el mismo par
 * `(coachId, clientId)`. Realtime + fallback a polling (ver coachChat.ts).
 * Se pueden adjuntar un ejercicio del catálogo o una plantilla de rutina;
 * el alumno importa la rutina a "Mis rutinas" desde el propio mensaje.
 */
export default function ChatThread({
  coachId,
  clientId,
  onBack,
  title,
}: {
  coachId: string
  clientId: string
  onBack: () => void
  title: string
}) {
  const navigate = useNavigate()
  const meId = useCurrentUserId()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachMode, setAttachMode] = useState<'menu' | 'exercise' | 'routine'>('menu')
  const [exerciseQuery, setExerciseQuery] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseName = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])
  const exerciseMatches = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase()
    if (!q) return exercises.slice(0, 30)
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 30)
  }, [exercises, exerciseQuery])

  useEffect(() => {
    let alive = true
    fetchThread(coachId, clientId).then((m) => {
      if (alive) setMessages(m)
    })
    markThreadRead(coachId, clientId)
    const sub = subscribeThread(coachId, clientId, (msg) => {
      setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]))
      if (msg.senderId !== meId) markThreadRead(coachId, clientId)
    })
    return () => {
      alive = false
      sub.close()
    }
  }, [coachId, clientId, meId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = async (payload: {
    body: string
    attachmentKind?: 'exercise' | 'routine'
    attachmentRef?: string
  }) => {
    if (!payload.body.trim() && !payload.attachmentKind) return
    setSending(true)
    try {
      await sendMessage(coachId, clientId, payload)
      setText('')
      // El mensaje propio llega igual por Realtime; si el socket cae en
      // polling puede tardar unos segundos, así que refrescamos ya.
      setMessages(await fetchThread(coachId, clientId))
    } catch (e) {
      toast.error('No se pudo enviar', e instanceof Error ? e.message : 'Error')
    } finally {
      setSending(false)
    }
  }

  const attachExercise = (id: string) => {
    setAttachOpen(false)
    setAttachMode('menu')
    send({ body: '', attachmentKind: 'exercise', attachmentRef: id })
  }
  const attachRoutine = (id: string) => {
    setAttachOpen(false)
    setAttachMode('menu')
    send({ body: '', attachmentKind: 'routine', attachmentRef: id })
  }

  const importRoutine = async (templateId: string) => {
    if (!meId) return
    const tpl = ROUTINE_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    try {
      await importPayload(meId, tpl.payload)
      toast.success('Rutina importada', `${tpl.name} — está en "Mis rutinas"`)
    } catch (e) {
      toast.error('No se pudo importar', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-bg">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="truncate font-semibold">{title}</h1>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-3">
            Todavía no hay mensajes. Escribí para arrancar.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug',
                  mine ? 'bg-accent text-bg' : 'bg-surface text-ink'
                )}
              >
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}

                {m.attachmentKind === 'exercise' && m.attachmentRef && (
                  <button
                    onClick={() => navigate('/ejercicios')}
                    className={cn(
                      'mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium',
                      mine ? 'bg-bg/15' : 'bg-surface-2'
                    )}
                  >
                    <Dumbbell size={15} className="shrink-0" />
                    {exerciseName.get(m.attachmentRef) ?? 'Ejercicio'}
                  </button>
                )}

                {m.attachmentKind === 'routine' && m.attachmentRef && (
                  <div
                    className={cn(
                      'mt-1 rounded-lg px-2.5 py-2 text-[13px]',
                      mine ? 'bg-bg/15' : 'bg-surface-2'
                    )}
                  >
                    <p className="flex items-center gap-2 font-semibold">
                      <ListChecks size={15} className="shrink-0" />
                      {ROUTINE_TEMPLATES.find((t) => t.id === m.attachmentRef)?.name ?? 'Rutina'}
                    </p>
                    {!mine && (
                      <button
                        onClick={() => importRoutine(m.attachmentRef!)}
                        className="mt-1.5 rounded-sm bg-accent px-3 py-1 text-[13px] font-bold text-bg"
                      >
                        Importar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-line px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5">
        <button
          onClick={() => {
            setAttachMode('menu')
            setAttachOpen(true)
          }}
          aria-label="Adjuntar"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <Paperclip size={20} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder="Mensaje…"
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={() => send({ body: text })}
          disabled={sending || !text.trim()}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-bg disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>

      {attachOpen && (
        <ResponsiveSheet onClose={() => setAttachOpen(false)}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold">
              {attachMode === 'menu' ? 'Adjuntar' : attachMode === 'exercise' ? 'Elegí un ejercicio' : 'Elegí una rutina'}
            </h2>
            <button
              onClick={() => setAttachOpen(false)}
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-ink-2"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
            {attachMode === 'menu' && (
              <div className="space-y-2">
                <button
                  onClick={() => setAttachMode('exercise')}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-2 p-4 text-left"
                >
                  <Dumbbell size={20} className="text-accent" />
                  <span className="font-medium">Un ejercicio</span>
                </button>
                <button
                  onClick={() => setAttachMode('routine')}
                  className="flex w-full items-center gap-3 rounded-xl bg-surface-2 p-4 text-left"
                >
                  <ListChecks size={20} className="text-accent" />
                  <span className="font-medium">Una rutina</span>
                </button>
              </div>
            )}

            {attachMode === 'exercise' && (
              <>
                <input
                  value={exerciseQuery}
                  onChange={(e) => setExerciseQuery(e.target.value)}
                  placeholder="Buscar ejercicio"
                  className="mb-2 h-11 w-full rounded-sm bg-surface-2 px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="space-y-1">
                  {exerciseMatches.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => attachExercise(e.id)}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-[15px] active:bg-surface-2"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {attachMode === 'routine' && (
              <div className="space-y-1">
                {ROUTINE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => attachRoutine(t.id)}
                    className="block w-full rounded-lg px-3 py-2.5 text-left active:bg-surface-2"
                  >
                    <p className="text-[15px] font-medium">{t.name}</p>
                    <p className="text-[13px] text-ink-3">{t.subtitle} · {t.level}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ResponsiveSheet>
      )}
    </div>
  )
}
