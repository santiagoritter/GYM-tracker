# Bitácora de Desarrollo

Registro cronológico de decisiones, correcciones y avances. Se actualiza en cada sesión de trabajo.

---

## 2026-07-18 — Sesión 1: Documentación + arranque de implementación

### Autocorrección de la documentación (errores encontrados en mis propios docs)

Antes de escribir código se revisó la documentación generada y se encontraron estos errores:

**E1. Supabase como requisito de la Fase 1 era un error de diseño.**
El objetivo era "lanzable de la manera más sencilla", pero la Fase 1 exigía crear un proyecto Supabase, correr migraciones y configurar OAuth antes de poder usar la app. Corrección: la app arranca en **modo local** (sin login, todo en IndexedDB). Supabase pasa a ser una capa opcional que se activa recién en Fase 2/4 para sync multi-dispositivo. Beneficio: `npm run dev` y la app ya funciona completa; el deploy a Vercel no necesita backend.

**E2. Índice booleano en Dexie no funciona.**
`docs/06-OFFLINE-SYNC.md` indexaba `synced: boolean` y consultaba `where('synced').equals(0)`. IndexedDB **no indexa booleans**. Corrección: `synced` se almacena como `0 | 1` numérico.

**E3. shadcn/ui agregaba fricción innecesaria al MVP.**
Instalar y customizar shadcn/ui (CLI, theming, deps de Radix) es trabajo que no aporta en Fase 1. Corrección: componentes propios livianos (`Button`, `Card`, `Sheet`, `Chip`) con los tokens del sistema de diseño. shadcn/ui queda como opción para cuando haya formularios complejos.

**E4. Canvas del scanner QR con tamaño hardcodeado.**
`docs/07-COMPARTIR-QR.md` dibujaba el frame de video en un canvas fijo de 300×300, lo que rompe la detección con cámaras de otra resolución. Corrección: usar `video.videoWidth/videoHeight` reales.

**E5. `profiles.dob NOT NULL` rompía el trigger de registro.**
El trigger `handle_new_user()` inserta el perfil sin `dob` → violación de NOT NULL → el registro fallaría. Corrección: `dob` es nullable; se completa en la pantalla de onboarding. Los niveles de fuerza muestran "Completá tu perfil" si falta.

**E6. RLS de `routine_days`/`routine_exercises` estaba especificado como "mismo patrón".**
Esas tablas no tienen `user_id`, así que el patrón `user_id = auth.uid()` no aplica. La política real necesita un subquery vía la rutina padre (igual que `workout_sets`). Queda explicitado para cuando se implemente Supabase.

**E7. Versión de Tailwind.**
`npm install tailwindcss` hoy instala v4 (config por CSS, sin `tailwind.config.ts`). Los docs asumen v3. Corrección: pinnear `tailwindcss@^3.4` para que la config documentada sea válida.

### Decisiones de implementación de esta sesión

- **Alcance**: Fase 1 completa en modo local — navegación, sesión activa de entreno con sets y timer de descanso, biblioteca de ejercicios con filtros, historial, rutinas básicas.
- **Sin auth todavía**: un "perfil local" en Dexie guarda unidades, peso corporal y timer por defecto.
- **Estructura**: el código vive en la raíz de `gym-tracker/` junto a `docs/`.
- **Versiones pinneadas**: React 18, Vite 5, Tailwind 3.4, Dexie 4, Zustand 4, React Router 6.

### Avance

- [x] Documentación completa (15 archivos .md)
- [x] Autocorrección E1–E7 aplicada
- [x] Scaffold del proyecto (Vite 5 + React 18 + TS strict + Tailwind 3.4 + PWA)
- [x] Capa de datos: tipos, Dexie schema, store Zustand, 66 ejercicios precargados
- [x] UI Fase 1: navegación con tab bar, Hoy, sesión activa (sets + steppers + timer de descanso + PRs), biblioteca con filtros, historial expandible, perfil local
- [x] `npm run build` pasa limpio (TS strict, 0 errores) y `npm run preview` responde 200

### Correcciones adicionales hechas durante la implementación

**E8. IDs de ejercicios como slugs estables, no UUIDs.**
Los docs proponían UUIDs para el catálogo. Corregido: los ejercicios del sistema usan slugs (`bench-press`, `squat`). Razón: cuando se comparta una rutina por QR, el ID debe referenciar el mismo ejercicio en cualquier instalación — un UUID generado localmente no es portable.

