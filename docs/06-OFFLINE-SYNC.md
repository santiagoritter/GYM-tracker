# Offline-First y Sincronización

## Por qué offline-first

Los gimnasios tienen WiFi malo o inexistente. Si la app no funciona sin internet, los usuarios no pueden registrar sus series. Perder un entreno por falta de señal arruina la experiencia.

**Regla de oro**: la app debe ser 100% funcional sin internet. La sincronización con Supabase es transparente para el usuario.

---

## Arquitectura offline

```
Usuario registra una serie
         │
         ▼
  ┌─────────────┐     SIEMPRE primero
  │  Dexie.js   │  ◄──────────────────
  │  (local DB) │
  └──────┬──────┘
         │ En background, si hay conexión
         ▼
  ┌─────────────┐
  │  Supabase   │  ◄── sync bidireccional
  │ (cloud DB)  │
  └─────────────┘
```

### Principios

1. **Write-local-first**: toda escritura va a Dexie primero. Si hay conexión, se sincroniza inmediatamente en background.
2. **Read-local**: la UI siempre lee de Dexie. Supabase es la fuente de verdad de respaldo.
3. **Optimistic UI**: el usuario ve el resultado inmediatamente, sin spinner de espera.
4. **Sync silencioso**: el usuario no tiene que hacer nada. Solo ve un indicador de estado.

---

## Schema de Dexie (IndexedDB)

```ts
// src/db/schema.ts
import Dexie, { type Table } from 'dexie'

export interface LocalWorkout {
  id: string
  userId: string
  routineId?: string
  name: string
  startedAt: string
  finishedAt?: string
  notes?: string
  totalVolumeKg?: number
  synced: 0 | 1         // 0 = pendiente de sync (numérico: IndexedDB no indexa booleans)
  syncedAt?: string
  updatedAt: string
}

export interface LocalWorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe?: number
  isWarmup: boolean
  completed: boolean
  synced: boolean
  updatedAt: string
}

export interface LocalRoutine {
  id: string
  userId: string
  name: string
  color: string
  isActive: boolean
  synced: boolean
  updatedAt: string
}

export class GymTrackerDB extends Dexie {
  workouts!: Table<LocalWorkout>
  workoutSets!: Table<LocalWorkoutSet>
  routines!: Table<LocalRoutine>
  exercises!: Table<any>
  personalRecords!: Table<any>

  constructor() {
    super('GymTrackerDB')
    this.version(1).stores({
      workouts:     'id, userId, synced, startedAt',
      workoutSets:  'id, workoutId, exerciseId, synced',
      routines:     'id, userId, synced',
      exercises:    'id, equipment, *musclePrimary',
      personalRecords: 'id, [userId+exerciseId], synced',
    })
  }
}

export const db = new GymTrackerDB()
```

---

## Cola de sincronización

```ts
// src/db/sync.ts

// Estado de sync
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

// Sincronizar todo lo que esté pendiente
export async function syncPending(): Promise<void> {
  const [workouts, sets] = await Promise.all([
    db.workouts.where('synced').equals(0).toArray(),  // false = 0 en IndexedDB
    db.workoutSets.where('synced').equals(0).toArray(),
  ])

  if (workouts.length === 0 && sets.length === 0) return

  // Sync workouts
  if (workouts.length > 0) {
    const { error } = await supabase.from('workouts').upsert(
      workouts.map(mapLocalToSupabase),
      { onConflict: 'id' }
    )
    if (!error) {
      await db.workouts
        .where('id').anyOf(workouts.map(w => w.id))
        .modify({ synced: true, syncedAt: new Date().toISOString() })
    }
  }

  // Sync sets
  if (sets.length > 0) {
    const { error } = await supabase.from('workout_sets').upsert(
      sets.map(mapLocalSetToSupabase),
      { onConflict: 'id' }
    )
    if (!error) {
      await db.workoutSets
        .where('id').anyOf(sets.map(s => s.id))
        .modify({ synced: true })
    }
  }
}
```

---

## Estrategia de resolución de conflictos

**Regla**: `last-write-wins` por `updatedAt`.

Si el mismo dato se modificó en local y en servidor (raro pero posible con múltiples dispositivos):
1. Al hacer sync, comparar `updatedAt` local vs Supabase
2. Si local es más reciente → se sube a Supabase
3. Si Supabase es más reciente → se descarga a local

En la práctica, el 99% de los conflictos no existe porque un usuario usa un solo dispositivo para entrenar.

---

## Service Worker (Workbox)

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',  // intentar red, fallback a cache
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxAgeSeconds: 60 * 60 * 24 },  // 24h
            },
          },
        ],
      },
    }),
  ],
})
```

---

## Indicador de estado de sync en UI

```
┌────────────────────────────────┐
│  GymTracker     ● Sincronizado │  ← verde
│  GymTracker     ◌ Sincronizando│  ← spinner
│  GymTracker     ● Sin conexión │  ← naranja
│                 3 pendientes   │  ← con badge
└────────────────────────────────┘
```

Hook para exponer estado:
```ts
// src/hooks/useSync.ts
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Escuchar eventos online/offline del navegador
    window.addEventListener('online', () => syncPending())
    window.addEventListener('offline', () => setStatus('offline'))

    // Actualizar contador de pendientes cada 10s
    const interval = setInterval(async () => {
      const count = await db.workouts.where('synced').equals(0).count()
      setPendingCount(count)
    }, 10_000)

    return () => clearInterval(interval)
  }, [])

  return { status, pendingCount }
}
```

---

## Carga inicial de datos

Al abrir la app por primera vez (o después de un login):

1. Descargar todos los ejercicios del sistema → guardar en Dexie
2. Descargar las rutinas del usuario → guardar en Dexie
3. Descargar últimos 30 workouts → guardar en Dexie
4. A partir de ahí, la app trabaja 100% en local

Esto garantiza que si el usuario pierde conexión, tiene acceso a su historial reciente.
