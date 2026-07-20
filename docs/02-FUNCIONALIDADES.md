# Especificación de Funcionalidades

## 1. Autenticación y Perfil

### Auth
- Registro con email + contraseña
- Login con Google OAuth (1 tap)
- Sesión persistente (refresh token automático)
- Logout en todos los dispositivos

### Perfil de usuario
Campos requeridos al completar registro:
- Fecha de nacimiento (para estándares de fuerza ajustados por edad)
- Sexo biológico (masc/fem, para estándares de fuerza)
- Peso corporal actual (kg o lbs)
- Altura (cm/ft)
- Unidades preferidas (kg o lbs — afecta toda la app)

---

## 2. Registro de Entrenamiento

### Iniciar sesión
- Desde "Mi rutina de hoy" → arranca con los ejercicios del día
- Desde "Entrenamiento libre" → agregar ejercicios manualmente
- Desde historial → repetir un entreno anterior

### Durante la sesión (pantalla activa)
- Header: nombre del entreno + cronómetro total
- Lista de ejercicios como acordeones desplegables
- Por cada ejercicio: nombre + músculo principal + icono

### Por cada serie (set)
- Tipo: calentamiento (warm-up) o trabajo (working set)
- Reps: input numérico con +/- botones
- Peso: input numérico con +/- configurables (ej. +2.5kg)
- RPE: slider 6-10 (opcional)
- Marcar como completada con swipe o tap en checkbox
- Al completar → timer de descanso automático (configurable por ejercicio)

### Timer de descanso
- Cuenta regresiva visible con ring progress
- Vibración al terminar (si el navegador lo soporta)
- Skip o +30s desde el timer
- Por defecto: 90 segundos (configurable en perfil)

### Agregar ejercicios durante la sesión
- Buscador con autocompletado desde biblioteca
- Aparece al final en playlist style (drag para reordenar)

### Finalizar sesión
- Resumen: duración, ejercicios completados, volumen total (kg)
- Notas de sesión (texto libre)
- Foto de sesión opcional (comprimida a 800px / 80% quality antes de upload)
- Comparativa con sesión anterior del mismo entreno
- PRs automáticamente detectados y destacados

### Historial de entrenamientos
- Lista cronológica con fecha, nombre, duración, volumen
- Tap → detalle completo con todos los sets
- Filtro por período y por rutina

---

## 3. Biblioteca de Ejercicios

### Catálogo base
200+ ejercicios precargados con:
- Nombre (español + inglés)
- Músculos primarios (1-2)
- Músculos secundarios (0-3)
- Tipo de equipo: barra, mancuernas, máquina, cable, peso corporal, banda
- Patrón de movimiento: empuje, jalón, sentadilla, bisagra, cargada, aislamiento
- Plano: horizontal, vertical, rotacional
- Dificultad: principiante / intermedio / avanzado
- Posición: de pie, sentado, tumbado, inclinado

### Filtros
- Por grupo muscular (multiselect)
- Por equipo disponible
- Por patrón de movimiento
- Por dificultad
- Búsqueda por nombre (fuzzy search)

### Ranking de ejercicios
- "Más efectivos" — basado en frecuencia de uso global + EMG studies (precargado)
- "Más populares" — basado en usos en la app
- "Tus favoritos" — marcados por el usuario con ⭐

### Ejercicios custom
- El usuario puede crear sus propios ejercicios
- Los custom son privados (no aparecen en el catálogo global)
- Mismos campos que los predefinidos

### Vista de ejercicio
- Nombre + músculos trabajados (chips de color)
- Tu historial en ese ejercicio (gráfico inline pequeño)
- Tu mejor set histórico
- Tu nivel de fuerza para ese ejercicio

---

## 4. Rutinas

### Crear/editar rutina
- Nombre y color identificador
- Días de la semana o días numerados (Día 1, Día 2...)
- Por cada día: nombre descriptivo o "Descanso"
- Los días de descanso son visibles en el calendario pero no tienen ejercicios

### Agregar ejercicios a un día (estilo playlist)
- Buscador de ejercicios en sheet/bottom drawer
- Los ejercicios se agregan en orden a una lista visual
- Cada item en la lista: nombre + músculos + configuración
- Reordenar con drag-and-drop (DnD Kit)
- Agrupar en superseries (marcar 2+ ejercicios como superset)

### Configuración por ejercicio en rutina
- Sets objetivo
- Reps objetivo (rango: ej. 8-12)
- Tiempo de descanso objetivo
- Notas del ejercicio (ej. "codos adentro")

