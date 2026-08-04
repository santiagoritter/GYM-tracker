import type { SetupKind } from '@/data/exerciseSetup'

/**
 * Dibujo de línea del puesto de trabajo. Estilo consistente: trazo fino gris
 * para la estructura y acento lima para la pieza que se agarra o se carga,
 * que es la que sirve para reconocer la máquina de un vistazo.
 */

const FRAME = '#6E6E73'
const ACCENT = '#E8FF47'
const SEAT = '#48484C'

const s = { stroke: FRAME, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' as const }
const a = { stroke: ACCENT, strokeWidth: 2.8, fill: 'none', strokeLinecap: 'round' as const }

function Shapes({ kind }: { kind: SetupKind }) {
  switch (kind) {
    case 'flat-bench':
      return (
        <>
          <rect x="14" y="30" width="52" height="7" rx="3" fill={SEAT} />
          <path d="M22 37v14M58 37v14" {...s} />
          <path d="M14 20h52" {...a} />
          <circle cx="16" cy="20" r="5" {...a} />
          <circle cx="64" cy="20" r="5" {...a} />
        </>
      )
    case 'incline-bench':
      return (
        <>
          <path d="M18 52 L58 24 L64 30 L24 56 Z" fill={SEAT} />
          <path d="M22 54v8M60 30v32" {...s} />
          <path d="M14 16h52" {...a} />
          <circle cx="16" cy="16" r="5" {...a} />
          <circle cx="64" cy="16" r="5" {...a} />
        </>
      )
    case 'decline-bench':
      return (
        <>
          <path d="M18 26 L58 50 L54 57 L14 33 Z" fill={SEAT} />
          <path d="M20 32v28M56 52v10" {...s} />
          <path d="M14 14h52" {...a} />
          <circle cx="16" cy="14" r="5" {...a} />
          <circle cx="64" cy="14" r="5" {...a} />
        </>
      )
    case 'pec-deck':
      return (
        <>
          <rect x="32" y="26" width="16" height="26" rx="4" fill={SEAT} />
          <path d="M40 52v10M28 62h24" {...s} />
          <path d="M32 30 L16 18M48 30 L64 18" {...a} />
          <circle cx="14" cy="16" r="4" {...a} />
          <circle cx="66" cy="16" r="4" {...a} />
        </>
      )
    case 'chest-press-machine':
    case 'shoulder-press-machine':
      return (
        <>
          <rect x="30" y="24" width="14" height="28" rx="4" fill={SEAT} />
          <path d="M37 52v10M26 62h22" {...s} />
          <rect x="52" y="18" width="12" height="38" rx="2" {...s} />
          <path d="M53 26h10M53 34h10M53 42h10" {...s} />
          <path d="M44 30h10M44 42h10" {...a} />
        </>
      )
    case 'cable-station':
      return (
        <>
          <path d="M16 12v50M64 12v50M16 12h48" {...s} />
          <rect x="52" y="20" width="12" height="30" rx="2" {...s} />
          <path d="M53 26h10M53 34h10M53 42h10" {...s} />
          <path d="M30 12v18" {...a} />
          <circle cx="30" cy="12" r="4" {...a} />
          <path d="M24 32h12" {...a} />
        </>
      )
    case 'lat-pulldown':
      return (
        <>
          <path d="M14 10v54M64 22v42M14 10h50" {...s} />
          <rect x="30" y="42" width="18" height="7" rx="3" fill={SEAT} />
          <path d="M39 49v13" {...s} />
          <path d="M40 10v10" {...a} />
          <path d="M24 20h32" {...a} />
          <path d="M24 20v6M56 20v6" {...a} />
        </>
      )
    case 'seated-row':
      return (
        <>
          <path d="M14 20v34M14 54h50" {...s} />
          <rect x="34" y="40" width="18" height="7" rx="3" fill={SEAT} />
          <path d="M43 47v7" {...s} />
          <path d="M18 34h14" {...a} />
          <path d="M32 30v8" {...a} />
        </>
      )
    case 'row-machine':
      return (
        <>
          <rect x="16" y="22" width="10" height="30" rx="3" fill={SEAT} />
          <rect x="36" y="24" width="14" height="24" rx="4" fill={SEAT} />
          <path d="M43 48v14M32 62h22" {...s} />
          <path d="M56 20v32" {...s} />
          <path d="M50 28h10M50 40h10" {...a} />
        </>
      )
    case 't-bar':
      return (
        <>
          <path d="M12 56 L58 26" {...s} />
          <circle cx="12" cy="56" r="4" {...s} />
          <circle cx="58" cy="24" r="7" {...a} />
          <circle cx="58" cy="24" r="11" {...a} />
          <path d="M34 40h10" {...a} />
        </>
      )
    case 'smith-machine':
      return (
        <>
          <path d="M18 10v54M62 10v54" {...s} />
          <path d="M14 64h52" {...s} />
          <path d="M18 30h44" {...a} />
          <circle cx="18" cy="30" r="4" {...a} />
          <circle cx="62" cy="30" r="4" {...a} />
        </>
      )
    case 'squat-rack':
      return (
        <>
          <path d="M18 14v50M62 14v50M14 64h52" {...s} />
          <path d="M18 26h6M56 26h6" {...s} />
          <path d="M12 26h56" {...a} />
          <circle cx="14" cy="26" r="6" {...a} />
          <circle cx="66" cy="26" r="6" {...a} />
        </>
      )
    case 'leg-press':
      return (
        <>
          <path d="M12 54 L34 54" {...s} />
          <path d="M16 54 L30 34" {...s} />
          <rect x="24" y="36" width="14" height="8" rx="3" transform="rotate(-30 31 40)" fill={SEAT} />
          <path d="M44 44 L64 18" {...a} strokeWidth="4" />
          <path d="M40 50 L60 24" {...s} />
        </>
      )
    case 'hack-squat':
      return (
        <>
          <path d="M14 58 L58 22" {...s} />
          <path d="M14 58h46" {...s} />
          <rect x="30" y="34" width="16" height="8" rx="3" transform="rotate(-39 38 38)" fill={SEAT} />
          <path d="M40 20h18" {...a} />
          <circle cx="60" cy="20" r="5" {...a} />
        </>
      )
    case 'leg-extension':
      return (
        <>
          <rect x="18" y="24" width="16" height="26" rx="4" fill={SEAT} />
          <path d="M26 50v12M16 62h22" {...s} />
          <path d="M34 34h16" {...s} />
          <path d="M50 34 L60 46" {...a} />
          <circle cx="61" cy="48" r="5" {...a} />
        </>
      )
    case 'leg-curl':
      return (
        <>
          <rect x="16" y="30" width="30" height="8" rx="4" fill={SEAT} />
          <path d="M24 38v12M40 38v12M16 50h32" {...s} />
          <path d="M46 34 L58 34" {...s} />
          <circle cx="60" cy="42" r="5" {...a} />
          <path d="M58 34 L60 40" {...a} />
        </>
      )
    case 'preacher-bench':
      return (
        <>
          <path d="M22 46 L38 26 L52 34 L34 52 Z" fill={SEAT} />
          <path d="M30 52v10M20 62h24" {...s} />
          <path d="M44 20h22" {...a} />
          <circle cx="46" cy="20" r="4" {...a} />
          <circle cx="66" cy="20" r="4" {...a} />
        </>
      )
    case 'hyperextension-bench':
      return (
        <>
          <path d="M20 40 L46 24" {...s} strokeWidth="6" />
          <path d="M26 44v16M42 34v26M18 60h34" {...s} />
          <path d="M52 44h10" {...a} />
          <circle cx="60" cy="48" r="5" {...a} />
        </>
      )
    case 'pull-up-bar':
      return (
        <>
          <path d="M16 16v46M64 16v46" {...s} />
          <path d="M12 62h56" {...s} />
          <path d="M14 16h52" {...a} strokeWidth="3.4" />
          <path d="M30 16v9M50 16v9" {...a} />
        </>
      )
    case 'dip-bars':
      return (
        <>
          <path d="M20 34v28M60 34v28M14 62h52" {...s} />
          <path d="M14 34h20M46 34h20" {...a} strokeWidth="3.4" />
        </>
      )
    case 'calf-machine':
      return (
        <>
          <path d="M18 14v48M62 20v42M14 62h52" {...s} />
          <path d="M18 24h22" {...a} strokeWidth="3.6" />
          <rect x="24" y="52" width="24" height="8" rx="2" fill={SEAT} />
          <rect x="52" y="26" width="10" height="26" rx="2" {...s} />
          <path d="M53 33h8M53 41h8" {...s} />
        </>
      )
    case 'hip-machine':
      return (
        <>
          <rect x="28" y="22" width="18" height="24" rx="4" fill={SEAT} />
          <path d="M37 46v14M26 60h22" {...s} />
          <path d="M28 42 L16 52M46 42 L58 52" {...a} strokeWidth="3.4" />
        </>
      )
    case 'barbell-floor':
      return (
        <>
          <path d="M10 32h60" {...a} strokeWidth="3" />
          <circle cx="16" cy="32" r="11" {...a} />
          <circle cx="64" cy="32" r="11" {...a} />
          <circle cx="16" cy="32" r="4" {...s} />
          <circle cx="64" cy="32" r="4" {...s} />
          <path d="M8 56h64" {...s} />
        </>
      )
    case 'dumbbells':
      return (
        <>
          <path d="M22 26h36" {...a} strokeWidth="3.4" />
          <rect x="12" y="16" width="10" height="20" rx="3" {...a} />
          <rect x="58" y="16" width="10" height="20" rx="3" {...a} />
          <path d="M22 52h36" {...s} strokeWidth="3" />
          <rect x="14" y="45" width="8" height="14" rx="3" {...s} />
          <rect x="58" y="45" width="8" height="14" rx="3" {...s} />
        </>
      )
    case 'kettlebell':
      return (
        <>
          <path d="M30 28c0-8 20-8 20 0" {...a} strokeWidth="4" />
          <path d="M30 28c-6 4-9 12-9 18 0 8 6 12 19 12s19-4 19-12c0-6-3-14-9-18" {...a} />
          <path d="M12 62h56" {...s} />
        </>
      )
    case 'treadmill':
      return (
        <>
          <rect x="12" y="44" width="52" height="12" rx="6" {...s} />
          <path d="M60 44V18M60 18h-16" {...s} />
          <rect x="30" y="10" width="16" height="12" rx="2" {...a} />
          <path d="M20 50h36" {...a} />
        </>
      )
    case 'rower':
      return (
        <>
          <path d="M10 52h56" {...s} />
          <circle cx="18" cy="34" r="11" {...s} />
          <path d="M18 34h-8" {...a} />
          <rect x="36" y="42" width="14" height="7" rx="3" fill={SEAT} />
          <path d="M28 34h22" {...a} strokeWidth="3.2" />
          <path d="M62 30v20" {...s} />
        </>
      )
    case 'air-bike':
      return (
        <>
          <circle cx="26" cy="30" r="15" {...a} />
          <path d="M26 15v30M11 30h30" {...a} strokeWidth="1.8" />
          <path d="M26 45 L40 58h20" {...s} />
          <rect x="50" y="34" width="12" height="7" rx="3" fill={SEAT} />
          <path d="M44 22h14" {...s} />
        </>
      )
    case 'jump-rope':
      return (
        <>
          <path d="M20 20c-14 10-14 32 0 42s34 10 40-4" {...a} />
          <rect x="16" y="12" width="7" height="14" rx="3" {...s} />
          <rect x="58" y="50" width="7" height="14" rx="3" {...s} />
        </>
      )
    case 'ab-wheel':
      return (
        <>
          <circle cx="40" cy="40" r="16" {...a} />
          <circle cx="40" cy="40" r="5" {...s} />
          <path d="M18 40h6M56 40h6" {...s} strokeWidth="4" />
          <path d="M10 60h60" {...s} />
        </>
      )
    case 'floor':
    default:
      return (
        <>
          <rect x="10" y="34" width="60" height="14" rx="7" {...s} />
          <path d="M18 41h44" {...a} strokeDasharray="4 5" />
        </>
      )
  }
}

export default function SetupIllustration({
  kind,
  className,
}: {
  kind: SetupKind
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 80 72"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Shapes kind={kind} />
    </svg>
  )
}
