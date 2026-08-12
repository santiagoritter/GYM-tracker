import { Calendar, Dumbbell, House, TrendingUp, User, type LucideIcon } from 'lucide-react'

export interface NavTab {
  to: string
  label: string
  icon: LucideIcon
}

/** Compartido entre Layout.tsx (mobile, tab bar) y LayoutDesktop.tsx
 * (sidebar) — mismas 5 pestañas, dos presentaciones distintas. */
export const TABS: NavTab[] = [
  { to: '/', label: 'Hoy', icon: House },
  { to: '/rutinas', label: 'Rutinas', icon: Calendar },
  { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/perfil', label: 'Yo', icon: User },
]
