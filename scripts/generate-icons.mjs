// Genera los íconos PWA (PNG) sin dependencias: dibuja una mancuerna
// lima sobre fondo oscuro píxel por píxel y codifica el PNG a mano.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const BG = [0x0a, 0x0a, 0x0a, 255]
const ACCENT = [0xe8, 0xff, 0x47, 255]

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // Cada scanline lleva un byte de filtro (0 = None) al inicio
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels(x, y)
      const i = rowStart + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Mancuerna: barra horizontal + dos pares de discos, en coordenadas relativas 0..1 */
function isDumbbell(u, v) {
  const inRect = (x0, x1, y0, y1) => u >= x0 && u <= x1 && v >= y0 && v <= y1
  return (
    inRect(0.28, 0.72, 0.465, 0.535) || // barra
    inRect(0.2, 0.28, 0.3, 0.7) || // disco interno izq
    inRect(0.13, 0.19, 0.37, 0.63) || // disco externo izq
    inRect(0.72, 0.8, 0.3, 0.7) || // disco interno der
    inRect(0.81, 0.87, 0.37, 0.63) // disco externo der
  )
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })

for (const size of [192, 512]) {
  const png = encodePng(size, (x, y) => {
    const u = x / size
    const v = y / size
    return isDumbbell(u, v) ? ACCENT : BG
  })
  const path = new URL(`../public/icons/icon-${size}.png`, import.meta.url)
  writeFileSync(path, png)
  console.log(`✓ icon-${size}.png (${png.length} bytes)`)
}
