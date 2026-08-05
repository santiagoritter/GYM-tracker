# 17 — Estado del rediseño (rama `beta`)

Actualizado al cierre de la sesión del 5 de agosto de 2026: cierre de las 6
fases del plan `staged-beaming-wind.md` y merge a `main`.

## Ramas

| Rama | Estado |
|---|---|
| `alpha` | Snapshot estable previo al rediseño. Congelada. |
| `beta` | Rediseño en curso. **Acá se trabaja.** |
| `main` | Producción (GitHub Pages). **Recibió el merge de `beta`** con las 6 fases del plan — el usuario ya lo va a ver en el teléfono tras el próximo deploy del workflow. |

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
- Todo lo anotado en `IDEAS.md` (18 ideas fuera de alcance).
- Segunda pasada de modernización sobre lo ya construido, usando de nuevo
  las referencias de diseño (bklit, kokonutui, dribbble) — en curso al
  cierre de esta sesión, ver el pie de este documento.

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
