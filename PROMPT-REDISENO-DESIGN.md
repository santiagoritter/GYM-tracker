# Prompt para Claude Design — Rediseño total de GymTracker

> Este documento es un prompt listo para pegar en una conversación de Claude
> Design. Está escrito en primera persona, dirigido a Claude Design
> directamente. Todo lo que sigue, hasta el final del archivo, es el prompt.

---

Quiero que rediseñes por completo la identidad visual de **GymTracker**, una
app de entrenamiento que ya existe y funciona (React + Tailwind, empaquetada
como PWA y como app nativa de iOS con Capacitor). No te pido una pantalla
suelta: te pido el sistema de diseño completo — color, tipografía, forma,
movimiento, y cómo se aplica a las pantallas reales de la app — con libertad
total para reestructurar lo que consideres que lo necesita.

El resultado tiene que ser **original**. No tiene que leerse como "una app
hecha con IA": nada de glassmorphism decorativo porque sí, nada de
gradientes genéricos tipo SaaS, nada de las paletas y tipografías que ya
usa todo el mundo cuando genera una interfaz sin pensarla. Más abajo te doy
una lista concreta de qué evitar y por qué — tomátela en serio, es la parte
más importante de este pedido.

---

## 1. Qué es la app, para quién es

GymTracker es una app de seguimiento de entrenamiento de fuerza, cardio y
running. El usuario la abre **parado en el gimnasio, con una mano, sudado,
entre series, con apuro** — no sentado en un sillón mirando con calma. Cada
decisión de diseño se filtra por esa realidad antes que por cualquier otra
consideración estética:

- Objetivo táctil mínimo 44×44px, sin excepciones.
- Lo que más se toca va donde llega el pulgar: abajo de la pantalla.
- Cero fricción para editar un número (peso, reps, segundos de descanso):
  seleccionar todo al enfocar, teclado numérico correcto, nunca un estado
  intermedio raro al borrar un dígito.
- Nunca perder datos por un toque mal dado — confirmación en lo
  destructivo, deshacer donde se pueda.
- Los números (peso, tiempo, distancia, reps) son el contenido real de la
  app. Tienen que leerse instantáneamente, de reojo, con el brazo estirado
  y el corazón acelerado. La tipografía numérica no es decorativa, es
  información crítica.
- La app también se usa fuera del gimnasio (revisar progreso en el sofá,
  armar una rutina con calma) — el diseño tiene que funcionar en los dos
  modos, pero el modo "urgente" manda cuando compiten.

La app funciona **100% offline** (Dexie/IndexedDB local, sincroniza a
Supabase cuando hay señal) — esto importa para vos porque cualquier
tipografía custom que elijas tiene que poder empaquetarse local (self-host),
nunca depender de una carga de red en el momento, con un fallback de
sistema mientras carga o si falla.

