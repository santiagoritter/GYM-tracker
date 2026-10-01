import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { db } from '@/db/schema'
import { routineExercisesForUser, workoutsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useCommunityWeights } from '@/hooks/useCommunityWeights'
import { useAuthStore } from '@/stores/authStore'
import { rankPopularWeights, topPrImprovements, PR_WINDOW_DAYS, type PopularWeight } from '@/lib/news'
import { restSuggestions } from '@/lib/progressSuggestions'
import { formatWeight } from '@/lib/utils'

/**
 * Card "Noticias" de Inicio: tres tarjetas que se pasan deslizando a los dos
 * lados (scroll-snap nativo, así el gesto es el del sistema y sigue al dedo)
 * o con las flechas del encabezado (para PC, y para quien no descubre el
 * deslizamiento).
 *   1. Pesos más usados por la comunidad (anónimo, k ≥ 5 — migración 0026).
 *   2. Descansos sugeridos para vos (misma regla que la notificación).
 *   3. Tus PRs que más subieron en los últimos 30 días.
 */

const SLIDES = ['Lo que levanta la comunidad', 'Descansos sugeridos', 'Tus PRs que más subieron'] as const
const EASE_DECEL = [0, 0, 0.58, 1] as const

export default function NewsCard() {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (i: number) => {
    const el = scroller.current
    if (!el) return
    const next = Math.max(0, Math.min(SLIDES.length - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <section aria-roledescription="carrusel" aria-label="Noticias" className="overflow-hidden rounded-md bg-surface">
      <div className="flex items-center gap-1 pl-4 pr-1 pt-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold">Noticias</h2>
          <p className="truncate text-[13px] text-ink-3" aria-live="polite">
            {SLIDES[index]}
          </p>
        </div>
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Anterior"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-fill disabled:text-ink-4"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === SLIDES.length - 1}
          aria-label="Siguiente"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-fill disabled:text-ink-4"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Slide label={SLIDES[0]}>
          <CommunitySlide visible={index === 0} />
        </Slide>
        <Slide label={SLIDES[1]}>
          <RestSlide />
        </Slide>
        <Slide label={SLIDES[2]}>
          <PrSlide />
        </Slide>
      </div>

      <div className="flex justify-center gap-1.5 pb-3 pt-1" aria-hidden="true">
        {SLIDES.map((s, i) => (
          <span
            key={s}
            className={
              'h-1.5 w-1.5 rounded-full transition-opacity duration-[220ms] ease-standard ' +
              (i === index ? 'bg-accent opacity-100' : 'bg-ink-4 opacity-60')
            }
          />
        ))}
      </div>
    </section>
  )
}

function Slide({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-roledescription="tarjeta"
      aria-label={label}
      className="min-h-[188px] w-full shrink-0 snap-center snap-always px-4 pb-2 pt-3"
    >
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-[150px] items-center text-[14px] text-ink-3">{children}</p>
}

function useUnits(): 'kg' | 'lbs' {
  const userId = useCurrentUserId()
  const profile = useLiveQuery(() => (userId ? db.profile.get(userId) : undefined), [userId])
  return profile?.units ?? 'kg'
}

function useExerciseNames() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
}

// ── 1. Comunidad ──────────────────────────────────────────────────────────

function CommunitySlide({ visible }: { visible: boolean }) {
  const navigate = useNavigate()
  const isGuest = useAuthStore((s) => s.isGuest)
  const { state, retry } = useCommunityWeights(!isGuest)
  const names = useExerciseNames()
  const units = useUnits()

  if (isGuest) {
    return (
      <div className="flex min-h-[150px] flex-col items-start justify-center gap-3">
        <p className="text-[14px] text-ink-3">
          Con una cuenta ves los pesos más usados por la gente que entrena con Repe. Anónimo: nadie ve los tuyos.
        </p>
        <button
          onClick={() => navigate('/registro')}
          className="flex h-11 items-center rounded-sm bg-fill px-4 text-[14px] font-semibold text-ink active:bg-fill-2"
        >
          Crear cuenta
        </button>
      </div>
    )
  }
  if (state.status === 'loading') return <Empty>Cargando lo que levanta la comunidad…</Empty>
  if (state.status === 'error') {
    return (
      <div className="flex min-h-[150px] flex-col items-start justify-center gap-3">
        <p className="text-[14px] text-ink-3">No pudimos traer los datos de la comunidad. Revisá la conexión.</p>
        <button
          onClick={retry}
          className="flex h-11 items-center gap-2 rounded-sm bg-fill px-4 text-[14px] font-semibold text-ink active:bg-fill-2"
        >
          <RotateCw size={16} /> Reintentar
        </button>
      </div>
    )
  }

  const ranked = rankPopularWeights(state.data.rows, names)
  if (ranked.length === 0) {
    return <Empty>Todavía no hay suficiente gente entrenando los mismos ejercicios para mostrarlo sin identificar a nadie.</Empty>
  }
  return (
    <div className="flex items-stretch gap-4">
      <ol className="min-w-0 flex-1 space-y-2.5">
        {ranked.slice(0, 3).map((r, i) => (
          <PodiumRow key={r.exerciseId} row={r} place={i + 1} units={units} visible={visible} />
        ))}
      </ol>
      <Bars rows={ranked.slice(0, 6)} visible={visible} />
    </div>
  )
}

function PodiumRow({
  row,
  place,
  units,
  visible,
}: {
  row: PopularWeight
  place: number
  units: 'kg' | 'lbs'
  visible: boolean
}) {
  const reduced = useReducedMotion()
  return (
    <motion.li
      initial={false}
      animate={visible && !reduced ? { opacity: [0, 1], x: [-8, 0] } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: place * 0.06, ease: EASE_DECEL }}
      className="flex items-baseline gap-2.5"
    >
      <span className="w-3 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink-3">{place}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{row.name}</p>
        <p className="text-[12px] text-ink-3">{row.users} personas</p>
      </div>
      <span className={'shrink-0 font-mono font-semibold tabular-nums ' + (place === 1 ? 'text-[20px] text-accent' : 'text-[16px]')}>
        {formatWeight(row.weightKg, units)}
        <span className="ml-0.5 text-[12px] font-medium text-ink-3">{units}</span>
      </span>
    </motion.li>
  )
}

