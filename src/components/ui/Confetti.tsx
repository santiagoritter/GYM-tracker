import { useEffect, useRef } from 'react'

const COLORS = ['#E8FF47', '#4ADE80', '#60A5FA', '#F97316', '#EC4899', '#FACC15']

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
}

/**
 * Ráfaga de confetti sobre canvas, sin dependencias. Se dispara una vez al
 * montar y se limpia sola. Pensado para renderizar condicionalmente al lograr
 * un PR o terminar un entreno.
 */
export default function Confetti({ pieces = 140 }: { pieces?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = (canvas.width = window.innerWidth * dpr)
    const H = (canvas.height = window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    const parts: Piece[] = Array.from({ length: pieces }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120 * dpr,
      y: H * 0.32,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (Math.random() * -12 - 4) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: (Math.random() * 6 + 4) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    const gravity = 0.35 * dpr
    let raf = 0
    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      }
      frame++
      if (frame < 200) raf = requestAnimationFrame(draw)
    }
    draw()

    return () => cancelAnimationFrame(raf)
  }, [pieces])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[90]"
      aria-hidden
    />
  )
}
