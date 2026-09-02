import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Mail } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/legal'

/**
 * Preguntas frecuentes + contacto. Acordeón con <details> nativo (sin JS de
 * estado). El contacto abre `mailto:` con asunto prellenado — sin backend
 * de feedback (fuera de alcance de esta tanda).
 */

const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: '¿Funciona sin internet?',
    a: 'Sí. Registrar entrenamientos, ver rutinas, usar el cronómetro y el modo cardio funcionan 100% sin conexión. Si iniciás sesión, los datos se sincronizan solos cuando volvés a tener señal.',
  },
  {
    q: '¿Cómo paso mis datos a otro teléfono?',
    a: 'Con sesión iniciada, se sincronizan automáticamente: entrás con el mismo email en el otro dispositivo y aparece todo. Sin sesión, usá Ajustes → Datos → "Exportar mis datos" y después "Importar datos" en el otro teléfono (podés cifrar el archivo con una frase).',
  },
  {
    q: 'Los recordatorios / el aviso de fin de descanso no me llegan con la app cerrada.',
    a: 'En el navegador, las notificaciones solo funcionan con la app abierta. Instalá la app para Android (Ajustes → La app → "Descargar para Android") o agregala a la pantalla de inicio: ahí el aviso lo agenda el sistema y llega aunque tengas la pantalla apagada.',
  },
  {
    q: '¿Por qué no puedo controlar Spotify / ver mis playlists?',
    a: 'GymTracker no reproduce música: controla lo que ya suena en tu Spotify. Necesitás tener Spotify abierto en algún dispositivo y una cuenta Premium para los controles. Si conectaste Spotify hace tiempo, puede que tengas que reconectar desde Ajustes → Conexiones para habilitar las playlists.',
  },
  {
    q: '¿Para qué usa el GPS?',
    a: 'Solo cuando trackeás una salida a correr, y siempre pidiéndote permiso antes. Con eso calcula distancia, ritmo, parciales por kilómetro y dibuja el recorrido. El recorrido queda con tus datos, no se comparte.',
  },
  {
    q: '¿Qué es el modo coach?',
    a: 'Si sos entrenador, podés vincularte con tus alumnos por link o QR para ver su progreso y asignarles rutinas y metas. Si sos alumno, un coach solo ve tus datos si aceptás el vínculo, y podés cortarlo cuando quieras desde tu perfil.',
  },
  {
    q: '¿Los niveles de fuerza y los pesos sugeridos son confiables?',
    a: 'Son orientativos. Se calculan con fórmulas y tablas estándar (Epley, estándares por edad/peso/sexo). No reemplazan a un entrenador ni a un profesional de la salud.',
  },
  {
    q: '¿Cómo borro mi cuenta?',
    a: <>Escribinos a <a className="font-medium text-accent" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('GymTracker — baja de cuenta')}`}>{SUPPORT_EMAIL}</a> y damos de baja la cuenta y borramos tus datos del servidor.</>,
  },
]

export default function FAQ() {
  const navigate = useNavigate()
  const mailto = (subject: string) =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`GymTracker — ${subject}`)}`

  return (
    <div className="mx-auto min-h-screen content-width pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/ajustes')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold">Preguntas frecuentes</h1>
      </header>

      <div className="space-y-2 px-4 py-4">
        {ITEMS.map((item) => (
          <details key={item.q} className="group rounded-md bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                size={18}
                className="shrink-0 text-ink-3 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="px-4 pb-4 text-[14px] leading-relaxed text-ink-2">{item.a}</div>
          </details>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-md border border-line-2 bg-surface p-4">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-accent" />
            <p className="font-semibold">Contacto y sugerencias</p>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            ¿Encontraste un problema, o hay algo que te gustaría que la app tuviera?
            Escribinos, leemos todo.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={mailto('consulta')}
              className="flex h-11 items-center justify-center rounded-sm bg-fill text-sm font-semibold text-ink-2 active:bg-fill-2"
            >
              Escribir a {SUPPORT_EMAIL}
            </a>
            <a
              href={mailto('me gustaría que la app…')}
              className="flex h-11 items-center justify-center rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
            >
              Proponer una idea
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
