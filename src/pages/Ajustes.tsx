import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Bell,
  Calculator,
  CalendarPlus,
  ChevronRight,
  CloudOff,
  Download,
  FileText,
  Flag,
  Flame,
  GraduationCap,
  HelpCircle,
  Music,
  Moon,
  Palette,
  RefreshCw,
  Scale,
  Settings,
  Smartphone,
  Sun,
  Target,
  Timer,
  Trash2,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const CoachSignupSheet = lazy(() => import('@/components/gym/CoachSignupSheet'))
const DeleteAccountSheet = lazy(() => import('@/components/gym/DeleteAccountSheet'))
const Paywall = lazy(() => import('@/components/gym/Paywall'))
import { db } from '@/db/schema'
// Sin lazy(): es genérico (<K extends string>) y React.lazy() no preserva
// el parámetro de tipo — el generic se erosiona a `string` en el punto de
// uso y rompe el chequeo de `onSelect`. El componente es chico, no vale la
// pena perder el tipado por el code-splitting acá.
import OptionPickerSheet from '@/components/gym/OptionPickerSheet'
import { GOAL_LABELS, GOAL_OPTIONS, LEVEL_LABELS, LEVEL_OPTIONS } from '@/lib/strengthStandards'
import { useMuscleGroupLevels } from '@/hooks/useMuscleGroupLevels'
import type { ExperienceLevel } from '@/types'

// Orden de menor a mayor — comparar niveles es comparar esta posición, no
// el string. Mismos 6 escalones que ExperienceLevel/StrengthLevel.
const LEVEL_RANK: Record<ExperienceLevel, number> = {
  novice: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  elite: 4,
  champion: 5,
}

/**
 * Sugerencia de nivel a partir de PRs reales (useMuscleGroupLevels, ya
 * calculado para la pantalla de niveles por grupo muscular) — nunca
 * escribe profile.level sola, solo informa. El nivel MÁS FRECUENTE entre
 * los grupos con datos reales (no el promedio ni el máximo: un PR suelto
 * en un solo grupo no debería disparar "sos elite"). Con menos de 4 grupos
 * con datos todavía no alcanza para sugerir nada.
 */
function suggestLevel(levels: { result: { level: string } }[]): ExperienceLevel | null {
  const real = levels.filter((m) => m.result.level !== 'no_data')
  if (real.length < 4) return null
  const counts = new Map<ExperienceLevel, number>()
  for (const m of real) {
    const lvl = m.result.level as ExperienceLevel
    counts.set(lvl, (counts.get(lvl) ?? 0) + 1)
  }
  let best: ExperienceLevel | null = null
  let bestCount = 0
  for (const [level, count] of counts) {
    if (count > bestCount || (count === bestCount && best && LEVEL_RANK[level] > LEVEL_RANK[best])) {
      best = level
      bestCount = count
    }
  }
  return best
}
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useThemeStore } from '@/stores/themeStore'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { isSpotifyConfigured, startSpotifyLogin } from '@/lib/spotifyAuth'
import { isSupabaseAuthConfigured } from '@/lib/supabaseAuth'
import { runSync } from '@/lib/sync'
import { useSyncStore } from '@/stores/syncStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import DraftNumberInput from '@/components/ui/DraftNumberInput'
import type { LocalProfile } from '@/types'
import { cn } from '@/lib/utils'
import { REST_OPTIONS } from '@/lib/constants'
import { backupNeedsPassphrase, exportBackup, importBackup } from '@/lib/backup'
import { useCanInstallPwa, promptInstall, isStandalone } from '@/lib/pwaInstall'
import { isNative } from '@/lib/native'
import { discardGuestData } from '@/lib/guest'
import { purchasesAvailable, restorePurchases } from '@/lib/purchases'
import { useEntitlementsStore } from '@/stores/entitlementsStore'
import { toast } from '@/stores/toastStore'

const ANDROID_APK_URL = 'https://github.com/santiagoritter/GYM-tracker/releases/latest'

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

