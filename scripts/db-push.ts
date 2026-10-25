/**
 * db-push local — génère le DDL PostgreSQL depuis prisma/schema.prisma
 * et l'applique sur DATABASE_URL (PGlite local ou vrai PostgreSQL).
 *
 * Pourquoi ce script ?
 * En environnement isolé (sans accès à binaries.prisma.sh), le moteur Rust
 * `schema-engine` de la CLI Prisma ne peut pas être téléchargé. Ce script
 * utilise le parseur officiel compilé en WASM (@prisma/prisma-schema-wasm)
 * pour produire un DDL équivalent, puis l'applique via le driver `pg`.
 *
 * En production / CI (réseau complet), utilisez plutôt :
 *   prisma migrate dev / prisma migrate deploy
 *
 * ⚠️ Détruit le schéma public existant (usage développement uniquement).
 *
 * Usage : npm run db:push
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
// @ts-ignore — paquet interne Prisma sans types publiés
import * as schemaWasm from '@prisma/prisma-schema-wasm'

// ----------------------------- Types DMMF -----------------------------

interface DmmfField {
  name: string
  kind: 'scalar' | 'enum' | 'object' | 'unsupported'
  isList: boolean
  isRequired: boolean
  isUnique: boolean
  isId: boolean
  type: string
  nativeType: string | null
  hasDefaultValue: boolean
  default?: unknown
  isUpdatedAt?: boolean
  relationFromFields?: string[]
  relationToFields?: string[]
  relationOnDelete?: string
  relationName?: string
}

interface DmmfModel {
  name: string
  dbName: string | null
  fields: DmmfField[]
  uniqueFields: string[][]
  uniqueIndexes: { name: string | null; fields: string[] }[]
  primaryKey: { fields: string[] } | null
}

interface DmmfEnum {
  name: string
  values: { name: string; dbName: string | null }[]
}

interface Dmmf {
  datamodel: { models: DmmfModel[]; enums: DmmfEnum[] }
}

// ----------------------------- Génération DDL -----------------------------

const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`

function sqlType(field: DmmfField): string {
  const base = (() => {
    switch (field.type) {
      case 'String':
        return 'text'
      case 'Int':
        return 'integer'
      case 'BigInt':
        return 'bigint'
      case 'Float':
        return 'double precision'
      case 'Decimal':
        return 'decimal(65,30)'
      case 'Boolean':
        return 'boolean'
      case 'DateTime':
        return 'timestamp(3)'
      case 'Json':
        return 'jsonb'
      case 'Bytes':
        return 'bytea'
      default:
        return q(field.type) // enum
    }
  })()
  return field.isList ? `${base}[]` : base
}

function sqlDefault(field: DmmfField): string | null {
  const d = field.default
  if (d === undefined || d === null) return null
  if (typeof d === 'object' && 'name' in (d as object)) {
    const name = (d as { name: string }).name
    if (name === 'now') return 'CURRENT_TIMESTAMP'
    if (name === 'autoincrement') return null // géré via SERIAL — non utilisé ici
    // cuid()/uuid()/dbgenerated() → générés côté client Prisma
    return null
  }
  if (typeof d === 'boolean' || typeof d === 'number') return String(d)
  if (typeof d === 'string') {
    if (field.kind === 'enum') return `'${d}'::${q(field.type)}`
    return `'${d.replace(/'/g, "''")}'`
  }
  if (Array.isArray(d)) return `'${JSON.stringify(d).replace(/'/g, "''")}'`
  return null
}

/** Parse les @@index([...]) du schéma (absents du DMMF). */
function parseSchemaIndexes(schemaText: string): Map<string, string[][]> {
  const result = new Map<string, string[][]>()
  const modelRegex = /model\s+(\w+)\s*{([\s\S]*?)}\s*\n/g
  let m: RegExpExecArray | null
  while ((m = modelRegex.exec(schemaText)) !== null) {
    const modelName = m[1]!
    const body = m[2]!
    const indexes: string[][] = []
    const idxRegex = /@@index\(\[([^\]]+)\]/g
    let i: RegExpExecArray | null
    while ((i = idxRegex.exec(body)) !== null) {
      indexes.push(
        i[1]!
          .split(',')
          .map((f) => f.trim().split(/\s+/)[0]!.replace(/"/g, ''))
          .filter(Boolean),
      )
    }
    if (indexes.length > 0) result.set(modelName, indexes)
  }
  return result
}

function generateDDL(dmmf: Dmmf, schemaText: string): string {
  const statements: string[] = []
  const postStatements: string[] = []
  const schemaIndexes = parseSchemaIndexes(schemaText)

  // 0. Tables de jonction implicites (relations many-to-many sans modèle explicite)
  //    Convention Prisma : "_<ModelA>To<ModelB>" (noms triés alphabétiquement)
  const implicitM2M = new Set<string>()
  for (const model of dmmf.datamodel.models) {
    for (const field of model.fields) {
      if (field.kind !== 'object' || !field.isList) continue
      if ((field.relationFromFields?.length ?? 0) > 0) continue
      // L'autre côté est-il aussi une liste sans FK ? → many-to-many implicite
      const other = dmmf.datamodel.models.find((m) => m.name === field.type)
      const otherField = other?.fields.find(
        (f) => f.kind === 'object' && f.type === model.name && f.relationName === field.relationName,
      )
      if (!otherField?.isList) continue
      const [a, b] = [model.name, field.type].sort()
      implicitM2M.add(`${a}|${b}`)
    }
  }
  for (const key of implicitM2M) {
    const [a, b] = key.split('|') as [string, string]
    const table = q(`_${a}To${b}`)
    statements.push(
      `CREATE TABLE ${table} (\n  ${q('A')} text NOT NULL,\n  ${q('B')} text NOT NULL,\n  PRIMARY KEY (${q('A')}, ${q('B')})\n);`,
    )
    postStatements.push(
      `CREATE INDEX ${q(`_${a}To${b}_B_index`)} ON ${table} (${q('B')});`,
      `ALTER TABLE ${table} ADD CONSTRAINT ${q(`_${a}To${b}_A_fkey`)} FOREIGN KEY (${q('A')}) REFERENCES ${q(a)} (${q('id')}) ON DELETE CASCADE ON UPDATE CASCADE;`,
      `ALTER TABLE ${table} ADD CONSTRAINT ${q(`_${a}To${b}_B_fkey`)} FOREIGN KEY (${q('B')}) REFERENCES ${q(b)} (${q('id')}) ON DELETE CASCADE ON UPDATE CASCADE;`,
    )
  }

  // 1. Enums
  for (const e of dmmf.datamodel.enums) {
    const values = e.values.map((v) => `'${v.dbName ?? v.name}'`).join(', ')
    statements.push(`CREATE TYPE ${q(e.name)} AS ENUM (${values});`)
  }

  // 2. Tables
  for (const model of dmmf.datamodel.models) {
    const table = q(model.dbName ?? model.name)
    const columns: string[] = []
    const inlineConstraints: string[] = []

    for (const field of model.fields) {
      if (field.kind === 'object') continue // relations → FK plus bas
      if (field.kind === 'unsupported') continue

      let col = `${q(field.name)} ${sqlType(field)}`
      if (field.isId && !model.primaryKey) {
        col += ' NOT NULL PRIMARY KEY'
      } else if (field.isRequired || field.isId) {
        col += ' NOT NULL'
      }
      const def = sqlDefault(field)
      if (def !== null && !field.isId) col += ` DEFAULT ${def}`
      columns.push(col)
    }

    // @@id composite
    if (model.primaryKey) {
      inlineConstraints.push(`PRIMARY KEY (${model.primaryKey.fields.map(q).join(', ')})`)
    }

    // @unique au niveau champ
    for (const field of model.fields) {
      if (field.kind === 'object' || !field.isUnique) continue
      inlineConstraints.push(
        `CONSTRAINT ${q(`${model.name}_${field.name}_key`)} UNIQUE (${q(field.name)})`,
      )
    }

    // @@unique / @@index composites
    for (const fields of model.uniqueFields) {
      inlineConstraints.push(`UNIQUE (${fields.map(q).join(', ')})`)
    }
    for (const idx of model.uniqueIndexes) {
      inlineConstraints.push(
        `CONSTRAINT ${q(idx.name ?? `${model.name}_${idx.fields.join('_')}_key`)} UNIQUE (${idx.fields.map(q).join(', ')})`,
      )
    }

    statements.push(
      `CREATE TABLE ${table} (\n  ${[...columns, ...inlineConstraints].join(',\n  ')}\n);`,
    )

    // Indexes simples (@@index)
    for (const fields of schemaIndexes.get(model.name) ?? []) {
      postStatements.push(
        `CREATE INDEX ${q(`${model.name}_${fields.join('_')}_idx`)} ON ${table} (${fields.map(q).join(', ')});`,
      )
    }

    // Foreign keys
    for (const field of model.fields) {
      if (field.kind !== 'object') continue
      const from = field.relationFromFields ?? []
      const to = field.relationToFields ?? []
      if (from.length === 0) continue
      const onDeleteRaw = field.relationOnDelete ?? (field.isRequired ? 'Restrict' : 'SetNull')
      const onDelete =
        {
          Cascade: 'CASCADE',
          SetNull: 'SET NULL',
          SetDefault: 'SET DEFAULT',
          Restrict: 'RESTRICT',
          NoAction: 'NO ACTION',
        }[onDeleteRaw] ?? 'RESTRICT'
      postStatements.push(
        `ALTER TABLE ${table} ADD CONSTRAINT ${q(`${model.name}_${from.join('_')}_fkey`)} ` +
          `FOREIGN KEY (${from.map(q).join(', ')}) REFERENCES ${q(field.type)} (${to.map(q).join(', ')}) ` +
          `ON DELETE ${onDelete} ON UPDATE CASCADE;`,
      )
    }
  }

  return [...statements, ...postStatements].join('\n')
}

// ----------------------------- Application -----------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL manquante (voir .env)')
    process.exit(1)
  }

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const schemaText = fs.readFileSync(schemaPath, 'utf8')

  const dmmf: Dmmf = JSON.parse(
    schemaWasm.get_dmmf(JSON.stringify({ prismaSchema: schemaText })),
  )

  const ddl = generateDDL(dmmf, schemaText)
  fs.mkdirSync(path.join(process.cwd(), 'prisma'), { recursive: true })
  const outPath = path.join(process.cwd(), 'prisma', 'local-dev.sql')
  fs.writeFileSync(outPath, `-- DDL généré par scripts/db-push.ts (dev local)\n${ddl}\n`)

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    await client.query(ddl)
    const tables = await client.query(
      "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'",
    )
    console.log(`✅ Schéma appliqué — ${tables.rows[0]!.n} tables (${dmmf.datamodel.models.length} modèles, ${dmmf.datamodel.enums.length} enums)`)
    console.log(`   DDL sauvegardé dans prisma/local-dev.sql`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('❌ Erreur db-push :', err.message)
  process.exit(1)
})
