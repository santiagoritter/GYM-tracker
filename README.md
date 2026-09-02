# GymTracker

App de seguimiento de entrenamientos. Minimalista, offline-first, compartible.

## Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Estilos**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **PWA**: vite-plugin-pwa + Workbox
- **Offline**: Dexie.js (IndexedDB)
- **Hosting**: Vercel + Supabase Cloud

## Correr en local

La app funciona en **modo local** sin backend: todos los datos viven en IndexedDB del navegador.

```bash
cd gym-tracker
npm install
npm run dev
# abrir http://localhost:5173
```

Supabase (auth + sync multi-dispositivo) es opcional y se configura recién en Fase 4 — ver [docs/09-DESPLIEGUE.md](docs/09-DESPLIEGUE.md).

## Instalar en el teléfono

- **Android (APK)**: descargá `gymtracker.apk` desde [Releases](https://github.com/santiagoritter/GYM-tracker/releases/latest) y abrilo en el teléfono (hay que permitir "instalar apps de esta fuente"). Trae notificaciones nativas: el recordatorio de entrenar y el aviso de fin de descanso llegan con la app cerrada. El APK lo genera el workflow `Build Android APK` (Actions). Detalles y firma de release en [docs/16-CAPACITOR.md](docs/16-CAPACITOR.md).
- **PWA (cualquier dispositivo)**: abrí la app en el navegador y usá "Instalar" (aparece también en Ajustes → La app). En iOS: Compartir → Agregar a inicio.

## Estado actual

- ✅ **Fase 1 (MVP)**: sesión de entreno con series/timer de descanso/calentamiento, biblioteca de 103 ejercicios, historial, PRs automáticos con 1RM (Epley), perfil local, PWA instalable
- ✅ **Fase 2**: rutinas por días estilo playlist con "Entrenar" en un tap, dashboard de progreso con gráficos (mejor peso por entreno + volumen semanal)
- ✅ **Fase 3**: galería de fotos de progreso (comprimidas, 100% locales), estadísticas mensuales con distribución muscular, niveles de fuerza por edad/sexo/peso corporal
- ✅ **Fase 4**: compartir rutinas por QR sin servidor (generar, escanear con cámara, importar con preview)
- ✅ **Fase 5 (parcial)**: RPE por serie, progresión automática +2.5kg, comparador de fotos lado a lado
- ⏳ **Pendiente**: sync Supabase opcional (requiere cuenta), supersets — ver [docs/10-HOJA-DE-RUTA.md](docs/10-HOJA-DE-RUTA.md)

El registro de decisiones y correcciones está en [docs/BITACORA.md](docs/BITACORA.md).

## Documentación

| Archivo | Descripción |
|---------|-------------|
| [Visión](docs/00-VISION.md) | Qué es, para quién, diferenciadores |
| [Arquitectura](docs/01-ARQUITECTURA.md) | Stack, decisiones técnicas, estructura |
| [Funcionalidades](docs/02-FUNCIONALIDADES.md) | Spec completa de cada módulo |
| [Esquema DB](docs/03-ESQUEMA-DB.md) | Tablas, relaciones, tipos |
| [Sistema de Diseño](docs/04-SISTEMA-DISENO.md) | Colores, tipografía, componentes |
| [Contratos API](docs/05-CONTRATOS-API.md) | Endpoints, RLS policies |
| [Offline & Sync](docs/06-OFFLINE-SYNC.md) | Estrategia offline-first |
| [Compartir QR](docs/07-COMPARTIR-QR.md) | Sistema de QR para rutinas |
| [Niveles de Fuerza](docs/08-NIVELES-FUERZA.md) | Estándares por edad/peso |
| [Despliegue](docs/09-DESPLIEGUE.md) | Guía de deploy |
| [Hoja de Ruta](docs/10-HOJA-DE-RUTA.md) | Fases de desarrollo |

## Prompt de contexto

Ver [PROMPT-CONTEXTO.md](PROMPT-CONTEXTO.md) para usar con Claude/Cursor/Copilot.