export default function Ajustes() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const fileRef = useRef<HTMLInputElement>(null)
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const { levels: muscleLevels } = useMuscleGroupLevels()
  const levelSuggestion = useMemo(() => {
    const suggested = suggestLevel(muscleLevels)
    if (!suggested || !profile) return null
    if (profile.level && LEVEL_RANK[suggested] <= LEVEL_RANK[profile.level]) return null
    return suggested
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscleLevels, profile?.level])
  const spotifyDisplayName = useSpotifyStore((s) => s.displayName)
  const spotifyAccessToken = useSpotifyStore((s) => s.accessToken)
  const spotifyDisconnect = useSpotifyStore((s) => s.disconnect)
  const syncStatus = useSyncStore((s) => s.status)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const canInstall = useCanInstallPwa()
  const showAppSection = !isNative && !isStandalone()
  const [coachSheetOpen, setCoachSheetOpen] = useState(false)
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const adFree = useEntitlementsStore((s) => s.adFree)
  const showPurchases = purchasesAvailable()
  const [levelSheetOpen, setLevelSheetOpen] = useState(false)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [restCustomOpen, setRestCustomOpen] = useState(false)
  const role = useAuthStore((s) => s.role)
  const isGuest = useAuthStore((s) => s.isGuest)
  const isCoach = role === 'coach' || role === 'admin'

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) toast.success('Instalando', 'Buscá el ícono de Repe en tu pantalla de inicio.')
  }

  const update = (patch: Partial<LocalProfile>) => {
    if (userId) db.profile.update(userId, patch)
  }

  const handleExport = async () => {
    if (!userId) return
    const passphrase =
      prompt(
        'Frase para cifrar el backup (recomendado si el archivo va a salir del teléfono). ' +
          'Dejala vacía para exportar sin cifrar.'
      ) ?? ''
    const blob = await exportBackup(userId, passphrase.trim() || undefined)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymtracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(
      passphrase.trim() ? 'Backup cifrado exportado' : 'Backup exportado',
      'Guardalo en un lugar seguro para restaurarlo en otro dispositivo.'
    )
  }

  const handleImportClick = () => {
    if (
      confirm(
        'Importar un backup agrega sus datos a los que ya tenés en este dispositivo — no reemplaza, puede duplicar si ya cargaste algo. Usalo solo en un dispositivo nuevo o vacío. ¿Continuar?'
      )
    ) {
      fileRef.current?.click()
    }
  }

  const handleImportFile = async (file: File) => {
    if (!userId) return
    try {
      const text = await file.text()
      let passphrase: string | undefined
      if (backupNeedsPassphrase(text)) {
        passphrase = prompt('El backup está cifrado. Ingresá la frase con la que lo exportaste.') ?? undefined
        if (!passphrase) return
      }
      await importBackup(userId, text, passphrase)
      toast.success('Datos importados', 'Volvé a entrar a cada pantalla para verlos actualizados.')
    } catch (err) {
      toast.error('No se pudo importar', err instanceof Error ? err.message : 'Revisá que sea un backup válido.')
    }
  }

  if (!profile) return null

  const reminderStatus =
    profile.reminderEnabled === 1
      ? `Activados, ${profile.reminderTime ?? '18:00'}`
      : 'Desactivados'
  const calorieStatus =
    profile.calorieTrackingEnabled === 1
      ? `Activo, meta ${(profile.calorieGoalKcal ?? 2200).toLocaleString('es-AR')} kcal`
      : 'Desactivado'

  const spotifyConfigured = isSpotifyConfigured()
  const spotifyConnected = Boolean(spotifyAccessToken)
  const spotifyStatus = !spotifyConfigured
    ? 'Pendiente de configurar'
    : spotifyConnected
      ? `Conectado${spotifyDisplayName ? ` como ${spotifyDisplayName}` : ''}`
      : 'Sin conectar'
  const handleSpotifyRow = () => {
    if (!spotifyConfigured) return
    if (spotifyConnected) {
      spotifyDisconnect()
      toast.success('Spotify desconectado')
    } else {
      startSpotifyLogin()
    }
  }

  const supabaseConfigured = isSupabaseAuthConfigured()
  const syncSubtitle = isGuest
    ? 'Creá una cuenta para respaldar tus datos'
    : !supabaseConfigured
    ? 'Pendiente de configurar'
    : syncStatus === 'syncing'
      ? 'Sincronizando…'
      : syncStatus === 'error'
        ? 'No se pudo sincronizar — se reintenta solo'
        : lastSyncedAt
          ? `Sincronizado ${timeAgo(lastSyncedAt)}`
          : 'Todavía no sincronizó'
  const handleSyncRow = () => {
    if (isGuest) return navigate('/registro')
    if (!supabaseConfigured || !userId || syncStatus === 'syncing') return
    runSync(userId)
  }

  const handleRestore = async () => {
    try {
      await restorePurchases()
      toast.success('Compras restauradas', 'Si tenías una suscripción activa, ya está de vuelta.')
    } catch (e) {
      toast.error('No se pudo restaurar', e instanceof Error ? e.message : 'Probá de nuevo.')
    }
  }

  const handleDiscardGuest = async () => {
    if (
      !confirm(
        '¿Borrar todos tus datos de este teléfono? Como no tenés cuenta, no hay copia en la nube y no se pueden recuperar.'
      )
    )
      return
    try {
      await discardGuestData()
      window.location.reload()
    } catch (e) {
      toast.error('No se pudo borrar', e instanceof Error ? e.message : 'Probá de nuevo.')
    }
  }

  return (
    <div className="mx-auto content-width pb-24">
      {/* Sin padding de safe-area acá: esta pantalla vive DENTRO de AppShell,
          debajo del header global (que ya reserva ese espacio) — sumarlo
          acá también duplicaba el hueco de arriba (bug real reportado con
          captura). Ese padding es para pantallas de pantalla completa
          (Workout.tsx, FAQ.tsx en su forma standalone, etc.) sin nada
          arriba. */}
      <header className="glass sticky top-[var(--app-header-h,0px)] z-20 flex items-center gap-3 border-b border-line px-4 pb-2 pt-2">
        <button
          onClick={() => navigate('/perfil')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-accent" />
          <h1 className="font-semibold">Ajustes</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 pt-2 pb-4">
        {isGuest && (
          <div className="space-y-3 rounded-md border border-line-2 bg-surface p-4">
            <div>
              <p className="font-semibold">Estás usando Repe sin cuenta</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                Tus datos están solo en este teléfono. Con una cuenta se respaldan en la nube, los
                recuperás en otro dispositivo y podés vincularte con un coach. No perdés nada de lo que
                ya registraste.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/registro')}
                className="h-11 flex-1 rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
              >
                Crear cuenta
              </button>
              <button
                onClick={() => navigate('/login')}
                className="h-11 flex-1 rounded-sm bg-fill text-sm font-semibold text-ink-2 active:bg-fill-2"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        )}

        {showAppSection && (
          <section>
            <SectionHeader title="La app" />
            <Card>
              {canInstall && (
                <Row onClick={handleInstall}>
                  <Smartphone size={18} className="shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">Instalar la app</p>
                    <p className="text-[13px] text-ink-3">Se agrega a tu pantalla de inicio y funciona sin conexión</p>
                  </div>
                </Row>
              )}
              <Row onClick={() => window.open(ANDROID_APK_URL, '_blank', 'noopener')}>
                <Download size={18} className="shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Descargar para Android</p>
                  <p className="text-[13px] text-ink-3">APK con notificaciones nativas, desde GitHub Releases</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            </Card>
          </section>
        )}

        <section>
          <SectionHeader title="Apariencia" />
          <Card>
            <Row>
              <Palette size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Tema</p>
              </div>
              <div className="flex shrink-0 gap-1 rounded-sm bg-surface-2 p-1">
                <button
                  onClick={() => setTheme('dark')}
                  aria-label="Tema oscuro"
                  aria-pressed={theme === 'dark'}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-xs px-3 text-[13px] font-medium',
                    theme === 'dark' ? 'bg-surface-3 text-ink' : 'text-ink-3'
                  )}
                >
                  <Moon size={14} /> Oscuro
                </button>
                <button
                  onClick={() => setTheme('light')}
                  aria-label="Tema claro"
                  aria-pressed={theme === 'light'}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-xs px-3 text-[13px] font-medium',
                    theme === 'light' ? 'bg-surface-3 text-ink' : 'text-ink-3'
                  )}
                >
                  <Sun size={14} /> Claro
                </button>
              </div>
            </Row>
          </Card>
        </section>

        <section>
          <SectionHeader title="Entrenamiento" />
          <Card>
            <Row className="flex-col items-stretch gap-2">
              <span className="flex items-center gap-3 text-[15px]">
                <Scale size={18} className="shrink-0 text-ink-3" />
                Unidades
              </span>
              <div className="flex gap-2">
                {(['kg', 'lbs'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => update({ units: u })}
                    className={cn(
                      'h-11 flex-1 rounded-xs border text-sm font-semibold',
                      profile.units === u
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line-2 text-ink-2'
                    )}
                  >
                    {u === 'kg' ? 'Kilos' : 'Libras'}
                  </button>
                ))}
              </div>
            </Row>
            <Row className="flex-col items-stretch gap-2">
              <span className="flex items-center gap-3 text-[15px]">
                <Timer size={18} className="shrink-0 text-ink-3" />
                Descanso por defecto
              </span>
              <div className="flex gap-2">
                {REST_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setRestCustomOpen(false)
                      update({ restTimerDefault: s })
                    }}
                    className={cn(
                      'h-11 flex-1 rounded-xs border font-mono text-sm font-semibold tabular-nums',
                      !restCustomOpen && profile.restTimerDefault === s
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line-2 text-ink-2'
                    )}
                  >
                    {s}s
                  </button>
                ))}
                <button
                  onClick={() => setRestCustomOpen((v) => !v)}
                  className={cn(
                    'h-11 flex-1 rounded-xs border text-sm font-semibold',
                    restCustomOpen ? 'border-accent bg-accent text-bg' : 'border-line-2 text-ink-2'
                  )}
                >
                  Otro
                </button>
              </div>
              {restCustomOpen && (
                <div className="flex items-center gap-2">
                  <DraftNumberInput
                    value={profile.restTimerDefault}
                    onCommit={(n) => update({ restTimerDefault: Math.max(5, n) })}
                    className="h-11 w-20 rounded-xs border border-line-2 bg-transparent text-center font-mono text-sm font-semibold tabular-nums outline-none focus:border-accent"
                  />
                  <span className="text-sm text-ink-3">segundos</span>
                </div>
              )}
            </Row>
            <Row className="flex-col items-stretch gap-2">
              <span className="flex items-center gap-3 text-[15px]">
                <Target size={18} className="shrink-0 text-ink-3" />
                Meta semanal (entrenos)
              </span>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => update({ weeklyGoal: n })}
                    className={cn(
                      'h-11 flex-1 rounded-xs border font-mono text-sm font-semibold tabular-nums',
                      (profile.weeklyGoal ?? 3) === n
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line-2 text-ink-2'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Row>
            <Row onClick={() => setLevelSheetOpen(true)}>
              <Trophy size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Nivel</p>
                <p className="text-[13px] text-ink-3">
                  {profile.level ? LEVEL_LABELS[profile.level] : 'Sin definir'}
                </p>
                {levelSuggestion && (
                  <p className="text-[13px] text-accent">
                    Tus marcas sugieren {LEVEL_LABELS[levelSuggestion]} — tocá para actualizar
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
            <Row onClick={() => setGoalSheetOpen(true)}>
              <Flag size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Objetivo</p>
                <p className="text-[13px] text-ink-3">
                  {profile.goal ? GOAL_LABELS[profile.goal] : 'Sin definir'}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
          </Card>
        </section>

        <section>
          <SectionHeader title="Notificaciones" />
          <Card>
            <Row onClick={() => navigate('/recordatorios')}>
              <Bell size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Recordatorios</p>
                <p className="text-[13px] text-ink-3">{reminderStatus}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
            <Row onClick={() => navigate('/calorias')}>
              <Flame size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Calorías</p>
                <p className="text-[13px] text-ink-3">{calorieStatus}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
          </Card>
        </section>

        <section>
          <SectionHeader title="Conexiones" />
          <Card>
            <Row onClick={handleSpotifyRow} className={cn(!spotifyConfigured && 'opacity-50')}>
              <Music size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Spotify</p>
                <p className="text-[13px] text-ink-3">{spotifyStatus}</p>
              </div>
              {spotifyConfigured && (
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              )}
            </Row>
          </Card>
        </section>

        <section>
          <SectionHeader title="Herramientas" />
          <Card>
            <Row onClick={() => navigate('/calculadora')}>
              <Calculator size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Calculadora de 1RM</p>
                <p className="text-[13px] text-ink-3">Pesos por objetivo, sin abrir un ejercicio</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
            <Row onClick={() => navigate('/entrenos-pasados')}>
              <CalendarPlus size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Cargar entreno pasado</p>
                <p className="text-[13px] text-ink-3">Para que se refleje en tus métricas y gráficos</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
          </Card>
        </section>

        <section>
          <SectionHeader title="Datos" />
          <Card>
            <Row onClick={handleSyncRow} className={cn(!supabaseConfigured && 'opacity-50')}>
              {supabaseConfigured && syncStatus === 'error' ? (
                <CloudOff size={18} className="shrink-0 text-danger" />
              ) : (
                <RefreshCw
                  size={18}
                  className={cn('shrink-0 text-ink-3', syncStatus === 'syncing' && 'animate-spin')}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Respaldo en la nube</p>
                <p className="text-[13px] text-ink-3">{syncSubtitle}</p>
              </div>
            </Row>
            <Row onClick={handleExport}>
              <Download size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Exportar mis datos</p>
                <p className="text-[13px] text-ink-3">Un archivo para restaurar todo en otro dispositivo</p>
              </div>
            </Row>
            <Row onClick={handleImportClick}>
              <Upload size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Importar datos</p>
                <p className="text-[13px] text-ink-3">Desde un backup exportado antes</p>
              </div>
            </Row>
          </Card>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
        </section>

        {supabaseConfigured && !isGuest && (
          <section>
            <SectionHeader title="Entrenador" />
            <Card>
              {isCoach ? (
                <Row onClick={() => navigate('/coach')}>
                  <Users size={18} className="shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">Mis alumnos</p>
                    <p className="text-[13px] text-ink-3">Ver progreso, asignar rutinas y metas</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-4" />
                </Row>
              ) : (
                <Row onClick={() => setCoachSheetOpen(true)}>
                  <GraduationCap size={18} className="shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">Convertirme en coach</p>
                    <p className="text-[13px] text-ink-3">Tomá alumnos y seguí su progreso</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-4" />
                </Row>
              )}
            </Card>
          </section>
        )}

        <section>
          <SectionHeader title="Ayuda" />
          <Card>
            <Row onClick={() => navigate('/faq')}>
              <HelpCircle size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Preguntas frecuentes</p>
                <p className="text-[13px] text-ink-3">Y cómo dejarnos una consulta o una idea</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
            <Row onClick={() => navigate('/legal')}>
              <FileText size={18} className="shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">Términos y privacidad</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-4" />
            </Row>
          </Card>
        </section>

        {showPurchases && (
          <section>
            <SectionHeader title="Suscripciones" />
            <Card>
              <Row onClick={() => !adFree && setPaywallOpen(true)}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Sin anuncios</p>
                  <p className="text-[13px] text-ink-3">
                    {adFree ? 'Activa' : 'Quitá los banners de la app'}
                  </p>
                </div>
                {!adFree && <ChevronRight size={16} className="shrink-0 text-ink-4" />}
              </Row>
              <Row onClick={handleRestore}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Restaurar compras</p>
                  <p className="text-[13px] text-ink-3">Recuperá una suscripción de otro dispositivo</p>
                </div>
              </Row>
              <Row onClick={() => window.open('https://apps.apple.com/account/subscriptions', '_blank', 'noopener')}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Administrar suscripciones</p>
                  <p className="text-[13px] text-ink-3">Cancelar o cambiar desde tu cuenta de Apple</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            </Card>
          </section>
        )}

        {isGuest && (
          <section>
            <SectionHeader title="Datos del teléfono" />
            <Card>
              <Row onClick={handleDiscardGuest}>
                <Trash2 size={18} className="shrink-0 text-danger" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-danger">Borrar mis datos</p>
                  <p className="text-[13px] text-ink-3">Elimina todo lo guardado en este teléfono</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            </Card>
          </section>
        )}

        {supabaseConfigured && !isGuest && (
          <section>
            <SectionHeader title="Cuenta" />
            <Card>
              <Row onClick={() => setDeleteSheetOpen(true)}>
                <Trash2 size={18} className="shrink-0 text-danger" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-danger">Borrar mi cuenta</p>
                  <p className="text-[13px] text-ink-3">Elimina tu cuenta y tus datos de la nube</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            </Card>
          </section>
        )}

        <p className="px-1 text-center text-xs text-ink-3">
          Repe v1.0 · Modo local
        </p>
      </div>

      {paywallOpen && (
        <Suspense fallback={null}>
          <Paywall kind="ad_free" onClose={() => setPaywallOpen(false)} />
        </Suspense>
      )}
      {deleteSheetOpen && (
        <Suspense fallback={null}>
          <DeleteAccountSheet onClose={() => setDeleteSheetOpen(false)} />
        </Suspense>
      )}
      {coachSheetOpen && (
        <Suspense fallback={null}>
          <CoachSignupSheet onClose={() => setCoachSheetOpen(false)} />
        </Suspense>
      )}
      {levelSheetOpen && (
        <OptionPickerSheet
          title="Tu nivel"
          options={LEVEL_OPTIONS}
          value={profile.level}
          onSelect={(level) => update({ level })}
          onClose={() => setLevelSheetOpen(false)}
        />
      )}
      {goalSheetOpen && (
        <OptionPickerSheet
          title="Tu objetivo"
          options={GOAL_OPTIONS}
          value={profile.goal}
          onSelect={(goal) => update({ goal })}
          onClose={() => setGoalSheetOpen(false)}
        />
      )}
    </div>
  )
}
