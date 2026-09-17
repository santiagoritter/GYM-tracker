import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { HistoryList } from '@/components/gym/HistoryList'
import StatsOverview from '@/components/gym/StatsOverview'
import StreakWeekCard from '@/components/gym/StreakWeekCard'
import RecentWorkouts from '@/components/gym/RecentWorkouts'
import { EmptyState, SectionHeader } from '@/components/ui/Card'
import AchievementsPanel from '@/components/gym/AchievementsPanel'
import { cn } from '@/lib/utils'

// Cada una de estas trae recharts (~400KB) y/o su propia lógica pesada —
// lazy() para que entrar a Progreso no las baje/parsee todas de una,
// solo la pestaña que se abre de verdad (react-doctor: "Heavy library
// loaded eagerly"). WeightCharts es la extracción de lo que antes era la
// función Charts() inline acá mismo.
const WeightCharts = lazy(() => import('@/components/gym/WeightCharts'))
const RestAnalyticsLazy = lazy(() =>
  import('@/components/gym/RestAnalytics').then((m) => ({ default: m.RestAnalytics }))
)
const MonthlyStatsLazy = lazy(() =>
  import('@/components/gym/MonthlyStats').then((m) => ({ default: m.MonthlyStats }))
)
const StrengthLevelsLazy = lazy(() =>
  import('@/components/gym/StrengthLevels').then((m) => ({ default: m.StrengthLevels }))
)
const MuscleGroupLevelsLazy = lazy(() =>
  import('@/components/gym/MuscleGroupLevels').then((m) => ({ default: m.MuscleGroupLevels }))
)
const PhotoGalleryLazy = lazy(() =>
  import('@/components/gym/PhotoGallery').then((m) => ({ default: m.PhotoGallery }))
)

const tabFallback = <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>

type Tab =
  | 'summary'
  | 'charts'
  | 'rest'
  | 'month'
  | 'levels'
  | 'achievements'
  | 'photos'
  | 'prs'
  | 'history'

const TABS: readonly Tab[] = [
  'summary', 'charts', 'rest', 'month', 'levels', 'achievements', 'photos', 'prs', 'history',
]

export default function Progress() {
  // `?tab=photos` para el acceso directo a fotos desde Inicio — el resto
  // de la navegación entre pestañas sigue siendo local, no hace falta
  // reflejar cada cambio en la URL.
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(
    TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'summary'
  )

  return (
    <div className="mx-auto content-width space-y-4">
      <h1 className="text-2xl font-bold">Progreso</h1>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {(
          [
            ['summary', 'Resumen'],
            ['charts', 'Gráficos'],
            ['rest', 'Descanso'],
            ['month', 'Mes'],
            ['levels', 'Niveles'],
            ['achievements', 'Logros'],
            ['photos', 'Fotos'],
            ['prs', 'PRs'],
            ['history', 'Historial'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
              tab === key ? 'bg-accent text-bg' : 'text-ink-3 active:text-ink-2'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="animate-fade-up space-y-4">
          {/* El anillo semanal se mudó desde Inicio (pedido explícito): es
              un resumen para revisar, no algo que compita con "qué entreno
              hoy". El heatmap de actividad se queda en Inicio. */}
          <StreakWeekCard />
          <StatsOverview />
          {/* RecentWorkouts vive acá, no en Inicio — mirar hacia atrás es
              revisión, no "qué entreno hoy", que es lo que resuelve Inicio. */}
          <section>
            <SectionHeader title="Últimos entrenos" />
            <RecentWorkouts />
          </section>
        </div>
      )}
      {tab === 'charts' && (
        <Suspense fallback={tabFallback}>
          <WeightCharts />
        </Suspense>
      )}
      {tab === 'rest' && (
        <Suspense fallback={tabFallback}>
          <RestAnalyticsLazy />
        </Suspense>
      )}
      {tab === 'month' && (
        <Suspense fallback={tabFallback}>
          <MonthlyStatsLazy />
        </Suspense>
      )}
      {tab === 'levels' && (
        <Suspense fallback={tabFallback}>
          <div className="animate-fade-up space-y-6">
            <StrengthLevelsLazy />
            <section>
              <SectionHeader title="Grupos musculares" />
              <MuscleGroupLevelsLazy />
            </section>
          </div>
        </Suspense>
      )}
      {tab === 'achievements' && <AchievementsPanel />}
      {tab === 'photos' && (
        <Suspense fallback={tabFallback}>
          <PhotoGalleryLazy />
        </Suspense>
      )}
      {tab === 'prs' && <PRList />}
      {tab === 'history' && <HistoryList />}
    </div>
  )
}

function PRList() {
  const userId = useCurrentUserId()
  const prs = useLiveQuery(() => (userId ? personalRecordsFor(userId).toArray() : []), [userId]) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const sorted = [...prs].sort((a, b) => b.oneRmKg - a.oneRmKg)

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={28} />}
        title="Sin récords todavía"
        description="Tus récords personales aparecen acá al terminar entrenos."
      />
    )
  }

  return (
    <div className="animate-fade-up space-y-2">
      {sorted.map((pr) => (
        <div key={pr.id} className="flex items-center justify-between rounded-xl bg-surface p-4">
          <div>
            <p className="font-medium">{exerciseMap.get(pr.exerciseId)?.name ?? pr.exerciseId}</p>
            <p className="text-xs text-ink-3">
              {new Date(pr.achievedAt).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 font-mono text-lg font-bold text-accent">
              <Trophy size={14} /> {pr.weightKg} × {pr.reps}
            </p>
            <p className="text-xs text-ink-2">1RM est. {pr.oneRmKg} kg</p>
          </div>
        </div>
      ))}
    </div>
  )
}
