import { supabase } from '@/lib/supabaseClient'
import { db, SYNC_ORDER } from '@/db/schema'
import { edgeErrorMessage } from '@/lib/coachSelfSignup'

interface OwnedRow {
  id: string
  userId: string
}

/**
 * Borra los datos de ESTA CUENTA de este dispositivo: solo las filas de
 * `userId`, no toda la base. Se usa tras borrar la cuenta en el servidor y
 * también para el "borrar mis datos" del modo sin cuenta. Después hay que
 * recargar la app.
 *
 * Antes era `db.delete()` (borraba TODA la base IndexedDB del dispositivo):
 * en un teléfono compartido, o si alguien probó el modo invitado y después
 * inició sesión con una cuenta real sin que las dos compartieran id, borrar
 * una borraba también las filas sin sincronizar de la otra — de las que no
 * hay copia en ningún lado. `localStorage`/`sessionStorage` sí se siguen
 * limpiando enteros: ahí no hay datos de otra cuenta que perder, solo
 * sesión y preferencias de este mismo navegador/dispositivo.
 *
 * `exercises` (el catálogo) queda afuera a propósito: no tiene `userId` —
 * ni siquiera los ejercicios propios (`isCustom`) tienen dueño hoy, son
 * del dispositivo, no de la cuenta.
 */
export async function wipeLocalData(userId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.tombstones, db.runs, db.syncState, ...SYNC_ORDER.map((t) => db.table(t))],
    async () => {
      for (const table of SYNC_ORDER) {
        if (table === 'profile') {
          await db.profile.delete(userId)
          continue
        }
        const t = db.table<OwnedRow>(table)
        await t.where('userId').equals(userId).delete()
      }
      await db.runs.where('userId').equals(userId).delete()
      await db.tombstones.where('userId').equals(userId).delete()
      // Cursores de pull de esta cuenta (ver sync.ts) — sin esto quedan
      // filas huérfanas en syncState, inofensivas pero basura.
      const staleCursors = await db.syncState
        .filter((row) => row.key.startsWith(`pull_${userId}_`))
        .toArray()
      await Promise.all(staleCursors.map((row) => db.syncState.delete(row.key)))
    }
  )
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // storage bloqueado: no hay nada más que limpiar
  }
}

/**
 * Baja de la cuenta (Guideline 5.1.1(v): borrado desde la app). Llama a la
 * Edge Function `delete-account` — que borra al usuario de Auth, cascadea sus
 * datos y limpia Storage con la service_role — y después borra lo local.
 * Nunca manda un userId al servidor: la identidad sale del JWT del lado del
 * servidor. El userId que recibe SÍ hace falta, pero es solo para saber qué
 * borrar en Dexie de este dispositivo, no para autorizar nada.
 */
export async function deleteAccount(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: true },
  })
  if (error) throw new Error(await edgeErrorMessage(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)

  // El usuario ya no existe en el servidor: el signOut puede fallar, da igual.
  await supabase.auth.signOut().catch(() => undefined)
  await wipeLocalData(userId)
}
