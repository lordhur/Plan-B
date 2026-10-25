import type { MetadataRoute } from 'next'
import { prisma } from '@/server/db'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Sitemap dynamique — pages publiques + événements à venir (SEO / Schema.org). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/explore`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/register`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const events = await prisma.event.findMany({
      where: { status: 'UPCOMING', visibility: 'PUBLIC' },
      select: { slug: true, updatedAt: true },
      orderBy: { startDate: 'asc' },
      take: 1000,
    })
    return [
      ...staticPages,
      ...events.map((e) => ({
        url: `${baseUrl}/events/${e.slug}`,
        lastModified: e.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ]
  } catch {
    // Base indisponible (build sans DATABASE_URL) → pages statiques seulement
    return staticPages
  }
}
