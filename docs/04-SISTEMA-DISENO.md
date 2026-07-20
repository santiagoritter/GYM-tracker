# Sistema de Diseño

## Filosofía visual

"Números grandes, espacio generoso, un color de acento."

El gym tracker debe sentirse como un instrumento de precisión, no como una red social. El fondo oscuro reduce el cansancio visual en el gym, los números de peso son el protagonista absoluto, y el color lima de acento guía la atención hacia las acciones principales.

---

## Paleta de colores

### Colores base

```css
/* Fondo principal */
--color-bg:         #0A0A0A;

/* Superficies (cards, inputs, sheets) */
--color-surface:    #141414;
--color-surface-2:  #1C1C1C;  /* Surface elevada */
--color-surface-3:  #242424;  /* Hover states */

/* Bordes */
--color-border:     #2A2A2A;
--color-border-2:   #383838;  /* Bordes más visibles */

/* Texto */
--color-text:       #F0F0F0;  /* Texto principal */
--color-text-2:     #A0A0A0;  /* Texto secundario */
--color-text-3:     #606060;  /* Placeholders, deshabilitados */
```

### Colores de acento

```css
/* Acento principal — lima / neon */
--color-accent:     #E8FF47;
--color-accent-dim: #B8CC30;  /* Hover del acento */
--color-accent-bg:  #E8FF4712; /* Fondo muy sutil de acento */

/* Semánticos */
--color-success:    #4ADE80;  /* Verde — PR, completado */
--color-warning:    #FACC15;  /* Amarillo — pendiente */
--color-danger:     #F87171;  /* Rojo — eliminar, error */
--color-info:       #60A5FA;  /* Azul — informativo */
```

### Colores de músculos (chips)

```css
--muscle-chest:       #F97316;  /* Naranja */
--muscle-back:        #3B82F6;  /* Azul */
--muscle-shoulders:   #A855F7;  /* Violeta */
--muscle-arms:        #EC4899;  /* Rosa */
--muscle-legs:        #10B981;  /* Verde esmeralda */
--muscle-core:        #F59E0B;  /* Ámbar */
--muscle-glutes:      #EF4444;  /* Rojo */
--muscle-cardio:      #06B6D4;  /* Cian */
```

---

## Tipografía

```css
/* UI en general */
font-family: 'Inter', system-ui, sans-serif;

/* Números (peso, reps, tiempo) */
font-family: 'Geist Mono', 'JetBrains Mono', monospace;

/* Jerarquía */
--text-xs:   0.75rem;   /* 12px — labels pequeños */
--text-sm:   0.875rem;  /* 14px — texto secundario */
--text-base: 1rem;      /* 16px — texto normal */
--text-lg:   1.125rem;  /* 18px — subtítulos */
--text-xl:   1.25rem;   /* 20px — títulos de sección */
--text-2xl:  1.5rem;    /* 24px — títulos de página */
--text-3xl:  1.875rem;  /* 30px — números grandes (peso) */
--text-4xl:  2.25rem;   /* 36px — peso en sesión activa */
--text-5xl:  3rem;      /* 48px — timer de descanso */
```

### Reglas tipográficas

- Los pesos levantados usan `Geist Mono`, tamaño `3xl-4xl`, peso `700`
- Los nombres de ejercicios usan `Inter`, `base-lg`, peso `500`
- Las etiquetas de campo usan `Inter`, `sm`, color `text-2`, peso `400`
- Mayúsculas solo para labels de sección cortos (ej. "SETS", "REPS", "KG")

---

## Espaciado

Sistema de 4px base (TailwindCSS por defecto):

```
4px  → space-1   (gaps internos mínimos)
8px  → space-2   (padding de chips, badges)
12px → space-3   (padding de inputs)
16px → space-4   (padding de cards, secciones)
20px → space-5   (gap entre elementos de lista)
24px → space-6   (padding de páginas, secciones)
32px → space-8   (separación entre secciones)
48px → space-12  (padding de páginas en desktop)
```

