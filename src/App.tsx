import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import { ProtectedRoute, AdminRoute, CoachRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Workout from '@/pages/Workout'
import Exercises from '@/pages/Exercises'
import Profile from '@/pages/Profile'
import Routines from '@/pages/Routines'
import RoutineEditor from '@/pages/RoutineEditor'
import Login from '@/pages/Login'
import Registro from '@/pages/Registro'
import ForgotPassword from '@/pages/ForgotPassword'
import Onboarding from '@/pages/Onboarding'
import Reminders from '@/pages/Reminders'
import Ajustes from '@/pages/Ajustes'
import Calories from '@/pages/Calories'
import Calculator from '@/pages/Calculator'
import LogPastWorkout from '@/pages/LogPastWorkout'
import SpotifyCallback from '@/pages/SpotifyCallback'
import ImportRoutine from '@/pages/ImportRoutine'
import Cardio from '@/pages/Cardio'
import Run from '@/pages/Run'
import Legal from '@/pages/Legal'
import FAQ from '@/pages/FAQ'
import ToastContainer from '@/components/ui/Toast'

// Lazy: Recharts pesa ~400KB min; solo se descarga al entrar a Progreso
const Progress = lazy(() => import('@/pages/Progress'))
const Admin = lazy(() => import('@/pages/Admin'))
const AdminUsers = lazy(() => import('@/pages/AdminUsers'))
const Measurements = lazy(() => import('@/pages/Measurements'))
const CoachHome = lazy(() => import('@/pages/coach/CoachHome'))
const CoachClientDetail = lazy(() => import('@/pages/coach/CoachClientDetail'))
const CoachInvite = lazy(() => import('@/pages/coach/CoachInvite'))
const CoachProfile = lazy(() => import('@/pages/coach/CoachProfile'))
const JoinCoach = lazy(() => import('@/pages/JoinCoach'))

const lazyFallback = <p className="py-12 text-center text-sm text-ink-3">Cargando…</p>

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/olvide-contrasena" element={<ForgotPassword />} />
      {/* Legal: accesible también antes de loguearse (linkeado desde el registro) */}
      <Route path="/legal" element={<Legal />} />
      <Route path="/legal/:doc" element={<Legal />} />

      {/* Onboarding: requiere auth pero no perfil completo */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
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
          <Route path="/perfil" element={<Profile />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/calorias" element={<Calories />} />
          <Route path="/calculadora" element={<Calculator />} />
          <Route path="/entrenos-pasados" element={<LogPastWorkout />} />
          <Route path="/recordatorios" element={<Reminders />} />
          <Route path="/faq" element={<FAQ />} />

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
        <Route path="/cardio" element={<Cardio />} />
        <Route path="/correr" element={<Run />} />
        <Route
          path="/unirse/:code"
          element={<Suspense fallback={lazyFallback}><JoinCoach /></Suspense>}
        />

        {/* Área de coach: rol `coach` (o admin). Pantalla completa, header propio. */}
        <Route element={<CoachRoute />}>
          <Route path="/coach" element={<Suspense fallback={lazyFallback}><CoachHome /></Suspense>} />
          <Route path="/coach/alumno/:id" element={<Suspense fallback={lazyFallback}><CoachClientDetail /></Suspense>} />
          <Route path="/coach/invitar" element={<Suspense fallback={lazyFallback}><CoachInvite /></Suspense>} />
          <Route path="/coach/perfil" element={<Suspense fallback={lazyFallback}><CoachProfile /></Suspense>} />
        </Route>
        <Route path="/rutina/:routineId" element={<RoutineEditor />} />
        <Route path="/spotify/callback" element={<SpotifyCallback />} />
        <Route path="/importar/:code" element={<ImportRoutine />} />
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