### Mis rutinas
- Lista de rutinas activas con chips de días
- Marcar una rutina como "activa" (la que se usa ahora)
- Duplicar rutina
- Archivar rutina (no aparece en lista principal pero se conserva historial)

### Vista de semana
- Calendario semanal que muestra qué entreno toca cada día
- Basado en la rutina activa + historial real de entrenamientos

---

## 5. Dashboard de Progreso

### Progreso por ejercicio
- Seleccionar ejercicio → ver gráfico de historial
- Eje Y: peso máximo del mejor set, peso promedio, o volumen total
- Eje X: tiempo (última semana / mes / 3 meses / 6 meses / año / todo)
- Ver sets históricos como tabla debajo del gráfico

### Progreso de volumen
- Volumen semanal total (suma de todos los sets × reps × peso)
- Por grupo muscular: "esta semana hiciste 8000kg de empuje de pecho"
- Gráfico de barras por semana, últimas 12 semanas

### Frecuencia
- Heatmap estilo GitHub contributions con días de entreno
- Racha actual y racha máxima

### Comparativa temporal
- "Hace 3 meses hacías 70kg en bench, ahora hacés 85kg (+21%)"

---

## 6. Galería de Progreso

### Subir foto
- Captura desde cámara o selección de galería
- Compresión automática cliente-side (canvas, max 800px, 80% JPEG)
- Campos: fecha (auto), peso corporal, medidas opcionales (cintura, pecho, brazo, muslo)
- Notas libres

### Vista galería
- Grid de fotos ordenadas por fecha
- Tap → vista fullscreen con datos del día

### Comparación lado a lado
- Seleccionar 2 fotos para ver cambio

### Timeline de peso corporal
- Gráfico de línea con el peso corporal registrado en cada foto

---

## 7. Personal Records (PRs)

### Detección automática
- Al finalizar un entreno, comparar cada set con el historial
- Si es el mayor peso × reps en ese ejercicio → PR detectado
- PR de mejor set: mayor peso con cualquier reps
- PR de volumen: mayor volumen en una sesión (sets × reps × peso)

### 1RM calculado
- Usando fórmula Epley: `1RM = peso × (1 + reps / 30)`
- Se muestra junto al PR real
- Permite comparar progreso independientemente de reps usadas

### Lista de PRs
- Por ejercicio: mejor peso, mejor reps, mejor 1RM estimado, fecha
- Historial de PRs: timeline de cuándo se rompieron
- Badge "PR" destacado en la sesión activa cuando se rompe uno

---

## 8. Estadísticas Mensuales

### Resumen del mes
- Sesiones completadas vs objetivo
- Volumen total del mes
- Ejercicios realizados (conteo de variedad)
- Grupos musculares trabajados (porcentaje de distribución)
- PRs del mes
- Días de descanso vs entreno

### Comparativa mes anterior
- Diferencia en sesiones, volumen y PRs vs el mes anterior

### Calendario mensual
- Vista de qué días se entrenó, qué músculos, cuánto tiempo

---

## 9. Niveles de Fuerza

### Cómo funciona
- Para cada ejercicio principal (squat, bench, deadlift, OHP, row, pullup)
- Calcular ratio: peso levantado / peso corporal del usuario
- Ajustar por edad y sexo usando tablas de estándares
- Asignar nivel: Desconocido → Novato → Principiante → Intermedio → Avanzado → Elite

### Pantalla de niveles
- Card por ejercicio principal con barra de progreso hasta el siguiente nivel
- "Necesitás levantar 5kg más para llegar a Avanzado en Bench Press"
- Resumen: nivel promedio general
- Ver estándares completos en tabla expandible

### Actualización
- Se recalcula automáticamente después de cada entreno
- Usa el mejor 1RM estimado histórico del usuario

---

## 10. Compartir Rutinas por QR

### Generar QR
- Desde cualquier rutina → botón "Compartir"
- Seleccionar si incluir pesos o solo estructura
- El QR contiene toda la rutina codificada (sin llamada al servidor)
- Botón de compartir imagen del QR (nativo de navegador)
- Botón de copiar como texto JSON (para geeks)

### Escanear QR
- Botón "Escanear rutina" en sección Rutinas
- Abre cámara del dispositivo
- Al detectar QR válido: preview de la rutina importada
- Preview muestra: días, ejercicios por día, series/reps configurados
- Botón "Importar rutina" → se agrega a Mis Rutinas
- El usuario puede renombrarla antes de importar

### Formato del QR
Ver [docs/07-COMPARTIR-QR.md](07-COMPARTIR-QR.md) para spec técnica completa.
