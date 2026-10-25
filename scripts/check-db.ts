import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

async function main() {
  const users = await prisma.user.findMany({
    select: { firstName: true, eventsAttended: true, eventsCreated: true, trustScore: true, friendCount: true, averageRating: true, totalRatings: true, badges: { select: { badge: { select: { code: true } } } } },
    orderBy: { firstName: 'asc' },
  })
  for (const u of users) {
    console.log(
      `${u.firstName.padEnd(8)} attended=${u.eventsAttended} created=${u.eventsCreated} trust=${u.trustScore} friends=${u.friendCount} rating=${u.averageRating}(${u.totalRatings}) badges=[${u.badges.map((b) => b.badge.code).join(', ')}]`,
    )
  }
}
main().finally(() => prisma.$disconnect())
