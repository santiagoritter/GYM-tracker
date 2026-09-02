# DESIGN.md — Sistema de diseño de GymTracker

Fuente de verdad de tokens y decisiones visuales. Si un valor no está acá, no
se usa: se agrega primero a este documento y después al código.

Referencia estética: **Apple / Apple Music**. Minimalista, jerarquía
tipográfica clara, aire generoso, movimiento sutil y con propósito.

---

## 0. Por qué existe este documento

El objetivo declarado es que el diseño **no se note hecho con IA**. Eso no se
logra con buen gusto genérico: se logra evitando un conjunto concreto de
tics que los generadores repiten. La lista de referencia es la de
[Impeccable](https://impeccable.style/slop) (65 anti-patrones).

La app **ya tenía varios de esos tics**. Auditoría inicial:

| Anti-patrón | Dónde estaba | Resolución |
|---|---|---|
| Dark mode con glow de acento | `shadow-accent`, `drop-shadow` lima en la tab bar, filtro SVG en el monigote | Eliminado |
| Glassmorphism decorativo | `.glass` disponible para cualquier superficie | Restringido a 2 superficies de chrome |
| Over-rounding | `rounded-2xl` (24px) y `rounded-3xl` (32px) en tarjetas chicas | Escala nueva: tarjetas 12–16px |
| Bounce / elastic easing | `ease-spring` = `cubic-bezier(0.34,1.56,0.64,1)` | Solo para el check de serie completada |
| Tarjetas anidadas | `bg-surface` conteniendo `bg-surface-2` en entreno y editor | Se aplana con separadores y espaciado |
| Fondo negro puro | `bg: #000000` | Tintado hacia el acento |
| Fuente sobreexpuesta | `Inter` en el stack | Fuera; SF Pro primero |
| Emojis | 11 archivos | Eliminados, con test que lo verifica |

---

## 1. Color

Modo oscuro es el default. El claro existe pero es secundario (§2.7 de
`Redisenio.md`).

### Superficies

```
bg           #0B0B0C   fondo de la app
surface      #16161A   tarjeta / fila elevada
surface-2    #1F1F25   control dentro de una tarjeta
surface-3    #2A2A32   estado presionado
```

No es negro puro. `#000000` con un acento saturado encima es la firma del
"dark mode con glow" generado; un neutro apenas tintado hacia el violeta del
acento da profundidad sin halo. La diferencia entre `bg` y `surface` es de
solo 11 puntos de luminancia: la jerarquía la hace el espaciado, no el
contraste de fondos.

### Acento

```
accent       #E8FF47   lima
accent-dim   #C8E030   presionado
accent-soft  rgba(232,255,71,0.12)   fondo de estado activo
```

Se mantiene el lima. **No es** ninguno de los tells de la lista (violeta,
cyan-sobre-oscuro, gradiente púrpura-azul) y ya es la identidad del producto.

Reglas de uso:
- Un solo acento por pantalla. Si dos cosas compiten por ser lo importante,
  una de las dos no lo es.
- Nunca como fondo de bloques grandes: es de alta luminancia y cansa.
- Nunca con `box-shadow` del mismo color. Un halo lima alrededor de un botón
  lima es exactamente el tell que estamos evitando.
- Nunca en texto con gradiente.

### Texto

```
ink          #FFFFFF                    títulos, números
ink-2        rgba(235,235,245,0.62)     cuerpo
ink-3        rgba(235,235,245,0.34)     etiquetas, metadatos
ink-4        rgba(235,235,245,0.18)     deshabilitado
```

`ink-3` es el piso: por debajo no se cumple WCAG AA sobre `surface`. Texto
gris sobre fondo de color está prohibido — se usa blanco o un tono más
oscuro del propio fondo.

### Semánticos

```
success  #30D158    warning  #FFD60A    danger  #FF453A    info  #0A84FF
```

Paleta de sistema de iOS. No se inventan variantes.

### Separadores

```
line     rgba(120,120,128,0.28)
line-2   rgba(120,120,128,0.16)
```

Un separador **o** una sombra, nunca los dos: borde de un pelo con sombra
difusa ancha es firma de UI generada.

### Modo claro

Existe pero es secundario. Toda la paleta clara se rehízo en la tanda de
expansión (B2) porque la anterior era ilegible: `ink-2`/`ink-3` a 0.6/0.3 de
alpha y un acento (`84 132 20`) que apenas llegaba a 4.5:1 y leía "oliva
militar". Los valores de abajo se calcularon con WCAG 2.1 real; los ratios
anotados son contra `surface` (blanco) salvo aclaración.

```
bg           #F2F2F5
surface      #FFFFFF   tarjeta
surface-2    #EDEDF1   un escalón sobre el fondo (skeletons, celdas vacías) — distinguible a propósito
surface-3    #E0E0E5   presionado
ink          #18181B   títulos          (~18:1)
ink-2        rgba(28,28,32,0.75)   cuerpo secundario   (~6.9:1)
ink-3        rgba(28,28,32,0.62)   metadatos — el piso AA   (~4.5:1)
ink-4        rgba(28,28,32,0.35)   solo deshabilitado
accent       #3F6E0C   verde-lima profundo   (~6.1:1 sobre blanco, ~5.2:1 sobre surface-2)
accent-dim   #32580A   presionado
line         rgba(0,0,0,0.15)
line-2       rgba(0,0,0,0.08)
```

Notas:

- **El acento pierde el amarillo.** Un lima brillante no puede ser legible
  como texto sobre blanco; el precio de cumplir AA es un verde profundo. Los
  botones rellenos (`bg-accent text-bg`) siguen bien porque ambos tokens
  invierten con el tema (texto casi blanco sobre verde, ~7:1).
- **Semánticos** más oscuros que iOS (`#1E8533` / `#A56900` / `#C82A2A` /
  `#0D63D5`): los de Apple (`#34C759`, `#FF9500`) fallan como texto/ícono
  chico sobre blanco.
- **Grupo muscular**: los tonos saturados de modo oscuro no llegan a 4.5:1
  como texto de chip sobre blanco. Variantes propias en `[data-theme=light]`
  de `index.css` (`--muscle-*`), misma identidad de hue, ratios 4.9–6.0.
  Recharts las lee vía `useMuscleColors()` (mismo patrón que `useChartColors`).
- **`card-shine`** y el sweep de `.skeleton` tienen override en claro: el
  inset blanco y el brillo blanco no se ven sobre blanco.
- `applyTheme` setea `color-scheme` en `<html>` para que inputs nativos
  (date/time), scrollbars y autofill sigan el tema.
- **Pendiente**: verificación visual en pantalla real (no hay navegador
  disponible en el entorno de trabajo). Contraste sí verificado con WCAG 2.1.

---

## 2. Tipografía

```
sans   -apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif
mono   "SF Mono", ui-monospace, "JetBrains Mono", monospace
```

**Inter queda fuera del stack.** Está en tantos sitios que ya no distingue
nada, y en un iPhone la fuente del sistema se ve mejor que cualquier
webfont cargada por red. En Android cae a Roboto, que también es nativa.

### Escala

Ratio 1.25 mínimo entre pasos, para que la jerarquía se lea sin esfuerzo.

| Token | px | Uso |
|---|---|---|
| `display` | 34 / 700 / -0.02em | número protagonista de una pantalla |
| `title` | 26 / 700 / -0.01em | título de pantalla |
| `heading` | 20 / 600 | título de sección |
| `body` | 16 / 400 | texto corrido, **mínimo para inputs** |
| `label` | 14 / 500 | etiquetas de formulario, botones secundarios |
| `caption` | 12 / 500 | metadatos |

Piso duro: **12px**. Nada funcional por debajo.

Interlineado: 1.5–1.7 en texto corrido, 1.1–1.25 en títulos.
Medida: máximo 70 caracteres por línea.

Prohibido:
- Etiquetas diminutas en mayúsculas con tracking abierto ("eyebrow"). Es el
  tell más repetido en headers generados. El texto de sección va en
  `heading` normal.
- Mayúsculas en párrafos.
- Tracking por encima de 0.02em en texto corrido.
- Números tabulares en datos que cambian (peso, reps, cronómetro): van con
  `font-variant-numeric: tabular-nums` para que no bailen.

---

## 3. Forma y espacio

### Radios

```
xs   6px    chips, badges
sm   10px   inputs, botones
md   14px   tarjetas            <- el default
lg   18px   contenedores grandes
full 9999px pills y avatares
```

Tope de 18px en tarjetas. Redondear todo a 24px+ convierte cada elemento en
la misma mancha blanda.

### Espaciado

Escala de 4px: `4 8 12 16 24 32 48`.

Agrupación por proximidad, no por cajas: elementos relacionados a 8px,
secciones separadas a 24–32px. **Un mismo valor repetido en toda la página
no es un sistema, es ausencia de ritmo.**

Padding interno mínimo en cualquier contenedor con borde o fondo: 12px.

### Superficies

**Nada de tarjetas dentro de tarjetas.** Si un bloque necesita agrupar
sub-bloques, se usan separadores y espaciado, no un segundo fondo. El
patrón correcto es el de Ajustes de iOS: una tarjeta con filas separadas
por hairlines.

`.glass` (backdrop-filter) se permite **exclusivamente** en dos lugares: la
cabecera fija y la barra de pestañas. Ahí resuelve un problema real —
contenido que scrollea por debajo de un chrome fijo — y es el patrón nativo
de iOS. En cualquier otro lado es decoración.

Sombras: solo neutras y solo para elevación real (sheets, overlays).
Prohibidas las de color y las de negro puro.

### Ancho de contenido

```
mobile   32rem (512px)   columna centrada, es el max-w-lg de siempre
desktop  sin tope fijo   en Inicio, Progreso y el panel de usuarios del
                         admin, que pasan a grid multi-columna a partir
                         de 1024px (`lg:`)
```

El resto de las pantallas (listas lineales, flujos, detalle) mantiene la
columna centrada también en desktop — forzar columnas ahí es la
abstracción que no hace falta. El breakpoint único es 1024px: por debajo,
la app es idéntica a hoy: un solo diseño mobile, sin ramas.

---

## 4. Movimiento

Duraciones: 120ms micro-interacción · 220ms transición de estado ·
320ms entrada de sheet.

Curvas:
```
standard  cubic-bezier(0.25, 0.46, 0.45, 0.94)   todo lo demás
decel     cubic-bezier(0, 0, 0.58, 1)            entradas
```

**Sin bounce ni elastic en elementos de interfaz.** El overshoot está
permitido en un único lugar: el check de serie completada, porque marca un
logro físico y es momentáneo.

Reglas:
- Solo se animan `transform` y `opacity`. Animar `width`/`height`/`padding`
  provoca layout thrash.
- Nada pulsa si el dato no está cambiando de verdad.
- Nada se mueve solo (marquees, autoscroll).
- Todo respeta `prefers-reduced-motion`.
- El contenido se sirve visible y la animación lo mejora, nunca al revés.

---

## 5. Componentes

Base en `src/components/ui/`, dominio en `src/components/gym/`.

- **Botón**: alto mínimo 44px. Variantes `primary` (acento), `secondary`
  (fill), `ghost`. Padding horizontal mayor que el vertical.
- **Tarjeta**: `surface`, radio `md`, padding 16px. Sin borde si tiene
  sombra; sin sombra si tiene borde.
- **Fila de lista**: alto mínimo 44px, hairline entre filas, chevron a la
  derecha solo si navega.
- **Input**: alto 44px, `body` (16px, obligatorio para no disparar el zoom
  de iOS), selección completa al enfocar.
- **Sheet**: entra desde abajo, radio `lg` arriba, drag handle, respeta
  `env(safe-area-inset-bottom)`.
- **Iconos**: solo Lucide, `strokeWidth` 1.8 (2.2 en estado activo). Nunca
  mezclar familias. **Cero emojis.**

Estados obligatorios en cualquier vista con datos: vacío, cargando, error.
Nunca una pantalla en blanco.

---

## 6. Accesibilidad

- Contraste AA: 4.5:1 en cuerpo, 3:1 en texto grande.
- Target táctil mínimo 44×44px.
- Foco visible con `:focus-visible`, nunca `outline: none` a secas.
- Jerarquía de headings sin saltos.
- Todo control interactivo con nombre accesible.
- `viewport-fit=cover` + `env(safe-area-inset-*)` en todo chrome fijo.

---

## 7. Verificación

`npm run test:style` verifica automáticamente lo que se puede verificar:
cero emojis y cero auras de color en los archivos de `src/`.

El resto es criterio, y la pregunta de control es siempre la misma: **¿esto
se ve como algo que decidió una persona, o como el default de un
generador?** Ante la duda, quitar.
