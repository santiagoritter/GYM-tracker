# 17 — Estado del rediseño (rama `beta`)

Actualizado al cierre de la sexta pasada (Fases 32-36 de
`staged-beaming-wind.md`), 5 de agosto de 2026: dos bugs reportados sobre
`main` desplegado, el cronómetro de descanso persistente (primera idea de
`IDEAS.md` implementada), y dos patrones más adaptados de referencias
puntuales del usuario (kokonutui) — card flip en la actividad de Inicio y
sheet para agregar calorías.

## Ramas

| Rama | Estado |
|---|---|
| `alpha` | Snapshot estable previo al rediseño. Congelada. |
| `beta` | Rediseño en curso. **Acá se trabaja.** |
| `main` | Producción (GitHub Pages). Al día con `beta` — el usuario lo ve en el teléfono tras el próximo deploy del workflow. |

Solo `main` dispara el deploy.

---

## Hecho en `beta`

### Fundaciones
- **`DESIGN.md`** — sistema de diseño completo. Fuente de verdad de tokens.
- **`.claude/CLAUDE.md`** — reglas de trabajo permanentes: metodología,
  ramas, stack real, reglas de React y datos, criterio de "intuitivo y
  cómodo".
- **`IDEAS.md`** — 18 ideas fuera de alcance + deuda técnica, sin implementar.

### Auditoría contra los 65 anti-patrones de impeccable.style/slop
Corregidos: fondo negro puro, over-rounding (24–32px en tarjetas chicas),
`shadow-accent`, bounce easing global, glassmorphism sin restricción, Inter
en el stack, emojis (11 archivos), y la **barra de acento lateral** en la
serie activa, catalogada como *"the most recognizable tell of AI-generated
UIs"*.

`npm run test:style` verifica automáticamente emojis y auras.

### Capacitor (§4)
Android generado, iOS pendiente de una Mac. `src/lib/native.ts` conecta
háptico y notificaciones programadas. Dos cosas que **no funcionaban** en el
dispositivo real y ahora sí:
- Safari en iOS ignora `navigator.vibrate`: no había feedback táctil.
- El aviso de fin de descanso solo llegaba con la app abierta en primer plano.

### Pantallas
- **Entreno**: superficies aplanadas, targets de 44px, `tabular-nums`.
- **Inicio** (§3.3): actividad arriba, frase al final (empujaba el botón
  principal fuera del alcance del pulgar), días de rutina como Card con
  hairlines, fila de calorías opcional.
- **Progreso** (§3.3): recibe "Últimos entrenos", niveles por grupo
  muscular debajo de `StrengthLevels`.
- Las 9 pantallas restantes (Perfil, Medidas, Recordatorios, Ejercicios,
  Admin, Login, Registro, Onboarding, Layout) migradas a `Card`/`Row`.
- **RoutineEditor** (§1.2): sin tarjetas anidadas, sin el borde lateral de
  acento en superserie; `restSeconds`/`notes` de `RoutineExercise` ahora
  visibles y editables (antes eran write-only).

### Plan `staged-beaming-wind.md` — las 6 fases, completas
1. Card/Row en toda la app.
2. RoutineEditor.
3. **§2.3** Niveles de fuerza por grupo muscular — deriva el 1RM
   equivalente vía `COEF` (ahora exportado de `recommendation.ts`), sin
   tabla de estándares nueva. `src/lib/muscleGroupStrength.ts`.
4. **§2.7** `Ajustes.tsx` (`/ajustes`) separado de Perfil + **tema claro**
   real vía custom properties CSS + `data-theme` (no el `dark:` de
   Tailwind, incompatible con los modificadores `/NN` ya usados en el
   código). `src/stores/themeStore.ts`.
5. **§2.6** Contador de calorías opcional (`/calorias`), tabla Dexie
   `calorieEntries` (v10), fila de resumen en Inicio solo si está activado.
6. **§2.1** Calculadora de 1RM (`/calculadora`), Epley + Brzycki
   (`calc1RMBrzycki` en `src/lib/utils.ts`) más tabla de peso sugerido por
   objetivo reutilizando `BY_GOAL`.

