# Errores del Brief Original y Correcciones Aplicadas

Este archivo documenta qué problemas se encontraron en el concepto inicial y cómo se resolvieron en la documentación y diseño de la app.

---

## Errores técnicos

### 1. Firebase como backend → Reemplazado por Supabase
**Problema**: El usuario pidió explícitamente no usar Firebase.
**Corrección**: Supabase es la alternativa open-source más completa:
- PostgreSQL real (no NoSQL como Firestore)
- Self-hosteable si el free tier no alcanza
- RLS declarativo y auditeable
- SDK tipado con generación de tipos

### 2. Sin estrategia offline
**Problema**: El brief no mencionaba qué pasa sin internet, siendo crítico para una app de gym.
**Corrección**: Arquitectura offline-first completa:
- Dexie.js como DB local (IndexedDB)
- Escritura local primero, sync en background
- Workbox para Service Worker y cache
- Indicador de estado de sync visible
Ver [docs/06-OFFLINE-SYNC.md](06-OFFLINE-SYNC.md)

### 3. QR sin análisis de capacidad
**Problema**: Los QR tienen un límite de ~2KB. Una rutina grande puede no entrar.
**Corrección**: Pipeline de compresión: JSON → lz-string → base64url → QR.
Reduce el payload 60-70%. Estimaciones por tamaño de rutina documentadas.
Ver [docs/07-COMPARTIR-QR.md](07-COMPARTIR-QR.md)

### 4. Fotos sin compresión
**Problema**: Subir fotos de alta resolución a Supabase Storage (límite 5MB/archivo en free tier) causaría problemas.
**Corrección**: Compresión client-side obligatoria antes del upload:
- Max 800px ancho con canvas
- 80% calidad JPEG
- Redución típica: 3MB → ~200KB

---

## Errores de UX/producto

### 5. No distinguir sets de calentamiento vs trabajo
**Problema**: El volumen total y los PRs no deben incluir sets de calentamiento (warmup distorsiona el progreso).
**Corrección**: Columna `is_warmup` en `workout_sets`. Los warm-ups no cuentan para:
- Cálculo de volumen total
- Detección de PRs
- Estadísticas mensuales

### 6. Sin timer de descanso
**Problema**: El brief no lo mencionaba, pero es indispensable para el uso en el gym.
**Corrección**: Timer integrado con:
- Cuenta regresiva visual con ring progress
- Configurable por ejercicio y globalmente
- Vibración al terminar
- Skip y +30s

### 7. Sin unidades configurables (kg/lbs)
**Problema**: No todos usan kg. Los usuarios de LATAM generalmente usan kg, pero EE.UU. usa lbs.
**Corrección**: Campo `units` en `profiles`. Toda la UI convierte automáticamente.
La DB siempre almacena en kg (conversión solo en capa de presentación).

### 8. Niveles de fuerza sin metodología clara
**Problema**: El brief decía "ver tu nivel" pero no explicaba cómo calcularlo.
**Corrección**: Metodología documentada:
- Ratio 1RM / peso corporal
- Tablas separadas por sexo biológico
- Multiplicadores por rango etario
- Basado en ExRx.net + Symmetric Strength
Ver [docs/08-NIVELES-FUERZA.md](08-NIVELES-FUERZA.md)

### 9. "Spotify-style playlist" para ejercicios no estaba especificado
**Problema**: El brief mencionaba el concepto pero sin especificar la UX.
**Corrección**: Definido como:
- Lista de ejercicios con acordeones desplegables
- Drag-and-drop para reordenar (DnD Kit)
- Búsqueda + add en un bottom sheet
- Indicador de músculo con chips de color

---

## Omisiones importantes corregidas

### 10. No había sistema de 1RM calculado
**Adición**: Fórmula Epley para estimar 1RM desde cualquier combinación de peso × reps.
```
1RM = peso × (1 + reps / 30)
```
Esto permite comparar entrenamientos con diferente esquema de reps.

### 11. No había RPE/RIR
**Adición**: Campo opcional de RPE (Rate of Perceived Exertion) por serie.
Permite al usuario registrar el esfuerzo percibido y hacer progresión más inteligente.

### 12. No había supersets
**Adición**: Campo `superset_group` en `routine_exercises` para agrupar ejercicios en supersets.
Dos ejercicios con el mismo `superset_group` se ejecutan alternados.

### 13. No había warm-up sets de calentamiento
**Adición**: Toggle de calentamiento por serie. Los warm-ups:
- Se muestran diferente visualmente (color atenuado)
- No cuentan para estadísticas
- Se sugieren automáticamente al iniciar un ejercicio pesado

---

## Decisiones de diseño tomadas

| Decisión | Alternativa considerada | Por qué esta |
|----------|------------------------|-------------|
| Modo oscuro único | Dark/light toggle | La app se usa en el gym con luz intensa; el oscuro siempre es mejor ahí |
| Color acento lima #E8FF47 | Azul, rojo, naranja | Contrasta máximo sobre fondo negro, poco común en apps de gym |
| Supabase | PocketBase | Supabase tiene mejor ecosistema, más features y tier gratuito mayor |
| React + Vite | SvelteKit / Next.js | El usuario eligió React explícitamente |
| Geist Mono para números | System monospace | Mejor legibilidad para números grandes, alineación perfecta |
