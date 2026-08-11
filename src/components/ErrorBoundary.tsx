import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Red de seguridad de último recurso: sin esto, cualquier excepción sin
 * capturar en el render tira abajo TODO el árbol de React y lo único que
 * queda visible es el fondo base de la app (`bg-bg`, casi negro) — una
 * "pantalla negra" muda, sin pista de qué pasó ni forma de recuperarse
 * sin cerrar la app entera. No había ningún ErrorBoundary en toda la app
 * (verificado, cero resultados) — hallazgo real, no relacionado con el
 * fix anterior de backdrop-blur, encontrado investigando el reporte de
 * pantalla negra al agregar un ejercicio a una rutina desde su detalle
 * (que sigue reproduciéndose después de ese fix).
 *
 * El mensaje y el stack se muestran SIEMPRE, no solo en dev: el objetivo
 * inmediato es que la próxima vez que esto pase en un dispositivo real
 * se pueda capturar el error real (screenshot) en vez de quedar sin
 * ninguna pista, que es lo que impide diagnosticar el bug de verdad
 * desde este entorno.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <AlertTriangle size={40} className="text-danger" />
        <div className="space-y-1">
          <p className="text-lg font-bold">Algo salió mal</p>
          <p className="text-sm text-ink-2">
            La app tuvo un error inesperado. Tus datos están a salvo — se
            guardan en el dispositivo antes de mostrarse en pantalla.
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="flex h-11 items-center rounded-sm bg-accent px-5 text-sm font-bold text-bg active:bg-accent-dim"
        >
          Reintentar
        </button>
        <pre className="mt-2 max-h-40 w-full max-w-lg overflow-auto rounded-md bg-surface p-3 text-left text-[12px] text-danger">
          {error.message}
          {error.stack ? `\n${error.stack}` : ''}
        </pre>
      </div>
    )
  }
}
