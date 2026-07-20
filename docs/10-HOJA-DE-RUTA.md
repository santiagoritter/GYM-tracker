# Hoja de Ruta de Desarrollo

## Principio de priorización

Construir en orden de valor para el usuario: primero lo que permite registrar un entreno (la acción core), luego lo que permite ver progreso, luego las features de contexto y social.

---

## Fase 1 — MVP (Core Workout)

**Objetivo**: Poder ir al gym y registrar un entreno completo.

### Infraestructura
- [ ] Inicializar proyecto React + Vite + TypeScript
- [ ] Configurar TailwindCSS + shadcn/ui con colores custom
- [ ] Setup Supabase: crear proyecto, correr migraciones
- [ ] Setup Dexie.js: schema local
- [ ] Configurar vite-plugin-pwa (manifiesto + service worker básico)
- [ ] Configurar React Router v6 con layout

### Auth
- [ ] Pantalla de Login (email/password + Google OAuth)
- [ ] Pantalla de Registro
- [ ] Pantalla de completar perfil (DOB, sexo, peso, unidades)
- [ ] Persistencia de sesión

### Registro de entrenamiento
- [ ] Pantalla de sesión activa (layout principal)
- [ ] Componente de ejercicio con acordeón
- [ ] Componente de set (reps + peso + warm-up toggle + checkbox)
- [ ] Guardar sets en Dexie en tiempo real
- [ ] Timer de descanso básico
- [ ] Finalizar sesión con resumen
- [ ] Historial de entrenamientos (lista básica)

### Ejercicios
- [ ] Cargar 200+ ejercicios en JSON
- [ ] Migración para poblar tabla de ejercicios
- [ ] Pantalla de biblioteca con búsqueda
- [ ] Filtros por músculo y equipo
- [ ] Precargar ejercicios en Dexie al primer login

**Criterio de éxito**: Un usuario puede registrarse, abrir la app, agregar ejercicios manualmente, registrar series con pesos, y ver el historial de sus entrenamientos.

---

## Fase 2 — Rutinas y Progreso

**Objetivo**: Organizar el entrenamiento y ver cómo se progresa.

### Rutinas
- [ ] Crear/editar rutina (nombre, color, días)
- [ ] Agregar/reordenar ejercicios en un día (drag-and-drop)
- [ ] Días de descanso
- [ ] Iniciar sesión desde rutina (pre-carga ejercicios del día)
- [ ] Vista semanal con el día de hoy resaltado

### Dashboard de progreso
- [ ] Pantalla de progreso por ejercicio (selector + gráfico Recharts)
- [ ] Filtros de período (semana / mes / 3m / 6m / todo)
- [ ] Gráfico de volumen semanal (barras)
- [ ] Heatmap de días entrenados

### PRs automáticos
- [ ] Detección de PR al finalizar sesión
- [ ] Pantalla de lista de PRs por ejercicio
- [ ] Badge de PR en set durante sesión activa

**Criterio de éxito**: El usuario puede crear su rutina PPL, iniciar el entreno del día desde la app, y ver un gráfico de cómo mejoró en Bench Press en los últimos 3 meses.

---

## Fase 3 — Fotos y Estadísticas

**Objetivo**: Registro visual del progreso y contexto mensual.

### Galería de progreso
- [ ] Subir foto (cámara o galería)
- [ ] Compresión automática en cliente (canvas)
- [ ] Upload a Supabase Storage
- [ ] Vista de galería en grid
- [ ] Comparación lado a lado de 2 fotos
- [ ] Timeline de peso corporal (gráfico de línea)

### Estadísticas mensuales
- [ ] Resumen del mes: sesiones, volumen, PRs, músculos
- [ ] Gráfico de distribución de músculos (donut)
- [ ] Comparativa mes anterior
- [ ] Calendario mensual con días entrenados

### Niveles de fuerza
- [ ] Implementar tablas de estándares (src/lib/strengthStandards.ts)
- [ ] Pantalla de niveles con barras de progreso
- [ ] Cálculo automático después de cada entreno
- [ ] "Necesitás X kg para el siguiente nivel"

**Criterio de éxito**: El usuario puede subir fotos de progreso, ver su galería con peso corporal por fecha, y saber que su sentadilla está a nivel "Intermedio" para su edad y peso.

---

## Fase 4 — Compartir y Offline Total

**Objetivo**: Compartir rutinas y funcionar sin internet en el gym.

### Compartir por QR
- [ ] Generar QR de rutina (lz-string + qrcode)
- [ ] Modal de generación con opción de incluir/excluir pesos
- [ ] Escanear QR desde cámara (jsQR)
- [ ] Preview de rutina importada
- [ ] Importar rutina al tap

### Offline completo
- [ ] Background sync con Workbox
- [ ] Indicador de estado de sync en header
- [ ] Descarga de historial completo al login
- [ ] Resolución de conflictos por updatedAt

**Criterio de éxito**: El usuario puede entrenar completo sin internet, los datos se sincronizan al salir del gym, y puede compartir su rutina PPL escaneando un QR con el celular de un amigo.

---

## Fase 5 — Pulido y Features Avanzados

**Objetivo**: UX refinada y features de valor diferencial.

### Mejoras de UX
- [ ] Animación de PR (slide-in + glow)
- [ ] Swipe-to-complete en sets
- [ ] Vibración al completar set/timer
- [ ] Autocompletar peso del último entreno en cada set
- [ ] Sugerencia de peso basada en histórico (+2.5kg si completaste todos los sets)

### Progresión automática
- [ ] Sugerir aumento de peso si se completaron todos los sets al máximo de reps
- [ ] Notificación de "deload": si llevas 4 semanas sin descanso, sugerir semana liviana

### Análisis avanzado
- [ ] 1RM proyectado por ejercicio (gráfico con tendencia)
- [ ] Volumen por grupo muscular (acumulado por mes)
- [ ] "Esta semana hiciste +15% de volumen en espalda"

---

## No está en el roadmap (v1)

Las siguientes features quedan **fuera del alcance** de la v1 para mantener el foco:

- Videos de demostración de ejercicios
- Plan de nutrición / conteo de calorías
- Feed social / seguir a otros usuarios
- Generación de rutinas por IA
- Wearables / integración con Apple Health / Google Fit
- Versión nativa Android/iOS
- Modo multi-atleta (para entrenadores)

---

## Estimación de esfuerzo

| Fase | Complejidad | Semanas estimadas |
|------|-------------|------------------|
| Fase 1 — MVP | Alta (infraestructura) | 3-4 semanas |
| Fase 2 — Rutinas y Progreso | Media | 2-3 semanas |
| Fase 3 — Fotos y Stats | Media | 2 semanas |
| Fase 4 — QR y Offline | Media-alta | 2 semanas |
| Fase 5 — Pulido | Variable | ongoing |

*Estimaciones para 1 desarrollador a tiempo parcial (~10h/semana).*
