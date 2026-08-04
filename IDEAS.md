# IDEAS.md

Ideas que surgieron trabajando pero **están fuera del alcance** de
`Redisenio.md`. Nada de acá se implementa sin confirmación explícita.

Orden: impacto real sobre el uso diario, no dificultad.

---

## Alto impacto

### Cronómetro que sigue corriendo con la app cerrada
Hoy el temporizador de descanso vive en memoria: si el usuario sale de la
app, se pierde. Guardar `endsAt` en Dexie y reconstruirlo al volver lo hace
sobrevivir a que el sistema descarte la app. En nativo se combina con la
notificación programada que ya existe.

### Deshacer al borrar
Ahora borrar una serie, una medida o una foto es inmediato y definitivo (con
un `confirm()` en algunos casos, que en móvil es un diálogo feo del sistema).
Un toast con "Deshacer" durante 5 segundos es el patrón correcto: no
interrumpe y protege igual. La infraestructura ya está: `softDelete` deja
lápida, así que restaurar es leerla de vuelta.

### Historial por ejercicio
Al abrir un ejercicio, ver directamente las últimas sesiones: peso, reps y
la curva de 1RM estimado. Hoy el dato existe (`workoutSets` con el índice
`exerciseId`) pero no se muestra en ningún lado, y es lo primero que uno
quiere saber parado frente a la máquina.

### Series de calentamiento automáticas
Con el peso de trabajo ya calculado por el recomendador, proponer la
progresión de calentamiento (40% × 8, 60% × 5, 80% × 3). Es aritmética sobre
datos que ya tenemos y ahorra pensar antes de cada ejercicio pesado.

### Reordenar ejercicios arrastrando
El editor de rutinas usa flechas arriba/abajo. En una lista de 8 ejercicios
mover el último al principio son 7 taps. Arrastrar es el gesto natural.

---

## Medio impacto

### Notas por ejercicio persistentes
"En esta máquina uso el pin 7", "el banco se traba". Distinto de las notas
de rutina: viaja con el ejercicio, no con el día. Se suma a la foto de
referencia que ya existe.

### Detección de estancamiento
Si un ejercicio lleva 3 sesiones sin subir de peso ni de reps, avisarlo y
sugerir un deload del 10%. Es la decisión que más cuesta tomar solo y los
datos para detectarla ya están.

### Volumen semanal por grupo muscular
Series efectivas por grupo en los últimos 7 días, contra el rango de 10–20
que sostiene la literatura. Detecta el desbalance clásico de mucho empuje y
poco tirón. Todo sale de `workoutSets` + `musclePrimary`.

### Widget de bloqueo / Live Activity (iOS)
Con Capacitor ya en el proyecto, mostrar el cronómetro de descanso en la
pantalla de bloqueo o en la Dynamic Island. Es exactamente el momento en que
el usuario no quiere desbloquear el teléfono.

### Exportar a CSV
Sacar el historial completo. Cuesta poco y elimina la sensación de que los
datos quedan encerrados en la app.

### Modo "solo lectura" para el entreno
Al entrar a un ejercicio durante la sesión, ver la técnica sin poder
modificar nada sin querer con la mano sudada.

---

## Bajo impacto / a futuro

### Superseries y circuitos en la UI
El modelo ya soporta `supersetGroup` y el descanso lo respeta, pero armarlas
es poco descubrible: hay que saber que el botón de cadena existe.

### Plantillas propias
Guardar una rutina propia como plantilla reutilizable, además de las 6
clásicas que ya vienen.

### Comparar fotos de progreso lado a lado con fecha
`PhotoGallery` ya tiene modo comparación; falta poder elegir cuáles y ver el
tiempo transcurrido entre ambas.

### Integración con Apple Health / Google Fit
Escribir los entrenos para que cuenten en el anillo de actividad. Requiere
plugins nativos y permisos; con Capacitor ya es posible.

### Tiempo bajo tensión
Registrar el tempo (ej. 3-1-1-0) por ejercicio. Interesa a poca gente pero
a esa le interesa mucho.

---

## Deuda técnica anotada

- **`@tanstack/react-query` está instalado y no se usa.** No hay
  `QueryClientProvider`. O se usa para el sync con Supabase o se desinstala.
- **`docs/01` a `docs/12` mezclan lo real con lo aspiracional.** Ya se
  corrigieron algunos; el resto sigue describiendo una arquitectura Supabase
  que nunca existió.
- **`supabase/functions/send-reminders/` es scaffold muerto.** O se despliega
  o se borra.
- **`Admin.tsx` escribe roles en el IndexedDB del propio usuario.** Funciona
  como demo local, pero no puede sobrevivir a la migración a Supabase Auth.
- **`RoutineExercise.notes` y `restSeconds` son write-only.** Los escribe el
  código (incluido el import por QR, que guarda ahí el peso de referencia)
  pero ningún editor los muestra. Ese dato hoy es invisible.
