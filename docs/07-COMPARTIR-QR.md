# Compartir Rutinas por QR

## Concepto

Inspirado en apps de intercambio de objetos coleccionables: generar un QR que contiene la rutina completa codificada. La otra persona escanea, ve la previsualización y puede importar con un tap. Sin login, sin links, sin servidor requerido.

---

## Flujo completo

### Exportar (compartir)

```
1. Usuario abre su rutina "Push Pull Legs"
2. Toca botón "Compartir ↗"
3. Modal se abre con opciones:
   - [✓] Incluir pesos
   - [✓] Incluir notas de ejercicio
4. Se genera QR inmediatamente (sin llamada al servidor)
5. Opciones del modal:
   - Descargar imagen del QR
   - Compartir imagen (Web Share API)
   - Copiar como texto (JSON legible)
```

### Importar (escanear)

```
1. Usuario abre app → Rutinas → botón "Escanear QR" (ícono QR)
2. Se abre cámara del dispositivo
3. Al detectar QR válido de GymTracker:
   - Vibración corta de confirmación
   - Modal de previsualización aparece
4. Preview muestra:
   - Nombre de la rutina
   - Lista de días con ejercicios
   - Número de ejercicios por día
5. Usuario puede renombrar la rutina antes de importar
6. Tap "Importar rutina" → se agrega a Mis Rutinas
7. Si el QR contiene pesos → se importan como referencia en configuración
```

---

## Formato del payload

### Estructura mínima

```ts
interface QRPayload {
  v: 1,                  // versión del formato (para compatibilidad futura)
  n: string,             // nombre de la rutina
  d: QRDay[],            // días
}

interface QRDay {
  n: string,             // nombre del día (ej: "Pecho y Tríceps")
  r?: true,              // is_rest (opcional, omitido si false)
  e?: QRExercise[],      // ejercicios (omitido en días de descanso)
}

interface QRExercise {
  id: string,            // UUID del ejercicio del catálogo
  s: number,             // sets target
  r: [number, number],   // reps [min, max]
  w?: number,            // peso en kg (opcional)
  rs?: number,           // rest_seconds (opcional)
  n?: string,            // notas (opcional)
}
```

### Ejemplo de payload

```json
{
  "v": 1,
  "n": "Push Pull Legs",
  "d": [
    {
      "n": "Push",
      "e": [
        { "id": "abc123", "s": 4, "r": [8, 12], "w": 80 },
        { "id": "def456", "s": 3, "r": [10, 15], "w": 25 }
      ]
    },
    {
      "n": "Pull",
      "e": [
        { "id": "ghi789", "s": 4, "r": [6, 10], "w": 70 }
      ]
    },
    { "n": "Descanso", "r": true },
    {
      "n": "Legs",
      "e": [
        { "id": "jkl012", "s": 4, "r": [6, 8], "w": 120 }
      ]
    }
  ]
}
```

---

## Proceso de compresión

Los QR tienen un límite de ~2KB para ser escaneables con cámara de celular. El JSON de una rutina compleja puede exceder ese límite fácilmente.

### Pipeline de compresión

```ts
// src/lib/qr.ts
import LZString from 'lz-string'
import QRCode from 'qrcode'

export async function generateRoutineQR(
  routine: Routine,
  options: { includeWeights: boolean }
): Promise<string> {
  // 1. Construir payload mínimo
  const payload: QRPayload = buildPayload(routine, options)

  // 2. JSON → string compacto (sin espacios)
  const json = JSON.stringify(payload)

  // 3. Comprimir con LZ-String (reduce 60-70% en promedio)
  const compressed = LZString.compressToEncodedURIComponent(json)

  // 4. Prefijo para identificar el QR como GymTracker
  const data = `GYMTR:${compressed}`

  // 5. Generar QR como Data URL (PNG)
  const qrDataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',  // M = 15% de corrección, balance capacidad/robustez
    margin: 2,
    color: {
      dark: '#0A0A0A',
      light: '#F0F0F0'
    },
    width: 300
  })

  return qrDataUrl
}
```

### Pipeline de descompresión

```ts
export function parseRoutineQR(rawData: string): QRPayload | null {
  try {
    // 1. Verificar prefijo
    if (!rawData.startsWith('GYMTR:')) return null

    // 2. Extraer datos comprimidos
    const compressed = rawData.slice(6)

    // 3. Descomprimir
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) return null

    // 4. Parsear y validar
    const payload = JSON.parse(json) as QRPayload
    if (payload.v !== 1) return null

    return payload
  } catch {
    return null
  }
}
```

---

## Límites de capacidad

| Rutina | JSON sin comp. | Comprimido | % del límite QR |
|--------|---------------|-----------|-----------------|
| 3 días × 5 ejercicios (sin pesos) | ~800 bytes | ~320 bytes | 16% ✅ |
| 4 días × 8 ejercicios (con pesos) | ~1.8 KB | ~720 bytes | 36% ✅ |
| 7 días × 10 ejercicios (con todo) | ~3.5 KB | ~1.4 KB | 70% ✅ |
| 7 días × 15 ejercicios + notas | ~5 KB | ~2 KB | ~100% ⚠️ |

Para rutinas muy grandes, ofrecer opción de "compartir sin pesos ni notas" para reducir tamaño.

---

## Escaneo desde cámara

```ts
// src/hooks/useQRScanner.ts
import jsQR from 'jsqr'

export function useQRScanner(onDetected: (data: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }  // cámara trasera
    })
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    ctx.drawImage(videoRef.current, 0, 0)
    const imageData = ctx.getImageData(0, 0, 300, 300)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data.startsWith('GYMTR:')) {
      onDetected(code.data)
    }
  }

  // Escanear cada 200ms
  useEffect(() => {
    startCamera()
    const interval = setInterval(scanFrame, 200)
    return () => clearInterval(interval)
  }, [])

  return { videoRef, canvasRef }
}
```

---

## Token server-side (opcional para links con expiración)

Para compartir por link en lugar de QR directo, existe el endpoint `generate-qr-token` (ver [docs/05-CONTRATOS-API.md](05-CONTRATOS-API.md)) que genera un token con expiración. Al escanear, se hace una llamada a Supabase para obtener la rutina.

Esta feature es opcional y no necesaria para la funcionalidad base de QR.
