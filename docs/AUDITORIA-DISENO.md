# Auditoría de diseño (Fase 7 del roadmap)

Hecha leyendo el código real de las pantallas principales contra las
reglas explícitas de `DESIGN.md`, con la pregunta de control que el
propio documento propone: *¿esto lo decidió una persona, o es el
default de un generador?* Nota de origen: el plan original pedía correr
esto con un agente sin contexto de la sesión (para juzgar con ojo
fresco); el intento de lanzarlo falló por límite de gasto de la API, así
que se hizo directamente, aplicando la misma vara — cruzando cada
hallazgo contra el texto de `DESIGN.md`, no contra el criterio propio.

No todo lo que se lee acá es un bug: algunos ítems son tensiones reales
entre dos objetivos válidos, marcadas como tales, no como errores.

---

## Alta prioridad

### 1. `MonthlyStats.tsx` inventa una segunda paleta de colores por músculo, distinta de la que ya existe

**Archivo**: `src/components/gym/MonthlyStats.tsx:12-25`

```ts
const MUSCLE_COLORS: Record<string, string> = {
  chest: '#F97316', back: '#3B82F6', shoulders: '#A855F7',
  biceps: '#EC4899', triceps: '#EC4899', forearms: '#EC4899',
  quads: '#10B981', hamstrings: '#10B981', glutes: '#EF4444',
  calves: '#10B981', core: '#F59E0B', cardio: '#06B6D4',
}
```

Ya existe una paleta por grupo muscular, real, ya en uso en el resto de
la app: `tailwind.config.ts:56-65` (`muscle.chest = #FF6B35`,
`muscle.back = #0A84FF`, `muscle.arms = #FF375F`, etc.), consumida por
`MuscleChip.tsx` (`MUSCLE_STYLES`) y por la insignia de equipo de
`Exercises.tsx`. Este archivo no la usa — arma la suya, con **valores
distintos para los mismos músculos**. Resultado concreto: el pecho se
ve de un naranja en el gráfico de torta de "Distribución muscular"
(Progreso → Mes) y de otro naranja distinto en la insignia de cada
ejercicio (Ejercicios) y en los chips (`MuscleChip`). Es el mismo dato
(grupo muscular) con dos identidades visuales según la pantalla.

