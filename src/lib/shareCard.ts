import { isNative } from '@/lib/native'
import { PUBLIC_APP_URL } from '@/lib/publicUrl'

/**
 * Tarjeta para compartir el entreno (formato historia, 1080×1920), dibujada en
 * un canvas propio: Recharts/SVG no exportan bien a imagen. Colores de
 * DESIGN.md (negro tintado y lima), sin gradientes ni halos. Lleva el isotipo y
 * el nombre de la app: cada historia es publicidad.
 *
 * Privacidad: la tarjeta NO incluye fotos ni peso corporal; solo lo que el
 * usuario hizo en el entreno (duración, volumen, series, récords) y, si hay,
 * el radar de niveles por músculo.
 */

export interface ShareCardData {
  workoutName: string
  dateLabel: string
  durationLabel: string
  volumeLabel: string
  setsLabel: string
  prs: { name: string; value: string }[]
  /** `progress` de 0 a 1 por grupo muscular; `null` si no hay perfil completo. */
  radar: { label: string; progress: number }[] | null
}

const W = 1080
const H = 1920
const PAD = 96
const BG = '#0B0B0C'
const SURFACE = '#16161A'
const LINE = '#2A2A32'
const ACCENT = '#E8FF47'
const INK = '#F5F5F7'
const INK_3 = '#8E8E96'
const SANS = '-apple-system, "SF Pro Text", "DM Sans", system-ui, sans-serif'
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace'

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Hasta 2 líneas; lo que no entra se corta con "…". */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !current) current = next
    else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  const out = lines.slice(0, maxLines)
  if (lines.length > maxLines) out[maxLines - 1] = fitText(ctx, `${out[maxLines - 1]} ${lines[maxLines]}`, maxWidth)
  return out.map((l) => fitText(ctx, l, maxWidth))
}

function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = (40 / 100) * size
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = (4 / 100) * size
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = (16 / 100) * size
  ctx.lineCap = 'round'
  ctx.beginPath()
  // El mismo arco del isotipo (RepeMark): 175,8 de 251,2 de circunferencia.
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (175.8 / 251.2))
  ctx.stroke()
  ctx.lineCap = 'butt'
}

