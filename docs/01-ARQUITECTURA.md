# Arquitectura

## Diagrama de capas

```
┌─────────────────────────────────────────┐
│              CLIENTE (Browser)           │
│                                         │
│  React + Vite + TypeScript              │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  UI Layer  │  │   State Layer      │ │
│  │  shadcn/ui │  │  Zustand + RQ v5   │ │
│  │  Tailwind  │  └────────────────────┘ │
│  └────────────┘  ┌────────────────────┐ │
│                  │   Offline Layer    │ │
│  Service Worker  │   Dexie (IndexedDB)│ │
│  (Workbox)       └────────────────────┘ │
└───────────────┬─────────────────────────┘
                │ HTTPS / WebSocket
┌───────────────▼─────────────────────────┐
│              SUPABASE                   │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │PostgreSQL│ │   Auth   │ │ Storage │ │
│  │  (RLS)   │ │ (JWT)    │ │(Fotos)  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────────────────────────────┐   │
│  │     Edge Functions (Deno)        │   │
│  │   (tokens QR, lógica server)     │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Stack tecnológico

### Frontend

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool + dev server |
| TypeScript | 5.x strict | Type safety |
| TailwindCSS | 3.x | Utility styles |
| shadcn/ui | latest | Componentes base |
| Zustand | 4.x | Estado global (sin boilerplate) |
| TanStack Query | 5.x | Server state + cache |
| React Hook Form | 7.x | Formularios performantes |
| Zod | 3.x | Schema validation |
| React Router | 6.x | Client-side routing |
| Recharts | 2.x | Gráficos SVG |
| Lucide React | latest | Iconos |
| DnD Kit | 6.x | Drag and drop (rutinas) |

### PWA & Offline

| Tecnología | Rol |
|-----------|-----|
| vite-plugin-pwa | Service worker generation |
| Workbox | Cache strategies + background sync |
| Dexie.js | IndexedDB wrapper type-safe |

### QR & Sharing

| Tecnología | Rol |
|-----------|-----|
| qrcode | Generar imágenes QR |
| jsQR | Decodificar QR desde cámara |
| lz-string | Comprimir JSON para reducir tamaño del QR |

### Backend (Supabase)

| Servicio | Uso |
|---------|-----|
| PostgreSQL | Base de datos principal |
| Row Level Security | Autorización por usuario |
| Supabase Auth | Autenticación (email + Google OAuth) |
| Supabase Storage | Fotos de progreso (bucket: progress-photos) |
| Edge Functions | Generación de tokens QR con expiración |

### Infraestructura

| Servicio | Uso | Costo |
|---------|-----|-------|
| Vercel | Hosting frontend (CI/CD automático) | Gratis |
| Supabase Cloud | Backend | Gratis (500MB DB, 1GB Storage) |
| GitHub | Control de versiones | Gratis |

## Estructura de carpetas del proyecto React

```
gym-tracker/
├── public/
│   ├── icons/           # PWA icons (72, 96, 128, 144, 152, 192, 384, 512)
│   └── manifest.webmanifest
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui (Button, Card, Dialog, etc.)
│   │   └── gym/         # Componentes de dominio
│   │       ├── ExerciseCard.tsx
│   │       ├── SetRow.tsx
│   │       ├── WorkoutTimer.tsx
│   │       ├── ProgressChart.tsx
│   │       ├── QRModal.tsx
│   │       └── StrengthLevel.tsx
│   ├── pages/
│   │   ├── Home.tsx          # Dashboard principal
│   │   ├── Workout.tsx       # Sesión activa de entrenamiento
│   │   ├── Exercises.tsx     # Biblioteca de ejercicios
│   │   ├── Routines.tsx      # Mis rutinas
│   │   ├── Progress.tsx      # Dashboard de progreso + fotos
│   │   ├── Stats.tsx         # Estadísticas mensuales + niveles
│   │   ├── Profile.tsx       # Perfil de usuario
│   │   └── auth/
│   │       ├── Login.tsx
│   │       └── Register.tsx
│   ├── stores/
│   │   ├── workoutStore.ts   # Sesión activa de entreno
│   │   ├── authStore.ts      # Usuario autenticado
│   │   └── uiStore.ts        # UI state (modales, loaders)
│   ├── hooks/
│   │   ├── useWorkout.ts
│   │   ├── useExercises.ts
│   │   ├── useProgress.ts
│   │   └── useSync.ts
│   ├── lib/
│   │   ├── supabase.ts       # Client init
│   │   ├── utils.ts          # cn(), formatWeight(), calc1RM()
│   │   ├── constants.ts      # Músculo groups, equipment types
│   │   └── strengthStandards.ts  # Tablas de niveles por ejercicio
│   ├── db/
│   │   ├── schema.ts         # Dexie schema (mirror de Supabase)
│   │   └── sync.ts           # Lógica de sync offline → Supabase
│   ├── types/
│   │   ├── workout.ts
│   │   ├── exercise.ts
│   │   ├── routine.ts
│   │   └── user.ts
│   └── data/
│       └── exercises.json    # 200+ ejercicios precargados
├── supabase/
│   ├── migrations/           # SQL migrations
│   └── functions/            # Edge functions
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## Decisiones de arquitectura

### Por qué Supabase en lugar de Firebase

- Open source (se puede auto-hostear si el free tier no alcanza)
- PostgreSQL real (JOINs, full text search, triggers)
- RLS declarativo y testeable
- Sin vendor lock-in total
- SDK tipado con generación de tipos desde el schema

### Por qué Zustand + TanStack Query y no Redux/Context

- Zustand: mínimo boilerplate, sin providers, perfecto para estado efímero de sesión activa
- TanStack Query: cache automático de consultas Supabase, invalidación inteligente, sin duplicar lógica de fetching

### Por qué Dexie.js para offline

- API async limpia sobre IndexedDB
- Soporte TypeScript nativo
- Queries complejas sin boilerplate
- Integra bien con Workbox para background sync

### Flujo de autenticación

```
1. Usuario abre app
2. Service Worker verifica si hay sesión en Dexie cache
3. Si hay sesión → mostrar app inmediatamente (optimistic)
4. En background → verificar token con Supabase Auth
5. Si token expiró → refresh silencioso
6. Si refresh falla → redirigir a Login
```

### Optimistic UI para registrar series

```
1. Usuario toca "Completar serie"
2. → Guardar en Dexie (IndexedDB) INMEDIATAMENTE
3. → Actualizar UI (el set aparece como completado)
4. En background → sync a Supabase
5. Si sync falla → marcar como "pendiente" en Dexie
6. Al recuperar conexión → reintentar sync automático
```