**E9. Fuente monoespaciada.**
Geist Mono no está en Google Fonts de forma confiable; se carga JetBrains Mono (visualmente equivalente) y Geist Mono queda primero en el stack de fallbacks por si se agrega self-hosted.

**E10. Detección de PR simplificada para modo local.**
En vez de la tabla `personal_records` con UNIQUE(user_id, exercise_id), en Dexie el PR usa `id = exerciseId` (un PR por ejercicio). Menos índices, misma semántica.

### Deuda pendiente (para la próxima sesión)

- [x] Íconos PWA reales → hechos en sesión 2
- [x] Ampliar catálogo → 103 ejercicios en sesión 2
- [x] Toggle de calentamiento → hecho en sesión 2
- [ ] Registro de RPE por serie (campo existe, falta UI).
- [ ] `git init` + primer commit (esperando confirmación del usuario).
- [x] Fase 2: rutinas + dashboard → hechos en sesión 2

---

## 2026-07-18 — Sesión 2: Deuda de Fase 1 + Fase 2 completa

### Deuda saldada

- **Íconos PWA**: script `scripts/generate-icons.mjs` que dibuja la mancuerna lima sobre fondo oscuro y codifica el PNG a mano (sin dependencias). Genera `icon-192.png` y `icon-512.png`. Verificado visualmente y servido con HTTP 200.
- **Toggle de calentamiento**: tap en el número de serie alterna trabajo ↔ calentamiento (se muestra "C" en amarillo). Los sets de calentamiento ya se excluían de volumen y PRs.
- **Quitar serie**: botón "−" junto a "+ Agregar serie" elimina la última serie del ejercicio (reemplaza el confirm() por tap en el número, que ahora se usa para calentamiento).
- **Catálogo**: de 66 a **103 ejercicios** (cardio, multipower, variantes de remo/press/curl, core, unilaterales).

### Correcciones nuevas (autodetectadas)

**E11. El seed nunca actualizaba instalaciones existentes.**
`seedIfEmpty` solo insertaba con la DB vacía: quien ya usó la app jamás recibiría ejercicios nuevos del catálogo. Corregido a `bulkPut` idempotente — los slugs estables hacen que actualice sin duplicar y sin tocar ejercicios custom.

**E12. Recharts inflaba el bundle inicial a 744KB.**
Todo el código se cargaba junto. Corregido con `React.lazy` para la página Progreso: bundle principal 353KB + chunk de gráficos 390KB que solo se descarga al entrar a Progreso.

**E13. Drag-and-drop pospuesto a propósito.**
Los docs pedían DnD Kit para reordenar ejercicios. Para el editor de rutinas alcanza con botones ↑/↓ (más confiables en móvil y sin dependencia nueva). DnD Kit queda para el pulido de Fase 5 si hace falta.

### Fase 2 implementada

**Rutinas** (`src/db/routines.ts`, `src/pages/Routines.tsx`, `src/pages/RoutineEditor.tsx`):
- Dexie v2 con `routines`, `routineDays`, `routineExercises` (migración automática desde v1)
- Crear/renombrar/eliminar rutinas, color identificador, rutina activa (estrella, solo una a la vez)
- Editor: días con nombre editable, días de descanso (luna), ejercicios estilo playlist con reordenar ↑/↓, series objetivo y rango de reps por ejercicio
- **Entrenar desde un día**: crea el workout precargado con las series objetivo y **autocompleta el peso con el último usado** en cada ejercicio (adelanto de Fase 5)
- Home muestra los días de la rutina activa con botón Entrenar directo

**Dashboard de progreso** (`src/pages/Progress.tsx`):
- Reemplaza el tab Historial por **Progreso** con 3 sub-tabs: Gráficos | PRs | Historial
- Gráfico de línea: mejor peso por entreno del ejercicio seleccionado (solo ejercicios entrenados)
- Gráfico de barras: volumen semanal de las últimas 8 semanas
- Lista de PRs ordenada por 1RM estimado
- El historial anterior se movió a `src/components/gym/HistoryList.tsx` sin cambios

### Verificación

- `npm run build`: TypeScript strict sin errores, PWA generada
- Preview server: `/` y `/icons/icon-192.png` responden 200
- Code-splitting confirmado en el output del build

### Pendiente para la próxima sesión (según hoja de ruta)

