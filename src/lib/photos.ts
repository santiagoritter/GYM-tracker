const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.8

/**
 * Comprime una imagen en el cliente: máximo 800px de lado mayor, JPEG 80%.
 * Una foto de cámara de ~3MB queda en ~150-250KB.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D no disponible')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al comprimir imagen'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}
