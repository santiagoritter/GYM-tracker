import 'fake-indexeddb/auto'
import { encryptString, decryptString, isEncryptedBlob } from '@/lib/crypto'
import { exportBackup } from '@/lib/backup'

/** Cifrado del backup (B7): round-trip AES-GCM, y que una frase equivocada
 * falle limpio en vez de devolver basura. */

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

const plaintext = JSON.stringify({ hola: 'mundo', peso: 82.5, notas: 'ácido láctico' })

const blob = await encryptString(plaintext, 'mi frase secreta 123')
check(isEncryptedBlob(blob), 'el resultado debería reconocerse como EncryptedBlob')
check(blob.enc === 'AES-GCM' && blob.kdf === 'PBKDF2-SHA256', 'metadatos de cifrado')
check(!JSON.stringify(blob).includes('mundo'), 'el texto plano no debería aparecer en el blob cifrado')

const back = await decryptString(blob, 'mi frase secreta 123')
check(back === plaintext, 'descifrar con la frase correcta debería devolver el original')

let threw = false
try {
  await decryptString(blob, 'frase equivocada')
} catch {
  threw = true
}
check(threw, 'descifrar con la frase equivocada debería tirar, no devolver basura')

check(!isEncryptedBlob(JSON.parse(plaintext)), 'un JSON normal no debería parecer cifrado')

// El backup real: sin frase es texto plano; con frase, cifrado.
// exportBackup con un userId inexistente devuelve tablas vacías, suficiente
// para chequear el envoltorio.
const plainBackup = await (await exportBackup('nadie')).text()
check(!isEncryptedBlob(JSON.parse(plainBackup)), 'exportBackup sin frase → texto plano')
const encBackup = await (await exportBackup('nadie', 'clave')).text()
check(isEncryptedBlob(JSON.parse(encBackup)), 'exportBackup con frase → cifrado')

if (fail.length) {
  console.error('\n❌ FALLOS:')
  fail.forEach((f) => console.error('  - ' + f))
  process.exit(1)
}
console.log('✅ Crypto: round-trip AES-GCM, frase equivocada falla limpio, backup cifrado y en claro OK.')
