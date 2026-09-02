# 18 — Modo running con GPS (B6)

Trackea una salida a correr: tiempo, distancia, ritmo (actual y promedio),
parciales por kilómetro, desnivel y el recorrido sobre un mapa. Pide el
permiso de ubicación de forma explícita antes de arrancar.

## Piezas

| Archivo | Rol |
|---|---|
| `src/lib/run.ts` | **Matemática pura y testeable**: haversine, limpieza de puntos (filtro de precisión + saltos imposibles), `summarizeRun` (distancia, ritmo, splits por km, desnivel, kcal), `currentPaceSecPerKm` (ritmo instantáneo suavizado). Cero DOM/Dexie/GPS. |
| `src/lib/geo.ts` | Wrapper de geolocalización con dos backends: `@capacitor-community/background-geolocation` (nativo, sigue con la pantalla apagada) y `@capacitor/geolocation` `watchPosition` (web / fallback, solo con la app abierta). `ensureLocationPermission()` + `startWatch(onFix)`. Degrada sin romper. |
| `src/stores/runStore.ts` | Sesión en curso. **Se persiste** en localStorage (a diferencia de `cardioStore`): una salida dura mucho y el webview puede reciclarse; sin persistir se perdería el recorrido. |
| `src/pages/Run.tsx` | Pantalla completa (`/correr`, fuera de `AppShell`). Fases: `permission → setup → active → summary`. |
| `src/components/gym/RunPermissionGate.tsx` | Racional + pedido de permiso. |
| `src/components/gym/RunMap.tsx` | Mapa Leaflet + tiles OSM, **lazy** (chunk `leaflet` en `vite.config.ts`, ~43KB gzip). Marcadores como `circleMarker` (los íconos por defecto de Leaflet rompen con bundlers). Sin conexión: Leaflet muestra gris y la polilínea igual se dibuja. |
| `src/components/gym/RunSplits.tsx` | Parciales por km como barras `scaleX` (sin Recharts). |
| Dexie **v13**, tabla `runs` | `id, userId, workoutId, startedAt, dirty` indexados; `route`/`summary` no. Sync-ready (`userId`/`dirty`) pero **NO** en `SYNC_ORDER` todavía — el sync de runs es trabajo de la fase backend. Test: `scripts/test-runs-migration.mjs`. |
| `Workout` espejo | Al terminar se crea un `Workout` con `notes = formatRunNotes(...)` (mismo truco que cardio) para que la salida aparezca en el historial y las métricas. Los datos ricos (trazado, splits) viven en `runs`, linkeados por `workoutId`. |

## Datos que se recolectan

Estándar de apps de running (Strava/Apple Workout), lo que da la Geolocation
API sin sensores extra:

- Tiempo total y "en movimiento" (descuenta paradas).
- Distancia acumulada (haversine). **Filtro anti-drift** (`src/lib/run.ts`):
  1. Se descartan los fixes con precisión reportada peor que **25 m** y los
     "teletransportes" (> 40 m/s).
  2. Se avanza de **punto confirmado en punto confirmado**: un fix nuevo
     solo aporta su desplazamiento cuando se alejó del último confirmado
     **más que el margen de error del GPS** (`movementGateM` = el promedio
     de las dos precisiones, con piso de 4 m). Parado, el drift del GPS de
     un navegador (saltos de 5-15 m con la app quieta) nunca supera su
     propio margen de error → **no acumula distancia**. En movimiento
     sostenido, aunque sea lento, tarde o temprano te alejás lo suficiente
     y el tramo cuenta. Esto reemplazó a un simple "ignorá pasos < 2.5 m",
     que en la web dibujaba una caminata estando quieto.
  - Nota: en la **app nativa** el GPS es bastante más preciso (location
    fusionada + GPS real vía `@capacitor-community/background-geolocation`);
    el filtro igual aplica y no estorba.
- Ritmo: instantáneo (ventana ~30 s), promedio total, y por km (auto-lap
  cada 1000 m con interpolación en el borde). Mejor km.
- Velocidad promedio y máxima.
- Desnivel + / − (altitud GPS, con umbral de 1 m para no acumular jitter).
- Recorrido `{lat,lng,t,alt?,acc?}[]` → polilínea + marcadores de km.
- Calorías estimadas: `0.9 kcal · kg⁻¹ · km⁻¹` × `LocalProfile.bodyWeightKg`
  (sin peso, no se calcula).
- Objetivo opcional (distancia o tiempo) con barra de progreso + háptico al
  cumplirlo. No corta: sigue contando.

Sin cadencia ni pulso (no hay BLE).

## Nativo — Android

`AndroidManifest.xml` ya trae los permisos: `ACCESS_FINE/COARSE_LOCATION`,
`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`. El servicio de
foreground y su notificación los aporta el plugin (manifest mergeado). El
usuario tiene que elegir **"Permitir todo el tiempo"** para el registro con
pantalla apagada.

## Nativo — iOS (pendiente)

No hay proyecto `ios/` (necesita Mac). Cuando se genere, el `Info.plist`
necesita: `NSLocationWhenInUseUsageDescription`,
`NSLocationAlwaysAndWhenInUseUsageDescription`, y
`UIBackgroundModes` con `location`. Ver README del plugin.

## Verificación

- `npm run test:run` — matemática de haversine/distancia/splits/ritmo/
  desnivel/kcal con puntos sintéticos de geometría conocida.
- `npm run test:db` — incluye `test-runs-migration` (v12 → v13).
- **Pendiente en dispositivo real** (no hay Android ni GPS en el entorno):
  recorrer una ruta con la pantalla apagada y confirmar que la distancia
  sigue sumando; auto-lap a 1 km; mapa del resumen con tiles OSM; permiso
  denegado → estado digno; offline → graba y muestra recorrido sin fondo.
