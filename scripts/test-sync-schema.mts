/**
 * Todo campo local que viaja a Postgres tiene que existir como columna.
 *
 * Por qué: el cliente manda TODAS las claves del objeto en el upsert. Si una
 * clave no es columna, PostgREST rechaza el lote entero (PGRST204) y esa tabla
 * no vuelve a subir. Así dejaron de llegar los entrenos nuevos: `Workout.kind`
 * se agregó al cliente en septiembre y nadie creó la columna. Este test lee las
 * interfaces de TypeScript y las migraciones SQL y falla en el CI, antes de que
 * un usuario lo sufra.
 */
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
import { BOOLEAN_FIELDS, camelToSnake, LOCAL_ONLY_FIELDS, REMOTE_TABLE } from '@/lib/syncSchema'

const root = process.cwd()
const fail: string[] = []

// ── Columnas según las migraciones ────────────────────────────────────────
const sql = fs
  .readdirSync(path.join(root, 'supabase/migrations'))
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort()
  .map((f) => fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'))
  .join('\n')
  .replace(/--[^\n]*/g, '') // comentarios

const columns = new Map<string, Map<string, string>>() // tabla → columna → tipo

function addColumn(table: string, col: string, type: string) {
  if (!columns.has(table)) columns.set(table, new Map())
  columns.get(table)!.set(col, type.toLowerCase())
}

// create table [if not exists] [public.]x ( … );
for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\)\s*;/gi)) {
  const table = m[1]!
  let depth = 0
  let current = ''
  const parts: string[] = []
  for (const ch of m[2]!) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  parts.push(current)
  for (const part of parts) {
    const t = part.trim()
    if (!t || /^(primary|foreign|unique|check|constraint)\b/i.test(t)) continue
    const [col, type] = t.split(/\s+/)
    if (col) addColumn(table, col.replace(/"/g, ''), type ?? '')
  }
}
// alter table [public.]x add column [if not exists] c type, add column …;
for (const stmt of sql.split(';')) {
  const alter = /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/i.exec(stmt)
  if (!alter) continue
  for (const m of stmt.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)\s+(\w+)/gi)) addColumn(alter[1]!, m[1]!, m[2]!)
}

// ── Campos según las interfaces ───────────────────────────────────────────
const program = ts.createProgram([path.join(root, 'src/types/index.ts'), path.join(root, 'src/db/schema.ts')], {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  baseUrl: root,
  paths: { '@/*': ['src/*'] },
  skipLibCheck: true,
  noEmit: true,
})
const checker = program.getTypeChecker()

// `workouts!: Table<Workout, string>` → tabla local → interfaz
const tableType = new Map<string, ts.Type>()
const schemaFile = program.getSourceFile(path.join(root, 'src/db/schema.ts'))!
ts.forEachChild(schemaFile, function visit(node) {
  if (ts.isPropertyDeclaration(node) && node.type && ts.isTypeReferenceNode(node.type) && node.type.typeName.getText() === 'Table') {
    const arg = node.type.typeArguments?.[0]
    if (arg && ts.isIdentifier(node.name)) tableType.set(node.name.text, checker.getTypeFromTypeNode(arg))
  }
  ts.forEachChild(node, visit)
})

let checked = 0
for (const [local, remote] of Object.entries(REMOTE_TABLE)) {
  const type = tableType.get(local)
  if (!type) {
    fail.push(`${local}: no encontré su interfaz en src/db/schema.ts`)
    continue
  }
  const remoteCols = columns.get(remote)
  if (!remoteCols) {
    fail.push(`${local}: la tabla ${remote} no está en las migraciones`)
    continue
  }
  const skip = new Set([...(LOCAL_ONLY_FIELDS[local as keyof typeof LOCAL_ONLY_FIELDS] ?? []), 'dirty'])
  const booleans = new Set(BOOLEAN_FIELDS[local as keyof typeof BOOLEAN_FIELDS] ?? [])
  for (const prop of checker.getPropertiesOfType(type)) {
    const name = prop.getName()
    if (skip.has(name)) continue
    checked++
    const col = camelToSnake(name)
    const colType = remoteCols.get(col)
    if (colType === undefined) {
      fail.push(`${remote}.${col}: el cliente lo envía (${local}.${name}) pero no existe la columna en las migraciones`)
      continue
    }
    // Un 0|1 local contra una columna boolean tiene que estar en BOOLEAN_FIELDS,
    // si no viaja como número y Postgres lo rechaza.
    const propType = checker.getTypeOfSymbol(prop)
    const text = checker.typeToString(propType, undefined, ts.TypeFormatFlags.NoTruncation)
    const isFlag = /^(0 \| 1|1 \| 0)( \| undefined)?$/.test(text)
    if (isFlag && colType.startsWith('bool') && !booleans.has(name)) {
      fail.push(`${remote}.${col}: es boolean en Postgres y ${local}.${name} es 0|1, falta en BOOLEAN_FIELDS`)
    }
  }
}

if (checked < 80) fail.push(`solo revisé ${checked} campos: el test no está leyendo bien las interfaces`)

if (fail.length) {
  console.error('❌ Esquema de sync:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log(`✅ Esquema de sync: ${checked} campos locales, todos con columna en las migraciones.`)
