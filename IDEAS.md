# IDEAS.md

Ideas que surgieron trabajando pero **están fuera del alcance** de
`Redisenio.md`. Nada de acá se implementa sin confirmación explícita.

Orden: impacto real sobre el uso diario, no dificultad.

---

## Alto impacto

### Multi-columna en Inicio y Progreso (desktop)
`DESIGN.md` decía que estas dos pantallas pasaban a grid multi-columna
desde 1024px — una auditoría de 2026-09 confirmó que no es así, siguen
como la columna centrada mobile estirada. La corrección del texto ya se
hizo (no mentir en la doc); implementarlo de verdad queda pendiente.

### Coach en PC: lo que quedó afuera de la primera pasada del tablero
Con el tablero en tabla (`CoachRosterTable`) + master-detail rehecho +
no leídos en vivo ya andando, quedó afuera de esta tanda (por tiempo, no
por dificultad):
- **Bandeja de mensajes unificada** (`/coach?vista=mensajes`): una vista
  de todos los hilos ordenados por el último mensaje. Hoy se entra al
  chat de a un alumno por vez desde su panel.
- **Caché en memoria por alumno** al cambiar de selección en el
  master-detail: hoy cada click a un alumno repite el fetch completo de
  `fetchClientProgress`, aunque se vuelva al mismo alumno en la misma
  sesión.
- **Acciones rápidas en la cabecera del alumno** (Mensaje / Nueva rutina
  / Nota) y mover "Finalizar vínculo" a un menú "…" en vez de un botón
  rojo a todo el ancho al pie del panel.
- **Textos legales todavía dicen "Apple"/"iPhone" fijo** (`legalText.ts`,
  5 lugares: compras, anuncios/ATT, borrado de cuenta, exportar datos,
  sección de suscripciones). Los textos de UI equivalentes ya se
  arreglaron (`subscriptionManagementHint()` en `purchases.ts`) — el
  legal es más delicado (es el documento público, generado con su propio
  test de sincronía) y merece una pasada aparte, no un cambio apurado
  dentro de este bloque.
- **Constructor de rutinas de escritorio** (biblioteca fija + rutina al
  lado, arrastrar para ordenar), **metas y notas privadas del coach por
  alumno** (tabla nueva), **adherencia** (heatmap reusado + 1RM por
  ejercicio en el tiempo) y **exportar CSV** del alumno.

### Interacciones con spring physics (gestos reales, no CSS transitions)
`~/.agents/skills/apple-design/SKILL.md` (secciones 1-11) describe cómo
Apple construye drag/swipe/sheets con física de resortes interrumpible en
vez de `@keyframes` de duración fija: seguimiento 1:1 del dedo, velocidad
que se retoma al soltar, rebote solo cuando el gesto trae momentum,
rubber-banding en los bordes.

**Parcialmente hecho (Fases 28-29):** `motion` (sucesor de Framer Motion)
ya se sumó como dependencia, pero acotado a dos pedidos puntuales del
usuario, no a esta idea completa: entrada con spring + stagger en los 4
sheets tipo bottom-sheet (`sheetPanelVariants` en
`src/lib/motionVariants.ts`) y la barra de progreso de `HoldButton.tsx`.
Sigue sin existir: drag interrumpible con seguimiento 1:1 del dedo,
velocity handoff al soltar, y rubber-banding en los bordes — el drag
handle de `ExerciseDetailSheet` sigue sin ser arrastrable. Eso es lo que
falta de esta idea si se retoma.

### Deshacer al borrar
Ahora borrar una serie, una medida o una foto es inmediato y definitivo (con
un `confirm()` en algunos casos, que en móvil es un diálogo feo del sistema).
Un toast con "Deshacer" durante 5 segundos es el patrón correcto: no
interrumpe y protege igual. La infraestructura ya está: `softDelete` deja
lápida, así que restaurar es leerla de vuelta.

### Borrar un entreno ya finalizado
Hoy no existe en ningún lado de la app una forma de borrar un `Workout`
finalizado — ni desde el historial (`HistoryList.tsx`/`RecentWorkouts.tsx`)
ni desde "Cargar entreno pasado" (Fase 3): si alguien se equivoca al cargar
uno retroactivo (fecha, ejercicio o peso mal tipeado), queda ahí para
siempre. `softDelete('workouts', id)` + `softDeleteMany('workoutSets', ...)`
ya existen y son exactamente lo que hace falta (mismo patrón que
`discardWorkout` para un entreno en curso) — falta el botón. Se dejó fuera
de la Fase 3 a propósito (no era lo pedido), pero es la pieza que falta
para que cargar mal algo no sea un error permanente.

### Historial por ejercicio
Al abrir un ejercicio, ver directamente las últimas sesiones: peso, reps y
la curva de 1RM estimado. Hoy el dato existe (`workoutSets` con el índice
`exerciseId`) pero no se muestra en ningún lado, y es lo primero que uno
quiere saber parado frente a la máquina.

### Series de calentamiento automáticas
Con el peso de trabajo ya calculado por el recomendador, proponer la
progresión de calentamiento (40% × 8, 60% × 5, 80% × 3). Es aritmética sobre
datos que ya tenemos y ahorra pensar antes de cada ejercicio pesado.

### Reordenar ejercicios arrastrando
El editor de rutinas usa flechas arriba/abajo. En una lista de 8 ejercicios
mover el último al principio son 7 taps. Arrastrar es el gesto natural.

---

## Medio impacto

### Notas por ejercicio persistentes
"En esta máquina uso el pin 7", "el banco se traba". Distinto de las notas
de rutina: viaja con el ejercicio, no con el día. Se suma a la foto de
referencia que ya existe.