Cada fase: commit propio, `npx tsc -b` + `npm test` + build en verde antes
del commit siguiente.

### Segunda pasada — Fases 7-11, completas
Motivadas por feedback real del usuario probando en un Redmi Note 14
(gama media) contra un iPhone 14 Pro, y por seguir investigando las webs
de referencia para gráficos/componentes:

7. **Fix de rendimiento crítico**: la lista de 107 ejercicios
   (`Exercises.tsx`) no estaba virtualizada — ~500+ nodos DOM montados de
   una sola vez, imperceptible en un iPhone 14 Pro pero causaba scroll
   trabado en Android de gama media. Virtualizada con
   `@tanstack/react-virtual` (`useWindowVirtualizer`, ya que el documento
   entero scrollea, no un contenedor propio). De paso: `.glass` bajó de
   `blur(20px)` a `blur(14px)` + `will-change`, y se consolidaron 7
   headers de página que usaban `backdrop-blur` de Tailwind directo en vez
   de la clase `.glass` sancionada.
8. Se movió `CalendarHeatmap` (el calendario de puntitos) de Progreso a
   Inicio, pedido explícito del usuario — es lo primero que se quiere ver
   al abrir la app.
9. **`WeeklyActivityRings`** (nuevo, `src/components/gym/`): 7 anillos
   concéntricos (lunes a domingo), inspirado en el ring-chart de
   bklit.com y en los Activity Rings de Apple, pero con un solo acento
   (no un color por anillo) y sin el glow de hover del original.
   Reemplaza el `ProgressRing` único que tenía `StreakWeekCard` — ese
   componente quedó sin consumidores y se borró.
10. **Tema claro corregido**: los 4 archivos con gráficos de Recharts
    tenían colores hex hardcodeados de modo oscuro (Recharts no puede leer
    `data-theme`); nuevo hook `useChartColors` los resuelve desde los
    custom properties del tema activo. Además, `--color-surface-2` era
    idéntico a `--color-bg` en claro (copiado ciego de un token de iOS que
    no aplicaba acá), aplanando skeletons y celdas vacías — corregido con
    valores propios y escalonados.
11. **Split de bundle**: `manualChunks` en `vite.config.ts` separa
    `recharts` (411KB, sigue lazy) y `vendor` (react/react-dom/router,
    164KB) del chunk principal — bajó de 574KB a 411KB, desaparece el
    warning de build.
12. **Tap-to-reveal en `RecentWorkouts`**: concepto adaptado del card-flip
    de kokonutui.com (dispara por hover en el original, no aplica a
    touch) — sin el flip 3D literal, que en esta app leería como
    decoración. Tap expande el detalle por ejercicio (series + mejor
    peso) de ese entreno, consultado solo cuando la fila está expandida.

### Tercera pasada — Fases 13-16, completas
Feedback directo del usuario probando `main` desplegado (captura de
Inicio adjunta en la conversación):

13. Avatar del header (`Layout.tsx`) ahora navega a `/perfil` — no tenía
    `onClick`.
14. Reordenamiento de Inicio: se saca `StreakWeekCard` (el anillo semanal
    de la Fase 9, competía con la actividad de hoy en el primer scroll) y
    pasa a ser lo primero del tab Resumen de Progreso. Nuevo orden de
    Inicio: calorías → iniciar entrenamiento → calendario de actividad →
    días de la rutina → frase.
15. **"/me" en las peticiones** — investigado: no hay ningún backend HTTP
    desplegado hoy (sin `@supabase/supabase-js` importado en `src/`, la
    app es 100% local). No hay ningún endpoint real al que agregarle ese
    patrón. El SQL ya lo cumple (`0004_indexes_rls_storage.sql`: RLS
    compara contra `auth.uid()`, nunca contra un `user_id` del cliente).
    Se documentó la regla para el código de cliente que todavía no existe
    en `docs/13-BACKEND-SUPABASE.md` §3.5 + referencia en
    `.claude/CLAUDE.md` §5.
