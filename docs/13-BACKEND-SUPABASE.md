# 13 — Backend Supabase: puesta en marcha

Este documento describe lo que hay que hacer **a mano** en el dashboard de
Supabase y en GitHub. El código de la app no puede hacer nada de esto por vos.

> Estado: el esquema SQL está en `supabase/migrations/`. La app todavía no se
> conecta — eso llega en los commits siguientes (cliente, auth, sync).

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

**SQL Editor → New query**, y ejecutá los cuatro archivos de
`supabase/migrations/` **en orden**:

1. `0001_helpers.sql` — función de sellado + last-write-wins
2. `0002_profiles.sql` — tabla de perfiles + trigger de alta automática
3. `0003_domain_tables.sql` — rutinas, entrenos, series, PRs, medidas, fotos
4. `0004_indexes_rls_storage.sql` — índices, RLS y el bucket de fotos

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

**Redirect URLs** — agregar las cuatro:

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

**Authentication → Emails → Confirm signup**:

```html
<h2>Confirmá tu cuenta</h2>
<p>Hola {{ .Data.full_name }}, tocá el botón para activar tu GymTracker.</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">
    Confirmar mi cuenta
  </a>
</p>
```

**Por qué `{{ .TokenHash }}` y no el link por defecto** — dos problemas reales
en celular, ambos frecuentes:

- **PKCE entre dispositivos.** El link por defecto usa `?code=`, que se
  canjea con un `code_verifier` guardado en el localStorage del navegador
  donde te registraste. Si abrís el mail en la app de Gmail (que usa su
  propio navegador embebido) o en otro dispositivo, falla con *"code verifier
  should be non-empty"*. `{{ .TokenHash }}` no depende del verifier.
- **Prefetch de Gmail.** Gmail precarga los links de los mails. Los tokens de
  Supabase son de un solo uso: el prefetch lo consume y cuando el usuario
  toca, ya expiró. Por eso la pantalla `/auth/callback` tiene un **botón
  explícito** en vez de verificar sola al cargar — los prefetchers no tocan
  botones.

Aplicá lo mismo a la plantilla **Reset password** (con `type=recovery`).

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

Esto no aplica hoy (no hay cliente de Supabase importado en `src/`,
confirmado — la app es 100% local vía Dexie) pero es la regla que hay que
respetar apenas se conecte, y por eso queda escrita acá antes de que haga
falta.

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

El workflow los inyecta en el build. Hay un chequeo de *fail-fast* en
`vite.config.ts` porque GitHub Actions reemplaza un secret inexistente por
string vacío **sin fallar**, y publicaría un bundle roto en silencio.

---

## Checklist

- [ ] Proyecto creado, URL y anon key anotadas
- [ ] Los 4 SQL corridos en orden
- [ ] Advisors → Security sin warnings
- [ ] Site URL y las 4 Redirect URLs
- [ ] SMTP de Gmail configurado y probado
- [ ] Rate limit de emails subido
- [ ] Plantillas con `{{ .TokenHash }}`
- [ ] Anonymous sign-ins desactivado
- [ ] Los 2 secrets en GitHub
- [ ] `{"role":"admin"}` puesto (después del primer registro)
