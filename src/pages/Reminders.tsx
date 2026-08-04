import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Bell, Mail } from 'lucide-react'
import { db } from '@/db/schema'
import type { LocalProfile } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from '@/stores/toastStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import {
  notificationsSupported,
  requestNotificationPermission,
} from '@/lib/reminders'

// getDay(): 0 = domingo … 6 = sábado. Orden de visualización lunes→domingo.
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'M' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
]

export default function Reminders() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )

  const update = (patch: Partial<LocalProfile>) =>
    userId ? db.profile.update(userId, patch) : Promise.resolve(0)

  if (!profile) return null

  const enabled = profile.reminderEnabled === 1
  const time = profile.reminderTime ?? '18:00'
  const days = profile.reminderDays ?? [1, 2, 3, 4, 5]

  const handleToggle = async () => {
    if (!enabled) {
      const perm = await requestNotificationPermission()
      if (perm !== 'granted') {
        toast.error('Permiso denegado', 'Habilitá las notificaciones en tu navegador.')
        return
      }
      await update({ reminderEnabled: 1, reminderTime: time, reminderDays: days })
      toast.success('Recordatorios activados', `Te avisamos a las ${time}`)
    } else {
      await update({ reminderEnabled: 0 })
      toast.info('Recordatorios desactivados')
    }
  }

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]
    update({ reminderDays: next })
  }

  const testNotification = async () => {
    const perm = await requestNotificationPermission()
    if (perm !== 'granted') {
      toast.error('Permiso denegado', 'Habilitá las notificaciones en tu navegador.')
      return
    }
    new Notification('Hora de entrenar', {
      body: 'Así se va a ver tu recordatorio. ¡A darle!',
      icon: '/icons/icon-192.png',
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          onClick={() => navigate('/ajustes')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-accent" />
          <h1 className="font-semibold">Recordatorios</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        {!notificationsSupported() && (
          <p className="rounded-sm bg-warning/10 p-3 text-sm text-warning">
            Tu navegador no soporta notificaciones. Instalá la app como PWA para recibir avisos.
          </p>
        )}

        {/* Toggle principal: toda la fila es el hit target, el switch es
            solo la representación visual del estado (DESIGN.md: 44px mínimo
            sin excepciones — un switch de 28px de alto no lo cumple solo). */}
        <Card>
          <Row onClick={handleToggle}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Recordatorio de entrenar</p>
              <p className="text-[13px] text-ink-3">Notificación local a la hora elegida</p>
            </div>
            <span
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                enabled ? 'bg-accent' : 'bg-surface-3'
              )}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
                  enabled ? 'left-6' : 'left-1'
                )}
              />
            </span>
          </Row>
        </Card>

        {/* Hora */}
        <section>
          <SectionHeader title="Hora del recordatorio" />
          <Card className="p-4">
            <input
              type="time"
              value={time}
              onChange={(e) => update({ reminderTime: e.target.value })}
              className="h-12 w-full rounded-sm bg-surface-2 px-4 font-mono text-lg tabular-nums outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            />
          </Card>
        </section>

        {/* Días */}
        <section>
          <SectionHeader title="Días" />
          <Card className="p-4">
            <div className="flex justify-between gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={`${d.value}-${d.label}`}
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center rounded-xs text-sm font-bold transition-colors',
                    days.includes(d.value)
                      ? 'bg-accent text-bg'
                      : 'bg-surface-2 text-ink-3'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        <button
          onClick={testNotification}
          className="h-12 w-full rounded-sm border border-line-2 text-sm font-semibold text-ink-2 active:bg-surface"
        >
          Probar notificación
        </button>

        {/* Email: requiere backend */}
        <div className="rounded-md border border-info/20 bg-info/5 p-4">
          <div className="flex items-center gap-2 text-info">
            <Mail size={16} />
            <p className="text-sm font-semibold">Recordatorios por email</p>
          </div>
          <p className="mt-1 text-xs text-ink-2">
            El envío de emails requiere un backend. La app ya trae el diseño y la
            función lista para desplegar en Supabase (Edge Function + cron). Ver
            <span className="font-mono text-ink-3"> docs/12-RECORDATORIOS.md</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
