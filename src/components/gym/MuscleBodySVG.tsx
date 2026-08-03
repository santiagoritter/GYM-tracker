import type { MuscleGroup } from '@/types'

interface Props {
  primary: MuscleGroup[]
  secondary?: MuscleGroup[]
  view?: 'front' | 'back' | 'both'
  size?: number
}

// Paleta de colores por estado
const COLOR_PRIMARY = '#E8FF47'
const COLOR_SECONDARY = 'rgba(232,255,71,0.3)'
const COLOR_INACTIVE = 'rgba(255,255,255,0.06)'
const COLOR_BODY = '#2C2C2E'
const COLOR_OUTLINE = '#3A3A3C'

// Paths SVG simplificados — vista frontal (coordenadas en 0-100 viewBox)
function FrontBody({ primary, secondary }: { primary: MuscleGroup[]; secondary: MuscleGroup[] }) {
  const fill = (m: MuscleGroup) =>
    primary.includes(m)
      ? COLOR_PRIMARY
      : secondary.includes(m)
      ? COLOR_SECONDARY
      : COLOR_INACTIVE

  return (
    <svg viewBox="0 0 120 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Contorno cuerpo */}
      {/* Cabeza */}
      <ellipse cx="60" cy="22" rx="14" ry="16" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />

      {/* Cuello */}
      <rect x="54" y="36" width="12" height="10" rx="2" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />

      {/* Torso */}
      <path d="M32 46 Q28 50 26 80 L28 130 Q32 135 60 135 Q88 135 92 130 L94 80 Q92 50 88 46 Z" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />

      {/* Pecho — dos zonas */}
      <path d="M36 52 Q40 48 54 50 L56 74 Q44 76 36 70 Z" fill={fill('chest')} opacity="0.9" />
      <path d="M84 52 Q80 48 66 50 L64 74 Q76 76 84 70 Z" fill={fill('chest')} opacity="0.9" />

      {/* Hombros */}
      <ellipse cx="28" cy="54" rx="10" ry="12" fill={fill('shoulders')} />
      <ellipse cx="92" cy="54" rx="10" ry="12" fill={fill('shoulders')} />

      {/* Core / abdomen — 6-pack simplificado */}
      <rect x="48" y="76" width="10" height="10" rx="2" fill={fill('core')} />
      <rect x="62" y="76" width="10" height="10" rx="2" fill={fill('core')} />
      <rect x="48" y="90" width="10" height="10" rx="2" fill={fill('core')} />
      <rect x="62" y="90" width="10" height="10" rx="2" fill={fill('core')} />
      <rect x="48" y="104" width="10" height="10" rx="2" fill={fill('core')} />
      <rect x="62" y="104" width="10" height="10" rx="2" fill={fill('core')} />

      {/* Brazos superiores izq — bíceps */}
      <path d="M20 62 Q14 68 14 88 Q14 94 18 98 L26 94 Q24 82 22 68 Z" fill={fill('biceps')} />
      {/* Tríceps (visible desde adelante, lado) */}
      <path d="M24 60 Q32 58 34 68 L26 94 Q20 92 18 80 Z" fill={fill('triceps')} opacity="0.7" />

      {/* Brazos superiores der */}
      <path d="M100 62 Q106 68 106 88 Q106 94 102 98 L94 94 Q96 82 98 68 Z" fill={fill('biceps')} />
      <path d="M96 60 Q88 58 86 68 L94 94 Q100 92 102 80 Z" fill={fill('triceps')} opacity="0.7" />

      {/* Antebrazos izq */}
      <path d="M14 96 Q10 108 12 122 L18 124 Q20 112 18 98 Z" fill={fill('forearms')} />
      {/* Antebrazos der */}
      <path d="M106 96 Q110 108 108 122 L102 124 Q100 112 102 98 Z" fill={fill('forearms')} />

      {/* Manos */}
      <ellipse cx="14" cy="128" rx="6" ry="8" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1" />
      <ellipse cx="106" cy="128" rx="6" ry="8" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1" />

      {/* Cadera / glúteos (frente) */}
      <path d="M32 128 Q36 140 60 142 Q84 140 88 128 L92 132 Q88 148 60 150 Q32 148 28 132 Z" fill={fill('glutes')} opacity="0.6" />

      {/* Cuádriceps izq */}
      <path d="M32 140 Q28 160 28 180 Q30 190 38 192 L44 188 Q44 168 44 148 Z" fill={fill('quads')} />
      {/* Cuádriceps der */}
      <path d="M88 140 Q92 160 92 180 Q90 190 82 192 L76 188 Q76 168 76 148 Z" fill={fill('quads')} />

      {/* Centro cuádriceps */}
      <path d="M44 144 Q52 148 60 148 Q68 148 76 144 L76 188 Q68 194 60 194 Q52 194 44 188 Z" fill={fill('quads')} opacity="0.8" />

      {/* Isquiotibiales (poco visible frontal) */}
      <path d="M30 180 Q28 200 32 212 L40 210 Q38 196 38 180 Z" fill={fill('hamstrings')} opacity="0.4" />
      <path d="M90 180 Q92 200 88 212 L80 210 Q82 196 82 180 Z" fill={fill('hamstrings')} opacity="0.4" />

      {/* Gemelos izq */}
      <path d="M30 208 Q28 222 32 232 Q36 236 40 234 L42 228 Q40 218 38 208 Z" fill={fill('calves')} />
      {/* Gemelos der */}
      <path d="M90 208 Q92 222 88 232 Q84 236 80 234 L78 228 Q80 218 82 208 Z" fill={fill('calves')} />
    </svg>
  )
}