Esto es además una violación directa de DESIGN.md §1 ("No se inventan
variantes") y del espíritu de "un solo acento por pantalla" — acá hay
ocho colores saturados compitiendo en una torta, el patrón de gráfico
de librería-sin-tocar que el resto de la app evitó a propósito (ver
`Progress.tsx` `ExerciseDot`/`ExerciseTooltip`, que si reemplazan el
estilo default de Recharts).

**Corrección**: borrar `MUSCLE_COLORS` y usar los tokens de
`tailwind.config.ts`. A diferencia de `--color-accent` y el resto, que sí
son custom properties de CSS y por eso los resuelve `useChartColors.ts`
vía `getComputedStyle`, `colors.muscle` en `tailwind.config.ts` son
literales hardcodeados directo en la config de Tailwind — no hay
`--muscle-*` en `index.css` (verificado, cero resultados). No alcanza con
sumarlos a `useChartColors.ts`: hace falta un módulo TS nuevo con los
mismos valores literales, a mantener en sync a mano con
`tailwind.config.ts`. Implementado en `src/lib/muscleColors.ts`
(`MUSCLE_HEX`), consumido por `MonthlyStats.tsx`.

---

### 2. Barra de progreso de logros anima `width`, no `transform`

**Archivo**: `src/components/gym/AchievementsPanel.tsx:42-47`

```tsx
<div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
  <div
    className="h-full rounded-full bg-accent transition-all duration-700"
    style={{ width: `${(count / total) * 100}%` }}
  />
</div>
```

DESIGN.md §4 es explícito: *"Solo se animan `transform` y `opacity`.
Animar `width`/`height`/`padding` provoca layout thrash."* Esto anima
`width` con `transition-all` (que además anima TODO lo animable, no
solo lo necesario). La corrección ya vive en el mismo repo, dos veces:
`StrengthLevels.tsx:105-109` y `HoldButton.tsx` usan
`transform-origin` + `scaleX()`, exactamente el patrón correcto, para
la misma clase de barra de progreso.

**Corrección**: `className="h-full origin-left rounded-full bg-accent
transition-transform duration-700"` + `style={{ transform:
scaleX(${count / total}) }}`.

---

### 3. Dos expansiones de `backdrop-filter`/glow más allá de lo que permite DESIGN.md, ambas auto-documentadas al momento de hacerlas

**Archivos**: `src/components/gym/RoutineStackCard.tsx` (aura de acento
en la carta al frente del mazo) y `src/pages/Exercises.tsx` (insignia
de equipo con `backdrop-blur-xs`).

DESIGN.md §1: *"Nunca [el acento] con `box-shadow` del mismo color."*
DESIGN.md §3: *"`.glass` se permite EXCLUSIVAMENTE en dos lugares: la
cabecera fija y la barra de pestañas."* Ambos casos violan la regla
tal cual está escrita, y ambos lo saben — los comentarios en el propio
código lo dicen ("esto es exactamente el anti-patrón que DESIGN.md
§0.5 marca...", "expande `backdrop-filter` a una superficie nueva más
allá de header/tab bar/sheets"). Fueron pedidos explícitos del usuario
en su momento, no descuidos. Se marcan acá porque:

- El aura de `RoutineStackCard` evade el chequeo automático
  `test:style` a propósito (usa `rgb(var(--color-accent)/alpha)` en
  vez de un literal `rgba(230,...)`, que es justo lo que el regex de
  `scripts/test-style-rules.mjs` busca) — el test sigue en verde pero
  ya no está verificando lo que se supone que verifica para este caso.
- Si en algún momento se decide que la regla vuelve a ser estricta sin
  excepciones, estos dos son los puntos a revertir.

**No se proponen cambios acá** — son decisiones tomadas con el usuario
presente, no bugs. Se dejan anotadas para que quede un registro central
de "dónde el sistema real diverge del documento", en vez de que esa
información solo viva dispersa en comentarios de código.

---

## Media prioridad

### 4. La etiqueta "eyebrow" que DESIGN.md prohíbe explícitamente sigue viva en dos pantallas

**Archivos**: `AchievementsPanel.tsx:36`, `MonthlyStats.tsx:171`

```tsx
<h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">Logros</h2>
<h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">Distribución muscular</h3>
```

DESIGN.md §2, textual: *"Etiquetas diminutas en mayúsculas con
tracking abierto ('eyebrow'). Es el tell más repetido en headers
generados."* Ya existe `SectionHeader` (`src/components/ui/Card.tsx`)
construido específicamente para reemplazar este patrón — y se usa
correctamente en el resto de `Progress.tsx` (`RecentWorkouts`,
`Charts()` después de la Fase 2 de este roadmap) y en `Ajustes.tsx`.
Estos dos archivos quedaron afuera cuando el resto de la app migró.

**Corrección**: `<SectionHeader title="Logros" action={<span className="font-mono text-sm text-accent">{count}/{total}</span>} />` y equivalente en `MonthlyStats.tsx`.

---

### 5. Texto por debajo del piso de 12px declarado

**Archivo**: `AchievementsPanel.tsx:65`

```tsx
<p className="truncate text-[11px] text-ink-3">{a.description}</p>
```

DESIGN.md §2: *"Piso duro: 12px. Nada funcional por debajo."* La
descripción del logro es información real (qué hay que hacer para
desbloquearlo), no un detalle decorativo — debería ser `text-[12px]`
como el resto de los metadatos de la app.

---

### 6. El mazo de rutinas, al sacarle el ángulo, perdió su único diferenciador visual

**Archivos**: `RoutineStack.tsx`, `RoutineStackCard.tsx`

Tensión real, no bug: el pedido explícito de "cartas derechas, sin
ángulo, para poder agarrar una en particular" (atendido en una fase
anterior de esta sesión) resolvió un problema de usabilidad genuino —
pero también le sacó al stack la rotación/desplazamiento lateral que
era la única señal visual de que esto es un "mazo" y no una lista
vertical con mucho espacio entre ítems (`Y_STEP = 64`, sin `X_STEP` ni
`ROTATE_STEP`). Con dos rutinas se nota poco; con cuatro o más, la
pantalla de Rutinas es efectivamente una lista vertical larga con
huecos grandes entre tarjetas, no un mazo. El aura de acento en la
carta al frente (hallazgo #3) hoy hace buena parte del trabajo de
"esto es un conjunto, no una lista" que antes hacía la geometría.

**No hay una corrección obvia que no reabra la usabilidad que se
arregló** — se anota como algo a tener en cuenta si en algún momento
se vuelve a tocar esta pantalla: por ejemplo, un espaciado NO uniforme
entre cartas (que decrece a medida que se aleja del frente, en vez de
`Y_STEP` fijo) daría sensación de profundidad sin reintroducir el
ángulo que complicaba agarrar una carta puntual.

---

### 7. Ocho pestañas de igual peso visual en Progreso, sin jerarquía

**Archivo**: `src/pages/Progress.tsx:40-64`

`summary / charts / month / levels / achievements / photos / prs /
history` — ocho pills de texto, mismo tamaño, mismo peso, en una fila
con scroll horizontal. Ninguna se distingue como "la que se usa más" (
presumiblemente `summary`, que ya es la que carga por defecto). En
393px de ancho probablemente entran 3-4 pills completas antes de que
haga falta scrollear — el resto se descubre por accidente. No es un
anti-patrón de DESIGN.md puntual, pero es la clase de pantalla que en
apps de referencia (Hevy separa "Historial"/"Estadísticas"/"Rutinas"
como destinos de navegación distintos, no sub-pestañas de una sola
pantalla) resuelve distinto: menos ítems por nivel, más jerarquía.

**No se propone una restructuración acá** (es un cambio de
arquitectura de información, no un ajuste de estilo) — se deja anotado
para una eventual revisión de cuántas de estas ocho vistas son
realmente de uso frecuente vs. archivo/consulta ocasional.

---

### 8. Estado vacío ad-hoc en vez de reusar `EmptyState`

**Archivo**: `MonthlyStats.tsx:218-222`

```tsx
{stats.sessions === 0 && (
  <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
    Sin entrenos este mes.
  </p>
)}
```

`EmptyState` (`src/components/ui/Card.tsx`) ya existe y se usa
correctamente en la pestaña de al lado en la misma sesión de Progreso
(`StrengthLevels.tsx`, `PRList` en `Progress.tsx`) — mismo problema
que el hallazgo #4: un archivo que quedó afuera de la convención ya
establecida en sus vecinos directos.

---

## Confirmado, no es un hallazgo

Para que quede constancia de que no todo lo leído se trató como
sospechoso por default:

- El reverso de `RoutineStackCard` (fila de acciones con íconos:
  compartir/favorito/eliminar/cerrar) y los accesos de `Profile.tsx`
  son deliberadamente planos — es el patrón de Ajustes de iOS que
  DESIGN.md pide explícitamente (§3, "una tarjeta con filas separadas
  por hairlines"), no una superficie sin trabajar.
- `StrengthLevels.tsx` y `HoldButton.tsx` ya usan `scaleX`/`transform`
  correctamente — son la referencia a copiar en los hallazgos #2/#4,
  no parte del problema.
- La insignia de equipo de `Exercises.tsx` (ícono propio + tinte por
  músculo) y los puntos de PR del gráfico de `Progress.tsx`
  (`ExerciseDot`) son ejemplos reales de evitar el look "librería sin
  tocar" que se le pidió a esta auditoría que buscara — no hace falta
  tocarlos.

---

## Cómo se usó esto

Los hallazgos #1, #2, #4, #5 y #8 son correcciones concretas,
verificables, de bajo riesgo (no cambian ningún comportamiento, solo
alinean código existente con reglas ya escritas) — se implementaron como
parte de esta misma Fase 7 (`src/lib/muscleColors.ts` nuevo,
`MonthlyStats.tsx` y `AchievementsPanel.tsx` corregidos). Los hallazgos
#3, #6 y #7 quedan documentados para decisión humana futura, no
autoimplementados: #3 son decisiones ya tomadas con el usuario que no
corresponde revertir sin que lo pida; #6 y #7 son tensiones/cambios de
alcance mayor al de un ajuste de estilo. `npx tsc -b`, `npm test`
(incluye `test:style`) y el build de producción pasaron en verde sobre
el resultado final.
