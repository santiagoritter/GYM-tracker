# 17 — Estado del rediseño (rama `beta`)

Actualizado al cierre de la sesión del 4 de agosto de 2026.

## Ramas

| Rama | Estado |
|---|---|
| `alpha` | Snapshot estable previo al rediseño. Congelada. |
| `beta` | Rediseño en curso. **Acá se trabaja.** |
| `main` | Producción (GitHub Pages). Sin los cambios de `beta`. |

Solo `main` dispara el deploy, así que nada de esto tocó todavía lo que el
usuario tiene en el teléfono.

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
  hairlines.
- **Progreso** (§3.3): recibe "Últimos entrenos".

---

## Pendiente

### Bloqueado
- **§2.5 Supabase**: SQL listo en `supabase/migrations/`, pasos en
  `docs/13`. Falta que el usuario cree el proyecto.
- **§2.8 Rutina más popular**: necesita el backend.
- **iOS**: `npx cap add ios` solo corre en macOS.

### Sin empezar
- **§1.2** Rediseñar la sección de ejercicios dentro de una rutina
  (`RoutineEditor`). Sigue con tarjetas anidadas.
- **§1.3** Auditoría de overflow en el resto de las pantallas. Solo se
  revisó Entreno.
- **§2.1** Pantalla de calculadora de pesos. El motor ya existe en
  `src/lib/recommendation.ts` (Epley + %1RM); falta la UI y sumar Brzycki.
- **§2.3** Niveles por grupo muscular. Hoy `StrengthLevels` cubre 5
  ejercicios; falta agregarlo por grupo.
- **§2.6** Contador de calorías.
- **§2.7** Pantalla de configuración + tema claro.
- **§3.1** Spec de design system con Fable (se hizo a mano en `DESIGN.md`).
- Aplicar las primitivas de `Card.tsx` a Rutinas, Perfil, Medidas,
  Recordatorios y Ejercicios.

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
2. **Merge de `beta` a `main`**: ¿cuándo? Hay valor ya desplegable (el fix
   del stepper, el contenido de los 107 ejercicios, el recomendador), pero
   §3.5 pide validar el rediseño antes.
