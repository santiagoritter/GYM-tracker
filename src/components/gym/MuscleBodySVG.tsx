import { useThemeStore } from '@/stores/themeStore'
import type { MuscleGroup } from '@/types'

interface Props {
  primary: MuscleGroup[]
  secondary?: MuscleGroup[]
  view?: 'front' | 'back' | 'both'
  /** Ancho máximo en px de cada silueta. */
  size?: number
}

interface BodyColors {
  primary: string
  secondary: string
  inactive: string
  // `body` no puede coincidir con el fondo de la tarjeta contenedora o la
  // silueta desaparece y los músculos quedan flotando sueltos.
  body: string
  outline: string
}

const DARK_COLORS: BodyColors = {
  primary: '#E8FF47',
  secondary: 'rgba(232,255,71,0.34)',
  inactive: 'rgba(255,255,255,0.10)',
  body: '#3A3A3D',
  outline: '#5A5A60',
}
const LIGHT_COLORS: BodyColors = {
  primary: '#3F6E0C',
  secondary: 'rgba(63,110,12,0.28)',
  inactive: 'rgba(0,0,0,0.07)',
  body: '#D5D5DB',
  outline: '#A8A8AF',
}

/**
 * Silueta anatómica con los músculos trabajados resaltados.
 *
 * Tres problemas del diseño anterior que acá están resueltos:
 *
 *  - La mitad izquierda y la derecha eran paths independientes escritos a
 *    mano con coordenadas que no coincidían. Ahora cada músculo par se
 *    define una vez y se espeja con <use>/scale(-1,1): la simetría es
 *    exacta por construcción.
 *  - Toda la espalda era una única región pintada a distintas opacidades,
 *    así que un jalón al pecho y un encogimiento de trapecios se veían
 *    idénticos. Ahora trapecio, romboides, dorsal y lumbar son zonas
 *    separadas.
 *  - `cardio` es un MuscleGroup que ningún path dibujaba: los siete
 *    ejercicios de cardio encendían un cuerpo completamente apagado. Ahora
 *    tiene tratamiento propio (cuerpo entero tenue + pulso).
 */
export default function MuscleBodySVG({ primary, secondary = [], view = 'both', size = 120 }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const c = theme === 'light' ? LIGHT_COLORS : DARK_COLORS
  const isCardio = primary.includes('cardio') || secondary.includes('cardio')

  const fill = (...groups: MuscleGroup[]): string => {
    if (isCardio) return c.secondary
    if (groups.some((g) => primary.includes(g))) return c.primary
    if (groups.some((g) => secondary.includes(g))) return c.secondary
    return c.inactive
  }

  return (
    <div className="flex w-full min-w-0 items-start justify-center gap-3">
      {(view === 'front' || view === 'both') && (
        <figure className="min-w-0 flex-1" style={{ maxWidth: size }}>
          <BodySvg>
            <FrontBody fill={fill} cardio={isCardio} c={c} />
          </BodySvg>
          <figcaption className="mt-1 text-center text-[12px] font-medium text-ink-3">
            Frente
          </figcaption>
        </figure>
      )}
      {(view === 'back' || view === 'both') && (
        <figure className="min-w-0 flex-1" style={{ maxWidth: size }}>
          <BodySvg>
            <BackBody fill={fill} cardio={isCardio} c={c} />
          </BodySvg>
          <figcaption className="mt-1 text-center text-[12px] font-medium text-ink-3">
            Espalda
          </figcaption>
        </figure>
      )}
    </div>
  )
}

/** Lienzo compartido. El origen de X está en el centro para poder espejar. */
function BodySvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="-50 0 100 210"
      className="aspect-[100/210] w-full"
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

type FillFn = (...groups: MuscleGroup[]) => string

/**
 * Dibuja un músculo del lado derecho y su espejo en el izquierdo. El path se
 * escribe una sola vez, con coordenadas X positivas.
 */
function Pair({ d, color }: { d: string; color: string }) {
  return (
    <g fill={color}>
      <path d={d} />
      <path d={d} transform="scale(-1,1)" />
    </g>
  )
}

/** Músculo único sobre la línea media (abdomen, lumbar, trapecio central). */
function Center({ d, color }: { d: string; color: string }) {
  return (
    <path d={d} fill={color} />
  )
}

// Silueta base: cabeza, cuello, torso, brazos y piernas en un solo path.
const SILHOUETTE = `
  M0 8 C6 8 9.5 12 9.5 17 C9.5 22 6 26 0 26 C-6 26 -9.5 22 -9.5 17 C-9.5 12 -6 8 0 8 Z
  M-6 25 h12 v7 h-12 Z
  M-21 35 C-29 38 -33 46 -34 57 L-38 95 C-38.5 100 -33.5 101.5 -31.5 97 L-27 61
  L-26 106 C-26 117 -24 126 -22 134 L-19.5 186 C-19.5 192 -12.5 193.5 -10 189
  L-6 138 L-3.5 126 h7 L6 138 L10 189 C12.5 193.5 19.5 192 19.5 186 L22 134
  C24 126 26 117 26 106 L27 61 L31.5 97 C33.5 101.5 38.5 100 38 95 L34 57
  C33 46 29 38 21 35 C15 32.5 -15 32.5 -21 35 Z
`

function Silhouette({ c }: { c: BodyColors }) {
  return (
    <path
      d={SILHOUETTE}
      fill={c.body}
      stroke={c.outline}
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  )
}