- [x] Fase 3 → hecha en sesión 3
- [ ] Fase 4: compartir rutinas por QR + sync Supabase opcional
- [ ] RPE por serie (UI)
- [ ] Supersets en el editor de rutinas (campo pensado, falta implementar)
- [ ] `git init` + primer commit

---

## 2026-07-18 — Sesión 3: Fase 3 completa + skills

### Skills de agente

Se intentó instalar skills del registry skills.sh (`npx skills`). El clasificador de
permisos de Claude Code bloquea la instalación de repos externos elegidos por el
agente; el usuario debe correr el comando él mismo (quedó indicado en el chat):
`npx -y skills add vercel-labs/skills@find-skills vercel-labs/agent-skills@web-design-guidelines jwynia/agent-skills@frontend-design erichowens/some_claude_skills@pwa-expert vercel-labs/agent-skills@deploy-to-vercel -a claude-code -y`

### Corrección nueva

**E14. Fotos en modo local van a IndexedDB, no a Supabase Storage.**
Los docs asumían upload a Supabase Storage desde el día uno. En modo local la foto
comprimida se guarda como `Blob` en Dexie (IndexedDB soporta Blobs nativamente).
La compresión (800px / JPEG 80%) se hace igual en el cliente, así el blob ya queda
listo para subirse a Storage cuando se active el sync en Fase 4.

### Fase 3 implementada

**Galería de fotos** (`src/components/gym/PhotoGallery.tsx`, `src/lib/photos.ts`):
- Captura desde cámara o galería (`<input capture="environment">`)
- Compresión client-side con `createImageBitmap` + canvas: máx 800px, JPEG 80%
- Guarda peso corporal del perfil junto a la foto
- Grid 3 columnas con fecha, visor fullscreen, eliminar
- Dexie v3 (tabla `progressPhotos`, migración automática)

**Estadísticas mensuales** (`src/components/gym/MonthlyStats.tsx`):
- Navegación mes a mes (← →)
- Cards: sesiones, volumen total, ejercicios distintos, PRs del mes
- Comparativa % vs mes anterior (verde/rojo)
- Donut de distribución muscular por volumen (ejercicios multi-músculo reparten
  su volumen entre los músculos primarios)

**Niveles de fuerza** (`src/lib/strengthStandards.ts`, `src/components/gym/StrengthLevels.tsx`):
- Tablas de estándares de docs/08 para squat, banca, peso muerto, militar y remo
- Ratio 1RM/peso corporal, tablas por sexo, multiplicador por edad
- Barra de progreso novato → campeón y "faltan X kg para el siguiente nivel"
- Si falta perfil (sexo/peso/nacimiento), CTA a completarlo
- Campo **sexo** agregado a Perfil

**Integración**: Progreso ahora tiene 6 tabs deslizables: Gráficos | Mes | Niveles |
Fotos | PRs | Historial. Todo dentro del chunk lazy (el bundle principal sigue en 353KB).

### Verificación

- `npm run build`: TS strict sin errores
- Chunk Progress: 431KB (crece solo el lazy, no el bundle inicial)

### Pendiente (hoja de ruta)

- [x] Fase 4 (QR) y Fase 5 (parcial) → hechas en sesión 4
- [ ] `git init` + primer commit

---

## 2026-07-18 — Sesión 4: Fase 4 (QR) + Fase 5 (RPE, progresión, comparador)

### Fase 4: Compartir rutinas por QR

Implementación completa según `docs/07-COMPARTIR-QR.md` (`src/lib/qr.ts`):
- Pipeline: rutina → payload mínimo → JSON → lz-string → `GYMTR:<datos>` → QR
- **Sin servidor**: toda la rutina viaja dentro del QR
- Modal de compartir con toggle "incluir pesos" (usa el último peso de trabajo de
  cada ejercicio), aviso si supera ~2KB, descarga PNG y copia como texto
- Scanner con cámara trasera (jsQR a 300ms), marco de encuadre, vibración al detectar
- Fallback "Pegar código" si no hay cámara (el texto copiado también funciona)
- Preview de importación: días, ejercicios, sets×reps, pesos; renombrable antes de
  importar; ejercicios desconocidos se omiten con aviso
- Los pesos compartidos se importan como nota "Peso de referencia: X kg"
- **Test verificado**: roundtrip encode/decode OK; rutina PPL de 3 días = 271 bytes
  codificados (13% del límite práctico del QR)

### Fase 5 (parcial)

