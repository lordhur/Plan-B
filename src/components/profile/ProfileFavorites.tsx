'use client'

import * as React from 'react'

import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { EVENT_CATEGORIES } from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/** Catégories favorites — elles boostent les plans suggérés dans le fil. */
export function ProfileFavorites() {
  const utils = trpc.useUtils()
  const { data: me } = trpc.auth.me.useQuery()
  const [favSlugs, setFavSlugs] = React.useState<string[]>([])

  React.useEffect(() => {
    if (me?.favoriteCategories) setFavSlugs(me.favoriteCategories.map((c) => c.slug))
  }, [me?.favoriteCategories])

  const save = trpc.users.setFavoriteCategories.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const toggle = (slug: string) => {
    const next = favSlugs.includes(slug) ? favSlugs.filter((s) => s !== slug) : [...favSlugs, slug]
    setFavSlugs(next)
    save.mutate({ slugs: next })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mes catégories favorites</CardTitle>
        <CardDescription>
          Les activités que vous aimez — elles boostent les plans suggérés dans votre fil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((cat) => {
            const active = favSlugs.includes(cat.slug)
            return (
              <button
                key={cat.slug}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(cat.slug)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  active
                    ? 'border-transparent text-white'
                    : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
                )}
                style={active ? { backgroundColor: cat.color } : undefined}
              >
                <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                {cat.name}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
