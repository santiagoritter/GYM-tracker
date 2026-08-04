import {
  Award,
  CalendarCheck,
  Dumbbell,
  Flame,
  Medal,
  Mountain,
  Rocket,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { AchievementIcon as IconName } from '@/lib/achievements'

const ICONS: Record<IconName, LucideIcon> = {
  Target,
  CalendarCheck,
  Medal,
  Award,
  Flame,
  Zap,
  Rocket,
  Trophy,
  TrendingUp,
  Dumbbell,
  Mountain,
}

/** Icono de un logro. Lucide en vez de emoji: mismo trazo que el resto de la app. */
export default function AchievementIcon({
  name,
  size = 20,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const Icon = ICONS[name] ?? Trophy
  return <Icon size={size} className={className} strokeWidth={1.8} />
}
