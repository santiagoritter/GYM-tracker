import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import { ProtectedRoute, AdminRoute, CoachRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Workout from '@/pages/Workout'
import Exercises from '@/pages/Exercises'
import Routines from '@/pages/Routines'
import Login from '@/pages/Login'
import ToastContainer from '@/components/ui/Toast'
import ActiveSessionKeeper from '@/components/ActiveSessionKeeper'
import { useIsDesktop } from '@/hooks/useMediaQuery'

// Pantallas que no hacen falta para abrir la app (registro, ajustes, cardio,
// calculadoras, legal…): cada una en su propio chunk. El service worker los
// precachea, así que siguen funcionando sin conexión.
const Registro = lazy(() => import('@/pages/Registro'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Reminders = lazy(() => import('@/pages/Reminders'))
const Ajustes = lazy(() => import('@/pages/Ajustes'))
const Calories = lazy(() => import('@/pages/Calories'))
const Calculator = lazy(() => import('@/pages/Calculator'))
const LogPastWorkout = lazy(() => import('@/pages/LogPastWorkout'))
const SpotifyCallback = lazy(() => import('@/pages/SpotifyCallback'))
const ImportRoutine = lazy(() => import('@/pages/ImportRoutine'))
const Cardio = lazy(() => import('@/pages/Cardio'))
const Run = lazy(() => import('@/pages/Run'))
const Legal = lazy(() => import('@/pages/Legal'))
const FAQ = lazy(() => import('@/pages/FAQ'))
const RoutineEditor = lazy(() => import('@/pages/RoutineEditor'))
const Profile = lazy(() => import('@/pages/Profile'))

// Lazy: Recharts pesa ~400KB min; solo se descarga al entrar a Progreso
const Progress = lazy(() => import('@/pages/Progress'))
const Admin = lazy(() => import('@/pages/Admin'))
const AdminUsers = lazy(() => import('@/pages/AdminUsers'))
const AdminReports = lazy(() => import('@/pages/AdminReports'))
const Measurements = lazy(() => import('@/pages/Measurements'))
const CoachHome = lazy(() => import('@/pages/coach/CoachHome'))
const CoachClientDetail = lazy(() => import('@/pages/coach/CoachClientDetail'))
const CoachRoutineBuilder = lazy(() => import('@/pages/coach/CoachRoutineBuilder'))
const CoachInvite = lazy(() => import('@/pages/coach/CoachInvite'))
const CoachProfile = lazy(() => import('@/pages/coach/CoachProfile'))
const CoachPlan = lazy(() => import('@/pages/coach/CoachPlan'))
const CoachChatWithClient = lazy(() =>
  import('@/pages/coach/ChatPages').then((m) => ({ default: m.CoachChatWithClient }))
)
const MyCoachChat = lazy(() =>
  import('@/pages/coach/ChatPages').then((m) => ({ default: m.MyCoachChat }))
)
const JoinCoach = lazy(() => import('@/pages/JoinCoach'))

/** Pantallas de coach que en mobile son de pantalla completa (fuera de la tab
 * bar) pero en desktop tienen que conservar el sidebar y el header global: ahí
 * se montan dentro de AppShell. */
function CoachDesktopShell() {
  const isDesktop = useIsDesktop()
  return isDesktop ? <AppShell /> : <Outlet />
}

const lazyFallback = <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>

export default function App() {
  return (
    <>
      <ToastContainer />
      <ActiveSessionKeeper />
      <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Suspense fallback={lazyFallback}><Registro /></Suspense>} />
      <Route path="/olvide-contrasena" element={<Suspense fallback={lazyFallback}><ForgotPassword /></Suspense>} />
      {/* Legal: accesible también antes de loguearse (linkeado desde el registro) */}
      <Route path="/legal" element={<Suspense fallback={lazyFallback}><Legal /></Suspense>} />
      <Route path="/legal/:doc" element={<Suspense fallback={lazyFallback}><Legal /></Suspense>} />

      {/* Onboarding: requiere auth pero no perfil completo */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Suspense fallback={lazyFallback}><Onboarding /></Suspense>} />
      </Route>

      {/* App principal: requiere auth */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/rutinas" element={<Routines />} />
          <Route path="/ejercicios" element={<Exercises />} />
          <Route
            path="/progreso"
            element={
              <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}>
                <Progress />
              </Suspense>
            }
          />
          <Route path="/perfil" element={<Suspense fallback={lazyFallback}><Profile /></Suspense>} />
          <Route path="/ajustes" element={<Suspense fallback={lazyFallback}><Ajustes /></Suspense>} />
          <Route path="/calorias" element={<Suspense fallback={lazyFallback}><Calories /></Suspense>} />
          <Route path="/calculadora" element={<Suspense fallback={lazyFallback}><Calculator /></Suspense>} />
          <Route path="/entrenos-pasados" element={<Suspense fallback={lazyFallback}><LogPastWorkout /></Suspense>} />
          <Route path="/recordatorios" element={<Suspense fallback={lazyFallback}><Reminders /></Suspense>} />
          <Route path="/faq" element={<Suspense fallback={lazyFallback}><FAQ /></Suspense>} />

          {/* Hub de coach: pestaña propia en la tab bar (navTabs.ts,
              condicional a role) — a diferencia del resto del área de
              coach, este vive DENTRO de AppShell para que la barra de
              navegación siga visible acá. Las pantallas de detalle
              (alumno, chat, invitar, perfil, plan) siguen siendo pantalla
              completa más abajo, mismo criterio que /entreno/:workoutId
              respecto de Home. */}
          <Route element={<CoachRoute />}>
            <Route path="/coach" element={<Suspense fallback={lazyFallback}><CoachHome /></Suspense>} />
          </Route>

          {/* Panel admin: solo admins */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}>
                  <Admin />
                </Suspense>
              }
            />
            <Route
              path="/admin/reportes"
              element={
                <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}>
                  <AdminReports />
                </Suspense>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}>
                  <AdminUsers />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="/entreno/:workoutId" element={<Workout />} />
        <Route path="/cardio" element={<Suspense fallback={lazyFallback}><Cardio /></Suspense>} />
        <Route path="/correr" element={<Suspense fallback={lazyFallback}><Run /></Suspense>} />
        <Route
          path="/unirse/:code"
          element={<Suspense fallback={lazyFallback}><JoinCoach /></Suspense>}
        />

        {/* Chat del lado del alumno (no requiere rol coach). */}
        <Route path="/mi-coach/chat" element={<Suspense fallback={lazyFallback}><MyCoachChat /></Suspense>} />

        {/* Resto del área de coach: rol `coach` (o admin). Pantalla completa,
            header propio — /coach (el hub) vive dentro de AppShell, más
            arriba. */}
        <Route element={<CoachRoute />}>
          <Route path="/coach/alumno/:id" element={<Suspense fallback={lazyFallback}><CoachClientDetail /></Suspense>} />
          <Route path="/coach/alumno/:id/chat" element={<Suspense fallback={lazyFallback}><CoachChatWithClient /></Suspense>} />
          <Route element={<CoachDesktopShell />}>
            <Route path="/coach/alumno/:id/rutina" element={<Suspense fallback={lazyFallback}><CoachRoutineBuilder /></Suspense>} />
            <Route path="/coach/alumno/:id/rutina/:routineId" element={<Suspense fallback={lazyFallback}><CoachRoutineBuilder /></Suspense>} />
            <Route path="/coach/invitar" element={<Suspense fallback={lazyFallback}><CoachInvite /></Suspense>} />
            <Route path="/coach/perfil" element={<Suspense fallback={lazyFallback}><CoachProfile /></Suspense>} />
            <Route path="/coach/plan" element={<Suspense fallback={lazyFallback}><CoachPlan /></Suspense>} />
          </Route>
        </Route>
        <Route path="/rutina/:routineId" element={<Suspense fallback={lazyFallback}><RoutineEditor /></Suspense>} />
        <Route path="/spotify/callback" element={<Suspense fallback={lazyFallback}><SpotifyCallback /></Suspense>} />
        <Route path="/importar/:code" element={<Suspense fallback={lazyFallback}><ImportRoutine /></Suspense>} />
        <Route
          path="/medidas"
          element={
            <Suspense fallback={<p className="py-12 text-center text-sm text-ink-3">Cargando…</p>}>
              <Measurements />
            </Suspense>
          }
        />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
