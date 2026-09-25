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
| PWA (la app) | GitHub Pages, `https://santiagoritter.github.io/GYM-tracker/` | Automático: `deploy.yml` en cada push a `main` |
| Android | GitHub Releases, release `android-latest` | Manual: `Actions → Build Android APK → Run workflow` (rama `main` para publicar) |
| iOS | Sin distribución todavía — solo verificación de build | Manual: `Actions → Verify iOS build` (no genera `.ipa`, sin firma) |
| Backend | Supabase Cloud, proyecto ya creado | Manual: `Actions → Deploy Supabase → Run workflow` |
| Web de marketing (`site/`) | Vercel, `https://site-kohl-rho-85.vercel.app` (dominio propio pendiente) | Manual con la CLI de Vercel, ver abajo |

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

## Web de marketing (`site/`) → Vercel

Proyecto **autónomo**, deploy **manual** (todavía no hay CI para esto — es
contenido, no código de producto, cambia con otro ritmo):

```bash
cd site
vercel            # deploy de preview
vercel --prod     # promueve a producción
```

Primer deploy: la CLI ya tiene sesión (`vercel whoami` → `santiagoritter`,
team `cita-app`) y linkeó el proyecto en `site/.vercel/` (gitignored). URL
actual: `https://site-kohl-rho-85.vercel.app` — dominio propio pendiente de
que el usuario decida y lo compre.

`site/` no pasa por `deploy.yml` (`paths-ignore: ['site/**']`): tocar la
landing no tiene por qué redesplegar la PWA, y viceversa.

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
