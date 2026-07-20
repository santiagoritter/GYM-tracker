# Guía de Despliegue

## Stack de producción

- **Frontend**: Vercel (deploy automático desde GitHub)
- **Backend**: Supabase Cloud (free tier)
- **Dominio**: Vercel subdomain gratis o dominio propio

---

## Paso 1: Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Elegir nombre: `gym-tracker`
3. Elegir región: South America (São Paulo) para menor latencia desde Argentina
4. Guardar la contraseña de base de datos (no se puede recuperar)
5. Esperar ~2 minutos que inicialice

### Obtener credenciales

En el dashboard de Supabase → Settings → API:
- `VITE_SUPABASE_URL`: https://xxxx.supabase.co
- `VITE_SUPABASE_ANON_KEY`: eyJhbGci... (clave pública, segura para exponer)

---

## Paso 2: Ejecutar migraciones

Con Supabase CLI instalado:

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Vincular al proyecto remoto
supabase link --project-ref <project-id>

# Ejecutar migraciones
supabase db push

# Generar types TypeScript actualizados
supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
```

O alternativamente, pegar el SQL de `supabase/migrations/` en el SQL Editor de Supabase.

---

## Paso 3: Configurar Storage

En Supabase Dashboard → Storage:

```
1. Crear bucket "progress-photos"
   - Public bucket: NO (privado)
   - File size limit: 5 MB
   - Allowed MIME types: image/jpeg, image/webp, image/png

2. Crear bucket "workout-photos"
   - Misma configuración
```

Aplicar las políticas de Storage del archivo [docs/05-CONTRATOS-API.md](05-CONTRATOS-API.md).

---

## Paso 4: Configurar Auth en Supabase

En Supabase Dashboard → Authentication → Providers:

### Email
- Enable Email provider: ✅
- Confirm email: recomendado activar para producción
- Minimum password length: 8

### Google OAuth (opcional pero recomendado)
1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear proyecto → API & Services → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URIs: `https://xxxx.supabase.co/auth/v1/callback`
4. Copiar Client ID y Client Secret
5. En Supabase → Auth → Google → pegar credenciales

---

## Paso 5: Deploy en Vercel

### Opción A: Deploy automático (recomendado)

```bash
# Instalar Vercel CLI
npm install -g vercel

# En la carpeta del proyecto
vercel

# Vercel pregunta:
# Set up and deploy? → Y
# Which scope? → tu cuenta
# Link to existing project? → N (nuevo)
# Project name: gym-tracker
# Directory: ./
# Override settings? → N
```

### Opción B: Conectar repositorio GitHub

1. Subir código a GitHub
2. Ir a vercel.com → New Project → Import desde GitHub
3. Seleccionar el repo
4. Vercel detecta automáticamente Vite

### Variables de entorno en Vercel

En Vercel Dashboard → Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL        = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGci...
```

Marcar para: Production, Preview, Development

---

## Paso 6: Verificar el deploy

```bash
# Build local antes de deployar (detectar errores)
npm run build
npm run preview

# Verificar:
# ✅ App carga en /
# ✅ Login funciona
# ✅ Se puede crear un workout
# ✅ Las fotos se suben
# ✅ El QR se genera y escanea
# ✅ Service worker se registra (F12 → Application → Service Workers)
# ✅ App se puede instalar como PWA (botón en barra de navegación del browser)
```

---

## Dominio personalizado (opcional)

1. En Vercel → Project → Settings → Domains → Add Domain
2. Agregar el dominio (ej: `gymtracker.app`)
3. Seguir instrucciones para configurar DNS en el registrar

---

## Variables de entorno (.env.example)

```bash
# Requeridas
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Opcionales
VITE_APP_URL=https://gymtracker.vercel.app
```

---

## Comandos útiles post-deploy

```bash
# Ver logs de Supabase Edge Functions
supabase functions logs

# Resetear DB (solo desarrollo)
supabase db reset

# Hacer una migration nueva
supabase migration new <nombre>

# Inspeccionar DB en local
supabase studio
```

---

## Monitoreo y límites del free tier

### Supabase Free Tier (2024)
- 500 MB base de datos PostgreSQL
- 5 GB Storage
- 50,000 MAU (usuarios activos mensuales)
- 500 MB de ancho de banda

Para un proyecto personal/familiar, el free tier es más que suficiente.

### Vercel Free Tier
- 100 GB de ancho de banda
- Deploy automático ilimitado
- Sin límite de proyectos

---

## Auto-hospedar (alternativa si el free tier no alcanza)

Si el proyecto crece y necesitás más recursos:

```bash
# Supabase self-hosted en VPS (~$5/mes en DigitalOcean/Hetzner)
git clone https://github.com/supabase/supabase
cd supabase/docker
docker-compose up -d
```

El frontend puede seguir en Vercel gratis, solo cambia la URL de Supabase en las env vars.
