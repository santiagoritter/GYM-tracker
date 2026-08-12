import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Workout from '@/pages/Workout'
import Exercises from '@/pages/Exercises'
import Profile from '@/pages/Profile'
import Routines from '@/pages/Routines'
import RoutineEditor from '@/pages/RoutineEditor'
import Login from '@/pages/Login'
import Registro from '@/pages/Registro'
import Onboarding from '@/pages/Onboarding'
import Reminders from '@/pages/Reminders'
import Ajustes from '@/pages/Ajustes'
import Calories from '@/pages/Calories'
import Calculator from '@/pages/Calculator'
import LogPastWorkout from '@/pages/LogPastWorkout'
import SpotifyCallback from '@/pages/SpotifyCallback'
import ToastContainer from '@/components/ui/Toast'

// Lazy: Recharts pesa ~400KB min; solo se descarga al entrar a Progreso
const Progress = lazy(() => import('@/pages/Progress'))
const Admin = lazy(() => import('@/pages/Admin'))
const Measurements = lazy(() => import('@/pages/Measurements'))

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      {/* Onboarding: requiere auth pero no perfil completo */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* App principal: requiere auth */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
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
          </Route>
        </Route>
        <Route path="/entreno/:workoutId" element={<Workout />} />
        <Route path="/rutina/:routineId" element={<RoutineEditor />} />
        <Route path="/spotify/callback" element={<SpotifyCallback />} />
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
