import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * Singleton Prisma (évite de recréer un pool de connexions à chaque hot-reload dev).
 *
 * La connexion passe par le driver adapter `pg` :
 * - Local : PGlite exposé en TCP (npm run db:local)
 * - Production : Supabase / Neon / Railway via DATABASE_URL
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL manquante — copier .env.example vers .env')
  }
  const adapter = new PrismaPg({
    connectionString,
    max: 5, // pool raisonnable pour les tiers gratuits (Supabase free = ~60 connexions)
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
