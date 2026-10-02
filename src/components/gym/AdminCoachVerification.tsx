import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from '@/stores/toastStore'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import VerifiedBadge from '@/components/gym/VerifiedBadge'
import { cn } from '@/lib/utils'

/**
 * Verificación de coaches (solo admin). Hasta ahora `verified` era una
 * insignia que nadie podía poner desde la app; con la migración 0028 es lo que
 * habilita a un coach a vincularse con menores. El admin compara el DNI cargado
 * con la persona antes de marcarlo. La escritura la autoriza la RLS
 * `coaches_admin_all` y el trigger `coaches_guard_verified` (0012).
 */
interface CoachRow {
  id: string
  displayName: string
  dni: string | null
  verified: boolean
}

export default function AdminCoachVerification() {
  const [rows, setRows] = useState<CoachRow[] | null>(null)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return setError(true)
    const [coaches, identities] = await Promise.all([
      supabase.from('coaches').select('id, display_name, verified').order('created_at', { ascending: false }),
      supabase.from('coach_identity').select('coach_id, dni'),
    ])
    if (coaches.error) return setError(true)
    const dni = new Map((identities.data ?? []).map((i) => [i.coach_id as string, i.dni as string | null]))
    setRows(
      (coaches.data ?? []).map((c) => ({
        id: c.id as string,
        displayName: (c.display_name as string | null) ?? 'Sin nombre',
        dni: dni.get(c.id as string) ?? null,
        verified: c.verified === true,
      }))
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (row: CoachRow) => {
    if (!supabase || busyId) return
    setBusyId(row.id)
    const { error: err } = await supabase
      .from('coaches')
      .update({ verified: !row.verified, verified_at: row.verified ? null : new Date().toISOString() })
      .eq('id', row.id)
    setBusyId(null)
    if (err) return toast.error('No se pudo actualizar', err.message)
    toast.success(row.verified ? 'Verificación quitada' : 'Coach verificado')
    void load()
  }

  return (
    <section>
      <SectionHeader title="Verificación de coaches" />
      {error ? (
        <EmptyState title="No se pudo cargar" description="Revisá la conexión y volvé a abrir el panel." />
      ) : rows === null ? (
        <p className="py-6 text-center text-sm text-ink-3">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Todavía no hay coaches" description="Cuando alguien se dé de alta como coach aparece acá." />
      ) : (
        <Card>
          {rows.map((r) => (
            <Row key={r.id} className={cn(busyId === r.id && 'opacity-50')}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-medium">
                  {r.displayName}
                  {r.verified && <VerifiedBadge size={16} />}
                </p>
                <p className="font-mono text-[12px] tabular-nums text-ink-3">DNI {r.dni ?? 'sin cargar'}</p>
              </div>
              <button
                onClick={() => toggle(r)}
                disabled={busyId !== null}
                className={cn(
                  'h-11 shrink-0 rounded-sm px-4 text-[13px] font-semibold',
                  r.verified ? 'bg-fill text-ink-2 active:bg-fill-2' : 'bg-accent text-bg active:bg-accent-dim'
                )}
              >
                {r.verified ? 'Quitar' : 'Verificar'}
              </button>
            </Row>
          ))}
        </Card>
      )}
    </section>
  )
}
