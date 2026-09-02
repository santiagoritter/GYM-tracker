import { Suspense, lazy, useRef, useState } from 'react'
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
  Flame,
  ListMusic,
  Music,
  Moon,
  RefreshCw,
  Settings,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react'

const SpotifyPlayerSheet = lazy(() => import('@/components/gym/SpotifyPlayerSheet'))
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useThemeStore } from '@/stores/themeStore'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { isSpotifyConfigured, startSpotifyLogin } from '@/lib/spotifyAuth'
import { isSupabaseAuthConfigured } from '@/lib/supabaseAuth'
import { runSync } from '@/lib/sync'
import { useSyncStore } from '@/stores/syncStore'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import type { LocalProfile } from '@/types'
import { cn } from '@/lib/utils'
import { exportBackup, importBackup } from '@/lib/backup'
import { useCanInstallPwa, promptInstall, isStandalone } from '@/lib/pwaInstall'
import { isNative } from '@/lib/native'
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
  const { theme, setTheme } = useThemeStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const spotifyDisplayName = useSpotifyStore((s) => s.displayName)
  const spotifyAccessToken = useSpotifyStore((s) => s.accessToken)
  const spotifyDisconnect = useSpotifyStore((s) => s.disconnect)
  const { status: syncStatus, lastSyncedAt } = useSyncStore()
  const canInstall = useCanInstallPwa()
  const showAppSection = !isNative && !isStandalone()
  const [playerOpen, setPlayerOpen] = useState(false)

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) toast.success('Instalando', 'Buscá el ícono de GymTracker en tu pantalla de inicio.')
  }

  const update = (patch: Partial<LocalProfile>) => {
    if (userId) db.profile.update(userId, patch)
  }

  const handleExport = async () => {
    if (!userId) return
    const blob = await exportBackup(userId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymtracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Backup exportado', 'Guardalo en un lugar seguro para restaurarlo en otro dispositivo.')
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
      await importBackup(userId, text)
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
  const syncSubtitle = !supabaseConfigured
    ? 'Pendiente de configurar'
    : syncStatus === 'syncing'
      ? 'Sincronizando…'
      : syncStatus === 'error'
        ? 'No se pudo sincronizar — se reintenta solo'
        : lastSyncedAt
          ? `Sincronizado ${timeAgo(lastSyncedAt)}`
          : 'Todavía no sincronizó'
  const handleSyncRow = () => {
    if (!supabaseConfigured || !userId || syncStatus === 'syncing') return
    runSync(userId)
  }

  return (
    <div className="mx-auto min-h-screen content-width pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
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

      <div className="space-y-5 px-4 py-4">
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
              <span className="min-w-0 flex-1 text-[15px]">Tema</span>
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
              <span className="text-[15px]">Unidades</span>
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
              <span className="text-[15px]">Descanso por defecto</span>
              <div className="flex gap-2">
                {[60, 90, 120, 180].map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ restTimerDefault: s })}
                    className={cn(
                      'h-11 flex-1 rounded-xs border font-mono text-sm font-semibold tabular-nums',
                      profile.restTimerDefault === s
                        ? 'border-accent bg-accent text-bg'
                        : 'border-line-2 text-ink-2'
                    )}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </Row>
            <Row className="flex-col items-stretch gap-2">
              <span className="text-[15px]">Meta semanal (entrenos)</span>
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
            {spotifyConnected && (
              <Row onClick={() => setPlayerOpen(true)}>
                <ListMusic size={18} className="shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">Elegir qué suena</p>
                  <p className="text-[13px] text-ink-3">Tus playlists, sin salir de la app</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-4" />
              </Row>
            )}
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

        <p className="px-1 text-center text-xs text-ink-3">
          GymTracker v0.1 · Modo local
        </p>
      </div>

      {playerOpen && (
        <Suspense fallback={null}>
          <SpotifyPlayerSheet onClose={() => setPlayerOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
