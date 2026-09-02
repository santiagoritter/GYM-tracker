import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FileText, ShieldCheck } from 'lucide-react'
import { Card, Row } from '@/components/ui/Card'
import { SUPPORT_EMAIL } from '@/lib/legal'

/**
 * Textos legales. Reflejan lo que la app REALMENTE hace, no un template
 * genérico: local-first, Supabase para auth + respaldo, Storage privado
 * para fotos, Spotify opcional, sin tracking publicitario, exportar/borrar.
 * Ruta: `/legal` (índice), `/legal/privacidad`, `/legal/terminos`.
 */

function Header({ title, backTo }: { title: string; backTo: string }) {
  const navigate = useNavigate()
  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <button
        onClick={() => navigate(backTo)}
        aria-label="Volver"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
      >
        <ArrowLeft size={22} />
      </button>
      <h1 className="font-semibold">{title}</h1>
    </header>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto content-width space-y-4 px-5 py-5 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink">
      {children}
      <p className="pt-4 text-[13px] text-ink-3">
        Última actualización: septiembre 2026. Dudas: {SUPPORT_EMAIL}
      </p>
    </div>
  )
}

function Privacidad() {
  return (
    <div className="min-h-screen pb-24">
      <Header title="Política de privacidad" backTo="/legal" />
      <Prose>
        <p>
          GymTracker es una app de seguimiento de entrenamientos pensada para funcionar
          <strong> sin conexión</strong>. Tus datos viven primero en tu dispositivo.
        </p>

        <h2>Qué datos se guardan</h2>
        <p>
          Nombre, email y (si los cargás) fecha de nacimiento, sexo, peso corporal, altura,
          objetivos, tus rutinas, entrenamientos, series, récords, medidas, fotos de
          progreso, registros de calorías y salidas a correr con su recorrido GPS.
        </p>

        <h2>Dónde se guardan</h2>
        <p>
          En el almacenamiento local del navegador o la app (IndexedDB). Si iniciás sesión,
          se sincronizan a <strong>Supabase</strong> (proveedor de base de datos) para que
          puedas recuperarlos en otro dispositivo. Las fotos van a un bucket privado: solo
          tu sesión puede leerlas. Cada usuario solo accede a sus propios datos, garantizado
          por Row Level Security del lado del servidor.
        </p>

        <h2>Terceros</h2>
        <p>
          <strong>Spotify</strong> (opcional): si lo conectás, la app usa tu sesión de
          Spotify para leer y controlar la reproducción. No guardamos tu música.
          <strong> OpenStreetMap</strong>: provee los mapas del modo running.
          <strong> No hay</strong> analítica de terceros, píxeles de seguimiento ni
          publicidad.
        </p>

        <h2>Ubicación</h2>
        <p>
          Solo se usa el GPS mientras trackeás una salida a correr, con tu permiso explícito.
          El recorrido se guarda con el resto de tus datos y no se comparte con nadie.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Podés <strong>exportar</strong> todos tus datos desde Ajustes → Datos (con opción
          de cifrarlos), y <strong>borrar tu cuenta</strong> escribiéndonos a {SUPPORT_EMAIL}.
          Borrar la cuenta elimina tus datos del servidor.
        </p>

        <h2>Seguridad</h2>
        <p>
          Las contraseñas se hashean con bcrypt del lado del servidor (nunca en texto plano).
          La conexión es siempre por HTTPS.
        </p>
      </Prose>
    </div>
  )
}

function Terminos() {
  return (
    <div className="min-h-screen pb-24">
      <Header title="Términos de uso" backTo="/legal" />
      <Prose>
        <h2>Uso de la app</h2>
        <p>
          GymTracker se ofrece "tal cual", para uso personal. Sos responsable de la
          información que cargás y de usar la app de forma segura durante el entrenamiento.
        </p>

        <h2>No es consejo médico ni profesional</h2>
        <p>
          Los niveles de fuerza, pesos sugeridos, estimaciones de 1RM, calorías y cualquier
          recomendación son <strong>orientativos</strong> y se basan en fórmulas y tablas
          estándar. No reemplazan el criterio de un entrenador o un profesional de la salud.
          Consultá con un profesional antes de empezar un plan de entrenamiento.
        </p>

        <h2>Modo coach</h2>
        <p>
          Si te vinculás con un coach, le das acceso a leer tu progreso y a asignarte
          rutinas y metas. Podés cortar el vínculo en cualquier momento desde tu perfil. El
          coach es responsable de las indicaciones que te da; GymTracker solo provee la
          herramienta.
        </p>

        <h2>Disponibilidad</h2>
        <p>
          La app puede tener interrupciones o cambios. La función principal (registrar
          entrenamientos) sigue andando sin conexión aunque el servidor no esté disponible.
        </p>

        <h2>Cuenta</h2>
        <p>
          Una persona, una cuenta. No compartas tu contraseña. Podemos suspender cuentas que
          hagan un uso abusivo del servicio.
        </p>

        <h2>Cambios</h2>
        <p>
          Si estos términos cambian de forma relevante, te vamos a pedir que los aceptes de
          nuevo al abrir la app.
        </p>
      </Prose>
    </div>
  )
}

function Index() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pb-24">
      <Header title="Legal" backTo="/ajustes" />
      <div className="mx-auto content-width space-y-4 px-4 py-4">
        <Card>
          <Row onClick={() => navigate('/legal/privacidad')}>
            <ShieldCheck size={18} className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 text-[15px]">Política de privacidad</span>
            <ChevronRight size={16} className="shrink-0 text-ink-4" />
          </Row>
          <Row onClick={() => navigate('/legal/terminos')}>
            <FileText size={18} className="shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 text-[15px]">Términos de uso</span>
            <ChevronRight size={16} className="shrink-0 text-ink-4" />
          </Row>
        </Card>
      </div>
    </div>
  )
}

export default function Legal() {
  const { doc } = useParams<{ doc?: string }>()
  if (doc === 'privacidad') return <Privacidad />
  if (doc === 'terminos') return <Terminos />
  return <Index />
}
