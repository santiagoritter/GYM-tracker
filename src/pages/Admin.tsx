import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, ExternalLink, Shield, Users } from 'lucide-react'
import { db } from '@/db/schema'
import { Card, Row, SectionHeader } from '@/components/ui/Card'

/**
 * La lista de usuarios y las acciones de promover/degradar que había acá
 * dependían de la tabla local `users` (Dexie) — con auth real de
 * Supabase esa tabla queda vacía para cuentas nuevas, y el rol vive en
 * `auth.users.raw_app_meta_data`, protegido: ni siquiera un admin
 * logueado puede escribirlo con la anon key desde el cliente, hace
 * falta la service role key (ver docs/13-BACKEND-SUPABASE.md). Por eso
 * esta pantalla se achica a estadísticas (datos locales, siguen
 * andando igual) + un link a dónde gestionar roles de verdad.
 */
export default function Admin() {
  const navigate = useNavigate()
  const workouts = useLiveQuery(
    () => db.workouts.filter((w) => Boolean(w.finishedAt)).toArray(),
    []
  )
  const prs = useLiveQuery(() => db.personalRecords.toArray(), []) ?? []

  const globalStats = useMemo(
    () => ({
      sessions: workouts?.length ?? 0,
      totalVolume: Math.round(
        (workouts ?? []).reduce((sum, w) => sum + (w.totalVolumeKg ?? 0), 0)
      ),
      prs: prs.length,
    }),
    [workouts, prs]
  )

  return (
    <div className="mx-auto content-width space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15">
          <Shield size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Panel de admin</h1>
          <p className="text-xs text-ink-3">Solo visible para administradores</p>
        </div>
      </div>

      <section>
        <SectionHeader title="Todos los usuarios" />
        <Card>
          <Row onClick={() => navigate('/admin/usuarios')}>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px]">
                <Users size={16} className="shrink-0 text-ink-3" /> Ver actividad de todos
              </p>
              <p className="text-[13px] text-ink-3">Entrenos, volumen y PRs de cada usuario, en vivo.</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-ink-4" />
          </Row>
        </Card>
      </section>

      <section>
        <SectionHeader title="Estadísticas de este dispositivo" />
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Sesiones" value={String(globalStats.sessions)} />
          <StatBlock
            label="Volumen"
            value={`${(globalStats.totalVolume / 1000).toFixed(1)}t`}
          />
          <StatBlock label="PRs" value={String(globalStats.prs)} />
        </div>
      </section>

      <section>
        <SectionHeader title="Gestión de usuarios" />
        <Card>
          <Row
            onClick={() =>
              window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px]">Ver usuarios y roles en Supabase</p>
              <p className="text-[13px] text-ink-3">
                Promover/degradar admin se hace ahí — el rol viaja firmado en el
                JWT, ni un admin logueado puede escribirlo desde acá.
              </p>
            </div>
            <ExternalLink size={16} className="shrink-0 text-ink-4" />
          </Row>
        </Card>
      </section>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface p-4 text-center">
      <p className="font-mono text-xl font-bold tabular-nums text-accent">{value}</p>
      <p className="mt-0.5 text-xs text-ink-3">{label}</p>
    </div>
  )
}