16. **Liquid Glass** (`~/.agents/skills/apple-design/SKILL.md` §12,
    coincide con la skill que pide `Redisenio.md` §3.2): borde superior
    brillante en la tab bar (`.glass-edge-top`), scrims de sheets/modales
    animan blur+opacity juntos al aparecer (`animate-glass-in`), y
    soporte nuevo de `prefers-reduced-transparency`/`prefers-contrast`/
    `prefers-reduced-motion` (ausente hasta ahora). Las secciones 1-11 de
    la skill (spring physics, gestos) quedan anotadas en `IDEAS.md` —
    cambio de arquitectura de interacción, no de blur.

**Auditoría de `Redisenio.md` §2 (features) contra el código**: todas las
features salvo §2.5 (sync online) y §2.8 (rutina más popular) — ambas
bloqueadas por Supabase sin desplegar — ya están confirmadas hechas por
lectura/grep directo. No queda ninguna feature de negocio nueva de esa
sección por construir.

### Cuarta pasada — Fases 18-24, completas
Batch de ideas nuevas del usuario, más una segunda captura marcando el
mismo widget de anillos (Fase 9) como roto:

18. Bienvenida del onboarding (`StepWelcome`) enriquecida con 3 bullets
    de qué hace la app — mismo paso, no suma fricción.
19. **Backup exportable/importable** (`src/lib/backup.ts`, nuevo): las 12
    tablas de `SYNC_ORDER` a JSON, blobs de fotos en base64, remapeo de
    `userId` en el import (incluidos los ids compuestos de
    `personalRecords`/`exercisePhotos`). Único camino real hoy para no
    perder el historial al cambiar de dispositivo, sin sync a Supabase.
    Test dedicado: `scripts/test-backup.mts`.
20. Dificultad por ejercicio (ya existía en el dato, nunca se mostraba):
    punto de color en cada fila de Ejercicios + filtro nuevo. Compartido
    entre la lista y el sheet de detalle vía `src/lib/difficulty.ts`.
21. `calorieTrackingEnabled: 1` por defecto en los dos puntos donde se
    crea un perfil — antes quedaba `undefined` (desactivado).
22. **El anillo de Progreso, arreglado por segunda vez, esta vez
    definitivo**: se borran los 7 anillos concéntricos de la Fase 9
    (dos rondas de feedback real los marcaron como rotos/confusos) y
    vuelve un `ProgressRing` único — theme-aware desde el arranque, a
    diferencia del original que se había borrado en la Fase 9.
23. `bodyFatPct` opcional en `LocalProfile` (v11 de Dexie, campo no
    indexado), input en Perfil, espejado desde Medidas igual que ya
    pasaba con el peso.
24. `ExperienceLevel` de 3 a 6 escalones
    (novice/beginner/intermediate/advanced/elite/champion), alineado
    con los 6 que ya usaba `STANDARDS` internamente — antes el
    recomendador nunca podía apuntar a `novice`/`elite`/`champion` desde
    el autorreporte del onboarding.

### Quinta pasada — Fases 26-30, completas
Último batch: notificaciones push que funcionen con la app cerrada, arreglo
de la paleta clara, y tres patrones de interacción con código de
referencia provisto por el usuario (kokonutui, bklit) — adaptados a la
paleta/forma/texto existentes, no copiados literal.

26. **Web Push real** (código listo, bloqueado por deploy de Supabase):
    `src/lib/supabaseClient.ts` (primer uso real de `@supabase/supabase-js`
    en el repo, `null` si no hay env vars) + `src/lib/webPush.ts`
    (`subscribeToPush`/`unsubscribeFromPush`). `vite-plugin-pwa` pasa de
    `generateSW` a `strategies: 'injectManifest'` para poder meter un
    service worker propio (`src/sw.ts`) con handlers de `push` y
    `notificationclick` — verificado leyendo `dist/sw.js` directo, no solo
    "el build no rompió": el precacheo de Workbox se mantuvo intacto tras
    el cambio de estrategia. Servidor: tabla `push_subscriptions`
    (`0005_push_subscriptions.sql`), función `send-push-reminders`
    (VAPID vía `npm:web-push`), reemplaza al scaffold muerto
    `send-reminders` (era por email, referenciaba columnas que nunca
    existieron en el SQL real). El recordatorio viejo (`setInterval` +
    `Notification`, solo con la app abierta) se mantiene como fallback
    cuando push no está disponible/configurado.