function drawRadar(ctx: CanvasRenderingContext2D, data: { label: string; progress: number }[], cx: number, cy: number, radius: number): void {
  const n = data.length
  const angle = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / n
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  for (const ring of [1 / 3, 2 / 3, 1]) {
    ctx.beginPath()
    data.forEach((_, i) => {
      const x = cx + Math.cos(angle(i)) * radius * ring
      const y = cy + Math.sin(angle(i)) * radius * ring
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()
  }
  ctx.beginPath()
  data.forEach(({ progress }, i) => {
    const p = Math.max(0.04, Math.min(1, progress))
    const x = cx + Math.cos(angle(i)) * radius * p
    const y = cy + Math.sin(angle(i)) * radius * p
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(232,255,71,0.22)'
  ctx.fill()
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.fillStyle = INK_3
  ctx.font = `500 28px ${SANS}`
  ctx.textBaseline = 'middle'
  data.forEach(({ label }, i) => {
    const a = angle(i)
    const x = cx + Math.cos(a) * (radius + 44)
    const y = cy + Math.sin(a) * (radius + 36)
    // Umbral bajo: con 11 ejes, dos etiquetas del fondo (Cuádriceps / Antebrazos)
    // quedaban centradas una encima de la otra.
    ctx.textAlign = Math.cos(a) > 0.1 ? 'left' : Math.cos(a) < -0.1 ? 'right' : 'center'
    ctx.fillText(label, x, y)
  })
}

export function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('No se pudo crear la imagen.'))

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  // Marca
  drawMark(ctx, PAD + 40, 150, 80)
  ctx.fillStyle = INK
  ctx.font = `700 44px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Repe', PAD + 100, 150)

  // Título y fecha
  ctx.fillStyle = INK
  ctx.font = `700 84px ${SANS}`
  ctx.textBaseline = 'alphabetic'
  const titleLines = wrapLines(ctx, data.workoutName || 'Entrenamiento', W - PAD * 2, 2)
  let y = 330
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += 98
  }
  ctx.fillStyle = INK_3
  ctx.font = `500 38px ${SANS}`
  ctx.fillText(data.dateLabel, PAD, y + 4)
  y += 100

  // Cifras
  ctx.fillStyle = SURFACE
  ctx.fillRect(PAD, y, W - PAD * 2, 220)
  const stats: [string, string][] = [
    [data.durationLabel, 'Duración'],
    [data.volumeLabel, 'Volumen'],
    [data.setsLabel, 'Series'],
  ]
  const colW = (W - PAD * 2) / 3
  stats.forEach(([value, label], i) => {
    const x = PAD + colW * i + 40
    ctx.fillStyle = INK
    // El valor más grande que entre en su columna ("1 h 18 min" no entra a 54px).
    let size = 54
    ctx.font = `700 ${size}px ${MONO}`
    while (size > 30 && ctx.measureText(value).width > colW - 56) {
      size -= 2
      ctx.font = `700 ${size}px ${MONO}`
    }
    ctx.fillText(value, x, y + 106)
    ctx.fillStyle = INK_3
    ctx.font = `500 32px ${SANS}`
    ctx.fillText(label, x, y + 164)
  })
  y += 220 + 80

  // Récords
  if (data.prs.length > 0) {
    ctx.fillStyle = ACCENT
    ctx.font = `700 46px ${SANS}`
    ctx.fillText(data.prs.length === 1 ? 'Récord personal' : 'Récords personales', PAD, y)
    y += 40
    for (const pr of data.prs.slice(0, 3)) {
      y += 76
      ctx.fillStyle = INK
      ctx.font = `500 44px ${SANS}`
      ctx.textAlign = 'left'
      ctx.fillText(fitText(ctx, pr.name, 560), PAD, y)
      ctx.fillStyle = ACCENT
      ctx.font = `700 44px ${MONO}`
      ctx.textAlign = 'right'
      ctx.fillText(pr.value, W - PAD, y)
      ctx.textAlign = 'left'
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(PAD, y + 28)
      ctx.lineTo(W - PAD, y + 28)
      ctx.stroke()
    }
    y += 70
  }

  // Radar de niveles: solo si entra entre lo de arriba y el pie. Con un título
  // largo o varios récords gana lo que el usuario hizo hoy y el radar se omite.
  if (data.radar && data.radar.length >= 3) {
    const radius = 210
    const top = y
    const bottom = H - 260
    if (bottom - top >= radius * 2 + 120) drawRadar(ctx, data.radar, W / 2, (top + bottom) / 2, radius)
  }

  // Pie
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = `700 40px ${SANS}`
  ctx.fillText('Entrená con Repe', W / 2, H - 150)
  ctx.fillStyle = INK_3
  ctx.font = `500 32px ${SANS}`
  ctx.fillText(PUBLIC_APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, H - 100)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))), 'image/png')
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

/**
 * Comparte la imagen. En la app nativa: se escribe en la caché y se abre la hoja
 * de compartir del sistema (Capacitor Share). En web: Web Share con archivo si
 * el navegador puede, y si no se descarga. Devuelve `false` si el usuario cerró
 * la hoja (no es un error).
 */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  try {
    if (isNative) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])
      const { uri } = await Filesystem.writeFile({
        path: filename,
        data: await blobToBase64(blob),
        directory: Directory.Cache,
      })
      await Share.share({ title, files: [uri] })
      return true
    }
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title })
      return true
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch (e) {
    const name = (e as { name?: string }).name
    const message = e instanceof Error ? e.message : ''
    // Cerrar la hoja de compartir no es un error.
    if (name === 'AbortError' || /cancel/i.test(message)) return false
    throw e
  }
}