/** Barras verticales: alto proporcional al peso. Se anima `scaleY` (no
 * `height`) desde la base — DESIGN.md §4. Las tres primeras en acento, son
 * las de la lista de al lado. */
function Bars({ rows, visible }: { rows: PopularWeight[]; visible: boolean }) {
  const reduced = useReducedMotion()
  const max = Math.max(...rows.map((r) => r.weightKg))
  return (
    <div
      role="img"
      aria-label={'Gráfico: ' + rows.map((r) => `${r.name} ${Math.round(r.weightKg)} kg`).join(', ')}
      className="flex h-[136px] w-[112px] shrink-0 items-end gap-1.5 self-center"
    >
      {rows.map((r, i) => (
        <motion.div
          key={r.exerciseId}
          initial={false}
          animate={visible && !reduced ? { scaleY: [0, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.32, delay: 0.1 + i * 0.04, ease: EASE_DECEL }}
          style={{ height: `${Math.max(8, (r.weightKg / max) * 100)}%` }}
          className={'flex-1 origin-bottom rounded-t-xs ' + (i < 3 ? 'bg-accent' : 'bg-fill-2')}
        />
      ))}
    </div>
  )
}

// ── 2. Descansos ──────────────────────────────────────────────────────────

function RestSlide() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const names = useExerciseNames()
  const profile = useLiveQuery(() => (userId ? db.profile.get(userId) : undefined), [userId])
  const logs = useLiveQuery(() => (userId ? db.restLogs.where('userId').equals(userId).toArray() : []), [userId])
  const entries = useLiveQuery(() => (userId ? routineExercisesForUser(userId).toArray() : []), [userId])

  const rows = useMemo(
    () => (logs && entries ? restSuggestions(logs, entries, profile?.restTimerDefault ?? 90).slice(0, 3) : null),
    [logs, entries, profile?.restTimerDefault]
  )
  if (!rows) return <Empty>Cargando…</Empty>
  if (rows.length === 0) {
    return <Empty>Cuando registres al menos 3 descansos en un ejercicio, acá te sugerimos cuánto descansar.</Empty>
  }
  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.exerciseId} className="flex items-baseline gap-3">
            <p className="min-w-0 flex-1 truncate text-[14px] font-medium">
              {names.get(r.exerciseId)?.name ?? 'Ejercicio'}
            </p>
            <span className="shrink-0 font-mono text-[14px] tabular-nums text-ink-3">
              {r.suggestion.currentSeconds} s
            </span>
            <ChevronRight size={14} className="shrink-0 self-center text-ink-4" aria-hidden="true" />
            <span className="w-14 shrink-0 text-right font-mono text-[16px] font-semibold tabular-nums">
              {r.suggestion.medianSeconds} s
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/progreso?tab=rest')}
        className="mt-3 flex h-11 items-center gap-1 text-[14px] font-semibold text-accent active:opacity-70"
      >
        Revisar y aplicar <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ── 3. PRs ────────────────────────────────────────────────────────────────

function PrSlide() {
  const userId = useCurrentUserId()
  const names = useExerciseNames()
  const units = useUnits()
  const data = useLiveQuery(async () => {
    if (!userId) return { sets: [], started: new Map<string, string>() }
    const workouts = await workoutsFor(userId).toArray()
    const sets = await db.workoutSets
      .where('workoutId')
      .anyOf(workouts.map((w) => w.id))
      .toArray()
    // Los borrados no están: softDelete los saca de la tabla y deja una lápida aparte.
    return { sets, started: new Map(workouts.map((w) => [w.id, w.startedAt])) }
  }, [userId])

  const prs = useMemo(
    () => (data ? topPrImprovements(data.sets, data.started, names) : null),
    [data, names]
  )
  if (!prs) return <Empty>Cargando…</Empty>
  if (prs.length === 0) {
    return (
      <Empty>
        Todavía no hay mejoras para comparar: aparecen cuando superás una marca de hace más de {PR_WINDOW_DAYS} días.
      </Empty>
    )
  }
  return (
    <ul className="space-y-3">
      {prs.map((p) => (
        <li key={p.exerciseId} className="flex items-baseline gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{p.name}</p>
            <p className="font-mono text-[12px] tabular-nums text-ink-3">
              1RM {formatWeight(p.beforeKg, units)} → {formatWeight(p.nowKg, units)} {units}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[16px] font-semibold tabular-nums text-success">
            +{Math.round(p.pct * 100)} %
          </span>
        </li>
      ))}
    </ul>
  )
}
