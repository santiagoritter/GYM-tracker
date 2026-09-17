import { Calendar, Dumbbell, House, TrendingUp, User, Users, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavTab {
  to: string
  label: string
  icon: LucideIcon
}

/** Compartido entre Layout.tsx (mobile, tab bar) y LayoutDesktop.tsx
 * (sidebar) — mismas pestañas base, dos presentaciones distintas. */
const BASE_TABS: NavTab[] = [
  { to: '/', label: 'Hoy', icon: House },
  { to: '/rutinas', label: 'Rutinas', icon: Calendar },
  { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/perfil', label: 'Yo', icon: User },
]

/** Quien tiene el modo coach activo (`role: 'coach'`, o `admin` que puede
 * ver todo) suma una pestaña propia — antes "Mis alumnos" solo se llegaba
 * cavando en Ajustes, y es algo que un coach revisa seguido, no una vez
 * cada tanto. Solo esta pestaña es condicional; el resto de la barra es
 * igual para todos. */
export function getTabs(role: UserRole | null): NavTab[] {
  if (role !== 'coach' && role !== 'admin') return BASE_TABS
  return [...BASE_TABS, { to: '/coach', label: 'Coach', icon: Users }]
}
