import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import RepeMark from '@/components/ui/RepeMark'
import { confirmGuardian, fetchGuardianInfo, type GuardianInfo } from '@/lib/guardianConsent'

/**
 * `/tutor/:token` — pública (sin cuenta): la abre la madre, el padre o el tutor
 * de un menor que quiere vincularse con un entrenador. Ver migración 0028.
 */
export default function GuardianConsent() {
  const { token = '' } = useParams()
  const [state, setState] = useState<
    { s: 'loading' } | { s: 'invalid' } | { s: 'offline' } | { s: 'ok'; info: GuardianInfo } | { s: 'done'; info: GuardianInfo }
  >({ s: 'loading' })
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchGuardianInfo(token)
      .then((info) => {
        if (cancelled) return
        if (!info) setState({ s: 'invalid' })
        else setState(info.confirmed ? { s: 'done', info } : { s: 'ok', info })
      })
      .catch(() => {
        if (!cancelled) setState({ s: navigator.onLine ? 'invalid' : 'offline' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const confirm = async () => {
    if (state.s !== 'ok' || busy) return
    setBusy(true)
    setError('')
    try {
      await confirmGuardian(token)
      setState({ s: 'done', info: state.info })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar.')
    } finally {
      setBusy(false)
    }
  }

  const shell = 'mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'

  if (state.s === 'loading') return <div className={shell}><p className="text-center text-sm text-ink-3">Cargando…</p></div>
  if (state.s === 'invalid' || state.s === 'offline') {
    return (
      <div className={shell}>
        <h1 className="text-2xl font-bold">{state.s === 'offline' ? 'Sin conexión' : 'Enlace no válido'}</h1>
        <p className="text-[15px] text-ink-2">
          {state.s === 'offline'
            ? 'No pudimos abrir el enlace porque no hay internet. Conectate y volvé a abrirlo.'
            : 'El enlace no existe. Pedile a quien te lo mandó que genere uno nuevo desde la app.'}
        </p>
      </div>
    )
  }

  const { info } = state
  const child = info.clientName || 'tu hijo o hija'
  if (state.s === 'done') {
    return (
      <div className={shell}>
        <CheckCircle2 size={32} className="text-success" />
        <h1 className="text-2xl font-bold">Listo, quedó autorizado</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          {child} ya puede vincularse con {info.coachName || 'el entrenador'} desde la app. Podés cortar el vínculo cuando
          quieras: lo puede hacer {child} desde su perfil, o escribinos y lo cortamos.
        </p>
      </div>
    )
  }
  if (info.expired) {
    return (
      <div className={shell}>
        <h1 className="text-2xl font-bold">El enlace venció</h1>
        <p className="text-[15px] text-ink-2">Pedile a {child} que genere uno nuevo desde la app.</p>
      </div>
    )
  }
  return (
    <div className={shell}>
      <RepeMark size={36} />
      <div className="space-y-1">
        <p className="text-[13px] text-ink-3">Permiso de madre, padre o tutor</p>
        <h1 className="text-2xl font-bold">{child} quiere entrenar con {info.coachName || 'un entrenador'}</h1>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-2">
        Repe es una app para registrar entrenamientos. Si autorizás, el entrenador va a poder:
      </p>
      <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-2">
        <li>ver los entrenamientos, récords, medidas y la ficha física de {child};</li>
        <li>asignarle rutinas y escribirle mensajes de texto en la app.</li>
      </ul>
      <p className="text-[13px] leading-relaxed text-ink-3">
        Las fotos de progreso nunca se comparten, y las calorías solo si {child} lo habilita. {child} o vos pueden cortar
        el vínculo cuando quieran, y el chat tiene botón para reportar o bloquear.
      </p>
      <label className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-2">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
        />
        <span>Soy la madre, el padre o el tutor legal de {child} y lo autorizo.</span>
      </label>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <button
        onClick={confirm}
        disabled={!agree || busy}
        className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-40"
      >
        {busy ? 'Confirmando…' : 'Autorizo'}
      </button>
    </div>
  )
}
