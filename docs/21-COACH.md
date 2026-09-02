# 21 — Modo coach / personal trainer (núcleo, B11)

**Alcance de esta versión** (decisión del usuario): cuentas de coach,
vínculo coach↔alumno por invitación (link/QR) cortable por cualquiera de
las dos partes, el coach ve el progreso de sus alumnos activos y les asigna
rutinas y metas, verificado amarillo (solo lo pone el admin).

**Fase 2, fuera de este bloque**: chat + adjuntos, reseñas/valoración,
unicidad por DNI + verificación, método de pago (maqueta y real).

## Rol

`coach` en `app_metadata`. Se obtiene de dos formas:

- **Self-serve** (lo normal): Ajustes → "Convertirme en coach" → carga nombre,
  DNI, experiencia y bio → Edge Function **`become-coach`** valida el DNI
  (único), setea `role: 'coach'` con la service_role (sin degradar a un
  `admin`), crea `coaches` + `coach_identity`, y el cliente hace
  `supabase.auth.refreshSession()` para que el JWT nuevo traiga el rol.
  `src/lib/coachSelfSignup.ts` + `src/components/gym/CoachSignupSheet.tsx`.
- **Admin**: `/admin/usuarios` → selector de rol → `coach` (Edge Function
  `admin-users`, B10). Útil para degradar o para casos especiales.

`CoachRoute` (`src/components/ProtectedRoute.tsx`) gatea el área con el mismo
`sessionChecked` que `AdminRoute`. Un `admin` también entra. El **verificado
amarillo** NO se otorga en ningún flujo self-serve — siempre lo pone un
admin tras cotejar el DNI (trigger `coaches_guard_verified` en 0013).

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

## Fase 2 — chat, reseñas, DNI, maqueta de pago

Migración `supabase/migrations/0013_coach_phase2.sql`.

| Tabla / función | Para qué | RLS |
|---|---|---|
| `coach_identity` (`coach_id pk`, `dni`) | DNI **único** por cuenta de coach — impide cuentas duplicadas y habilita el cotejo de verificación (que sigue haciendo el admin). Tabla **aparte** de `coaches` porque `coaches` es `public_read` y RLS es por fila, no por columna: acá el DNI solo lo ven el dueño y el admin. | `coach_id = auth.uid()` o admin |
| `coach_reviews` (`rating 1..5`, `comment`) | una reseña por alumno por coach (`unique(coach_id, client_id)`) | lectura pública; escribe el alumno si `has_bonded_with(coach)` (cualquier estado — un ex-alumno puede reseñar) |
| `coach_messages` (`sender_id`, `body`, `attachment_kind`, `attachment_ref`, `read_at`) | chat del hilo `(coach_id, client_id)` | lo ven las dos partes; se **inserta solo con vínculo `active`** (si termina, el historial se lee pero nadie escribe más); el que recibe marca `read_at` |
| `has_bonded_with(coach)` | helper `stable` | — |
| `alter publication supabase_realtime add table coach_messages` | entrega en tiempo real (respeta la RLS de SELECT) | — |

**Cliente**: `src/lib/coachChat.ts` (Realtime con fallback a polling de 4 s si el
websocket no engancha en 3 s), `coachReviews.ts`, `coachIdentity.ts`,
`coachSubscription.ts` (maqueta — `isCoachBillingEnabled()` = `VITE_COACH_BILLING === 'on'`,
hoy off).

**UI**: `src/components/gym/ChatThread.tsx` (hilo compartido; adjuntar un ejercicio del
catálogo o una plantilla de rutina; el alumno importa la rutina desde el mensaje con
`importPayload`). Rutas `/coach/alumno/:id/chat` y `/mi-coach/chat` (`src/pages/coach/ChatPages.tsx`).
`CoachProfile.tsx` suma el campo **DNI** (obligatorio) + sección de reseñas + link a
`/coach/plan` (`CoachPlan.tsx`, maqueta). `MyCoachCard.tsx` suma "Mensajes" y "Dejar una
reseña" (estrellas + comentario). `JoinCoach.tsx` muestra `★ promedio (n)` en el preview.

**CSP**: `index.html` suma `wss://*.supabase.co` a `connect-src` para Realtime.

**Pago real**: queda para más adelante (Mercado Pago). `coachSubscription.ts` es el único
punto a tocar cuando se integre.

## Pasos de despliegue (el usuario)

1. Correr `supabase/migrations/0012_coach.sql` **y** `0013_coach_phase2.sql` en el SQL Editor.
2. Desplegar las Edge Functions (con verificación de JWT):
   `supabase functions deploy admin-users` y `supabase functions deploy become-coach`.
3. **Advisors → Security**: confirmar que sigue en cero (las policies nuevas
   son todas `to authenticated` con `is_coach_of`/`has_bonded_with`/`auth.uid()`).
4. Confirmar que Realtime está habilitado en el proyecto (default sí) — el chat lo usa.
5. Prueba de humo:
   - La cuenta B va a Ajustes → "Convertirme en coach", carga sus datos → queda coach
     (o el admin la promueve desde `/admin/usuarios`).
   - B entra a "Mis alumnos" (Ajustes o Perfil), completa/edita su ficha, genera una
     invitación.
   - Cuenta A abre `/unirse/:code`, ve a B, acepta.
   - B ve a A en `/coach`, abre su detalle, le asigna una plantilla y una
     meta.
   - A ve la rutina en "Mis rutinas" (tras sync) y la meta en Perfil → "Tu
     coach".
   - A toca "Finalizar vínculo": B deja de ver los datos de A (RLS).
   - Una cuenta C cualquiera NO puede leer datos de A ni de B.
6. Fase 2:
   - B intenta guardar la ficha sin DNI → bloqueado. Carga un DNI → guarda. El mismo DNI
     en otra cuenta de coach → error de duplicado.
   - A abre "Mensajes" desde "Tu coach", le escribe a B con un ejercicio adjunto → B lo
     recibe **en vivo** en `/coach/alumno/:id/chat`.
   - B adjunta una plantilla de rutina → A la importa desde el mensaje.
   - A deja una reseña 5★ → aparece en `CoachProfile` de B y en el preview de `/unirse/:code`.
   - Con el vínculo `ended`: el hilo se lee pero el envío se rechaza (RLS).
   - Cuenta C sin vínculo: no lee el hilo ni puede reseñar a B.