27. **Paleta de acento en modo claro**: `--color-accent` daba 3.24:1 de
    contraste contra blanco (pasa AA para elementos grandes, no para texto
    normal, y el acento se usa como `text-accent` chico en varios lados).
    Ajustado a mano a `84 132 20` (~4.5:1, más verde que amarillo — lee
    "lima fresco" en vez de "oliva militar"). Sin poder confirmarlo en
    pantalla real en este entorno — queda anotado para confirmar a ojo.
28. **Smooth Drawer** (kokonutui, adaptado): `motion` (sucesor de Framer
    Motion) se suma como dependencia nueva, acotada a este pedido — no es
    adopción general de la librería. Entrada con spring
    (`damping: 30, stiffness: 300`) + `staggerChildren` del contenido
    interno en los 3 sheets que sí son bottom-sheet
    (`ExerciseDetailSheet`, `TemplatePicker`, `QRShareModal`);
    `ExercisePicker` se excluyó al leer el código completo — es una vista
    de pantalla completa (`fixed inset-0`), no un sheet, el patrón no
    aplica. Mismos colores/forma/texto de siempre, solo cambia cómo entra.
29. **Hold Button** (kokonutui, adaptado) en "Iniciar entrenamiento" de
    Inicio: mantener presionado 500ms dispara el inicio, con una barra de
    progreso sobre el propio botón; soltar antes cancela. Dos desvíos
    deliberados del ejemplo: la barra anima `scaleX` (no `width`, que
    dispara layout) y `holdDuration` es 500ms en vez de los 3000ms del
    original (ahí confirmaba un borrado — acá es la acción más frecuente
    de la app, 3s sería fricción excesiva).
30. **Radar chart** (bklit, adaptado) en Niveles por grupo muscular:
    `MuscleGroupLevels.tsx` suma un `RadarChart` de Recharts (ya
    instalado, no hace falta la librería propia de bklit) arriba de la
    lista existente, que se mantiene. Un solo acento, sin glow, mismos
    tokens de tema que el resto de los charts vía `useChartColors`, y
    cada eje lee `result.progress` — el mismo campo 0-1 que ya mostraba
    la barra lineal, sin cálculo nuevo.

**Nota sobre la idea de gestos/spring physics de `IDEAS.md`**: la Fase 28
y 29 la resuelven parcialmente (entrada de sheets + hold button), pero el
drag interrumpible con seguimiento 1:1 del dedo y rubber-banding en los
bordes sigue sin implementarse — anotado en `IDEAS.md` qué falta
puntualmente.

### Sexta pasada — Fases 32-36, completas
Dos bugs reportados sobre `main` ya desplegado, más el pedido de seguir
con `IDEAS.md` y con Liquid Glass, más dos componentes de referencia
nuevos (kokonutui) — mismo criterio de adaptación que el batch anterior:
técnica sí, colores/forma/texto no.

32. **Fecha de nacimiento descentrada** (Perfil): no era un problema del
    layout de `Row`/`Card` (ya usan `tailwind-merge`, el padding es
    simétrico) sino un bug conocido de WebKit/iOS Safari —
    `input[type=date]` ignora `width:100%` y colapsa al ancho intrínseco
    de sus segmentos, dejando el resto del box como espacio muerto. Fix
    de una línea (`-webkit-min-logical-width: 100%`) en `index.css`,
    corrige los dos usos del repo (`Profile.tsx`, `Onboarding.tsx`) a la
    vez. Sin poder confirmarse en un iPhone real en este entorno.
