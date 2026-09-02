# 21 — Modo coach / personal trainer (núcleo, B11)

**Alcance de esta versión** (decisión del usuario): cuentas de coach,
vínculo coach↔alumno por invitación (link/QR) cortable por cualquiera de
las dos partes, el coach ve el progreso de sus alumnos activos y les asigna
rutinas y metas, verificado amarillo (solo lo pone el admin).

**Fase 2, fuera de este bloque**: chat + adjuntos, reseñas/valoración,
unicidad por DNI + verificación, método de pago (maqueta y real).

## Rol

`coach` en `app_metadata` (lo pone el admin vía la Edge Function
`admin-users`, B10). `CoachRoute` (`src/components/ProtectedRoute.tsx`)
gatea el área con el mismo `sessionChecked` que `AdminRoute`. Un `admin`
también entra.

## Datos — `supabase/migrations/0012_coach.sql`

| Tabla | Para qué | RLS |
|---|---|---|
| `coaches` | ficha del coach (`display_name`, `bio`, `experience_years`, `verified`) | el coach gestiona la suya (`coaches_self`); lectura pública para autenticados; `admin` puede todo. Un **trigger** (`coaches_guard_verified`) impide que el coach se ponga `verified` — solo el admin. |
| `coach_invites` | código corto por coach (`code`, `expires_at`) | el coach maneja los suyos; cualquiera autenticado resuelve un código vigente para previsualizar |
| `coach_clients` | el vínculo (`coach_id`, `client_id`, `status` pending/active/ended) | lo ven las dos partes; el **alumno** lo crea (`coach_clients_client_accepts`) y solo si existe una invitación vigente de ese coach; cualquiera de los dos lo pasa a `ended` |
| `client_goals` | metas asignadas | lee el coach o el alumno; escribe el coach si `is_coach_of(client)` |
| `routines.source_coach_id` | marca la rutina copiada por un coach | — |

**`is_coach_of(client uuid)`**: helper `stable` — ¿el que llama es coach
`active` de ese alumno? Lo usan las policies nuevas:

- `routines_coach` / `routine_days_coach` / `routine_exercises_coach`:
  **RW** (para armar y empujar la copia; el alumno la posee y la edita por
  su `_own` de siempre).
- `workouts_coach_read`, `workout_sets_coach_read`,
  `personal_records_coach_read`, `body_measurements_coach_read`,
  `achievements_coach_read`: **solo lectura** (monitoreo). `calorie_entries`
  y `progress_photos` quedan **fuera** a propósito (privacidad); `runs` es
  local, sin RLS.

**RPC `coach_client_summaries()`** (`security definer`): el coach no puede
leer `auth.users` ni `profiles` ajenos — este RPC le devuelve solo lo suyo
(alumnos activos + nombre + email).

## Cliente

- `src/lib/coachQueries.ts` / `coachMutations.ts` — lecturas y escrituras,
  todas en vivo contra Supabase (como `adminQueries`).
- `src/pages/coach/`: `CoachHome` (`/coach`, lista de alumnos),
  `CoachClientDetail` (`/coach/alumno/:id`, overview + rutinas + metas +
  cortar vínculo), `CoachInvite` (`/coach/invitar`, código + link + QR),
  `CoachProfile` (`/coach/perfil`, también onboarding).
- `src/pages/JoinCoach.tsx` (`/unirse/:code`) — preview + aceptar.
- `src/components/gym/VerifiedBadge.tsx`, `MyCoachCard.tsx` ("Tu coach" +
  metas en el perfil del alumno).
- Entrada: fila "Mis alumnos" en Perfil cuando el rol es `coach`/`admin`
  (no se sumó una 6ª pestaña — la tab bar mobile tiene una pastilla de
  ancho fijo con arrastre y 5 posiciones).

### Compromisos de núcleo (a completar en fase 2)

- **Asignar rutina** = elegir una de las 6 plantillas de
  `ROUTINE_TEMPLATES` y empujarla como copia. Armar una rutina a medida
  para un alumno desde `RoutineEditor` queda pendiente.
- **Metas** del alumno se muestran en su Perfil (`MyCoachCard`), no en una
  sección nueva de Progreso.
- Sin `used_count`/`max_uses` enforcement en las invitaciones.

## Pasos de despliegue (el usuario)

1. Correr `supabase/migrations/0012_coach.sql` en el SQL Editor.
2. **Advisors → Security**: confirmar que sigue en cero (las policies nuevas
   son todas `to authenticated` con `is_coach_of`/`auth.uid()`).
3. Prueba de humo:
   - Admin promueve la cuenta B a `coach` (`/admin/usuarios`).
   - B entra, ve "Mis alumnos" en Perfil, completa su ficha, genera una
     invitación.
   - Cuenta A abre `/unirse/:code`, ve a B, acepta.
   - B ve a A en `/coach`, abre su detalle, le asigna una plantilla y una
     meta.
   - A ve la rutina en "Mis rutinas" (tras sync) y la meta en Perfil → "Tu
     coach".
   - A toca "Finalizar vínculo": B deja de ver los datos de A (RLS).
   - Una cuenta C cualquiera NO puede leer datos de A ni de B.
