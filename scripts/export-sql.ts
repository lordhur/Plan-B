/**
 * Export des données de démonstration (PGlite locale) vers un fichier SQL
 * rejouable sur n'importe quel PostgreSQL (déploiement Supabase via l'API).
 *
 * - Lit toutes les tables dans l'ordre des dépendances (FK)
 * - Les timestamps/jsonb/text[] sont conservés tels quels (parseurs identity)
 * - Les URLs de médias locaux sont réécrites vers des placeholders externes
 *   (le stockage data/uploads n'existe pas sur Vercel)
 *
 * Usage : npx tsx scripts/export-sql.ts  →  data/export-planb.sql
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

// Conserver les valeurs brutes PostgreSQL (pas de conversion JS)
const IDENTITY = (v: string) => v
pg.types.setTypeParser(1114, IDENTITY) // timestamp
pg.types.setTypeParser(1184, IDENTITY) // timestamptz
pg.types.setTypeParser(3802, IDENTITY) // jsonb
pg.types.setTypeParser(1009, IDENTITY) // text[]

/** Ordre d'insertion respectant les clés étrangères. */
const TABLES = [
  'EventCategory',
  'Interest',
  'Badge',
  'Partner',
  'User',
  '_InterestToUser',
  '_EventCategoryToUser',
  'VerificationCode',
  'ProfilePhoto',
  'Page',
  'Event',
  'EventCollaborator',
  'EventParticipation',
  'WaitlistEntry',
  'EventInvitation',
  'EventChatMessage',
  'Conversation',
  'ConversationMember',
  'DirectMessage',
  'EventAlbum',
  'Media',
  'MediaIdentification',
  'UserRating',
  'Report',
  'CarpoolOffer',
  'CarpoolRequest',
  'PageFollow',
  'InterestGroup',
  'GroupMember',
  'ForumPost',
  'ForumReply',
  'PartnerOffer',
  'RedeemedOffer',
  'Subscription',
  'LeaderboardEntry',
  'Notification',
  'PushSubscription',
  'Advertisement',
]

const esc = (s: string) => s.replace(/'/g, "''")

/** Réécrit /api/media/file/xxx.jpg → placeholder externe (picsum). */
function rewriteMediaUrls(sql: string): string {
  return sql.replace(
    /\/api\/media\/file\/(thumb-)?(?:seed-)?([\w-]+?)\.jpg/g,
    (_m, thumb: string | undefined, seed: string) =>
      `https://picsum.photos/seed/planb-${seed}/${thumb ? '600/600' : '1200/1200'}`,
  )
}

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return `'${value.toISOString()}'`
  return `'${esc(String(value))}'`
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const out: string[] = ['-- Export démo PlanB (scripts/export-sql.ts)', 'BEGIN;']
  let totalRows = 0

  for (const table of TABLES) {
    const res = await client.query(`SELECT * FROM "${table}"`)
    if (res.rows.length === 0) continue
    const cols = res.fields.map((f) => f.name)
    const colList = cols.map((c) => `"${c}"`).join(', ')

    const BATCH = 40
    for (let i = 0; i < res.rows.length; i += BATCH) {
      const batch = res.rows.slice(i, i + BATCH)
      const values = batch
        .map((row) => `(${cols.map((c) => literal(row[c])).join(', ')})`)
        .join(',\n')
      out.push(`INSERT INTO "${table}" (${colList}) VALUES\n${values};`)
    }
    totalRows += res.rows.length
    console.log(`  ${table.padEnd(24)} ${res.rows.length} lignes`)
  }

  out.push('COMMIT;')
  await client.end()

  const dir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'export-planb.sql')
  fs.writeFileSync(file, rewriteMediaUrls(out.join('\n')))
  console.log(`✅ ${totalRows} lignes exportées → data/export-planb.sql (${fs.statSync(file).size} octets)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
