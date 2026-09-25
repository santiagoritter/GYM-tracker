import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Mejora progresiva, no el contenido: sin JS o con `prefers-reduced-motion`,
 * todo el contenido de `index.html` ya es visible (ver `.reveal` en
 * style.css). Acá solo se agrega un fade + translateY sutil al entrar en
 * viewport y el trazado del anillo del hero — nada de pin de scroll
 * (`Redisenio.md`/`DESIGN.md` §0 marcan el scroll-jacking como el mismo
 * tipo de tic que un glow: el default de un generador, no una decisión).
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!reducedMotion) {
  gsap.registerPlugin(ScrollTrigger)
  document.documentElement.classList.add('js-gsap-ready')

  const groups = new Map<string, Element[]>()
  for (const el of document.querySelectorAll<HTMLElement>('.reveal')) {
    const key = el.dataset.revealGroup ?? el.dataset.revealId ?? Math.random().toString(36)
    const arr = groups.get(key) ?? []
    arr.push(el)
    groups.set(key, arr)
  }

  for (const els of groups.values()) {
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: els[0],
        start: 'top 85%',
        once: true,
      },
    })
  }

  const ring = document.querySelector<SVGCircleElement>('#hero-ring-progress')
  if (ring) {
    const length = ring.getTotalLength()
    ring.style.strokeDasharray = `${length}`
    ring.style.strokeDashoffset = `${length}`
    gsap.to(ring, {
      strokeDashoffset: length * 0.22, // mismo gap que RepeMark.tsx (175.8/75.4 ≈ 0.7 de vuelta)
      duration: 1.1,
      ease: 'power2.out',
      delay: 0.2,
    })
  }
}

// Año del footer, sin hardcodear.
const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

// Nav: fondo sólido recién al scrollear, como el header con vidrio de la
// app (DESIGN.md §3: `.glass` solo resuelve contenido que pasa por debajo).
const nav = document.querySelector<HTMLElement>('#nav')
if (nav) {
  const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 8)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}