- **RPE por serie**: al completar una serie de trabajo aparecen chips 6–10; un tap
  registra, otro tap lo quita. No estorba durante la serie.
- **Progresión automática**: al iniciar desde rutina, si el último entreno completó
  todas las series objetivo llegando al máximo de reps, sugiere **+2.5kg**; si no,
  repite el último peso.
- **Comparador de fotos**: modo comparar (2 fotos lado a lado ordenadas por fecha)
  con diferencia de peso corporal.
- **Timeline de peso corporal**: gráfico de línea en la galería con el peso
  registrado en cada foto.

### Corrección nueva

**E15. Las libs de QR inflaban el bundle inicial (356→526KB).**
`qrcode` + `jsqr` entraban al chunk principal vía Routines. Corregido con `React.lazy`
por componente: QRShareModal (3KB), lib qr (31KB) y QRScanner (135KB) se descargan
solo al compartir/escanear. Bundle principal de vuelta en 356KB.

### Fuera de alcance (documentado, no implementado)

- **Sync con Supabase**: requiere que el usuario cree el proyecto en supabase.com
  (gratis). Toda la capa local ya está preparada (flags `synced`, pesos en kg,
  fotos comprimidas). Guía en `docs/09-DESPLIEGUE.md`.
- **Supersets**: el campo `superset_group` existe en el diseño de datos pero la UI
  de agrupado + flujo alternado en sesión activa queda para más adelante.

### Verificación

- `npm run build`: TS strict sin errores
- Chunks: main 356KB / Progress 434KB / QRScanner 135KB / qr 31KB (todo lazy)
- Test de roundtrip QR con Node: OK

### Estado de la hoja de ruta

| Fase | Estado |
|------|--------|
| 1 — MVP core workout | ✅ completa |
| 2 — Rutinas y progreso | ✅ completa |
| 3 — Fotos y estadísticas | ✅ completa |
| 4 — QR | ✅ completa (sync Supabase opcional pendiente de credenciales) |
| 5 — Pulido | ✅ RPE, progresión, comparador · ⏳ supersets, animaciones, deload |

## 2026-07-19 — Sesión 5: Supersets + diseño + optimización + suite de pruebas

### Supersets (cierra el pendiente de Fase 5)

- `toggleSupersetWithPrevious` en `src/db/routines.ts`: enlaza/desenlaza un
  ejercicio con el anterior del mismo día; limpia grupos que quedan con un solo
  miembro. Botón Link2 en el editor de rutinas, badge **SS** + borde de acento
  en los ejercicios agrupados.
- `supersetGroup` se propaga de `RoutineExercise` → `WorkoutSet` al iniciar
  entreno desde rutina.
- En sesión activa: al completar una serie de un superset, el descanso **no**
  arranca mientras el compañero del grupo tenga pendiente la serie del mismo
  número; solo al cerrar la vuelta.

### Correcciones de diseño (según docs/04)

- Animaciones en `index.css`: `set-pop` (check al completar serie, 200ms),
  `pr-appear` (cards de PR con rebote, escalonadas 120ms), `fade-up` (entradas).
- El primer set pendiente de cada ejercicio se resalta (borde de acento +
  surface-2) para saber siempre "dónde estoy".
- Pill flotante "Entreno en curso" en el Layout: visible desde cualquier tab con
  duración en vivo, un tap vuelve a la sesión.

### Optimización

- **Fuentes offline**: `runtimeCaching` de Workbox para Google Fonts
  (StaleWhileRevalidate para el CSS, CacheFirst 1 año para los woff2). Antes la
  tipografía desaparecía sin conexión. (E16)
- **Queries Dexie indexadas** — se eliminaron los 3 escaneos completos de
  `workoutSets` (con años de datos serían miles de filas leídas por render):
  - `Progress/Charts`: `orderBy('exerciseId').uniqueKeys()` para el selector y
    `where('exerciseId').equals(...)` para la serie del gráfico.
  - `HistoryList`: solo carga los sets del entreno expandido
    (`where('workoutId').equals(expanded)`).
  - `MonthlyStats`: primero los entrenos del mes, después
    `where('workoutId').anyOf(ids)`.

### Corrección nueva

**E16. La tipografía desaparecía offline.** El precache de Workbox solo cubría
assets propios; Inter/JetBrains Mono se cargan de Google Fonts y sin
`runtimeCaching` la PWA instalada quedaba con fuente de sistema sin conexión.

