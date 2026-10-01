import {
  draftToRpcPayload,
  emptyDraft,
  newExercise,
  payloadToDraft,
  removeDraftExercise,
  toggleDraftSuperset,
  validateDraft,
} from '@/lib/coachRoutineDraft'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

// Borrador vacío: no se puede guardar.
check(validateDraft(emptyDraft()) !== null, 'un borrador vacío no debería validar')

// Toda plantilla del catálogo se convierte en un borrador válido y ida-y-vuelta.
for (const t of ROUTINE_TEMPLATES) {
  const draft = payloadToDraft(t.payload)
  check(validateDraft(draft) === null, `plantilla "${t.name}" no valida: ${validateDraft(draft)}`)
  const rpc = draftToRpcPayload(draft)
  check(rpc.days.length === t.payload.d.length, `plantilla "${t.name}": cantidad de días`)
  const exercises = rpc.days.flatMap((d) => d.exercises)
  check(exercises.every((e) => e.sets >= 1 && e.repsMin <= e.repsMax), `plantilla "${t.name}": series/reps`)
}

// Reps invertidas y descanso fuera de rango.
const d = emptyDraft()
d.name = 'Test'
d.days[0]!.exercises.push({ ...newExercise('bench-press'), repsMin: 12, repsMax: 8 })
check(validateDraft(d) !== null, 'reps mín > máx debería fallar')
d.days[0]!.exercises[0] = { ...newExercise('bench-press'), sets: 99, restSeconds: 99999 }
const p = draftToRpcPayload(d)
check(p.days[0]!.exercises[0]!.sets === 20, 'sets se acota a 20')
check(p.days[0]!.exercises[0]!.restSeconds === 900, 'descanso se acota a 900')

// Un día de descanso no manda ejercicios; un día solo de descanso no valida.
const r = emptyDraft()
r.name = 'Solo descanso'
r.days[0]!.isRest = true
check(validateDraft(r) !== null, 'una rutina de solo descanso no debería validar')

// Los ids del servidor viajan solo si existen (editar vs crear).
const e = emptyDraft()
e.name = 'Ids'
e.days[0]!.id = 'day-1'
e.days[0]!.exercises.push({ ...newExercise('bench-press'), id: 'ex-1' })
const rpc = draftToRpcPayload(e)
check(rpc.days[0]!.id === 'day-1' && rpc.days[0]!.exercises[0]!.id === 'ex-1', 'ids existentes se conservan')
const created = draftToRpcPayload(payloadToDraft(ROUTINE_TEMPLATES[0]!.payload))
check(created.days.every((x) => !('id' in x)), 'un borrador nuevo no manda ids')

// supersetGroup: editar una rutina que ya tenía superseries no puede
// perderlas al guardar (bug real: fetchClientRoutineDraft no la leía de
// vuelta, así que el borrador cargado tenía undefined y la RPC la pisaba
// con null al guardar sin tocar nada).
const sg = emptyDraft()
sg.name = 'Con superset'
sg.days[0]!.exercises.push(
  { ...newExercise('bench-press'), id: 'ex-a', supersetGroup: 1 },
  { ...newExercise('incline-press'), id: 'ex-b', supersetGroup: 1 }
)
const sgPayload = draftToRpcPayload(sg)
check(
  sgPayload.days[0]!.exercises.every((e) => e.supersetGroup === 1),
  'supersetGroup no viaja en el payload a la RPC'
)
const noSgDraft = emptyDraft()
noSgDraft.days[0]!.exercises.push(newExercise('bench-press'))
const noSg = draftToRpcPayload(noSgDraft)
check(
  noSg.days[0]!.exercises.every((e) => e.supersetGroup === null),
  'un ejercicio sin superset debería mandar null explícito, no omitirlo'
)

// Superseries en el borrador (antes no había UI para armarlas).
{
  const exs = [newExercise('bench-press'), newExercise('row'), newExercise('curl')]
  const linked = toggleDraftSuperset(exs, 1)
  check(linked[0]!.supersetGroup !== undefined && linked[0]!.supersetGroup === linked[1]!.supersetGroup, 'superserie: no enlazó con el anterior')
  check(linked[2]!.supersetGroup === undefined, 'superserie: tocó un ejercicio que no correspondía')
  const three = toggleDraftSuperset(linked, 2)
  check(three.every((e) => e.supersetGroup === linked[0]!.supersetGroup), 'superserie: el tercero no se sumó al grupo existente')
  const unlinked = toggleDraftSuperset(toggleDraftSuperset(exs, 1), 1)
  check(unlinked.every((e) => e.supersetGroup === undefined), 'superserie: desenlazar dejó un grupo de un solo ejercicio')
  check(toggleDraftSuperset(exs, 0) === exs, 'superserie: el primero no tiene anterior, no debería cambiar nada')
  const afterRemove = removeDraftExercise(toggleDraftSuperset(exs, 1), exs[0]!.key)
  check(afterRemove.every((e) => e.supersetGroup === undefined), 'superserie: quitar un ejercicio dejó un grupo huérfano')
  const rpc = draftToRpcPayload({ name: 'SS', days: [{ key: 'k', name: 'D', isRest: false, exercises: linked }] })
  check(rpc.days[0]!.exercises[0]!.supersetGroup === rpc.days[0]!.exercises[1]!.supersetGroup && rpc.days[0]!.exercises[0]!.supersetGroup !== null, 'superserie: no llega a la RPC')
}

if (fail.length) {
  console.error('❌ Borrador de rutina del coach:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Borrador de rutina del coach: plantillas válidas, límites y ids correctos.')
