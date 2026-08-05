import type { Variants } from 'motion/react'

/**
 * Fase 28 — "Smooth Drawer" (kokonutui) adaptado a nuestro propio patrón de
 * sheet (Portal + fixed bottom-0, no el Drawer de shadcn del ejemplo, que
 * no está instalado). Mismo spring que el original (damping 30, stiffness
 * 300) para el panel, más un stagger corto del contenido interno.
 *
 * El centrado horizontal (`left-1/2` + `x: '-50%'`) va DENTRO de los
 * keyframes, no en una clase `-translate-x-1/2` aparte — una animación
 * reemplaza el transform completo del elemento, mismo motivo que ya
 * documentaba `animate-sheet-in` en index.css (que este archivo reemplaza
 * para los sheets que pasan a usar `motion`).
 */
export const sheetPanelVariants: Variants = {
  hidden: { opacity: 0, x: '-50%', y: '100%' },
  visible: {
    opacity: 1,
    x: '-50%',
    y: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

/** Para las secciones internas del sheet (header, cuerpo…) que cascadean
 * con `sheetPanelVariants` como padre. */
export const sheetItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
}

/** Mismo spring, para sheets que se centran con flexbox (`items-end
 * justify-center` del padre) en vez de `left-1/2` + `x: -50%` — no hace
 * falta la componente `x`, el padre ya centra sin transform. */
export const sheetPanelVariantsFlex: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

/** Variante sin stagger ni desplazamiento, para prefers-reduced-motion:
 * solo cross-fade, mismo criterio que ya se usó en la Fase 16 para las
 * animaciones CSS existentes. Mantiene el centrado horizontal estático. */
export const sheetPanelVariantsReduced: Variants = {
  hidden: { opacity: 0, x: '-50%' },
  visible: { opacity: 1, x: '-50%', transition: { duration: 0.15 } },
}

export const sheetItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}

/** Reduced-motion de `sheetPanelVariantsFlex` — sin la `x` que no aplica acá. */
export const sheetPanelVariantsFlexReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}
