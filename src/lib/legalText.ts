import { SUPPORT_EMAIL } from '@/lib/legal'

/**
 * Texto de la política de privacidad y de los términos de uso. Es la fuente
 * de verdad de lo que muestra `src/pages/Legal.tsx`; `docs/legal/*.md` es una
 * copia legible generada de acá (no editarla a mano). Refleja lo que la app
 * REALMENTE hace — si una función cambia, se cambia el texto en el mismo
 * commit y se sube `LEGAL_VERSION` (src/lib/legal.ts) para pedir la aceptación
 * de nuevo.
 *
 * Marcado: `**negrita**` en línea. Las secciones con `when` solo se muestran si
 * esa función está activa en el build (mismos flags que las pantallas):
 *  - `ads`: `VITE_ADS_ENABLED=on` — el texto no puede decir "sin publicidad"
 *    si la app muestra anuncios, ni hablar de anuncios si no los hay.
 *  - `purchases`: `VITE_PURCHASES_ENABLED=on` — compras y suscripciones.
 *
 * Son textos operativos redactados desde el producto real, no asesoramiento
 * legal: la edad mínima y la jurisdicción (abajo) los tiene que confirmar el
 * dueño con un profesional antes de publicar.
 */

/** CONFIRMAR con el dueño / un abogado antes de publicar en la tienda. */
export const LEGAL_JURISDICTION = 'la República Argentina'
/** CONFIRMAR: edad mínima para usar la app con cuenta. */
export const LEGAL_MIN_AGE = 16
export const LEGAL_UPDATED = 'septiembre 2026'

export type LegalFlag = 'ads' | 'purchases'

export interface LegalSection {
  title: string
  body: string[]
  when?: LegalFlag
}

export interface LegalDoc {
  title: string
  intro: string[]
  sections: LegalSection[]
}

export function legalFlags(): Record<LegalFlag, boolean> {
  return {
    ads: import.meta.env.VITE_ADS_ENABLED === 'on',
    purchases: import.meta.env.VITE_PURCHASES_ENABLED === 'on',
  }
}