### Detección de estancamiento
Si un ejercicio lleva 3 sesiones sin subir de peso ni de reps, avisarlo y
sugerir un deload del 10%. Es la decisión que más cuesta tomar solo y los
datos para detectarla ya están.

### Volumen semanal por grupo muscular
Series efectivas por grupo en los últimos 7 días, contra el rango de 10–20
que sostiene la literatura. Detecta el desbalance clásico de mucho empuje y
poco tirón. Todo sale de `workoutSets` + `musclePrimary`.

### Widget de bloqueo / Live Activity (iOS)
Con Capacitor ya en el proyecto, mostrar el cronómetro de descanso en la
pantalla de bloqueo o en la Dynamic Island. Es exactamente el momento en que
el usuario no quiere desbloquear el teléfono.

**Hecho (septiembre 2026):** Live Activities para el **descanso entre series**,
el **entreno en curso** y **running/cardio** — plugin propio
`LiveActivityPlugin.swift` + Widget Extension `ios/App/GymTrackerWidget/`,
cableado en `RestTimer.tsx`, `Workout.tsx`, `Run.tsx` y `Cardio.tsx` vía
`src/lib/liveActivity.ts`. Ver `docs/16` §"Live Activities" y
`docs/BITACORA.md` (2026-09-16) para los criterios ya probados.

### Exportar a CSV
Sacar el historial completo. Cuesta poco y elimina la sensación de que los
datos quedan encerrados en la app.

### Modo "solo lectura" para el entreno
Al entrar a un ejercicio durante la sesión, ver la técnica sin poder
modificar nada sin querer con la mano sudada.

---

## Bajo impacto / a futuro

### Superseries y circuitos en la UI
El modelo ya soporta `supersetGroup` y el descanso lo respeta, pero armarlas
es poco descubrible: hay que saber que el botón de cadena existe.

### Plantillas propias
Guardar una rutina propia como plantilla reutilizable, además de las 6
clásicas que ya vienen.

### Comparar fotos de progreso lado a lado con fecha
`PhotoGallery` ya tiene modo comparación; falta poder elegir cuáles y ver el
tiempo transcurrido entre ambas.

### Integración con Apple Health / Google Fit
Escribir los entrenos para que cuenten en el anillo de actividad. Requiere
plugins nativos y permisos; con Capacitor ya es posible.

### Tiempo bajo tensión
Registrar el tempo (ej. 3-1-1-0) por ejercicio. Interesa a poca gente pero
a esa le interesa mucho.

### Animar el trazado del recorrido de running (B6)
En el resumen de una salida a correr (`RunMap.tsx`, Leaflet + polilínea OSM),
"dibujar" el recorrido progresivamente en vez de mostrarlo entero de golpe —
y opcionalmente un puntito que lo recorre de punta a punta.

Referencia que pasó el usuario:
<https://animejs.com/documentation/svg/createmotionpath> (anime.js
`createMotionPath` mueve un elemento a lo largo de un `<path>` SVG).

**Tensión con el stack actual**: `DESIGN.md` y el plan de la tanda de
expansión dicen explícitamente *no sumar anime.js* (`motion` es la librería
sancionada). Dos caminos si se retoma:
- **Sin anime.js**: la polilínea del recorrido se puede dibujar sola con
  `stroke-dasharray` + `stroke-dashoffset` animando de `longitud → 0` (una
  transición CSS o `motion`), sobre un `<path>` en un overlay SVG de Leaflet
  (`L.svgOverlay` o un `<svg>` propio posicionado con `map.latLngToLayerPoint`).
  El "puntito que recorre" es un `<circle>` con `offset-path`/`offsetDistance`
  animado, sin dependencia.
- **Con anime.js**: sumar la dep solo para este efecto y `createMotionPath`.
  Habría que actualizar `DESIGN.md §0`/§4 y el plan, no meterla de prepo.

Solo `transform`/`opacity` (o `stroke-dashoffset`, ya usado en `ProgressRing`)
para no romper `DESIGN.md §4`.

---

## Deuda técnica anotada

- ~~`@tanstack/react-query` instalado y sin uso~~ — desinstalado (junto con
  `@emailjs/browser`).
- **`docs/01` a `docs/12` mezclan lo real con lo aspiracional.** Ya se
  corrigieron algunos; el resto sigue describiendo una arquitectura Supabase
  que nunca existió.
- **`Admin.tsx` escribe roles en el IndexedDB del propio usuario.** Funciona
  como demo local, pero no puede sobrevivir a la migración a Supabase Auth.
- **`RoutineExercise.notes` y `restSeconds` son write-only.** Los escribe el
  código (incluido el import por QR, que guarda ahí el peso de referencia)
  pero ningún editor los muestra. Ese dato hoy es invisible.

### Del cierre pre-App Store (fuera de alcance de esa tanda)
- **Notas privadas del coach por alumno** (tabla `coach_notes`, RLS solo el coach).
- **Superseries en el constructor de rutinas del coach** (la RPC ya acepta `supersetGroup`).
- **Compartir fotos de progreso con el coach, con permiso**: hoy los bytes ni salen
  del dispositivo (la cola de Storage no está hecha).
- **Sincronizar `runs`** (recorridos GPS): hoy son solo locales; si se sincronizan, hay
  que actualizar la política, el manifiesto de privacidad y "App Privacy".
- **Migración a `LazyMotion`**: el ahorro real es chico porque el drag exige `domMax`.
- **Animar `height` en `RoutineStack`/`RoutineStackCard`** con solo `transform` (hoy
  React Doctor lo marca): requiere rediseñar el apilado.
- **`LogPastWorkout` con ids estables por serie** (hoy keys por índice; solo se
  agregan/quitan al final, así que no rompe).
- **Subir el deployment target de la app a 16.2** para igualar al widget.
