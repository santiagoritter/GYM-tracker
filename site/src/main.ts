import { animate, onScroll, splitText, stagger, svg, utils } from 'animejs'

/**
 * Motor de animación del sitio: anime.js v4 (no GSAP — ver BITACORA.md,
 * cambio a pedido del dueño después de ver animejs.com). Todo acá es mejora
 * progresiva, nunca el contenido: sin JS, sin `animejs` cargado, o con
 * `prefers-reduced-motion`, todo el contenido ya es visible (`.reveal` y
 * `.kinetic-word` arrancan en `opacity:1` — solo se ocultan si
 * `js-motion-ready` está en `<html>`, que es lo primero que hace este
 * archivo si el motion está permitido).
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!reducedMotion) {
  document.documentElement.classList.add('js-motion-ready')

  // ─── Hero: anillo de marca dibujándose ──────────────────────────────────
  const ring = document.querySelector<SVGCircleElement>('#hero-ring-progress')
  if (ring) {
    const length = ring.getTotalLength()
    ring.style.strokeDasharray = `${length}`
    ring.style.strokeDashoffset = `${length}`
    animate(ring, {
      strokeDashoffset: [length, length * 0.22], // mismo gap que RepeMark.tsx (175.8/75.4)
      duration: 1100,
      ease: 'outExpo',
      delay: 150,
    })
  }

  // ─── Hero: titular cinético (palabra por palabra) al cargar ────────────
  // Tipografía cinética en vez de imagen estática de hero — tendencia real
  // de apps fitness 2026 (dribbble/canvasbuilder), no un efecto porque sí.
  const heroHeading = document.querySelector('#hero-heading')
  if (heroHeading) {
    const { words } = splitText(heroHeading, { words: true })
    for (const w of words) w.classList.add('kinetic-word')
    animate(words, {
      opacity: [0, 1],
      y: ['100%', '0%'],
      rotate: [4, 0],
      duration: 900,
      delay: stagger(45, { start: 250 }),
      ease: 'outExpo',
    })
  }

  // ─── Reveal por scroll, agrupado (fade + translateY con stagger) ───────
  const groups = new Map<string, HTMLElement[]>()
  for (const el of document.querySelectorAll<HTMLElement>('.reveal')) {
    const key = el.dataset.revealGroup ?? el.dataset.revealId ?? Math.random().toString(36)
    const arr = groups.get(key) ?? []
    arr.push(el)
    groups.set(key, arr)
  }
  // `autoplay: onScroll(...)` pasado directo a `animate()` no engancha de
  // forma confiable (el linking interno de Timer.init() depende de un
  // orden que no se puede garantizar acá) — se verificó con Playwright que
  // el elemento se queda en opacity:0 después de scrollear la página
  // entera. El patrón que sí funciona, verificado igual: `onScroll`
  // standalone con `onEnter`, disparando el `animate()` a mano.
  for (const els of groups.values()) {
    onScroll({
      target: els[0],
      sync: false,
      onEnter: () =>
        animate(els, {
          opacity: [0, 1],
          translateY: [28, 0],
          duration: 700,
          ease: 'outExpo',
          delay: stagger(90),
        }),
    })
  }

  // ─── Títulos de sección: cinéticos al entrar en viewport ────────────────
  for (const heading of document.querySelectorAll<HTMLElement>('.section-heading')) {
    if (heading.id === 'hero-heading') continue // ya se animó al cargar
    const { words } = splitText(heading, { words: true })
    for (const w of words) w.classList.add('kinetic-word')
    onScroll({
      target: heading,
      sync: false,
      onEnter: () =>
        animate(words, {
          opacity: [0, 1],
          y: ['100%', '0%'],
          rotate: [4, 0],
          duration: 700,
          delay: stagger(35),
          ease: 'outExpo',
        }),
    })
  }

  // ─── Anillos de "Números reales" (ver DESIGN.md §8: marco, no gráfico
  // comparativo — las tres dibujan a la misma fracción fija) + el número
  // cuenta desde 0 en sincronía. ────────────────────────────────────────
  for (const card of document.querySelectorAll<HTMLElement>('.stat-ring-card')) {
    const ringPath = card.querySelector<SVGCircleElement>('.stat-ring-progress')
    const numberEl = card.querySelector<HTMLElement>('.stat-ring-number')
    const target = numberEl ? Number(numberEl.dataset.value ?? '0') : 0
    const counter = { value: 0 }

    const [drawable] = ringPath ? svg.createDrawable(ringPath) : [null]
    if (drawable) animate(drawable, { draw: '0 0' }) // arranca invisible

    onScroll({
      target: card,
      sync: false,
      onEnter: () => {
        if (drawable) {
          animate(drawable, { draw: ['0 0', '0 0.78'], duration: 1200, ease: 'outExpo' })
        }
        if (numberEl) {
          animate(counter, {
            value: target,
            duration: 1200,
            ease: 'outExpo',
            onUpdate: () => {
              numberEl.textContent = Math.round(counter.value).toString()
            },
          })
        }
      },
    })
  }

  // ─── Parallax: varios elementos a velocidades distintas, suavizado ─────
  // Investigado contra fitonist-app.webflow.io (usa `kinet`, una librería
  // de suavizado por física — friction/acceleration hacia un valor
  // objetivo). No sumamos esa dependencia: `utils.damp` de anime.js hace
  // exactamente lo mismo (suavizado exponencial independiente del
  // framerate), así que cada elemento con `data-parallax="<velocidad>"`
  // persigue su posición objetivo con inercia propia en vez de saltar
  // 1:1 con el scroll — eso es lo que se lee como "vivo" y no como scroll
  // nativo con un div encima. La velocidad es relativa a la distancia del
  // elemento al centro del viewport, no al scroll acumulado de la página
  // entera — así nunca "se escapa" en una página larga, siempre vuelve a
  // 0 cuando el elemento vuelve al centro.
  const parallaxEls = [...document.querySelectorAll<HTMLElement>('[data-parallax]')].map((el) => ({
    el,
    speed: Number(el.dataset.parallax),
    current: 0,
  }))
  if (parallaxEls.length) {
    let lastTime = performance.now()
    const tick = (now: number) => {
      const deltaTime = Math.min(now - lastTime, 50) / 1000 // clamp: tab en background no debe "saltar"
      lastTime = now
      const viewportCenter = window.innerHeight / 2
      for (const p of parallaxEls) {
        const rect = p.el.getBoundingClientRect()
        const distanceFromCenter = rect.top + rect.height / 2 - viewportCenter
        const target = distanceFromCenter * p.speed
        p.current = utils.damp(p.current, target, deltaTime, 6)
        p.el.style.transform = `translateY(${p.current.toFixed(2)}px)`
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}

// ─── Feedback en pointer-down, no en click (apple-design §1) ─────────────
// Corre siempre, con o sin reduced-motion: es un cambio de estado de 0.1s,
// no una animación que deba respetar la preferencia.
for (const el of document.querySelectorAll<HTMLElement>('.btn-accent, .pill-link')) {
  const press = () => el.classList.add('press')
  const release = () => el.classList.remove('press')
  el.addEventListener('pointerdown', press)
  el.addEventListener('pointerup', release)
  el.addEventListener('pointerleave', release)
  el.addEventListener('pointercancel', release)
}

// Año del footer, sin hardcodear.
const yearEl = document.querySelector('#year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

// Nav: fondo sólido recién al scrollear, como el header con vidrio de la
// app (DESIGN.md §3: `.glass` solo resuelve contenido que pasa por debajo).
const nav = document.querySelector<HTMLElement>('#nav')
if (nav) {
  const onNavScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 8)
  onNavScroll()
  window.addEventListener('scroll', onNavScroll, { passive: true })
}
