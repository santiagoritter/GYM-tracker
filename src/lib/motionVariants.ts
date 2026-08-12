import type { Variants } from 'motion/react'

/**
 * Fase 28 — "Smooth Drawer" (kokonutui) adaptado a nuestro propio patrón de
 * sheet (Portal + fixed bottom-0, no el Drawer de shadcn del ejemplo, que
 * no está instalado). Mismo spring que el original (damping 30, stiffness
 * 300) para el panel, más un stagger corto del contenido interno. Todos
 * los sheets se centran con flexbox (ver ResponsiveSheet.tsx), por eso
 * solo queda la variante "Flex" — la que centraba con `left-1/2` + `x:
 * -50%` se retiró al migrar los 11 sheets a ese wrapper compartido.
 */
export const sheetItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } },
}

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

export const sheetItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}

/** Reduced-motion de `sheetPanelVariantsFlex` — sin la `x` que no aplica acá. */
export const sheetPanelVariantsFlexReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}

/** Modal centrado (desktop, ≥1024px) — mismo panel que un sheet, otra
 * entrada: fade + scale en vez de deslizar desde abajo, no hay "abajo" en
 * un diálogo centrado. Usado por ResponsiveSheet.tsx. */
export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

export const modalPanelVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
}
