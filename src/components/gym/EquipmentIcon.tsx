import type { Equipment } from '@/types'

interface Props {
  equipment: Equipment
  size?: number
  className?: string
}

const COMMON = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Barra con discos en cada punta. */
function Barbell() {
  return (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <rect x="1" y="9" width="2.5" height="6" rx="0.5" />
      <rect x="4.5" y="7" width="2" height="10" rx="0.5" />
      <rect x="17.5" y="7" width="2" height="10" rx="0.5" />
      <rect x="20.5" y="9" width="2.5" height="6" rx="0.5" />
    </>
  )
}

/** Mancuerna corta con discos redondos en las puntas. */
function DumbbellIcon() {
  return (
    <>
      <line x1="8" y1="12" x2="16" y2="12" />
      <rect x="6" y="9" width="3" height="6" rx="1" />
      <rect x="15" y="9" width="3" height="6" rx="1" />
      <rect x="3.5" y="10.5" width="2" height="3" rx="0.5" />
      <rect x="18.5" y="10.5" width="2" height="3" rx="0.5" />
    </>
  )
}

/** Máquina de polea: marco + pila de discos + cable. */
function MachineIcon() {
  return (
    <>
      <path d="M5 3 L5 21" />
      <path d="M19 3 L19 21" />
      <path d="M5 3 L19 3" />
      <circle cx="12" cy="7" r="1.4" />
      <path d="M12 8.4 L12 14" strokeDasharray="1.5 1.5" />
      <rect x="9" y="14" width="6" height="2" rx="0.4" />
      <rect x="9" y="16.5" width="6" height="2" rx="0.4" />
    </>
  )
}

/** Polea con cable en ángulo (cross/cable). */
function CableIcon() {
  return (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2 L7 19" strokeDasharray="1.6 1.6" />
      <path d="M5 21 L9 17" />
    </>
  )
}

/** Figura simple: peso corporal, sin equipo. */
function BodyweightIcon() {
  return (
    <>
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M12 7 L12 14" />
      <path d="M7 10 L12 8.5 L17 10" />
      <path d="M12 14 L8 21" />
      <path d="M12 14 L16 21" />
    </>
  )
}

/** Banda elástica: lazo ondulado. */
function BandIcon() {
  return (
    <>
      <path d="M4 12 Q7 6, 12 12 T20 12" />
      <path d="M4 12 Q7 18, 12 12 T20 12" opacity="0.5" />
    </>
  )
}

/** Kettlebell: cuerpo redondo + asa. */
function KettlebellIcon() {
  return (
    <>
      <path d="M9 8 Q9 4, 12 4 Q15 4, 15 8" />
      <circle cx="12" cy="15" r="6.5" />
    </>
  )
}

/** Genérico: un asterisco simple para equipo "otro". */
function OtherIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8 L12 16 M9 10 L15 14 M15 10 L9 14" />
    </>
  )
}

const ICONS: Record<Equipment, () => JSX.Element> = {
  barbell: Barbell,
  dumbbell: DumbbellIcon,
  machine: MachineIcon,
  cable: CableIcon,
  bodyweight: BodyweightIcon,
  band: BandIcon,
  kettlebell: KettlebellIcon,
  other: OtherIcon,
}

export default function EquipmentIcon({ equipment, size = 20, className }: Props) {
  const Shape = ICONS[equipment] ?? OtherIcon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={className}
      {...COMMON}
    >
      <Shape />
    </svg>
  )
}
