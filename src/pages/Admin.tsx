import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Crown, Shield, User, Users } from 'lucide-react'
import { db } from '@/db/schema'
import { useAuthStore } from '@/stores/authStore'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export default function Admin() {
  const currentUserId = useAuthStore((s) => s.userId)
  const users = useLiveQuery(() => db.users.toArray(), []) ?? []
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

  const promoteToAdmin = async (userId: string) => {
    await db.users.update(userId, { role: 'admin' })
  }

  const demoteToUser = async (userId: string) => {
    if (userId === currentUserId) return
    await db.users.update(userId, { role: 'user' })
  }

  const admins = users.filter((u) => u.role === 'admin')
  const members = users.filter((u) => u.role === 'user')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15">
          <Shield size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Panel de admin</h1>
          <p className="text-xs text-ink-3">Solo visible para administradores</p>
        </div>
      </div>

      {/* Stats globales */}
      <section>
        <SectionHeader title="Estadísticas globales" />
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Sesiones" value={String(globalStats.sessions)} />
          <StatBlock
            label="Volumen"
            value={`${(globalStats.totalVolume / 1000).toFixed(1)}t`}
          />
          <StatBlock label="PRs" value={String(globalStats.prs)} />
        </div>
      </section>

      {/* Admins */}
      {admins.length > 0 && (
        <section>
          <SectionHeader
            title="Administradores"
            action={<Crown size={14} className="mb-1 text-ink-3" />}
          />
          <Card>
            {admins.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onDemote={() => demoteToUser(u.id)}
              />
            ))}
          </Card>
        </section>
      )}

      {/* Usuarios */}
      {members.length > 0 && (
        <section>
          <SectionHeader
            title={`Usuarios (${members.length})`}
            action={<User size={14} className="mb-1 text-ink-3" />}
          />
          <Card>
            {members.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={false}
                onPromote={() => promoteToAdmin(u.id)}
              />
            ))}
          </Card>
        </section>
      )}

      {users.length <= 1 && (
        <EmptyState
          icon={<Users size={28} />}
          title="Sos el único usuario registrado"
          description="Cuando otros se registren aparecen acá."
        />
      )}
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

function UserRow({
  user,
  isSelf,
  onPromote,
  onDemote,
}: {
  user: {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
    onboardingComplete: 0 | 1
  }
  isSelf: boolean
  onPromote?: () => void
  onDemote?: () => void
}) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <Row>
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        user.role === 'admin' ? 'bg-accent text-bg' : 'bg-surface-2 text-ink'
      )}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {user.name} {isSelf && <span className="text-xs text-ink-3">(vos)</span>}
        </p>
        <p className="truncate text-xs text-ink-3">{user.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {user.onboardingComplete === 0 && (
          <span className="rounded-xs bg-warning/20 px-1.5 py-1 text-[10px] font-bold text-warning">
            Pendiente
          </span>
        )}
        {user.role === 'admin' && !isSelf && (
          <button
            onClick={onDemote}
            className="flex h-11 items-center rounded-xs bg-surface-2 px-3 text-xs text-ink-2 active:bg-surface-3"
          >
            Quitar admin
          </button>
        )}
        {user.role === 'user' && (
          <button
            onClick={onPromote}
            className="flex h-11 items-center rounded-xs bg-accent/10 px-3 text-xs font-semibold text-accent active:bg-accent/20"
          >
            Hacer admin
          </button>
        )}
      </div>
    </Row>
  )
}
