# 17 — Estado del rediseño (rama `beta`)

Actualizado al cierre de la cuarta pasada (Fases 18-24 de
`staged-beaming-wind.md`), 5 de agosto de 2026: batch de ideas del
usuario — bienvenida enriquecida, backup exportable/importable,
dificultad por ejercicio, calorías on por defecto, el anillo de Progreso
simplificado por segunda vez (definitivo), % de grasa corporal opcional,
y nivel de experiencia ampliado a 6 escalones.

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

---

## Pendiente

### Bloqueado
- **§2.5 Supabase**: SQL listo en `supabase/migrations/`, pasos en
  `docs/13`. Falta que el usuario cree el proyecto.
- **§2.8 Rutina más popular**: necesita el backend.
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
3. **Contraste del acento en modo claro**: `--color-accent` se oscureció a
   mano (~`#8A9A00`) para pasar AA sobre fondo blanco manteniendo el hue del
   lima. No se verificó en pantalla real — si no convence, es un solo valor
   en `src/index.css` para ajustar.