33. **Texto que no entraba en el anillo semanal** (`StreakWeekCard`): con
    stroke de 7px sobre 72px, el espacio libre real ronda 58px de
    diámetro — insuficiente para "de X días" con metas de dos dígitos.
    Se elimina esa segunda línea; el texto al lado del anillo ya da el
    contexto de la meta.
34. **Cronómetro de descanso persistente**: primera idea de "Alto
    impacto" de `IDEAS.md` implementada. `useWorkoutStore` (`restTimer`)
    se persiste en localStorage vía el middleware `persist` de Zustand,
    mismo patrón que `themeStore.ts`. Riesgo manejado explícitamente: si
    la app murió de golpe con un descanso corriendo, la notificación
    nativa ya agendada de esa sesión sigue pendiente en el SO —
    `onRehydrateStorage` la cancela antes de que `RestTimer.tsx` agende
    una nueva para el mismo horario al montar, así no llegan avisos
    duplicados.
35. **Card Flip** (kokonutui, adaptado) en `CalendarHeatmap` de Inicio:
    tap gira la card en 3D (CSS puro, sin `motion`) y revela agregados
    del mismo período de 18 semanas que no se mostraban en ningún lado
    (entrenos, kg movidos, mejor día). Se elimina el glow del ejemplo
    (prohibido por `DESIGN.md`), el disparo pasa de hover a tap, y ambas
    caras comparten celda de grid en vez de un alto fijo inventado.
36. **Sheet para agregar calorías** (Smooth Drawer, adaptado): la sección
    "Agregar" de `Calories.tsx`, antes inline y siempre visible, pasa a
    un `CalorieAddSheet.tsx` lazy con el mismo patrón de sheet que ya
    usan `TemplatePicker`/`QRShareModal` (Portal + `sheetPanelVariants`).
    Mismos inputs y guardado de siempre, solo cambia el contenedor — y de
    paso es la respuesta concreta al pedido de más Liquid Glass sin
    expandir `backdrop-filter` fuera de header/tab bar/sheets, que sigue
    siendo una restricción deliberada de `DESIGN.md`.

`IDEAS.md` se actualiza sacando el cronómetro persistente de la lista.

---

## Tanda de expansión — septiembre 2026

Plan completo en `~/.claude/plans/starry-forging-snowflake.md` (12 bloques). Rama de
trabajo: `expansion-2026-09` (el usuario pidió rama nueva + merge a `main` por bloque, en
vez de pasar por `beta`).

**Estado real verificado (B0)** — corrige lo que este doc daba por "bloqueado" más abajo:
Supabase auth + sync **ya están cableados y en producción** (`src/lib/supabaseClient.ts`,
`supabaseAuth.ts` con login por código de 6 dígitos, `sync.ts` push/pull con
`dirty`/`tombstones`, `runSync` en `main.tsx`, Dexie v12). El build de producción tiene
fail-fast si faltan los secrets de Supabase (`vite.config.ts`) y los deploys a `main`
vienen pasando → los secrets están cargados. Existen además: modo cardio, Spotify (PKCE),
`/admin/usuarios` (lectura cross-user por RLS `*_admin_read` + RPC `admin_list_users`),
layout desktop responsive. Pendiente de confirmar a mano en el dashboard: bucket `photos`,
`VITE_VAPID_PUBLIC_KEY`, cron de `send-push-reminders`, rol admin asignado.

`README.md` y `docs/01`, `04`, `05`, `06`, `PROMPT-CONTEXTO.md` siguen siendo en buena
parte ficción aspiracional (shadcn, TanStack Query, Vercel, Firebase→Supabase, `#0A0A0A`,
Inter). Fuera de alcance de esta tanda reescribirlos; queda el registro.