export const PRIVACY: LegalDoc = {
  title: 'Política de privacidad',
  intro: [
    'GymTracker es una app de seguimiento de entrenamientos pensada para funcionar **sin conexión**: tus datos viven primero en tu dispositivo. Esta política explica qué datos se guardan, para qué, con quién se comparten y cómo los controlás.',
  ],
  sections: [
    {
      title: 'Quién es responsable',
      body: [
        `El responsable del tratamiento es el desarrollador de GymTracker. Para cualquier consulta sobre tus datos escribinos a **${SUPPORT_EMAIL}**.`,
      ],
    },
    {
      title: 'Qué datos tratamos',
      body: [
        '**Cuenta:** email, nombre y contraseña (la contraseña se guarda con hash en el servicio de autenticación; nunca la vemos en texto plano).',
        '**Perfil físico (opcional):** fecha de nacimiento, sexo, peso corporal, altura, nivel y objetivo. Lo usamos para calcular niveles de fuerza, pesos sugeridos y calorías.',
        '**Actividad:** rutinas, entrenamientos, series, récords, medidas corporales, logros, tiempos de descanso y registros de calorías. Son datos de salud y estado físico.',
        '**Salidas a correr:** el recorrido GPS (ubicación precisa) se usa solo mientras registrás una salida, con tu permiso, y se guarda **únicamente en tu dispositivo**. La distancia, el tiempo y el ritmo de la salida sí se guardan con tu entrenamiento y se sincronizan.',
        '**Fotos de progreso:** se guardan **solo en tu dispositivo**; no se suben a nuestros servidores.',
        '**Modo coach:** el mensaje de chat, las reseñas que escribís y, si sos coach, tu nombre público, biografía, experiencia, especialidades, ciudad y tu **número de DNI**, que usamos únicamente para verificar identidad y evitar cuentas duplicadas (nunca se muestra a otros usuarios).',
        '**Notificaciones:** si activás recordatorios, se programan en tu dispositivo; no enviamos tu horario a terceros.',
        '**Reportes y bloqueos:** los reportes que hagas o recibas y la lista de personas que bloqueaste.',
      ],
    },
    {
      title: 'Para qué los usamos',
      body: [
        'Para darte las funciones de la app: registrar y mostrar tu progreso, sincronizarlo entre tus dispositivos, calcular sugerencias, vincularte con un coach y mantener un entorno seguro (moderación). **No vendemos tus datos** ni los usamos para perfilarte con fines publicitarios.',
      ],
    },
    {
      title: 'Dónde se guardan y con quién se comparten',
      body: [
        'En tu dispositivo (base de datos local). Si iniciás sesión, se sincronizan a **Supabase** (base de datos, autenticación, almacenamiento y funciones del servidor) para que puedas recuperarlos en otro dispositivo. Cada usuario solo accede a sus propios datos, garantizado por reglas de seguridad a nivel de fila en el servidor.',
        '**Tu coach:** si aceptás el vínculo con un coach, ese coach puede ver tu progreso (entrenamientos, series, récords, medidas, logros, descansos, nivel y tu ficha física) y asignarte rutinas y metas. Tus **calorías** solo las ve si vos lo habilitás; las **fotos de progreso** nunca se comparten. Podés terminar el vínculo cuando quieras y el acceso se corta en el momento.',
        '**Spotify (opcional):** si lo conectás, usamos tu sesión para leer y controlar la reproducción. No guardamos tu música.',
        '**OpenStreetMap:** provee los mapas del modo correr.',
        'No usamos analítica de terceros ni píxeles de seguimiento.',
      ],
    },
    {
      title: 'Compras y suscripciones',
      when: 'purchases',
      body: [
        'Las compras y suscripciones se procesan a través de **Apple** (App Store). Para administrarlas y reconocer tus beneficios usamos **RevenueCat**, que recibe un identificador de tu cuenta y el estado de tus compras. No vemos ni guardamos los datos de tu tarjeta.',
      ],
    },
    {
      title: 'Publicidad y seguimiento',
      when: 'ads',
      body: [
        'La versión gratuita muestra anuncios de **Google AdMob**, solo en pantallas de consulta (nunca durante un entrenamiento). Antes de mostrar anuncios personalizados te pedimos permiso (seguimiento de apps de Apple y, en la Unión Europea, el consentimiento correspondiente). Si lo rechazás, se muestran anuncios no personalizados. Podés quitar los anuncios con la suscripción "Sin anuncios".',
        'Google puede usar identificadores del dispositivo para medir y mostrar anuncios. Podés cambiar tu decisión en Ajustes de tu iPhone → Privacidad y seguridad → Seguimiento.',
      ],
    },
    {
      title: 'Ubicación',
      body: [
        'El GPS solo se usa mientras registrás una salida a correr, con tu permiso. Puede seguir activo con la pantalla apagada para no cortar el recorrido; lo ves en la barra de estado de iOS y con la Live Activity. El recorrido (los puntos del mapa) no sale de tu dispositivo; no lo compartimos con nadie.',
      ],
    },
    {
      title: 'Conservación y borrado',
      body: [
        'Conservamos tus datos mientras tengas la cuenta. Podés **borrar tu cuenta desde la app** (Ajustes → Cuenta → Borrar mi cuenta): se eliminan tu cuenta y tus datos del servidor y los de tu dispositivo. Las copias de seguridad del proveedor se sobrescriben en su ciclo normal. Si tenés una suscripción, se cancela por separado desde los ajustes de tu Apple ID.',
      ],
    },
    {
      title: 'Tus derechos',
      body: [
        'Podés acceder, corregir y **exportar** tus datos desde Ajustes → Datos (con opción de cifrarlos), y pedirnos su eliminación. También podés retirar permisos (ubicación, cámara, notificaciones) desde los ajustes del iPhone en cualquier momento.',
      ],
    },
    {
      title: 'Menores',
      body: [
        `GymTracker no está dirigida a menores de ${LEGAL_MIN_AGE} años y no recopilamos a sabiendas datos de menores de esa edad. Si creés que un menor creó una cuenta, escribinos y la eliminamos.`,
      ],
    },
    {
      title: 'Seguridad',
      body: [
        'Las comunicaciones usan HTTPS y el acceso a los datos se controla en el servidor. Ningún sistema es infalible: si detectamos un incidente que te afecte, te lo vamos a informar.',
      ],
    },
    {
      title: 'Transferencias internacionales',
      body: [
        'Nuestros proveedores pueden procesar datos en otros países. Los elegimos por sus compromisos de protección de datos.',
      ],
    },
    {
      title: 'Cambios',
      body: [
        'Si esta política cambia de forma relevante, te lo avisamos en la app y te pedimos aceptarla de nuevo.',
      ],
    },
  ],
}

