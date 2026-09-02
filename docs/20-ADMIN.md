# 20 — Panel de admin

`/admin` (entrada, `Admin.tsx`) y `/admin/usuarios` (`AdminUsers.tsx`),
detrás de `AdminRoute` (rol `admin` en el JWT + `sessionChecked`, ver
`docs/19`).

## Lectura (ya existía, 0008)

`src/lib/adminQueries.ts` lee Supabase **en vivo** vía las policies
`*_admin_read` (`0008_admin_rls_domain.sql`): actividad cross-user
(entrenos, volumen, PRs por semana). No pasa por Dexie — es la única parte
de la app que no funciona offline, a propósito.

## Escritura sobre cuentas (B10)

`auth.admin.*` necesita la **service_role key**, que no puede ir al
frontend. Todo pasa por la **Edge Function `admin-users`**
(`supabase/functions/admin-users/index.ts`):

1. Lee el JWT del `Authorization` header, resuelve el usuario con la
   service_role y **confirma que su `app_metadata.role === 'admin'`** — el
   cliente nunca manda un `userId` para "decidir" nada (`CLAUDE.md §5`).
2. Ejecuta la acción con la service_role.
3. Deja una fila en `admin_audit` (`0011`): actor, acción, target, detalle.

Acciones (`src/lib/adminMutations.ts` las invoca):

| acción | qué hace |
|---|---|
| `list` | lista cuentas con email, alta, último acceso, rol, si está deshabilitada |
| `setRole` | `user` / `coach` / `admin` en `app_metadata` (`user` = sin `role`) |
| `updateEmail` | cambia el email, lo marca confirmado |
| `sendPasswordReset` | dispara el email de recuperación (cliente anon, plantilla configurada) |
| `setBanned` | deshabilita / reactiva la cuenta (`ban_duration`) |
| `createUser` | alta con email + contraseña + rol, email confirmado |

`admin_audit` es solo-lectura para admins (`admin_audit_admin_read`); nadie
escribe desde el cliente. `AdminUsers.tsx` muestra las últimas 50 acciones.

## Pasos de despliegue (el usuario, en el dashboard / CLI)

1. Correr `supabase/migrations/0011_admin_audit.sql` en el SQL Editor.
2. Desplegar la función **con** verificación de JWT (quien llama es un
   usuario con sesión):
   ```
   supabase functions deploy admin-users
   ```
   No hace falta setear secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` ya están en el entorno de Edge Functions.
3. Verificar: como admin, abrir `/admin/usuarios` → la lista carga vía la
   función. Cambiar el rol de una cuenta de prueba a `coach` y confirmar
   que esa cuenta ve la navegación de coach al re-loguear. Como no-admin,
   `supabase.functions.invoke('admin-users', ...)` tiene que devolver 403.