// Vista dorsal
function BackBody({ primary, secondary }: { primary: MuscleGroup[]; secondary: MuscleGroup[] }) {
  const fill = (m: MuscleGroup) =>
    primary.includes(m)
      ? COLOR_PRIMARY
      : secondary.includes(m)
      ? COLOR_SECONDARY
      : COLOR_INACTIVE

  return (
    <svg viewBox="0 0 120 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Cabeza */}
      <ellipse cx="60" cy="22" rx="14" ry="16" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />
      {/* Cuello */}
      <rect x="54" y="36" width="12" height="10" rx="2" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />
      {/* Torso */}
      <path d="M32 46 Q28 50 26 80 L28 130 Q32 135 60 135 Q88 135 92 130 L94 80 Q92 50 88 46 Z" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1.5" />

      {/* Trapecios */}
      <path d="M40 46 Q60 40 80 46 Q76 58 60 62 Q44 58 40 46 Z" fill={fill('back')} opacity="0.9" />

      {/* Deltoides posterior */}
      <ellipse cx="28" cy="54" rx="10" ry="12" fill={fill('shoulders')} />
      <ellipse cx="92" cy="54" rx="10" ry="12" fill={fill('shoulders')} />

      {/* Dorsal ancho (lat) */}
      <path d="M30 58 Q26 80 28 110 L38 112 Q42 88 44 64 Z" fill={fill('back')} />
      <path d="M90 58 Q94 80 92 110 L82 112 Q78 88 76 64 Z" fill={fill('back')} />

      {/* Romboides / espalda media */}
      <path d="M44 62 Q52 60 60 60 Q68 60 76 62 L74 100 Q68 104 60 104 Q52 104 46 100 Z" fill={fill('back')} opacity="0.8" />

      {/* Lumbar */}
      <path d="M46 100 Q52 110 60 112 Q68 110 74 100 L74 128 Q68 134 60 134 Q52 134 46 128 Z" fill={fill('back')} opacity="0.6" />

      {/* Glúteos */}
      <path d="M32 128 Q34 150 48 154 Q54 156 60 156 Q66 156 72 154 Q86 150 88 128 Z" fill={fill('glutes')} />

      {/* Tríceps dorsal izq */}
      <path d="M22 60 Q16 70 14 88 L22 96 Q24 78 26 62 Z" fill={fill('triceps')} />
      {/* Tríceps der */}
      <path d="M98 60 Q104 70 106 88 L98 96 Q96 78 94 62 Z" fill={fill('triceps')} />

      {/* Antebrazos */}
      <path d="M14 94 Q10 108 12 122 L18 124 Q20 112 18 96 Z" fill={fill('forearms')} />
      <path d="M106 94 Q110 108 108 122 L102 124 Q100 112 102 96 Z" fill={fill('forearms')} />

      {/* Manos */}
      <ellipse cx="14" cy="128" rx="6" ry="8" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1" />
      <ellipse cx="106" cy="128" rx="6" ry="8" fill={COLOR_BODY} stroke={COLOR_OUTLINE} strokeWidth="1" />

      {/* Isquiotibiales */}
      <path d="M34 154 Q30 172 30 190 Q32 200 42 202 L46 198 Q44 176 44 158 Z" fill={fill('hamstrings')} />
      <path d="M86 154 Q90 172 90 190 Q88 200 78 202 L74 198 Q76 176 76 158 Z" fill={fill('hamstrings')} />
      <path d="M44 156 Q52 162 60 162 Q68 162 76 156 L76 198 Q68 204 60 204 Q52 204 44 198 Z" fill={fill('hamstrings')} opacity="0.8" />

      {/* Gemelos */}
      <path d="M30 198 Q28 214 32 228 Q36 234 42 232 L44 224 Q40 212 38 198 Z" fill={fill('calves')} />
      <path d="M90 198 Q92 214 88 228 Q84 234 78 232 L76 224 Q80 212 82 198 Z" fill={fill('calves')} />
    </svg>
  )
}

export default function MuscleBodySVG({ primary, secondary = [], view = 'both', size = 120 }: Props) {
  // aspect-[1/2] + min-w-0 en vez de width/height fijos en px: el diagrama
  // se achica para entrar en contenedores angostos (celular) en lugar de
  // desbordar. `size` queda como tope máximo, no como ancho forzado.
  if (view === 'front') {
    return (
      <div className="mx-auto aspect-[1/2] w-full min-w-0" style={{ maxWidth: size }}>
        <FrontBody primary={primary} secondary={secondary} />
      </div>
    )
  }
  if (view === 'back') {
    return (
      <div className="mx-auto aspect-[1/2] w-full min-w-0" style={{ maxWidth: size }}>
        <BackBody primary={primary} secondary={secondary} />
      </div>
    )
  }
  return (
    <div className="flex w-full items-start justify-center gap-3">
      <div className="aspect-[1/2] w-full min-w-0 flex-1" style={{ maxWidth: size }}>
        <FrontBody primary={primary} secondary={secondary} />
      </div>
      <div className="aspect-[1/2] w-full min-w-0 flex-1" style={{ maxWidth: size }}>
        <BackBody primary={primary} secondary={secondary} />
      </div>
    </div>
  )
}