**B1 — Capacitor completo + notificaciones + link de instalación (hecho):**
- `src/lib/nativeReminders.ts` nuevo: `syncReminderSchedule(profile)` agenda con el SO una
  repetición semanal por día elegido a la hora del recordatorio (llega con la app cerrada,
  sin backend). IDs reservados `4_200_000 + díaJS`, canal Android `gymtracker-reminders`
  (`ensureReminderChannel` desde `main.tsx`). Cuerpo = frase de `getQuoteForNow`.
  Se dispara desde `useReminderScheduler` (`src/lib/reminders.ts`) en cada cambio de
  `reminder*`.
- `src/lib/pwaInstall.ts` nuevo: captura `beforeinstallprompt`; hook `useCanInstallPwa`.
  Fila "Instalar la app" + "Descargar para Android" en Ajustes → sección "La app" (solo web).
- `.github/workflows/android.yml` nuevo: build manual del APK (debug) → release
  `android-latest` con link directo. Firma de release documentada en `docs/16`.
- `src/pages/Reminders.tsx`: permiso y "probar notificación" nativos; el bloque de push
  se oculta en nativo (el SO ya cubre "con la app cerrada").
- `RestTimer.tsx` ya agendaba el aviso de fin de descanso con el SO (Fase 34) — sin cambios.
- `src/lib/quotes.ts` nuevo (adelanto de B4): ~40 frases filosóficas con autor, etiquetadas
  por daypart; `getQuoteForNow()` pura, estable por día. Cableada en Home (reemplaza
  `HOME_MESSAGES` random en la frase de cierre) y en los recordatorios (web + nativo).
- Verificación: `npx tsc -b`, `npm test`, `npm run build` verde. Falta prueba en Android
  real (recordatorio con pantalla apagada) y `beforeinstallprompt` en Chrome.

**B2 — Modo claro rediseñado (hecho):**
- `src/index.css` `[data-theme=light]`: paleta nueva calculada con WCAG 2.1 real. `ink-2`/
  `ink-3` a 0.75/0.62 (~6.9:1 / ~4.5:1). Acento `#3F6E0C` (verde profundo — el lima
  brillante no es legible como texto sobre blanco). `surface-2` distinguible del fondo.
  Overrides de `card-shine` y `.skeleton` para claro.
- Grupo muscular theme-aware: `--muscle-*` en ambos temas, `tailwind.config.ts` usa las
  vars, variantes claras propias, hook `useMuscleColors()` nuevo en `muscleColors.ts`
  (patrón de `useChartColors`).
- `MuscleBodySVG.tsx` y `SetupIllustration.tsx` eligen paleta por `useThemeStore` (antes
  `#E8FF47` literal, invisible sobre blanco).
- `themeStore.ts`/`index.html`: `color-scheme` en `<html>`.
- `DESIGN.md §1` subsección "Modo claro" con valores + ratios.
- Verificación: build/test/style verde; contraste WCAG verificado. **Pendiente**:
  verificación visual (sin navegador en el entorno).

**B4 — Frases filosóficas por hora (hecho):** `src/lib/quotes.ts` (40 frases con autor,
por daypart, `getQuoteForNow()` pura y estable por día) creado en B1 y cableado en Home +
recordatorios web/nativos. Se cerró con el edge function `send-push-reminders` (frases por
daypart, elegidas con la hora local de cada suscripción — **requiere redeploy**) y
`scripts/test-quotes.mts`.

**B5 — Cardio con duración objetivo (hecho):** `CardioSetupSheet` pide "¿cuánto tiempo?"
para todos los aparatos (+ distancia proyectada si hay velocidad). `Cardio.tsx` muestra
barra de progreso hacia el objetivo (`scaleX` lineal), "faltan X" / overtime, háptico al
cruzar. `cardioStore.CardioSession.targetDurationMin`. `formatCardioNotes` incluye el
objetivo en el resumen del historial.

**B3 — Spotify, playlists que no se veían (hecho):** el sheet de playlists solo se abría
por long-press sobre la fila "sonando ahora", que solo existe con reproducción activa.
Ahora `SpotifyPlayerSheet` acepta `playback` opcional y hay una fila "Elegir qué suena" en
Ajustes → Conexiones. `fetchUserPlaylists` pagina (antes cortaba a 50). Reconexión en un
tap. **Pendiente runtime**: confirmar con cuenta real si el 403 es token viejo o app en
"development mode".

