# 19 — Seguridad

Estado real de la seguridad de la app, auditado en B7 de la tanda de
expansión. Lo que protege los datos de un usuario de otro es **RLS en
Postgres**, no ningún `if` del frontend.

## Autenticación

- **Supabase Auth**, email + contraseña. Las contraseñas las hashea Supabase
  con **bcrypt** server-side — nunca viajan ni se guardan en claro, y el
  cliente nunca ve el hash. Reemplazó al SHA-256 de una vuelta local de
  `lib/auth.ts` (que el propio `CLAUDE.md §5` marcaba como "no cuenta como
  hasheado").
- Confirmación de cuenta y "olvidé mi contraseña" por **código de 6 dígitos**
  (OTP numérico), no magic link — evita el prefetch de Gmail y el problema de
  PKCE entre dispositivos. Ver `docs/13 §3.3`.
- El **rol** (`admin`/`coach`/`user`) vive en `auth.users.raw_app_meta_data`,
  viaja firmado dentro del JWT, y solo se escribe desde el dashboard o con la
  service_role. El cliente solo lo LEE (`toAuthUser` en `supabaseAuth.ts`).
  Una columna `profiles.role` no serviría: el usuario puede editar su propio
  perfil y ascenderse solo.

## RLS — cobertura

`supabase/migrations/0004_indexes_rls_storage.sql` habilita RLS en las 11
tablas de dominio + `profiles`, todas con la política `<tabla>_own`:
`user_id = (select auth.uid())` (en `profiles`, `id = auth.uid()`), `to
authenticated` (nunca `anon`/`public`). `0008_admin_rls_domain.sql` agrega
`<tabla>_admin_read` (SELECT si `auth.jwt() -> app_metadata ->> role =
'admin'`) para el panel de admin, sin exponer la service_role.

`push_subscriptions` (`0005`) y `calorie_entries` (`0006`): mismo patrón por
`auth.uid()`.

**Verificación obligatoria en el dashboard**: Advisors → Security tiene que
dar **cero** warnings de "RLS disabled in public" y "policy allows anonymous
access". Después de correr `0009_harden_functions.sql`, tampoco debe quedar
"function_search_path_mutable".

## Identidad: nunca confiar en el cliente

Regla de `CLAUDE.md §5` y `docs/13 §3.5`: ninguna llamada del frontend manda
un `userId` para **decidir** qué filas devolver o escribir — lo resuelve RLS
desde el JWT.

- `src/lib/sync.ts` hace `.eq('user_id', userId)` en el pull. **Es un filtro
  de eficiencia** (acota la página que baja), no la compuerta de
  autorización: aunque un atacante cambiara ese valor, RLS igual no le
  devuelve filas ajenas. Queda documentado acá para que no se lea como una
  violación de la regla.
- `admin_list_users()` (RPC) **no recibe parámetros**: resuelve todo
  server-side y su `security definer` solo expone id/email/fecha de alta.
- Cualquier RPC o Edge Function nueva (B10 `admin-users`, B11 coach) tiene
  que re-chequear el rol/identidad server-side (`auth.uid()` / `auth.jwt()`),
  nunca confiar en un id que venga en el body.

## Cliente — qué vive en localStorage y por qué es aceptable

| Clave | Contenido | Riesgo |
|---|---|---|
| `gymtracker-auth` | `userId`, `role`, `name`, `email` (persistidos por zustand) | Es un **hint de UX**. El acceso a datos lo controla RLS con el JWT, que vive aparte (lo maneja `@supabase/supabase-js` en su propio storage). Un `role: admin` falseado a mano en localStorage **no** da acceso a datos ajenos — solo pintaría nav de admin. B7 agrega `sessionChecked`: `AdminRoute` no renderiza hasta que la sesión viva de Supabase confirmó el rol (`onAuthStateChange` en `main.tsx`). `sessionChecked` no se persiste. |
| `gymtracker-spotify` | tokens de Spotify | Bearer de un servicio externo, de vida corta, con refresh. Cada dispositivo conecta su propia sesión. No son datos de entrenamiento. |
| `gymtracker-theme` / `-run` | preferencia de tema / sesión de running en curso | Sin valor sensible. |

## Backup exportable

`exportBackup(userId, passphrase?)` (`src/lib/backup.ts`): sin frase, el JSON
es **texto plano** (nombre, peso corporal, fechas, notas). Con frase, se
cifra con **AES-GCM 256** y clave derivada por **PBKDF2-SHA256 / 210k
iteraciones** (`src/lib/crypto.ts`, WebCrypto, sin dependencias). El import
detecta el formato y pide la frase si hace falta. Recomendado cifrar siempre
que el archivo vaya a salir del dispositivo.

## CSP

`index.html` trae un `<meta http-equiv="Content-Security-Policy">` que acota
red e imágenes a lo que la app usa (Supabase, API/login de Spotify,
carátulas de Spotify, tiles de OSM) y bloquea `object`, `base-uri` y
`form-action` fuera de `self`. `script-src`/`style-src` llevan
`'unsafe-inline'` (bootstrap de tema; estilos inline de React/Tailwind/
Leaflet). **Follow-up**: pasar `script-src` a hashes en vez de
`'unsafe-inline'` — necesita verificación en navegador. GitHub Pages no deja
mandar headers, así que `frame-ancestors` (solo válido por header) no se
puede aplicar acá.

## Checklist manual en el dashboard de Supabase

- [ ] Advisors → Security: **cero** warnings.
- [ ] Authentication → Providers → "Enable anonymous sign-ins" **desactivado**.
- [ ] Authentication → Settings → "Leaked password protection" **activado**.
- [ ] Confirmación de email **requerida**.
- [ ] Rate limits de email subidos (ver `docs/13 §3.2`).
- [ ] `0009_harden_functions.sql` corrido → sin "function_search_path_mutable".
- [ ] `npm audit`: revisar solo las críticas y pinear (14 vulnerabilidades al
      cierre de B7, la mayoría en toolchain de build — evaluar `npm audit fix`
      sin `--force`).
