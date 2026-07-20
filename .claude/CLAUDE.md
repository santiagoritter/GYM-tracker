# GymTracker — Instrucciones para Claude

## El proyecto

App web PWA de seguimiento de entrenamientos. Stack: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + Supabase + Dexie.js.

## Stack rápido

- Frontend: React + Vite + TypeScript (strict)
- Estilos: TailwindCSS + shadcn/ui (customizado, no defaults)
- Estado: Zustand (global) + TanStack Query v5 (server)
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Offline: Dexie.js (IndexedDB)
- Router: React Router v6
- Iconos: Lucide React (no otros)

## Diseño

- Fondo: #0A0A0A — Surface: #141414 — Acento: #E8FF47 (lima)
- Tipografía UI: Inter — Números/pesos: Geist Mono
- Modo oscuro ÚNICO (no toggle)
- NO usar colores default de shadcn/ui sin customizar
- Principio: "números grandes, espacio generoso, un solo acento"

## Reglas de código

- No usar `any` en TypeScript
- Imports absolutos con alias `@/` → `src/`
- Componentes en `src/components/gym/` (dominio) o `src/components/ui/` (base)
- Stores en `src/stores/`, hooks en `src/hooks/`
- Siempre RLS activado en tablas Supabase
- Offline-first: escribir en Dexie primero, sync en background
- Fotos: comprimir a 800px / 80% JPEG antes del upload

## Documentación

Ver `docs/` para referencia completa:
- `02-FUNCIONALIDADES.md` — spec de cada módulo
- `03-ESQUEMA-DB.md` — tablas y relaciones
- `04-SISTEMA-DISENO.md` — tokens de diseño
- `07-COMPARTIR-QR.md` — formato QR
- `08-NIVELES-FUERZA.md` — tablas de estándares

## Convenciones de respuesta

Respondé siempre en español. Preferí soluciones directas sin abstracciones innecesarias.