export const TERMS: LegalDoc = {
  title: 'Términos de uso',
  intro: [
    'Al crear una cuenta o usar GymTracker aceptás estos términos. Si no estás de acuerdo, no uses la app.',
  ],
  sections: [
    {
      title: 'Uso de la app y edad mínima',
      body: [
        `GymTracker se ofrece para uso personal. Tenés que tener al menos **${LEGAL_MIN_AGE} años** para crear una cuenta. Sos responsable de la información que cargás y de entrenar de forma segura.`,
      ],
    },
    {
      title: 'Tu cuenta',
      body: [
        'Una persona, una cuenta. Cuidá tu contraseña y no la compartas. Podés usar la app **sin cuenta** (con tus datos solo en el dispositivo) y crear la cuenta después sin perder lo que registraste. Podés borrar tu cuenta cuando quieras desde Ajustes.',
      ],
    },
    {
      title: 'No es consejo médico ni profesional',
      body: [
        'Los niveles de fuerza, pesos sugeridos, estimaciones de 1RM, calorías y cualquier recomendación son **orientativos**, calculados con fórmulas y tablas estándar. **No reemplazan** a un profesional de la salud ni a un entrenador. Consultá con un médico antes de empezar un plan de entrenamiento, sobre todo si tenés una condición médica. Detené el ejercicio si sentís dolor o malestar.',
      ],
    },
    {
      title: 'Correr y cardio: seguridad',
      body: [
        'Al registrar una salida o una sesión de cardio, prestá atención al entorno (tránsito, terreno, clima). No uses la app de forma que te distraiga en situaciones peligrosas. La precisión del GPS varía y no garantizamos distancias ni ritmos exactos.',
      ],
    },
    {
      title: 'Modo coach',
      body: [
        'El modo coach conecta a un entrenador con sus alumnos. Los coaches son **usuarios independientes**: GymTracker no los emplea, no garantiza sus servicios ni resultados, y **la verificación** (tilde) solo indica que se contrastó un dato de identidad, no acredita títulos ni capacidad profesional.',
        'Para ser coach tenés que tener al menos 18 años, cargar datos verdaderos y tratar la información de tus alumnos con confidencialidad, usándola solo para entrenarlos. Cada alumno decide si acepta un vínculo y puede terminarlo en cualquier momento; al terminar, el coach pierde el acceso a sus datos.',
        'Los acuerdos económicos entre coach y alumno por fuera de la app son responsabilidad de ambos.',
      ],
    },
    {
      title: 'Contenido y conducta',
      body: [
        'Los mensajes, reseñas, nombres y biografías que publiques tienen que respetar a los demás. **Está prohibido:** acosar, amenazar o insultar; contenido sexual, violento o discriminatorio; suplantar identidades; spam o publicidad; y compartir datos personales de otras personas sin permiso.',
        'Podés **reportar** contenido o usuarios y **bloquearlos** desde el chat, la tarjeta de tu coach y las reseñas. Revisamos los reportes y podemos quitar contenido, suspender o eliminar cuentas que incumplan estas reglas, sin aviso previo si es grave. Aplicamos un filtro básico de lenguaje ofensivo en mensajes y reseñas. Contacto para denuncias: ' +
          SUPPORT_EMAIL +
          '.',
      ],
    },
    {
      title: 'Suscripciones y compras',
      when: 'purchases',
      body: [
        'Ofrecemos suscripciones **mensuales** con renovación automática (por ejemplo, "Sin anuncios" y "Coach"). El precio y el período se muestran antes de confirmar y se cobran a tu cuenta de Apple al confirmar la compra. La suscripción **se renueva sola** salvo que la canceles al menos 24 horas antes de que termine el período; se administra y cancela en Ajustes del iPhone → tu nombre → Suscripciones. Los reembolsos los gestiona Apple. Si cambia el precio, te avisamos antes de la renovación. Podés recuperar tus compras con "Restaurar compras". Borrar la cuenta no cancela la suscripción.',
      ],
    },
    {
      title: 'Anuncios',
      when: 'ads',
      body: [
        'La versión gratuita incluye anuncios de terceros en pantallas de consulta. No controlamos su contenido. Se pueden quitar con la suscripción "Sin anuncios".',
      ],
    },
    {
      title: 'Sincronización y pérdida de datos',
      body: [
        'Tus datos viven en tu dispositivo y, con sesión, se respaldan en la nube. Hacé copias con "Exportar mis datos". No podemos garantizar la recuperación de datos que solo existan en un dispositivo que se pierda o se borre.',
      ],
    },
    {
      title: 'Propiedad intelectual',
      body: [
        'GymTracker, su diseño y su código son de su desarrollador. Vos conservás tus datos y contenidos; nos das permiso para almacenarlos y mostrarlos solo para prestarte el servicio.',
      ],
    },
    {
      title: 'Disponibilidad y limitación de responsabilidad',
      body: [
        'La app se ofrece "tal cual", puede tener interrupciones o cambios y la función principal (registrar entrenamientos) sigue funcionando sin conexión. En la medida que la ley lo permita, no somos responsables por lesiones, daños o pérdidas derivadas del uso de la app, de las recomendaciones que muestra o de lo que indique un coach.',
      ],
    },
    {
      title: 'Suspensión y baja',
      body: [
        'Podemos suspender o cerrar cuentas que incumplan estos términos. Vos podés dejar de usar la app y borrar tu cuenta cuando quieras.',
      ],
    },
    {
      title: 'Cambios, ley aplicable y contacto',
      body: [
        'Si estos términos cambian de forma relevante, te pedimos aceptarlos de nuevo al abrir la app. Se rigen por las leyes de ' +
          LEGAL_JURISDICTION +
          '. Dudas o denuncias: ' +
          SUPPORT_EMAIL +
          '.',
      ],
    },
  ],
}

/** Secciones visibles en este build (filtra las que dependen de un flag apagado). */
export function visibleSections(doc: LegalDoc, flags = legalFlags()): LegalSection[] {
  return doc.sections.filter((s) => !s.when || flags[s.when])
}
