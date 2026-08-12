import Layout from '@/components/Layout'
import LayoutDesktop from '@/components/LayoutDesktop'
import { useIsDesktop } from '@/hooks/useMediaQuery'

/** Elige el layout mobile (tab bar) o desktop (sidebar) según el ancho de
 * pantalla — ver DESIGN.md §3 "Ancho de contenido". Las rutas hijas no
 * cambian, solo el chrome que las envuelve. */
export default function AppShell() {
  const isDesktop = useIsDesktop()
  return isDesktop ? <LayoutDesktop /> : <Layout />
}