Toda la interfaz está en **español rioplatense** (Argentina) — todos los
mockups, textos y ejemplos que generes tienen que estar en ese idioma y
tono, nunca en inglés. Unidades métricas por default (kg, km), fecha en
formato día/mes. Para que los mockups se sientan reales y no genéricos,
usá contenido de ejemplo concreto del dominio en vez de texto de relleno:
nombres de ejercicios reales ("Press banca", "Sentadilla", "Peso muerto
rumano", "Remo con barra"), pesos y reps creíbles ("82.5 kg × 6", "3
series de 8-12"), nombres de rutina ("Empuje", "Tirón", "Día de piernas").

El dispositivo de referencia real del usuario es un **iPhone 14 Pro**
(393px de ancho lógico, Dynamic Island). Diseñá pensando en ese viewport
primero — todo lo demás es una adaptación de eso, no al revés — y tené en
cuenta el notch/Dynamic Island y el home indicator en cualquier chrome
fijo arriba o abajo de la pantalla.

---

## 2. Stack técnico (para que lo que diseñes sea implementable)

- React 18 + TypeScript + Vite. Tailwind CSS (config con tokens vía CSS
  custom properties — ver §4). Sin styled-components ni CSS-in-JS.
- `motion` (ex Framer Motion) para animación. Recharts para gráficos.
  Lucide para iconos (librería única, no se mezcla con otra).
- Dexie.js como base local, Zustand como estado global.
- Empaquetado nativo iOS con Capacitor 8: la app corre dentro de un
  WKWebView, no es una vista nativa. Esto importa para el "liquid glass"
  (ver §6): `backdrop-filter` real, pero con techo de rendimiento real en
  hardware Android/iPhone de gama media — ya hay un caso documentado de
  traqueteo de scroll por un blur mal puesto encima de contenido que
  scrollea. El efecto tiene que ser deliberado, no una capa de vidrio
  puesta en todos lados porque "se ve Apple".
- Modo claro y modo oscuro, con el oscuro como default. El mecanismo de
  cambio de tema ya existe (`data-theme` en `<html>` + variables CSS) y se
  mantiene — lo que cambia es qué valores lleva cada token, no el
  mecanismo.
- Breakpoint único a 1024px: por debajo, un solo diseño mobile sin ramas.
  Arriba, algunas pantallas (Inicio, Progreso, panel de admin) pasan a
  grid multi-columna; el resto se queda en columna centrada también en
  desktop.

---

## 3. Lo que ya existe (tu punto de partida, no tu jaula)

Hoy la app tiene un sistema de diseño deliberadamente minimalista,
inspirado en Apple / Apple Music: fondo casi negro con acento lima
(`#E8FF47`), tipografía del sistema (SF Pro / system-ui, sin webfont
cargada), radios de 6 a 18px, animaciones cortas (120–320ms) sin bounce
salvo en un solo lugar (el check de serie completada). Ya pasó por una
auditoría anti-"IA genérica" y sacó varios tics: glow de acento, tarjetas
anidadas, negro puro, `Inter`, emojis.

**Tenés libertad total para conservar, evolucionar o tirar esto.** Lo único
que quiero que NO pierdas es la disciplina de fondo: cada decisión tiene
que poder defenderse ("esto lo elegí porque X"), no ser el default de un
generador. El lima como color de marca es negociable — hoy es la identidad
del producto, pero si tu sistema de color propuesto lo reemplaza por algo
mejor y más original, adelante.

El problema más concreto que tenés que resolver es el **modo claro**: hoy
es feo. Literalmente no tiene ninguna identidad propia — es el oscuro con
los valores invertidos a las apuradas y parchado después para cumplir
contraste. Necesita ser una paleta pensada de cero, con su propia
personalidad, no un negativo del oscuro.

---

## 4. El pedido central

### 4.1 Estética: Apple moderno + Liquid Glass + gimnasio

Quiero una fusión de dos mundos que hoy casi nunca se combinan bien:

- **Apple actual**: el lenguaje de "Liquid Glass" que Apple introdujo en
  iOS/iPadOS/macOS recientes — materiales translúcidos con profundidad
  real, que refractan y reaccionan a lo que tienen atrás en vez de ser un
  blur plano, controles que flotan sobre el contenido (no que viven
  incrustados en él), formas que se morphean entre estados en vez de
  cortar duro, luz especular sutil en los bordes de las superficies de
  vidrio. Esto es un lenguaje de **controles e interacciones**, no de
  fondo — Apple lo usa en barras, hojas, botones flotantes; no lo pone
  detrás de cada párrafo de texto.
- **Estética de gimnasio**: energía, tensión, algo físico y tangible.
  Nada de la estética "app de e-sports" (diagonales agresivas, rojo y
  negro a los gritos, gradientes neón) — eso también es un cliché, el
  cliché específico de las apps fitness genéricas. Pensá más en materiales
  reales del ambiente (acero cepillado, goma de piso, tiza, el peso visual
  de una placa de hierro) traducidos con mucha moderación a acentos
  puntuales — textura como condimento, nunca como fondo.

La combinación tiene que sentirse **intencional**, no una capa de vidrio
Apple pegada sobre una paleta de gimnasio sin que dialoguen entre sí. Es tu
trabajo encontrar el punto exacto donde ambos mundos se sienten como la
misma decisión de diseño.

### 4.2 Cero estética de IA — lista concreta de qué evitar

Esto es un requisito duro, no una preferencia. Yo ya audité la app una vez
contra esta lista y saqué lo que encontré — quiero que vos partas
asumiendo que cualquiera de estos tics puede colarse de nuevo si no los
tenés presentes activamente:

- Glow o halo de color alrededor de botones, tarjetas o texto — sobre todo
  un halo del mismo color que el elemento que rodea.
- Glassmorphism puesto en cualquier superficie porque sí, sin que resuelva
  un problema real de capas (contenido pasando por debajo de un chrome
  fijo).
- Gradientes decorativos genéricos — el típico degradé violeta-a-cyan o
  púrpura-a-azul de "SaaS con IA", o cualquier gradiente sin una razón de
  ser (no es una superficie metálica real, no comunica profundidad real).
- Tarjetas dentro de tarjetas. Si un bloque agrupa sub-bloques, se resuelve
  con separadores y espaciado, no con un segundo fondo anidado.
- Redondeo excesivo — todo a 24px+ convierte cada elemento en la misma
  mancha blanda sin jerarquía.
- Bounce/spring/elastic easing puesto en todos lados como "personalidad" —
  se vuelve ruido, no carácter. Si lo usás, que sea en UN lugar con
  sentido (un logro, una confirmación física), no en toda la interfaz.
- Etiquetas diminutas en mayúsculas con tracking abierto ("EYEBROW LABEL")
  arriba de cada título de sección — es el tic más repetido de headers
  generados.
- Tipografías por defecto de generador: **Inter, Poppins, Manrope, Plus
  Jakarta Sans, DM Sans, Space Grotesk** quedan afuera — son exactamente lo
  que usa cualquier app generada sin pensar la tipografía, y por eso ya no
  comunican nada propio. Elegí algo con carácter real, o quedate con la
  fuente del sistema si tu argumento es que la fuente del sistema es la
  decisión correcta — lo que no vale es la fuente "de moda" del momento.
- Sombras de color, o sombra + borde en el mismo elemento a la vez (un
  borde de un pelo con una sombra difusa ancha detrás es firma de UI
  generada — se usa uno de los dos, nunca los dos).
- Emojis. Cero, en ningún lado.
- Iconografía mezclada (una librería para unos iconos, otra para otros, o
  emojis mezclados con iconos vectoriales).
- Fondo negro puro (`#000000`) — un negro con la más mínima intención de
  color (tintado hacia el acento, por ejemplo) siempre lee mejor y es más
  difícil de confundir con el default de cualquier framework.
- Spinners/loaders genéricos tipo librería sin ninguna personalidad propia.

La pregunta de control para cada decisión, tuya y mía: **¿esto lo decidió
una persona mirando esta app en particular, o es lo primero que sale
cuando no se piensa nada?** Ante la duda, se saca o se reemplaza por algo
más específico de GymTracker.

### 4.3 Sistema de color — completo, los dos modos

Necesito una paleta de marca propia (no partas asumiendo que el lima se
queda) con:

- Superficies (fondo, tarjeta, control dentro de tarjeta, estado
  presionado) para modo oscuro Y modo claro — **el modo claro no es un
  invertido del oscuro, es su propio sistema**, pensado con la misma
  intención desde cero.
- Un acento de marca (o una paleta de acento chica) que funcione en los
  dos modos sin perder identidad — hoy el problema puntual es que el lima
  como texto sobre blanco no es legible, y la solución actual (oscurecerlo
  hasta un verde oliva) le saca todo el carácter. Resolvé esto de raíz,
  no parchando.
- Semánticos (éxito, alerta, error, información) coherentes con el resto
  de la paleta, no la paleta default de iOS pegada sin adaptar.
- Colores de dominio para los grupos musculares (pecho, espalda, hombros,
  brazos, piernas, core, glúteos, cardio) — hoy son 8 colores saturados
  con variantes por tema; podés conservar la lógica o proponer un sistema
  mejor (¿un solo hue con variación de valor/saturación en vez de 8 hues
  distintos, por ejemplo?).
- **Todo tiene que cumplir WCAG AA real** (4.5:1 en texto de cuerpo, 3:1 en
  texto grande) — esto no es negociable, ya se rompió una vez en este
  proyecto y costó una tanda entera arreglarlo. Si elegís un acento
  vibrante, resolvé el problema de contraste en el sistema (texto siempre
  blanco/negro sobre superficies de acento lleno, nunca el acento como
  texto sobre un fondo donde no cumple) en vez de decidirlo pantalla por
  pantalla.

### 4.4 Tipografía propia

Sistema tipográfico completo: familia (o par de familias — una para
títulos/números protagonistas, otra para cuerpo, si eso sirve mejor a la
identidad), escala de tamaños, pesos, tracking, y **tratamiento específico
para números** (`font-variant-numeric: tabular-nums` como mínimo — el peso
y el cronómetro no pueden "bailar" mientras cambian). Los números
merecen la mayor atención de todo el sistema tipográfico: son lo que el
usuario mira más veces por sesión.

Restricción técnica: tiene que poder self-hostearse (archivos de fuente
empaquetados en el proyecto, no cargados de un CDN en runtime) para no
romper el offline-first, con un fallback de sistema mientras carga.
Priorizá licencias que permitan eso sin fricción legal.

### 4.5 Forma, espacio y componentes

Proponé tu propia escala de radios y espaciado — no asumas que tenés que
mantener el tope actual de 18px, pero si lo cambiás, que sea una decisión
razonada, no "todo a 24 porque se ve más suave". Definí cómo se ven los
componentes base: botón, tarjeta, fila de lista, input, hoja modal
(sheet), barra de navegación, chip/badge.

**Cards flotantes**: si el sistema de Liquid Glass te lleva a que ciertos
elementos floten sobre el contenido en vez de vivir incrustados en el flujo
(un resumen del entreno activo, un control de reproducción, la barra de
navegación misma) — proponelo. Es exactamente el tipo de patrón que
Liquid Glass habilita bien cuando tiene un propósito real.

### 4.6 Movimiento

Proponé tu propio catálogo de animaciones — duraciones, curvas, cuándo
overshoot está permitido y cuándo no. Reglas duras que sí se mantienen:
solo se anima `transform`/`opacity` (nada de `width`/`height`/`padding`,
por rendimiento), todo respeta `prefers-reduced-motion`, nada pulsa o se
mueve si el dato no cambió de verdad. Quiero que las transiciones entre
pantallas y estados se sientan **livianas pero con carácter** — no el
fundido genérico de 200ms que usa cualquier framework por default, pero
tampoco algo tan elaborado que se sienta lento en un contexto de "apurado
entre series".

### 4.7 Navegación e información

Investigá y proponé qué estructura de navegación sirve mejor a esta app
específica — no asumas que la barra de 5 pestañas de abajo (Hoy / Rutinas
/ Ejercicios / Progreso / Yo) es intocable. Cosas a considerar:

- La app creció bastante desde que se diseñó esa barra: ahora hay running
  y cardio como flujos de pantalla completa aparte, una sección de coach
  (para quien entrena a otros o tiene un coach asignado), notificaciones,
  y una pantalla de Progreso con 9 sub-secciones (hoy resueltas como chips
  de scroll horizontal). ¿Sigue siendo la estructura correcta, o hay una
  mejor?
- Qué información tiene que estar SIEMPRE visible (sin necesidad de
  navegar) durante un entreno activo — hoy es: nombre+avatar del usuario,
  un indicador de que hay un entreno en curso con el tiempo transcurrido,
  el descanso restante si hay uno corriendo, y opcionalmente las calorías
  del día. Investigá si esa es la lista correcta o si falta/sobra algo.
- Qué tan agresivamente ocultar/mostrar chrome (barra de navegación,
  header) en pantallas de foco total (entreno activo, salida a correr) —
  hoy esas pantallas tienen su propio header reducido en vez del global.

Tenés libertad completa para reestructurar la jerarquía de navegación si
tu investigación te lleva a que hay una mejor.

### 4.8 Más allá de la pantalla: ícono y Live Activities

La identidad nueva no vive solo dentro de la app:

- **Ícono de la app** (iOS home screen): si vas a proponer una paleta y
  tipografía nuevas, proponé también un ícono acorde — hoy no tiene una
  identidad de marca fuerte, es una buena oportunidad.
- **Live Activities / Dynamic Island**: la app ya tiene widgets nativos de
  iOS para el descanso, el entreno en curso y las salidas a correr, que
  aparecen en la pantalla de bloqueo y en la Dynamic Island — hoy usan el
  mismo acento lima. Si cambiás el color de marca, tené presente que ese
  mismo acento tiene que seguir leyéndose bien como texto/ícono chico
  sobre el fondo oscuro semitransparente de un widget nativo, encima de
  cualquier fondo de pantalla del usuario — es el contexto más exigente de
  contraste de toda la app.

### 4.9 Personalización y secciones nuevas

Si identificás que el rediseño abre la puerta a más personalización del
usuario (temas, densidad de información, orden de los accesos rápidos,
qué tarjetas ver primero en Inicio, etc.) o a alguna sección nueva que la
estructura actual no contempla bien, proponela. No tiene que quedarse en
"solo repintar lo que ya existe" si ves una oportunidad real.

---

## 5. Inventario de pantallas y flujos (para que el sistema cubra todo)

No hace falta que diseñes cada pantalla en detalle — priorizá las de más
uso (§6) — pero el sistema de diseño (tokens + componentes) tiene que
poder cubrir todo esto sin inventar nada ad-hoc pantalla por pantalla:

**Autenticación / onboarding**: login, registro (con verificación por
código), recuperar contraseña, términos y privacidad, onboarding
(objetivo, nivel, datos corporales).

**Núcleo de entreno**: Inicio (CTA de iniciar entreno, entreno en curso,
racha semanal, calendario de actividad, accesos rápidos a cardio/correr/
fotos), pantalla de entreno activo (tarjetas de ejercicio expandibles,
steppers de peso/reps, indicador de superserie, vista previa antes de
terminar, resultados con PRs y logros), el selector/detalle de ejercicio,
el temporizador de descanso (barra inferior mientras cuenta + la card de
"descanso terminado" con sobretiempo — ver más abajo), el editor de
rutinas (días, ejercicios, series/reps/descanso por ejercicio,
superseries).

**Cardio y running**: setup de cardio (elegir aparato, velocidad,
inclinación), pantalla activa de cardio con control de Spotify, salida a
correr (permisos, setup de objetivo, pantalla activa con mapa en vivo y
parciales, resumen final).

**Progreso**: resumen, gráficos (peso por entreno, volumen semanal),
descanso (nuevo — gráfico planeado vs. real, sugerencia de tiempo,
historial editable), vista mensual, niveles de fuerza (generales y por
grupo muscular), logros, galería de fotos de progreso, récords personales,
historial de entrenos.

**Cuenta y ajustes**: perfil, ajustes (tema, unidades, descanso por
defecto, meta semanal, nivel, objetivo, calorías, recordatorios, coach,
datos/backup, cuenta), calculadora de pesos, calorías, registrar entreno
pasado, recordatorios, FAQ/ayuda.

**Notificaciones**: campana con feed filtrable por tipo (récords, pesos
recomendados, descansos recomendados, novedades).

**Coach** (opcional, para quien lo activa): panel de coach con lista de
alumnos, detalle de alumno, chat, invitar alumnos, perfil de coach, plan;
del lado alumno, unirse a un coach y chatear con el propio.

**Admin** (interno, no es cara al usuario final pero existe): panel de
usuarios.

---

## 6. Qué priorizar si no llegás a todo

Si tenés que elegir qué pantallas mockear primero, en este orden:

1. **Inicio** — la primera impresión, y donde más se decide si la
   identidad nueva "prende".
2. **Entreno activo** (con una tarjeta de ejercicio expandida, steppers,
   y la barra de descanso) — es la pantalla que más tiempo acumulado tiene
   por usuario, con diferencia.
3. **La card de "descanso terminado"** (sobretiempo) — un patrón nuevo,
   buena oportunidad para mostrar el lenguaje de Liquid Glass en un
   elemento que literalmente flota sobre el entreno.
4. **Barra de navegación / chrome global** — define el tono de toda la
   app.
5. **Progreso** (al menos el resumen y un gráfico) — es donde más
   necesita brillar la fusión con "gimnasio" (números grandes, sensación
   de logro).
6. **Ajustes** — el patrón de lista de iOS que ya usa, para validar cómo
   se ve el sistema en su forma más "utilitaria".

---

## 7. Qué NO tocar

Este es un rediseño **visual y estructural de navegación/IA**, no una
reescritura del producto. No toques ni asumas cambios en: el modelo de
datos, la lógica de negocio (recomendación de pesos, sincronización,
Live Activities de iOS), ni ningún copy funcional salvo que lo pidas
explícitamente como parte de una propuesta de restructuración de
navegación.

---

## 8. Qué esperar como entrega

- Un sistema de color completo, documentado, con los dos modos y los
  ratios de contraste reales verificados.
- Un sistema tipográfico completo con la fuente (o fuentes) elegidas,
  self-hosteables, con su escala y su tratamiento especial de números.
- Escala de forma (radios), espaciado y una guía de cuándo usar vidrio/
  materiales translúcidos y cuándo no.
- Catálogo de movimiento con las curvas y duraciones propuestas.
- Mockups de las pantallas priorizadas en §6, en los dos modos (claro y
  oscuro) si el tiempo alcanza, o al menos oscuro con la paleta clara
  documentada aparte.
- Una propuesta de ícono de app.
- Una explicación breve de las decisiones más importantes — igual que
  hizo el sistema anterior, quiero poder defender cada elección con un
  "por qué", no solo mostrar el resultado.
