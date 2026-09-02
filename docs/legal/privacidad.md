# Política de privacidad — GymTracker

> Fuente de verdad del texto que muestra `src/pages/Legal.tsx` (`/legal/privacidad`).
> Si cambiás algo acá que sea relevante, subí `LEGAL_VERSION` en `src/lib/legal.ts`.

GymTracker es una app de seguimiento de entrenamientos pensada para funcionar **sin
conexión**. Tus datos viven primero en tu dispositivo.

## Qué datos se guardan

Nombre, email y (si los cargás) fecha de nacimiento, sexo, peso corporal, altura,
objetivos, tus rutinas, entrenamientos, series, récords, medidas, fotos de progreso,
registros de calorías y salidas a correr con su recorrido GPS.

## Dónde se guardan

En el almacenamiento local del navegador o la app (IndexedDB). Si iniciás sesión, se
sincronizan a **Supabase** (proveedor de base de datos) para que puedas recuperarlos en
otro dispositivo. Las fotos van a un bucket privado: solo tu sesión puede leerlas. Cada
usuario solo accede a sus propios datos, garantizado por Row Level Security del lado del
servidor.

## Terceros

- **Spotify** (opcional): si lo conectás, la app usa tu sesión de Spotify para leer y
  controlar la reproducción. No guardamos tu música.
- **OpenStreetMap**: provee los mapas del modo running.
- **No hay** analítica de terceros, píxeles de seguimiento ni publicidad.

## Ubicación

Solo se usa el GPS mientras trackeás una salida a correr, con tu permiso explícito. El
recorrido se guarda con el resto de tus datos y no se comparte con nadie.

## Tus derechos

Podés **exportar** todos tus datos desde Ajustes → Datos (con opción de cifrarlos), y
**borrar tu cuenta** escribiendo a santiagoritter26@gmail.com. Borrar la cuenta elimina
tus datos del servidor.

## Seguridad

Las contraseñas se hashean con bcrypt del lado del servidor (nunca en texto plano). La
conexión es siempre por HTTPS.