**B6 — Modo running con GPS, completo con mapa (hecho):** deps nuevas (aprobadas)
`leaflet` + `@capacitor/geolocation` + `@capacitor-community/background-geolocation`.
`src/lib/run.ts` (matemática pura testeada), `src/lib/geo.ts` (watch FG/BG),
`src/stores/runStore.ts` (persistido), `src/pages/Run.tsx` (`/correr`, 4 fases),
`RunMap`/`RunSplits`/`RunPermissionGate`. Dexie **v13** tabla `runs` (aún fuera de
`SYNC_ORDER`). `Workout` espejo para el historial. `test:run` + `test-runs-migration`.
`AndroidManifest.xml` con permisos de ubicación FG/BG. Ver `docs/18-RUNNING-GPS.md`.
**Pendiente**: prueba en Android real (no hay GPS en el entorno); iOS necesita generar el
proyecto en una Mac.

**B7 — Reforzar seguridad (hecho):** `docs/19-SEGURIDAD.md` nuevo (auditoría + checklist).
`sessionChecked` en `authStore` → `AdminRoute` no pinta hasta confirmar el rol de la
sesión viva (RLS ya bloqueaba el acceso a datos). Backup cifrado opcional (`src/lib/crypto.ts`,
AES-GCM + PBKDF2, `test:crypto`). `0009_harden_functions.sql` (`sync_stamp` con
`search_path` fijo). CSP `<meta>` en `index.html`. **Pendiente**: checklist del dashboard
(Advisors en cero, leaked-password ON) y verificar la CSP en navegador.

**B8 — Legal en el registro (hecho):** `src/pages/Legal.tsx` (`/legal/*`, público),
checkbox obligatorio en `Registro.tsx`, `profile.legalAcceptedAt`/`legalVersion` (Dexie
**v14** no-op + `0010_legal_acceptance.sql`). `src/lib/legal.ts` (`LEGAL_VERSION`,
`SUPPORT_EMAIL`). Fuente en `docs/legal/*.md`. **Pendiente**: correr `0010`.

**B9 — FAQ + contacto (hecho):** `src/pages/FAQ.tsx` (`/faq`), acordeón `<details>` con 8
preguntas + contacto por `mailto:`. Sección "Ayuda" en Ajustes. Sin backend de feedback.

**B10 — Panel de admin, gestión de cuentas (hecho):** Edge Function `admin-users`
(verifica rol admin server-side, usa service_role, cada mutación → `admin_audit`).
`0011_admin_audit.sql`. `src/lib/adminMutations.ts`. `AdminUsers.tsx` reescrito con
acciones (rol/reset/ban), crear usuario, registro de acciones. Ver `docs/20-ADMIN.md`.
**Pendiente**: correr `0011`, `supabase functions deploy admin-users`.

**B11 — Modo coach, núcleo (hecho):** `0012_coach.sql` (tablas `coaches`/`coach_invites`/
`coach_clients`/`client_goals`, `is_coach_of()`, policies `*_coach`/`*_coach_read`, RPC
`coach_client_summaries`). `src/lib/coachQueries.ts`/`coachMutations.ts`. Páginas en
`src/pages/coach/` + `JoinCoach.tsx` (`/unirse/:code`). `VerifiedBadge`, `MyCoachCard`,
`CoachRoute`. Compromisos de núcleo (asignar = plantilla; metas en Perfil; sin
`max_uses`) — chat/reseñas/DNI/pago quedan para fase 2. Ver `docs/21-COACH.md`.
**Pendiente**: correr `0012`, prueba de humo end-to-end.

---

**Tanda de expansión completa (B1–B11).** Rama `expansion-2026-09` mergeada a `main` por
bloque. Falta del lado del usuario: los pasos de backend (correr `0009`–`0012`, desplegar
las Edge Functions `admin-users` y redeploy de `send-push-reminders`), y las
verificaciones que necesitan dispositivo/navegador reales (modo claro, running en Android,
CSP, flujo coach). §2.8 del brief original ("rutina más popular") sigue sin implementar.

