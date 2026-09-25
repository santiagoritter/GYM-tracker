# Guía de despliegue

> Reescrito en 2026-09 a partir del estado real del repo: la versión anterior
> describía deployar la app entera en Vercel con buckets de Storage
> (`progress-photos`, `workout-photos`) que nunca existieron — el mismo tipo
> de documentación aspiracional que `CLAUDE.md` marca como quemada en
> `docs/03/05/06`. Lo de abajo está verificado contra `.github/workflows/*.yml`
> y `supabase/migrations/` reales, no contra un plan viejo.

## Stack de producción real

| Pieza | Dónde | Cómo se despliega |
|---|---|---|
| PWA (la app) | GitHub Pages, `https://santiagoritter.github.io/GYM-tracker/` — **la que ya usan los dispositivos instalados, no se da de baja** | Automático: `deploy.yml` en cada push a `main` |
| PWA (la app), mirror | Vercel, proyecto `repe-app`, `https://repe-app-five.vercel.app` | Automático: Vercel tiene el repo conectado por GitHub, redeploya solo en cada push a `main` (además del deploy manual de abajo) |
| Android | GitHub Releases, release `android-latest` | Manual: `Actions → Build Android APK → Run workflow` (rama `main` para publicar) |
| iOS | Sin distribución todavía — solo verificación de build | Manual: `Actions → Verify iOS build` (no genera `.ipa`, sin firma) |
| Backend | Supabase Cloud, proyecto ya creado | Manual: `Actions → Deploy Supabase → Run workflow` |
| Web de marketing (`site/`) | Vercel, proyecto `site`, `https://site-kohl-rho-85.vercel.app` (dominio propio pendiente) | Manual con la CLI de Vercel, ver abajo |
| Web de marketing, mirror | GitHub Pages, repo aparte [`repe-landing`](https://github.com/santiagoritter/repe-landing), `https://santiagoritter.github.io/repe-landing/` | Automático en ese repo (push a `main`), pero copiar los archivos ahí es manual — ver abajo |

**Por qué dos hosts para la misma app:** GitHub Pages es el original, con el
link ya guardado/instalado por quien la usa hoy — no se toca. El mirror en
Vercel se sumó a pedido, como alternativa con deploy más rápido y sin el
límite de subpath (`/GYM-tracker/`) de Pages. Los dos sirven el mismo build,
apuntan al mismo Supabase, y en cualquier momento uno puede quedar como el
"oficial" sin migrar nada — es el mismo `dist/`.

**No hay un solo botón "deploy" que suba todo.** Cada pieza es un workflow o
comando separado, a propósito: publicar un cambio de UI no tiene por qué
tocar las migraciones de la base, y viceversa.

---

## PWA → GitHub Pages

Automático en cada push a `main` (`.github/workflows/deploy.yml`):

1. `npm ci && npm run build` con `VITE_BASE_PATH=/GYM-tracker/` (la app vive en
   un subpath, no en la raíz del dominio — ver el comentario en
   `capacitor.config.ts` sobre por qué la build nativa usa un path distinto).
2. Copia `dist/index.html` a `dist/404.html` (GitHub Pages no tiene
   fallback de SPA nativo; así cualquier ruta profunda cae en la app).
3. `actions/deploy-pages`.

Secrets usados (`Settings → Secrets and variables → Actions`):
`VITE_SPOTIFY_CLIENT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_VAPID_PUBLIC_KEY`.

Verificar un deploy: `gh run list --workflow=deploy.yml` y abrir la URL
publicada — no alcanza con que el workflow diga verde, hay que mirar la
página (ver `docs/BITACORA.md` para el patrón de verificación con
Playwright que se usa en este repo).

---

## Android → GitHub Releases

Manual, `Actions → Build Android APK` (`android.yml`). Compila con
`build:native` (sin base path — la build nativa se sirve desde la raíz del
WebView), sincroniza Capacitor, arma APK release + AAB **firmados de
verdad** con el keystore de producción — sin el secret, el build falla
explícito en vez de publicar algo sin firmar.

Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ADMOB_APP_ID_ANDROID`.

Corriendo desde `main`, además publica el APK en el release `android-latest`
(link estable: `github.com/<repo>/releases/latest`). El AAB es el que exige
Play Store — se sube a Play Console a mano. Paso a paso completo de la firma
y Play App Signing: `docs/16-CAPACITOR.md`.

---

## iOS → sin distribución (todavía)

`Actions → Verify iOS build` (`ios.yml`) solo compila para simulador, sin
firma — detecta que un cambio en `src/` o en un plugin de Capacitor rompió
la parte nativa, nada más. Corre en runner macOS (10x más caro que Linux),
por eso es manual. Para correr en un iPhone real hoy hace falta Xcode local
con un Apple ID — ver `docs/16-CAPACITOR.md`.

---

## Backend → Supabase Cloud

**El proyecto ya existe** (vinculado en `supabase/.temp/project-ref`, fuera
del repo). No hay un "Paso 1: crear proyecto" — lo que hay es aplicar
migraciones nuevas cuando se agregan.

Manual, `Actions → Deploy Supabase` (`supabase-deploy.yml`): aplica TODAS las
migraciones de `supabase/migrations/*.sql` por orden numérico (no una lista
fija — un archivo nuevo se recoge solo) y despliega las 6 Edge Functions.
Se puede correr las veces que haga falta: los errores de "ya existe" no
frenan el resto.

Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF`.

Localmente, con la CLI ya vinculada:

```bash
supabase migration list --linked   # ver qué está aplicado de verdad
supabase db push                   # aplicar migraciones nuevas
supabase functions deploy <nombre> # una función puntual
```

No hay buckets de Storage: las fotos de progreso y de ejercicio se manejan
distinto (ver `docs/13-BACKEND-SUPABASE.md` — esa es la doc confiable de
Supabase, no esta).

---

## ⚠️ Gotcha del team de Vercel (`cita-app`): dos trampas en cada proyecto nuevo

Pasaron las dos con `site` y `repe-app` al crearlos — anotado para no
repetirlo con el próximo proyecto de este team:

1. **Root Directory por defecto es la raíz del repo, no la carpeta desde la
   que corriste `vercel`.** Si el proyecto vive en un subdirectorio
   (`site/`), hay que fijarlo a mano — si no, el deploy manual (CLI) sale
   bien la primera vez, pero en cuanto la integración de GitHub reacciona a
   un push construye desde la raíz y pisa la producción con otra cosa.
   ```bash
   TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/Library/Application Support/com.vercel.cli/auth.json'))['token'])")
   curl -X PATCH "https://api.vercel.com/v9/projects/<projectId>?teamId=<orgId>" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"rootDirectory":"site"}'
   ```
   (`projectId`/`orgId` están en `.vercel/project.json` de cada carpeta). No
   hay flag de `vercel link`/`vercel project` para esto — es API o dashboard.

2. **El team tiene "Vercel Authentication" (SSO) activada por defecto** para
   toda URL que no sea un dominio propio (`all_except_custom_domains`) —
   cualquier visitante sin sesión en la cuenta de Vercel del team choca
   contra el login de **Vercel**, no el de la app, así que parece "el login
   no anda" cuando en realidad nunca llegó a la app. Se desactiva por
   proyecto:
   ```bash
   vercel project protection disable <nombre-proyecto> --sso
   ```
   Verificar sin cookies (`curl -I` a la URL o un contexto de Playwright
   nuevo) — con sesión propia en el navegador esto pasa desapercibido
   porque el browser ya tiene la cookie de SSO válida.

---

## PWA, mirror → Vercel (proyecto `repe-app`)

Mismo `dist/` que GitHub Pages, pero servido desde la raíz del dominio (sin
`VITE_BASE_PATH`, el default de `vite.config.ts` ya es `/`). Repo conectado
vía la integración de GitHub de Vercel: cada push a `main` redeploya solo,
sin workflow propio.

Variables de entorno cargadas en el proyecto (`vercel env ls`, scope
`production`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_SPOTIFY_CLIENT_ID` — las mismas de `.env` local. **Falta
`VITE_VAPID_PUBLIC_KEY`** (no estaba en el `.env` local para copiarla): en
este mirror, `/recordatorios` no ofrece notificaciones push web hasta que
se cargue con `vercel env add VITE_VAPID_PUBLIC_KEY production` y se
redeploye — el resto de la app funciona igual, es una degradación
conocida y sin romper nada (mismo criterio que Spotify/anuncios apagados).

Verificado contra el Supabase real: un intento de login con credenciales
inventadas devolvió `400 invalid_credentials` desde
`tgdqzapvlnuaemjdvscy.supabase.co/auth/v1/token` — no un error de red ni una
URL vacía, así que las env vars están bien cargadas.

⚠️ El check de "faltan secrets" de `vite.config.ts` (línea ~20) **no corre**
acá, porque solo se activa cuando `VITE_BASE_PATH !== '/'` (pensado para el
build de GitHub Actions). Un secret vacío en este proyecto de Vercel no
rompe el build, rompe el login en silencio — hay que verificarlo a mano
como arriba después de cualquier cambio a las env vars.

---

## Web de marketing (`site/`) → Vercel + mirror en GitHub Pages

Proyecto **autónomo**, deploy **manual** (todavía no hay CI para esto — es
contenido, no código de producto, cambia con otro ritmo):

```bash
cd site
vercel            # deploy de preview
vercel --prod     # promueve a producción
```

URL: `https://site-kohl-rho-85.vercel.app` — dominio propio pendiente de que
el usuario decida y lo compre. El proyecto **NO** está conectado al repo de
GitHub a propósito (se desconectó después del incidente de abajo) — el
único deploy es el manual de arriba.

`site/` no pasa por `deploy.yml` (`paths-ignore: ['site/**']`): tocar la
landing no tiene por qué redesplegar la PWA, y viceversa.

### Incidente 2026-09-25: el proyecto de Vercel rompió dos veces

1. **Root Directory mal seteado.** Al crear el proyecto, Vercel conectó el
   repo de GitHub solo con `Root Directory: .` (la raíz) en vez de `site`.
   Cualquier push a `main` (de cualquier cosa, no solo de `site/`) hacía que
   la integración de GitHub reconstruyera el proyecto **desde la raíz** —
   es decir, publicaba la app entera pisando la landing en la misma URL.
   El deploy manual (`vercel --prod` corrido desde adentro de `site/`) no
   mostraba el problema porque sube el directorio actual directo, sin pasar
   por esa configuración — por eso parecía andar bien hasta el próximo push.
2. **Vercel Authentication (SSO) del team activada por default.** Encima,
   el team `cita-app` tiene protección SSO activada para toda URL que no
   sea un dominio propio (`all_except_custom_domains`, ver
   `vercel project protection <nombre>`). Un visitante sin sesión en esa
   cuenta de Vercel chocaba contra el login **de Vercel**, no el de la app
   — se leía como "no anda el login" sin serlo.

**Arreglo aplicado**: se desconectó el repo de GitHub del proyecto `site`
(`DELETE /v9/projects/{id}/link` — no hay comando de CLI para esto, es API
o dashboard) y se desactivó SSO (`vercel project protection site --sso`
con `disable`). Con eso, el único disparador de deploy es el manual de
arriba, y no hay muro de login de por medio.

**Lección**: verificar un fix de infra *sin cookies de sesión propia* —
`curl -I` sin auth, o un contexto de Playwright nuevo (`browser.newContext()`
sin heredar cookies) — porque con sesión propia en el navegador estos dos
problemas pasan desapercibidos: la cookie de SSO ya está puesta, y la
CLI resuelve el proyecto sin pasar por el flujo de la integración de Git.

### Mirror independiente: repo `repe-landing` → GitHub Pages

Copia standalone de `site/` en <https://github.com/santiagoritter/repe-landing>,
publicada en `https://santiagoritter.github.io/repe-landing/` — mismo
contenido, cero dependencia de Vercel/del team `cita-app`. Se armó como
respaldo después del incidente de arriba, para tener una URL que no dependa
de esa cuenta ni de su configuración.

Es una copia manual, no un submódulo ni un mirror automático: al cambiar
`site/` acá, hay que copiar los archivos a mano al otro repo (`rsync -a
--exclude .git --exclude node_modules --exclude dist --exclude .vercel
site/ ../repe-landing/`), regenerar los legales si cambiaron
(`npm run docs:legal-site` acá, después copiar `site/privacidad.html` y
`site/terminos.html`), commitear y pushear allá — `deploy.yml` de ese repo
hace el resto.

Todas las rutas del sitio (nav, footer, links entre páginas legales,
imágenes/video de `public/`) son **relativas**, no absolutas — a propósito,
para que el mismo build sirva tanto en la raíz de un dominio (Vercel) como
en un subpath de GitHub Pages (`/repe-landing/`, vía
`VITE_BASE_PATH=/repe-landing/` en su workflow) sin tocar nada. Los únicos
absolutos son `/src/style.css` y `/src/main.ts` en las etiquetas
`<link>`/`<script type="module">`, que Vite reescribe solo con el `base`
correcto — esos si hace falta que empiecen con `/`.

---

## Variables de entorno reales (`.env.example`)

Ver `.env.example` en la raíz — es la fuente de verdad de qué variables
existen y por qué. Resumen:

```bash
# Requeridas para el backend
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Opcionales, cada una con su propio flag de apagado
VITE_SPOTIFY_CLIENT_ID=...
VITE_VAPID_PUBLIC_KEY=...
VITE_PURCHASES_ENABLED=on|off
VITE_REVENUECAT_IOS_KEY=...
VITE_REVENUECAT_ANDROID_KEY=...
VITE_ADS_ENABLED=on|off
VITE_ADMOB_BANNER_ID_IOS=...
VITE_ADMOB_BANNER_ID_ANDROID=...
```

---

## Comandos útiles post-deploy

```bash
# Ver qué migraciones están aplicadas de verdad en la base remota
supabase migration list --linked

# Logs de una Edge Function
supabase functions logs <nombre>

# Ver runs de un workflow y su resultado
gh run list --workflow=deploy.yml
gh run list --workflow=android.yml
```