---

## Componentes clave

### Card de ejercicio en sesión activa

```
┌─────────────────────────────────────────┐
│ ○  Press de Banca           [+ Agregar] │
│    Pecho · Tríceps                      │
│─────────────────────────────────────────│
│  #   Tipo   REPS    KG      RPE    ✓   │
│  1   Calent   12    60      —      ✓   │
│  2   Trabajo   8    80     8.5     ✓   │
│  3   Trabajo   8    80      —      □   │ ← set activo
│─────────────────────────────────────────│
│  [+ Agregar serie]                      │
└─────────────────────────────────────────┘
```

### Row de set activo

- El set activo tiene fondo `surface-2` y borde izquierdo `accent`
- El checkbox al completar se anima con scale + color `success`
- Los inputs de reps y peso tienen botones `−` y `+` a los costados

### Timer de descanso

```
┌─────────────────────┐
│        1:30         │  ← Geist Mono, 5xl
│  ████████░░░░░░░░   │  ← Ring progress
│  [Skip]   [+30s]    │
└─────────────────────┘
```

### Chip de músculo

```
[● Pecho]   ← fondo muscle-chest/20, borde muscle-chest/40, texto muscle-chest
[● Tríceps] ← ídem con color correspondiente
```

### Barra de nivel de fuerza

```
Bench Press    ●────────────●────○────────  Avanzado
               Novato    Intermedio  ↑ Elite
               [Tu 1RM: 100kg]
```

### Card de PR

```
┌─────────────────────┐
│ 🏆 NUEVO PR         │
│ Sentadilla          │
│ 120 kg × 5          │
│ 1RM est.: 136 kg    │
└─────────────────────┘
```

---

## Iconografía

Usar exclusivamente **Lucide React**. Tamaño por defecto: 16px (inline), 20px (botones), 24px (navegación).

Iconos principales:
- `Dumbbell` — ejercicios, entrenamientos
- `Calendar` — rutinas, historial
- `TrendingUp` — progreso
- `Camera` — fotos
- `Trophy` — PRs
- `QrCode` — compartir
- `Timer` — descanso
- `Flame` — racha
- `BarChart2` — estadísticas
- `User` — perfil

---

## Navegación

Barra inferior con 5 tabs (mobile-first):

```
┌──────────────────────────────────┐
│                                  │
│         Contenido                │
│                                  │
├──────────────────────────────────┤
│ 🏋 Hoy  📅 Rutinas  ➕  📈 Stats  👤 Yo │
└──────────────────────────────────┘
```

- Tab activo: icono + label con color `accent`
- Tabs inactivos: icono + label con color `text-3`
- El `➕` central abre el modal de "Iniciar entrenamiento"

---

## Animaciones

```css
/* Transiciones de página */
transition: opacity 150ms ease, transform 150ms ease;

/* Completar un set */
/* checkbox: scale 0.8 → 1.2 → 1, color: border → success */
animation: set-complete 200ms ease;

/* Nuevo PR */
/* card: slide-in desde abajo + glow de acento */
animation: pr-appear 400ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Timer progress ring */
/* stroke-dashoffset animado cada segundo, transición linear */
```

---

## Config de TailwindCSS (extracto)

```ts
// tailwind.config.ts
export default {
  darkMode: 'class', // siempre clase 'dark' en <html>
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: { DEFAULT: '#141414', 2: '#1C1C1C', 3: '#242424' },
        border: { DEFAULT: '#2A2A2A', 2: '#383838' },
        text: { DEFAULT: '#F0F0F0', 2: '#A0A0A0', 3: '#606060' },
        accent: { DEFAULT: '#E8FF47', dim: '#B8CC30', bg: '#E8FF4712' },
        success: '#4ADE80',
        warning: '#FACC15',
        danger: '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
}
```