**E17. Refactor dejó referencia colgante.** Al optimizar `Charts` quedó `allSets`
(variable eliminada) en las dependencias del `useMemo` → error de compilación.
Detectado por `tsc` strict antes de llegar a main. Recordatorio: correr build
después de cada refactor de queries.

### Pruebas (suite de humo, 16/16 OK)

Bundle de los módulos de lógica con esbuild (alias `@` resuelto) ejecutado en Node:
- **1RM Epley**: 100×1=100, 100×5=116.7, 80×10=106.7, inválidos→0
- **QR**: prefijo `GYMTR:`, PPL de 3 días = 250 bytes (<2KB), roundtrip
  encode→decode idéntico, entradas corruptas → `null`, genera data-URL PNG
- **Niveles de fuerza**: ratio 1.25 correcto, multiplicadores por edad
  monotónicos, ejercicio sin estándar → `no_data`

### Verificación

- `npm run build`: TS strict sin errores, PWA generada (13 entradas precache)
- Chunks: main 359KB / Progress 434KB / QRScanner 135KB / qr 31KB (lazy)
- Preview server: `/`, `manifest.webmanifest`, `sw.js`, iconos → HTTP 200

### Estado de la hoja de ruta

| Fase | Estado |
|------|--------|
| 1 — MVP core workout | ✅ completa |
| 2 — Rutinas y progreso | ✅ completa |
| 3 — Fotos y estadísticas | ✅ completa |
| 4 — QR | ✅ completa |
| 5 — Pulido | ✅ completa (supersets, RPE, progresión, animaciones, optimización) |

Pendientes opcionales: sync Supabase (requiere cuenta del usuario), deload
inteligente, `git init` + primer commit (a confirmar por el usuario).

---

## Sesión 6 — Auth, app "viva" y recordatorios (2026-07-19)

### Sistema de autenticación (previo en esta sesión)
Login/registro local con WebCrypto (SHA-256 + salt), primer usuario = admin,
onboarding obligatorio de 4 pasos, panel admin, mensajes motivacionales.
Schema v4 (`users`). Rutas protegidas con `ProtectedRoute` / `AdminRoute`.

### Mejoras de UX/UI y features "app viva"
Schema **v5**: tablas `bodyMeasurements` y `achievements`; `LocalProfile`
extendido con `weeklyGoal` y `reminder*`.

- **Toasts** (`stores/toastStore` + `ui/Toast`): feedback global, helpers
  `toast.success/error/info/pr`. Montado en `App`.
- **Confetti** (`ui/Confetti`): ráfaga canvas sin dependencias al lograr PR o
  logro. Cableado en la pantalla de fin de entreno.
- **Racha** (`lib/stats` `computeStreak`): días consecutivos, actual + máxima.
- **Meta semanal**: anillo SVG (`ui/ProgressRing`) + `StreakWeekCard` en Home;
  configurable en Perfil.
- **Logros** (`lib/achievements`): 11 logros desbloqueables, `syncAchievements`
  persiste y devuelve nuevos para celebrar. Panel con progreso.
- **Heatmap** (`gym/CalendarHeatmap`): grilla estilo GitHub, 18 semanas, 5
  niveles por volumen.
- **Dashboard ampliado** (`gym/StatsOverview`): 6 métricas. Nuevas pestañas en
  Progreso: Resumen y Logros.
- **Medidas corporales** (`pages/Measurements`, lazy): formulario + evolución
  de peso (Recharts) + historial. Ruta `/medidas`.
- **Recordatorios** (`lib/reminders` + `pages/Reminders`): notificaciones
  locales (Web Notifications API) con hora/días configurables, scheduler en
  `Layout`. Ruta de **emails** documentada + scaffold de Supabase Edge Function
  (`supabase/functions/send-reminders`, `docs/12-RECORDATORIOS.md`).
- **Skeletons** (`ui/Skeleton` + shimmer): estado de carga en Home.

### Verificación
- `tsc -b` strict sin errores · `npm run build` OK (2505 módulos)
- Chunks: index 405KB / LineChart(Recharts) 385KB / QRScanner 135KB /
  Progress 55KB / Measurements 4.8KB / Admin 4.2KB (lazy). PWA 16 entradas.

---

## 2026-09-02 — Tanda de expansión, Bloque 1: Capacitor + notificaciones + link de instalación

Rama `expansion-2026-09` (rama nueva + merge a `main` por bloque, pedido del usuario).
Plan completo: `~/.claude/plans/starry-forging-snowflake.md`.

