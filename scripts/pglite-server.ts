/**
 * Serveur PostgreSQL local basé sur PGlite (PostgreSQL compilé en WASM).
 *
 * Permet de développer PlanB sans installer PostgreSQL ni Docker :
 * les données sont persistées dans ./data/pgdata.
 *
 * Usage : npm run db:local   (puis npm run db:push && npm run db:seed)
 * L'application se connecte ensuite via DATABASE_URL (postgresql://planb:planb@127.0.0.1:5433/planb).
 *
 * En production (Supabase, Neon, Railway…), ce script n'est pas utilisé :
 * DATABASE_URL pointe simplement vers le vrai serveur PostgreSQL.
 */
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'data', 'pgdata')
const PORT = Number(process.env.PGLITE_PORT ?? 5433)

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const db = new PGlite(DATA_DIR)
  await db.waitReady
  console.log(`[pglite] Base prête — données persistées dans ${DATA_DIR}`)

  const server = new PGLiteSocketServer({
    db,
    port: PORT,
    host: '127.0.0.1',
    maxConnections: 8,
  })

  await server.start()
  console.log(`[pglite] PostgreSQL (WASM) écoute sur 127.0.0.1:${PORT}`)
  console.log(`[pglite] DATABASE_URL=postgresql://planb:planb@127.0.0.1:${PORT}/planb`)

  const shutdown = async () => {
    console.log('\n[pglite] Arrêt…')
    try {
      await server.stop()
      await db.close()
    } finally {
      process.exit(0)
    }
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[pglite] Erreur fatale :', err)
  process.exit(1)
})