## Pendiente

### Bloqueado
- **§2.5 Supabase**: SQL listo en `supabase/migrations/`, pasos en
  `docs/13`. Falta que el usuario cree el proyecto.
- **§2.8 Rutina más popular**: necesita el backend.
- **Fase 26 (Web Push)**: cliente y servidor listos, pero el push real no
  funciona hasta que el usuario despliegue Supabase y complete los pasos
  manuales de `docs/13-BACKEND-SUPABASE.md` §6 (claves VAPID, secrets,
  cron). Mismo estado que el resto de lo que depende de Supabase.
- **iOS**: `npx cap add ios` solo corre en macOS.

### Sin empezar
- **§1.3** Auditoría de overflow línea por línea en las pantallas nuevas
  (se verificó por cálculo de anchos, no en dispositivo real — pendiente
  de confirmación visual en el iPhone del usuario).
- **§3.1** Spec de design system con Fable (se hizo a mano en `DESIGN.md`).
- Todo lo anotado en `IDEAS.md` (18 ideas fuera de alcance) — siguen
  requiriendo confirmación explícita antes de implementarse, regla que
  el propio documento establece.
- **Confirmación en dispositivo real**: el fix de rendimiento de la Fase 7
  está razonado por código (menos nodos DOM, menos costo de compositing
  del blur), pero no hay un Android real en este entorno para confirmarlo.
  Falta que el usuario vuelva a probar en el Redmi Note 14.
- `kokonutui.com/docs/card-flip` sigue devolviendo 404 en cada intento de
  esta sesión — no bloqueó nada, el concepto se adaptó igual en la Fase 12
  (tap-to-reveal en `RecentWorkouts`, sin el flip 3D literal).
- **Spring physics / gestos interactivos** (secciones 1-11 de la skill
  `apple-design`) — anotado en `IDEAS.md`, requiere sumar una librería de
  springs y reescribir interacciones existentes.

---

## Decisiones que conviene no revertir sin leer el motivo

1. **Inter fuera del stack.** Está en la lista de fuentes sobreexpuestas, y
   SF Pro se ve mejor en el iPhone del usuario. De paso se eliminó el
   `<link>` a Google Fonts: petición bloqueante que en un gimnasio sin señal
   no resuelve.
2. **`backdrop-filter` NO está prohibido**, pero solo se permite en la
   cabecera y la tab bar. Ahí es el patrón nativo de iOS y resuelve un
   problema real. En cualquier otro lado es decoración.
3. **La build nativa no lleva base path.** Sincronizar una build con
   `/GYM-tracker/` da pantalla blanca en el webview. Ver `docs/16`.
4. **El lima se mantiene.** No es ninguno de los tells conocidos (violeta,
   cyan-sobre-oscuro) y ya es la identidad del producto.

---

## Preguntas abiertas para el usuario

1. **Google OAuth** (§2.5 dice "evaluar"). Antes se había definido que
   "gmail" era solo el remitente del mail de confirmación. ¿Se suma el login
   con Google? Cambia el setup.
2. ~~**Merge de `beta` a `main`**~~ — resuelto: el usuario autorizó
   explícitamente el merge al cierre de esta sesión, sin esperar validación
   visual previa ("mergea a main todo para que pueda ver ls cambios").
3. **Contraste del acento en modo claro**: ajustado dos veces (Fase 10 y
   Fase 27), el valor actual es `84 132 20` (~4.5:1 contra blanco,
   calculado a mano). Sigue sin verificarse en pantalla real — si no
   convence, es un solo valor en `src/index.css` para ajustar.
4. **Web Push (Fase 26)**: código completo y en `main` tras el merge, pero
   inerte hasta que el usuario cree el proyecto de Supabase y siga los
   pasos manuales de `docs/13-BACKEND-SUPABASE.md` §6. Nada que decidir de
   su parte salvo cuándo hacer ese deploy.