### B0 — verificación de estado
Supabase auth + sync ya están en producción (contradice `docs/17`, que quedó atrás). El
fail-fast de `vite.config.ts` + deploys pasando implica secrets cargados. `docs/17` puesto
al día con el estado real.

### B1 — implementado
- **`src/lib/nativeReminders.ts`** (nuevo): `syncReminderSchedule(profile)` agenda con el
  SO (`@capacitor/local-notifications`) una repetición semanal por cada día elegido a la
  hora del recordatorio — llega con la app cerrada, sin backend. IDs reservados
  `4_200_000 + díaJS`; canal Android `gymtracker-reminders` (`ensureReminderChannel` desde
  `main.tsx`). Cuerpo = `getQuoteForNow()`.
- **`src/lib/reminders.ts`**: `useReminderScheduler` ahora también resincroniza el schedule
  nativo en cada cambio de `reminder*`. `fireNotification` (web) usa frase filosófica.
- **`src/lib/quotes.ts`** (nuevo, adelanto de B4): ~40 frases filosóficas con autor real,
  etiquetadas por daypart. `getQuoteForNow()` pura y estable por día. Cableada en Home
  (frase de cierre) y en los recordatorios.
- **`src/lib/pwaInstall.ts`** (nuevo): captura `beforeinstallprompt`, hook `useCanInstallPwa`.
  Ajustes → nueva sección "La app": "Instalar la app" (si el navegador lo permite) y
  "Descargar para Android" (link al release). Solo en web.
- **`.github/workflows/android.yml`** (nuevo): build manual del APK (debug) publicado en el
  release `android-latest` — link directo estable. Firma de release documentada en `docs/16`.
- **`src/pages/Reminders.tsx`**: permiso y "probar notificación" nativos; el bloque de push
  se reemplaza por una nota cuando `isNative` (el SO ya cubre "app cerrada").
- **`RestTimer.tsx`**: sin cambios — ya agendaba el aviso de fin de descanso con el SO.
- `docs/16-CAPACITOR.md`, `README.md` actualizados.

### Verificación
`npx tsc -b`, `npm test` (18/18), `npm run build` verde. Pendiente de dispositivo real:
recordatorio nativo con pantalla apagada, `beforeinstallprompt` en Chrome.

---

## 2026-09-02 — Tanda de expansión, Bloque 2: modo claro rediseñado

El modo claro anterior era ilegible (el usuario lo reportó). Se rehízo entero.

- **`src/index.css`**: paleta `[data-theme=light]` nueva, calculada con WCAG 2.1 real
  (script en scratchpad). `ink-2`/`ink-3` a 0.75/0.62 de alpha (~6.9:1 / ~4.5:1). Acento
  `#3F6E0C` (verde-lima profundo, ~6.1:1 sobre blanco — el lima brillante no puede ser
  legible como texto sobre blanco). Semánticos más oscuros que iOS. `surface-2`
  distinguible del fondo. Overrides de `card-shine` y del sweep de `.skeleton` (el brillo
  blanco no se ve sobre blanco).
- **Grupo muscular theme-aware**: `--muscle-*` como custom properties en ambos temas
  (`index.css`), `tailwind.config.ts` pasa `muscle.*` a `rgb(var(--muscle-*))`. Variantes
  claras propias (ratios 4.9–6.0 sobre blanco). `src/lib/muscleColors.ts`: nuevo hook
  `useMuscleColors()` (resuelve del tema, patrón de `useChartColors`); `MonthlyStats.tsx`
  lo usa en vez de `MUSCLE_HEX`.
- **SVGs con acento hardcodeado**: `MuscleBodySVG.tsx` y `SetupIllustration.tsx` usaban
  `#E8FF47` literal (invisible sobre blanco). Ahora eligen paleta por `useThemeStore`.
- **`themeStore.ts` / `index.html`**: `applyTheme` setea `color-scheme` en `<html>`
  (inputs nativos, scrollbars, autofill siguen el tema). `theme-color` meta actualizado.
- **`DESIGN.md §1`**: subsección "Modo claro" nueva con los valores y ratios.

### Verificación
`npx tsc -b`, `npm test` (18/18), `npm run build` verde. `test:style` sin auras nuevas.
Contraste verificado con WCAG 2.1. **Pendiente**: verificación visual en pantalla real —
no hay navegador conectado en el entorno (extensión no disponible).
