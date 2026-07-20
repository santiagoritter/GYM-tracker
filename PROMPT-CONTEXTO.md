# Prompt de Contexto — GymTracker

Usá este prompt al inicio de cualquier sesión con Claude, Cursor o Copilot para que entienda el proyecto completo.

---

## Prompt Maestro

```
Estoy trabajando en GymTracker, una app web PWA de seguimiento de entrenamientos.

## Stack
- React 18 + Vite + TypeScript (strict)
- TailwindCSS + shadcn/ui para componentes
- Zustand para estado global
- TanStack Query (React Query v5) para datos del servidor
- React Hook Form + Zod para formularios y validación
- Supabase como backend (PostgreSQL + Auth + Storage)
- Dexie.js para caché offline en IndexedDB
- vite-plugin-pwa + Workbox para PWA
- Recharts para gráficos
- qrcode + jsQR para generar/escanear QR
- lz-string para comprimir datos de rutinas en QR
- React Router v6 para navegación
- Lucide React para iconos
- Hosting: Vercel (frontend) + Supabase Cloud (backend)

## Principios de diseño
- Visual minimalista: fondo #0A0A0A, surface #141414, acento #E8FF47 (lima)
- Tipografía: Inter para UI, Geist Mono para números de peso/reps
- "Números grandes, espacio generoso, un color de acento"
- NO usar colores default de shadcn/ui sin customizar
- Modo oscuro por defecto (único modo)

## Estructura de carpetas (cuando el proyecto exista)
src/
├── components/      # Componentes reutilizables
│   ├── ui/          # shadcn/ui base components
│   └── gym/         # Componentes específicos de la app
├── pages/           # Rutas de React Router
├── stores/          # Zustand stores
├── hooks/           # Custom hooks
├── lib/             # Supabase client, utils, constantes
├── db/              # Dexie schema + sync logic
├── types/           # TypeScript types globales
└── data/            # Ejercicios precargados (JSON)

## Convenciones de código
- Componentes: PascalCase, archivos .tsx
- Hooks: camelCase con prefijo "use", archivos .ts
- Stores: camelCase con sufijo "Store", ej: workoutStore.ts
- Types: PascalCase, sin prefijo "I" ni "T"
- Funciones async siempre con try/catch + toast de error
- No usar "any" en TypeScript
- Imports absolutos desde "src/" (alias "@/")

## Módulos principales
1. Auth — email/password + Google OAuth, perfil con DOB/peso/unidades (kg o lbs)
2. Registro de entreno — sesión activa con sets/reps/peso/RPE, timer de descanso
3. Biblioteca de ejercicios — 200+ ejercicios, filtros por músculo/equipo/patrón
4. Rutinas — días de entrenamiento + descansos, drag-and-drop estilo playlist
5. Dashboard — gráficos de progreso por ejercicio, volumen, frecuencia
6. Galería de progreso — fotos con peso corporal, timeline
7. PRs — personal records automáticos + 1RM calculado (fórmula Epley)
8. Estadísticas mensuales — resumen por mes
9. Niveles de fuerza — comparación vs estándares por edad/peso corporal/sexo
10. Compartir QR — rutinas codificadas en QR sin dependencia de servidor

## Reglas de Supabase
- Toda tabla tiene Row Level Security (RLS) activada
- El user_id siempre es auth.uid() en las policies
- Nunca exponer claves privadas en el cliente
- Usar Supabase realtime solo para notificaciones, no para sync principal

## Offline
- Al registrar un entreno sin internet: guardar en Dexie.js primero
- Al recuperar conexión: sync automático a Supabase
- Indicador de estado de sync visible en header
- Conflictos: last-write-wins por updated_at timestamp

## Formato de QR para rutinas
- Payload: { v: 1, n: "nombre", d: [{ n: "día", e: [{ id, s: sets, w: peso_kg }] }] }
- Proceso: JSON → LZ-string compress → base64url → QR code
- Máximo ~2KB para que el QR sea scaneable
- Sin llamadas a servidor durante generación ni escaneo

Respondé siempre en español. Preferí soluciones simples. No inventés abstracciones innecesarias.
```

---

## Prompt rápido para nuevas funcionalidades

```
Proyecto: GymTracker (React+Vite+TypeScript+Supabase+TailwindCSS+shadcn/ui)
Diseño: minimalista oscuro, acento lima #E8FF47
Convención: ver PROMPT-CONTEXTO.md para estructura y reglas

Tarea: [DESCRIBIR FUNCIONALIDAD AQUÍ]

Restricciones:
- No usar "any" en TypeScript
- RLS activado en Supabase
- Offline-first: guardar en Dexie antes de sync
- Seguir estructura de carpetas src/ existente
```
