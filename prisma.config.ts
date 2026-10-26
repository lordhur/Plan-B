import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Repli non-throwing via `process.env` : le helper `env()` de Prisma lève une
// PrismaConfigEnvError quand la variable est absente, ce qui casserait
// `prisma generate` sur Vercel où DIRECT_URL n'est pas définie.
// (prisma generate ne se connecte jamais à la base : l'URL factice en dernier
// recours n'est là que pour satisfaire la validation du schéma.)
const dbUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgresql://prisma:prisma@localhost:5432/prisma'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Utilisé par les commandes CLI (db push, migrate, studio…)
    url: dbUrl,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
