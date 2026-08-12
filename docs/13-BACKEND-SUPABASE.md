# 13 — Backend Supabase: puesta en marcha

Este documento describe lo que hay que hacer **a mano** en el dashboard de
Supabase y en GitHub. El código de la app no puede hacer nada de esto por vos.

> Estado: el esquema SQL está en `supabase/migrations/` (6 archivos — el 6º,
> `calorie_entries`, se agregó después, ver §2) y la app ya se conecta:
> `src/lib/supabaseAuth.ts` (auth real) y `src/lib/sync.ts` (push/pull). El
> login usa un código de 6 dígitos vía Supabase Auth, no el link con
> `{{ .TokenHash }}` que este doc planeaba originalmente — ver §3.3, cambió
> de diseño una vez que se implementó de verdad.

---

## 1. Crear el proyecto

1. [supabase.com](https://supabase.com) → **New project**.
2. Región: la más cercana a Argentina (normalmente `South America (São Paulo)`).
3. Guardá la contraseña de la base que te genera (no la vas a necesitar para
   la app, pero sí si algún día entrás por `psql`).
4. Cuando termine de aprovisionar, andá a **Settings → API** y anotá:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon / public key** → será `VITE_SUPABASE_ANON_KEY`

> La anon key es **pública por diseño**: viaja dentro del JavaScript de la app
> y cualquiera la puede leer con las devtools. No es un secreto. Lo único que
> protege los datos es RLS, por eso el paso 2 no es opcional.
>
> La **service_role key** sí es secreta. No va nunca en el frontend ni en
> GitHub Actions.

---

## 2. Correr el SQL

**SQL Editor → New query**, y ejecutá los seis archivos de
`supabase/migrations/` **en orden**:

1. `0001_helpers.sql` — función de sellado + last-write-wins
2. `0002_profiles.sql` — tabla de perfiles + trigger de alta automática
3. `0003_domain_tables.sql` — rutinas, entrenos, series, PRs, medidas, fotos
4. `0004_indexes_rls_storage.sql` — índices, RLS y el bucket de fotos
5. `0005_push_subscriptions.sql` — suscripciones de Web Push (Fase 26)
6. `0006_calorie_entries.sql` — registro de calorías (Dexie v10, Fase 21):
   se agregó después de las primeras cuatro migraciones, nunca había tenido
   tabla en Postgres hasta que se construyó el motor de sync de verdad.

### Verificación obligatoria

**Advisors → Security**. Tiene que dar **cero** warnings de
*"RLS disabled in public"* o *"policy allows anonymous access"*.

Si aparece alguno, hay una tabla desprotegida y sus filas son legibles por
cualquiera que tenga la anon key — es decir, por cualquiera.

---

## 3. Autenticación

### 3.1 URLs

**Authentication → URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://santiagoritter.github.io/GYM-tracker` (sin barra final) |

**Redirect URLs** — agregar las cuatro (aunque el login de hoy no las use,
ver §3.3: Supabase igual valida que el Site URL esté configurado, y las de
`/auth/callback` quedan cargadas por si el día de mañana se agrega un flujo
por link, ej. "Olvidé mi contraseña"):

```
https://santiagoritter.github.io/GYM-tracker/auth/callback
https://santiagoritter.github.io/GYM-tracker/**
http://localhost:5173/auth/callback
http://localhost:5173/**
```

### 3.2 SMTP con tu Gmail

Para que el mail de confirmación llegue **desde tu cuenta** y no desde un
remitente genérico de Supabase.

**Requisito previo**: tener la verificación en dos pasos activada en la
cuenta de Google, y generar una **contraseña de aplicación** de 16 caracteres
en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

**Authentication → Settings → SMTP Settings**:

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `santiagoritter26@gmail.com` |
| Password | la contraseña de aplicación (16 chars, sin espacios) |
| Sender email | `santiagoritter26@gmail.com` |
| Sender name | `GymTracker` |

> El **sender email tiene que ser la misma cuenta** que autentica. Gmail
> reescribe el `From` al de la cuenta autenticada; si ponés otro, o sale
> cambiado o el mail rebota.
>
> Límite práctico de Gmail: ~500 mails por día. De sobra.

**Authentication → Rate Limits** → subí **"Emails per hour"**. El default es
muy bajo incluso con SMTP propio, y probando registros repetidos vas a chocar
contra el límite; el síntoma es *"no llega el mail"*, que parece otra cosa.

### 3.3 Plantillas de email

**Authentication → Emails → Confirm signup**. Cambio de diseño respecto a lo
que este doc planeaba originalmente (link con `{{ .TokenHash }}` + una
pantalla `/auth/callback` que nunca se construyó): la app ya tenía una UI de
6 cajas para tipear un código (del sistema viejo de EmailJS, que Supabase
Auth reemplazó) y Supabase soporta mandar un **código numérico** en vez de
(o además de) un link — así que se reusa esa UI en vez de agregar una
pantalla nueva:

```html
<h2>Confirmá tu cuenta</h2>
<p>Tu código de verificación es:</p>
<h1 style="letter-spacing: 4px;">{{ .Token }}</h1>
<p>Ingresalo en la app para activar tu GymTracker.</p>
```

**Por qué un código y no el link por defecto** — resuelve los mismos dos
problemas que este doc ya había identificado, pero de raíz en vez de con un
parche:

- **PKCE entre dispositivos.** El link por defecto usa `?code=`, que se
  canjea con un `code_verifier` guardado en el localStorage del navegador
  donde te registraste — si abrís el mail en otro dispositivo, falla. Un
  código tipeado a mano no depende de en qué navegador se abre el mail,
  el problema directamente no existe.
- **Prefetch de Gmail.** Gmail precarga los links de los mails y los
  tokens de un solo uso quedan consumidos antes de que el usuario toque
  nada. Sin link, no hay nada que prefetchear.

`src/lib/supabaseAuth.ts` consume esto con
`supabase.auth.verifyOtp({ email, token, type: 'signup' })`.

Aplicá el mismo criterio a la plantilla **Reset password** si el día de
mañana se construye ese flujo (todavía no existe en la app).

### 3.4 Cerrar el registro anónimo

**Authentication → Providers** → desactivar **"Enable anonymous sign-ins"**.

---

## 3.5 Identidad del usuario: nunca confiar en el cliente

Ya está bien hecho en el SQL (`0004_indexes_rls_storage.sql`: todas las
políticas comparan contra `(select auth.uid())`, nunca contra un `user_id`
que mande el cliente) — esto es la regla a **no romper** cuando se escriba
el cliente que consuma Supabase:

- Ninguna llamada desde el frontend debe mandar `userId` como filtro para
  decidir qué filas devolver o escribir. Row Level Security ya lo resuelve
  solo a partir del JWT de la sesión (`auth.uid()`); un `userId` de más en
  el payload es, en el mejor caso, redundante, y en el peor, una superficie
  para que alguien lo edite y pida datos de otra cuenta.
- Si algún día hace falta una función RPC (`supabase.rpc(...)`), tiene que
  resolver el usuario adentro de la función SQL vía `auth.uid()`, nunca
  recibirlo como parámetro.
- El equivalente de "pedile a la API `/me`" en este stack no es un
  endpoint nuevo: es dejar que RLS + la sesión autenticada hagan el
  scoping siempre, en vez de confiar en nada que venga del cliente.

Actualización (Fase 26): ya existe un primer cliente de Supabase
(`src/lib/supabaseClient.ts`), pero acotado a un solo uso — guardar/borrar
suscripciones de Web Push (`push_subscriptions`, ver §6). El resto de la
app (rutinas, entrenos, perfil, todo lo demás) sigue siendo 100% local vía
Dexie. Esta regla aplica igual: esa tabla también tiene RLS por
`auth.uid()`, nunca confía en un `user_id` que mande el cliente.

---

## 4. Rol de admin

El rol **no** vive en una tabla: vive en `auth.users.raw_app_meta_data`, que
solo se puede escribir con la service role key o desde el dashboard, y viaja
firmado dentro del JWT.

Una columna `profiles.role` no serviría: el usuario puede actualizar su propio
perfil, así que podría ascenderse solo. Hoy la app hace exactamente eso
(`Admin.tsx` escribe el rol en el IndexedDB del propio usuario).

Después de registrarte por primera vez:

1. **Authentication → Users** → tu usuario.
2. **Raw App Meta Data** → `{"role": "admin"}` → guardar.
3. **Cerrá sesión y volvé a entrar.** El JWT solo refleja el rol nuevo
   después de un refresh de token.

---

## 5. Secrets en GitHub

**Repo → Settings → Secrets and variables → Actions → New repository secret**:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | el Project URL del paso 1 |
| `VITE_SUPABASE_ANON_KEY` | la anon key del paso 1 |

El workflow los inyecta en el build. `vite.config.ts` tiene un chequeo de
*fail-fast*: si `VITE_BASE_PATH` está seteado (o sea, es el build de
GitHub Actions, no uno local) y falta `VITE_SUPABASE_URL` o
`VITE_SUPABASE_ANON_KEY`, el build tira error en vez de salir "bien" — sin
esto, un secret mal cargado se resuelve a string vacío (GitHub Actions no
omite la variable) y publicaría un bundle con auth/sync rotos en silencio.

---

## 6. Notificaciones push (Fase 26) — ya desplegado

El 6º SQL (`0006_calorie_entries.sql`, ver §2) corre igual que los otros;
`0005_push_subscriptions.sql` no necesita nada especial tampoco. Lo que sí
es un flujo aparte es la función y el cron, ya en producción:

0. **CLI de Supabase**: el binario de `npx supabase` es un ELF genérico y
   no arranca en NixOS ("Could not start dynamically linked executable").
   `nix-shell -p supabase-cli --run "supabase ..."` sí anda (paquete de
   nixpkgs, linkeado correcto) — no hace falta instalarlo global.
1. **Generar el par de claves VAPID**:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Un secreto propio para el cron** — cualquier string random largo
   (`openssl rand -hex 32` o similar). Deliberadamente **no** es la
   service_role key: `send-push-reminders/index.ts` valida este secreto a
   mano (`Authorization: Bearer <CRON_SECRET>`) contra su propia variable
   de entorno — así el cron solo puede invocar esta función puntual, no
   tiene el acceso total que da la service_role. Por eso además se
   despliega con `--no-verify-jwt`: la autenticación es la propia de la
   función, no la de la plataforma (que exigiría un JWT de Supabase, y
   quien llama acá es pg_cron, no un usuario con sesión).
3. **Secrets de la función**:
   ```bash
   supabase secrets set --project-ref <ref> \
     VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... CRON_SECRET=...
   ```
4. **Desplegar la función**:
   ```bash
   supabase functions deploy send-push-reminders --project-ref <ref> --no-verify-jwt
   ```
5. **Habilitar `pg_cron`/`pg_net` y programar** (cada hora en punto):
   ```sql
   create extension if not exists pg_cron with schema extensions;
   create extension if not exists pg_net with schema extensions;

   select cron.schedule(
     'send-push-reminders-hourly',
     '0 * * * *',
     $$ select net.http_post(
          url := 'https://<ref>.functions.supabase.co/send-push-reminders',
          headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
        ) $$
   );
   ```
   Verificar con `select * from cron.job;` — tiene que aparecer
   `send-push-reminders-hourly` con `active = true`.
6. **Secret nuevo en GitHub** (mismo lugar que los otros): la clave VAPID
   **pública** (la privada y el `CRON_SECRET` nunca salen de Supabase):

   | Nombre | Valor |
   |---|---|
   | `VITE_VAPID_PUBLIC_KEY` | la clave pública generada en el paso 1 |

Sin `VITE_VAPID_PUBLIC_KEY`, `/recordatorios` no ofrece la opción de
notificaciones push — `isPushAvailable()` en `src/lib/webPush.ts` la
esconde en vez de mostrar algo que no puede andar.

---

## Checklist

- [ ] Proyecto creado, URL y anon key anotadas
- [ ] Los 6 SQL corridos en orden (incluye `0005_push_subscriptions.sql` y
      `0006_calorie_entries.sql`)
- [ ] Advisors → Security sin warnings
- [ ] Site URL y las 4 Redirect URLs
- [ ] SMTP de Gmail configurado y probado
- [ ] Rate limit de emails subido
- [ ] Plantilla "Confirm signup" con `{{ .Token }}` (código, no link)
- [ ] Anonymous sign-ins desactivado
- [ ] Los 2 secrets de Supabase en GitHub (URL + anon key)
- [ ] `{"role":"admin"}` puesto (después del primer registro)
- [ ] Claves VAPID generadas, secrets de la función seteados
- [ ] `send-push-reminders` desplegada y con su cron programado
- [ ] `VITE_VAPID_PUBLIC_KEY` en los secrets de GitHub
