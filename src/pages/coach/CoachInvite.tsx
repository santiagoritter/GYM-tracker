import { publicLink } from '@/lib/publicUrl'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Copy, QrCode, Trash2 } from 'lucide-react'
import { createInvite, fetchMyInvites, revokeInvite, type MyInvite } from '@/lib/coachMutations'
import { toast } from '@/stores/toastStore'

/**
 * Genera un código de invitación y lo muestra como link + QR. El alumno lo
 * abre en `/unirse/:code` (JoinCoach.tsx). El QR usa la misma librería
 * `qrcode` que el resto de la app, cargada lazy.
 */
export default function CoachInvite() {
  const navigate = useNavigate()
  const [code, setCode] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [invites, setInvites] = useState<MyInvite[]>([])

  const loadInvites = useCallback(() => {
    fetchMyInvites().then(setInvites).catch(() => setInvites([]))
  }, [])
  useEffect(loadInvites, [loadInvites])

  const link = code ? publicLink(`unirse/${code}`) : ''

  const generate = async () => {
    setBusy(true)
    try {
      const c = await createInvite()
      setCode(c)
      loadInvites()
      const url = publicLink(`unirse/${c}`)
      const QRCode = (await import('qrcode')).default
      setQr(
        await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: { dark: '#111', light: '#fff' },
        })
      )
    } catch (e) {
      toast.error('No se pudo generar', e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('No se pudo copiar', 'Mantené apretado el enlace para copiarlo.')
    }
  }

  const revoke = async (invite: MyInvite) => {
    if (!confirm('¿Revocar esta invitación? El enlace deja de funcionar.')) return
    try {
      await revokeInvite(invite.id)
      if (invite.code === code) {
        setCode(null)
        setQr(null)
      }
      loadInvites()
    } catch (e) {
      toast.error('No se pudo revocar', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="mx-auto min-h-screen lg:min-h-0 content-width pb-24">
      <header className="glass sticky top-[var(--app-header-h,0px)] z-20 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/coach')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">Invitar alumno</h1>
      </header>

      <div className="flex flex-col items-center gap-5 px-6 py-8">
        {!code ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <QrCode size={26} className="text-accent" />
            </div>
            <p className="max-w-xs text-center text-[15px] leading-relaxed text-ink-2">
              Generá un enlace de invitación y pasáselo a tu alumno. Cuando lo abra y acepte,
              vas a poder ver su progreso y asignarle rutinas y metas.
            </p>
            <button
              onClick={generate}
              disabled={busy}
              className="h-12 w-full max-w-xs rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-50"
            >
              {busy ? 'Generando…' : 'Generar invitación'}
            </button>
          </>
        ) : (
          <>
            {qr && <img src={qr} alt="QR de invitación" className="w-56 rounded-xl" />}
            <div className="w-full max-w-sm rounded-md bg-surface-2 px-3 py-2.5">
              <p className="break-all text-[13px] text-ink-2">{link}</p>
            </div>
            <button
              onClick={copy}
              className="flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-sm bg-fill text-sm font-semibold text-ink-2 active:bg-fill-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <button onClick={generate} className="text-[13px] font-medium text-ink-3">
              Generar otro
            </button>
            <p className="text-center text-[12px] text-ink-3">El enlace vence en 30 días.</p>
          </>
        )}
      </div>

      {invites.length > 0 && (
        <section className="px-4">
          <p className="mb-2 text-sm font-semibold text-ink-2">Invitaciones vigentes</p>
          <ul className="divide-y divide-line rounded-md bg-surface">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4">
                <div className="min-w-0 flex-1 py-3">
                  <p className="font-mono text-[14px] font-semibold tracking-wide">{inv.code}</p>
                  <p className="text-[12px] text-ink-3">
                    {inv.expiresAt
                      ? `Vence el ${new Date(inv.expiresAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`
                      : 'Sin vencimiento'}
                    {' · '}
                    {inv.usedCount} uso{inv.usedCount === 1 ? '' : 's'}
                    {inv.maxUses != null && ` de ${inv.maxUses}`}
                  </p>
                </div>
                <button
                  onClick={() => revoke(inv)}
                  aria-label={`Revocar invitación ${inv.code}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-danger/80"
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
