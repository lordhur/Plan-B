'use client'

import { ChevronRight, Layers, Sparkles, UserPlus, Users, UsersRound } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'

/** Tuile de section (amis / groupes / pages). */
function Block({
  title,
  count,
  icon: Icon,
  seeAll,
  children,
}: {
  title: string
  count: number
  icon: typeof Users
  seeAll: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Icon className="h-4 w-4 text-primary-600" aria-hidden />
          {title}
          <span className="rounded-full bg-bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">
            {count}
          </span>
        </h2>
        <Link
          href={seeAll}
          className="flex items-center gap-0.5 text-xs font-semibold text-accent-600 hover:underline"
        >
          Tout voir <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  )
}

/**
 * SOCIAL — les amis, les groupes et les pages où l'utilisateur est engagé,
 * plus ses catégories favorites.
 */
export function ProfileSocialTab() {
  const friends = trpc.friends.list.useQuery()
  const groups = trpc.groups.mine.useQuery()
  const pages = trpc.pages.mine.useQuery()

  return (
    <div className="space-y-7">
      <Block title="Mes amis" count={friends.data?.length ?? 0} icon={Users} seeAll="/friends">
        {friends.isLoading ? (
          <LoadingSpinner label="Chargement" />
        ) : (friends.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center">
            <p className="text-sm text-fg-muted">Aucun ami pour le moment.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/community">
                <UserPlus className="h-4 w-4" aria-hidden /> Trouver des membres
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {(friends.data ?? []).map(({ friend }) => {
              const name = friend.displayName || `${friend.firstName} ${friend.lastName}`
              return (
                <li key={friend.id} className="w-16 shrink-0">
                  <Link href={`/profile/${friend.id}`} className="flex flex-col items-center gap-1">
                    <Avatar src={friend.avatarUrl} name={name} className="h-14 w-14" />
                    <span className="w-full truncate text-center text-[11px] font-semibold">
                      {friend.firstName}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Block>

      <Block
        title="Mes groupes"
        count={groups.data?.length ?? 0}
        icon={UsersRound}
        seeAll="/groups"
      >
        {groups.isLoading ? (
          <LoadingSpinner label="Chargement" />
        ) : (groups.data?.length ?? 0) === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-fg-muted">
            Vous n’êtes membre d’aucun groupe.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(groups.data ?? []).map(({ group, role }) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary"
                >
                  {group.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.coverImage}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600">
                      <Layers className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{group.name}</span>
                    <span className="block text-[11px] text-fg-muted">
                      {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
                      {group.city ? ` · ${group.city}` : ''}
                      {role === 'ADMIN' ? ' · admin' : ''}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Mes pages" count={pages.data?.length ?? 0} icon={Sparkles} seeAll="/pages">
        {pages.isLoading ? (
          <LoadingSpinner label="Chargement" />
        ) : (pages.data?.length ?? 0) === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-fg-muted">
            Vous ne suivez aucune page.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(pages.data ?? []).map((page) => (
              <li key={page.id}>
                <Link
                  href={`/pages/${page.slug}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary"
                >
                  {page.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.coverUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-500/10 text-secondary-600">
                      <Sparkles className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{page.name}</span>
                    <span className="block text-[11px] text-fg-muted">
                      {page.category} · {page.followerCount} abonné
                      {page.followerCount > 1 ? 's' : ''}
                      {page.relation === 'owner' ? ' · propriétaire' : ''}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  )
}