/** Latido: los ejercicios de cardio no tienen un músculo diana que marcar. */
function CardioPulse({ c }: { c: BodyColors }) {
  return (
    <g>
      <path
        d="M-17 68 h8 l4 -10 l6 20 l5 -12 h11"
        fill="none"
        stroke={c.primary}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

// ── Frente ─────────────────────────────────────────────────────────────────

function FrontBody({ fill, cardio, c }: { fill: FillFn; cardio: boolean; c: BodyColors }) {
  return (
    <g>
      <Silhouette c={c} />

      {/* Deltoides anterior */}
      <Pair d="M19 35 C27 37 31.5 44 32.5 53 C28.5 56.5 23.5 55 20.5 51 C18.5 45 18 39 19 35 Z" color={fill('shoulders')} />

      {/* Pectoral: porción clavicular (alta) y esternal (baja) */}
      <Pair d="M2.5 39 C10.5 38 17.5 40 20.5 45 C18.5 49 11.5 51 3.5 50 Z" color={fill('chest')} />
      <Pair d="M2.5 52 C10.5 53 17.5 51 20.5 47 C20.5 57 15.5 65 3.5 65 Z" color={fill('chest')} />

      {/* Bíceps y antebrazo */}
      <Pair d="M23 57 C28 59 30.5 67 29.5 77 C26.5 79 23.5 77 22.5 71 C21.5 65 21 60 23 57 Z" color={fill('biceps')} />
      <Pair d="M24 81 C29 83 31.5 91 31.5 99 C28.5 101 25.5 99 24.5 93 C23.5 87 23 84 24 81 Z" color={fill('forearms')} />

      {/* Recto abdominal: un bloque segmentado, no seis rectángulos sueltos */}
      <Center d="M-9 59 h18 v45 c0 6 -4 10.5 -9 10.5 s-9 -4.5 -9 -10.5 Z" color={fill('core')} />
      <g stroke={c.body} strokeWidth="1.5" opacity="0.9" fill="none">
        <path d="M0 60 v50" />
        <path d="M-9 72 h18M-9 84 h18M-9 96 h18" />
      </g>

      {/* Oblicuos */}
      <Pair d="M9.5 66 C14.5 68 16.5 76 15.5 90 C12.5 94 10.5 90 9.5 84 Z" color={fill('core')} />

      {/* Cuádriceps */}
      <Pair d="M3.5 120 C13.5 122 19.5 131 20.5 147 C19.5 163 15.5 173 9.5 175 C5.5 167 3.5 146 3.5 120 Z" color={fill('quads')} />

      {/* Gemelo visto de frente */}
      <Pair d="M6.5 150 C13.5 154 16.5 165 15.5 179 C12.5 183 9.5 181 8.5 173 C7.5 165 6.5 156 6.5 150 Z" color={fill('calves')} />

      {cardio && <CardioPulse c={c} />}
    </g>
  )
}

// ── Espalda ────────────────────────────────────────────────────────────────

function BackBody({ fill, cardio, c }: { fill: FillFn; cardio: boolean; c: BodyColors }) {
  return (
    <g>
      <Silhouette c={c} />

      {/* Trapecio superior: es lo que trabaja un encogimiento */}
      <Center d="M-8 33 C-3 31.5 3 31.5 8 33 L5 48 L0 51 L-5 48 Z" color={fill('back')} />
      <Pair d="M7 34 C13 35 18 37.5 21 41 C16 44 9 44 7 42 Z" color={fill('back')} />

      {/* Deltoides posterior */}
      <Pair d="M19 36 C27 38 31.5 45 32.5 54 C28.5 57.5 23.5 56 20.5 52 C18.5 46 18 40 19 36 Z" color={fill('shoulders')} />

      {/* Romboides / trapecio medio */}
      <Pair d="M2.5 50 C9 51 14.5 53.5 17.5 57 C13.5 62 6.5 63 2.5 61 Z" color={fill('back')} />

      {/* Dorsal ancho: la V, claramente separada del trapecio */}
      <Pair d="M3 63 C11 62 16.5 59 19.5 56.5 C21.5 69 17.5 85 9.5 97 C5.5 95 3 83 3 63 Z" color={fill('back')} />

      {/* Erectores espinales / lumbar */}
      <Center d="M-7.5 84 C-3 82 3 82 7.5 84 L5.5 110 C2 112 -2 112 -5.5 110 Z" color={fill('back')} />

      {/* Tríceps y antebrazo */}
      <Pair d="M23 56 C28 58 31.5 67 30.5 78 C27.5 80 24.5 78 23.5 71 C22.5 64 22 59 23 56 Z" color={fill('triceps')} />
      <Pair d="M24.5 82 C29.5 84 32 92 32 100 C29 102 26 100 25 94 C24 88 23.5 85 24.5 82 Z" color={fill('forearms')} />

      {/* Glúteos */}
      <Pair d="M2 110 C12 110 19.5 116 20.5 126 C19.5 136 12.5 140 5.5 137.5 C2 133.5 2 120 2 110 Z" color={fill('glutes')} />

      {/* Isquiotibiales */}
      <Pair d="M3.5 140 C12.5 142 18.5 150 19.5 162 C18.5 172 14.5 178 9.5 178 C5.5 172 3.5 156 3.5 140 Z" color={fill('hamstrings')} />

      {/* Gemelos */}
      <Pair d="M5.5 155 C13.5 158 17 168 16 181 C13 185 9.5 183 8 175 C7 167 5.5 159 5.5 155 Z" color={fill('calves')} />

      {cardio && <CardioPulse c={c} />}
    </g>
  )
}
