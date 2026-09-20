// Supabase Edge Function: delete-account
//
// Guideline 5.1.1(v) de la App Store: si la app permite crear una cuenta,
// tiene que permitir borrarla DESDE la app. Borra al usuario de Auth con la
// service_role; todas las tablas de dominio, coach, chat, reseñas,
// notificaciones y suscripciones push tienen `on delete cascade` sobre
// `auth.users` (ver migraciones 0002-0015), así que la baja arrastra los
// datos. Lo único que NO cascadea son los archivos de Storage: se borran
// acá a mano (bucket `photos`, carpeta = uid).
//
// La identidad sale del JWT del que llama (CLAUDE.md §5), nunca de un id en
// el body. El body debe traer `{ confirm: true }` para que una llamada
// accidental no borre nada.
//
// Un admin no se puede borrar desde acá (evita dejar el panel sin admins por
// un tap): se hace a mano desde el dashboard de Supabase.
//
// Desplegar CON verificación de JWT:
//   supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Falta el token de sesión.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
  if (callerErr || !caller.user) return json({ error: 'Sesión inválida.' }, 401)
  const userId = caller.user.id
  const role = (caller.user.app_metadata as Record<string, unknown>)?.role as string | undefined

  let body: { confirm?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }
  if (body.confirm !== true) return json({ error: 'Falta la confirmación.' }, 400)

  if (role === 'admin') {
    return json({ error: 'Una cuenta de administrador no se puede borrar desde la app.' }, 403)
  }

  try {
    // 1. Storage: los objetos no cascadean con el usuario. Se listan por
    //    carpeta (`<uid>/...`) y se borran en tandas.
    for (let guard = 0; guard < 50; guard++) {
      const { data: files, error: listErr } = await admin.storage
        .from('photos')
        .list(userId, { limit: 100 })
      if (listErr) throw listErr
      if (!files || files.length === 0) break
      const { error: rmErr } = await admin.storage
        .from('photos')
        .remove(files.map((f) => `${userId}/${f.name}`))
      if (rmErr) throw rmErr
    }

    // 2. Auditoría ANTES de borrar (después el actor ya no existe; la FK es
    //    `on delete set null`, así que la fila sobrevive sin identidad).
    await admin
      .from('admin_audit')
      .insert({ actor_id: userId, action: 'self_delete_account', target_user_id: userId, detail: {} })
      .then(() => {}, () => {})

    // 3. El usuario. Cascadea el resto.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})
