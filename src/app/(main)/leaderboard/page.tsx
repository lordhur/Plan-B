'use client'

import { Crown, Medal, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

const PERIODS = [
  ['WEEKLY', 'Semaine'],
  ['MONTHLY', 'Mois'],
  ['ALL_TIME', 'Tout le temps'],
] as const

type Period = (typeof PERIODS)[number][0]

const MEDALS = ['🥇', '🥈', '🥉']

/** Classements des membres les plus actifs (spec Phase 3 §3.4). */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('MONTHLY')
  const top = trpc.leaderboard.top.useQuery({ period, limit: 50 })

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Trophy className="h-6 w-6 text-amber-500" aria-hidden /> Classements
        </h1>
        <p className="text-sm text-fg-muted">
          Score : 10 pts par événement participé + 15 pts par événement organisé.
        </p>
      </header>

      <div role="radiogroup" aria-label="Période" className="flex gap-2">
        {PERIODS.map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={period === value}
            onClick={() => setPeriod(value)}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
              period === value
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-border text-fg-muted hover:bg-bg-secondary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {top.isLoading ? (
        <LoadingSpinner label="Chargement du classement" />
      ) : !top.data || top.data.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Classement vide"
          description="Participez à des événements pour apparaître ici ! (mis à jour chaque nuit)"
        />
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {top.data.map((entry, i) => (
            <li key={entry.id}>
              <Link href={`/profile/${entry.user.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-bg-secondary">
                <span className="w-9 shrink-0 text-center text-lg font-extrabold" aria-label={`Rang ${i + 1}`}>
                  {i < 3 ? MEDALS[i] : <span className="text-sm text-fg-muted">{i + 1}</span>}
                </span>
                <Avatar
                  src={entry.user.avatarUrl}
                  name={entry.user.displayName || `${entry.user.firstName} ${entry.user.lastName}`}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">
                      {entry.user.displayName || `${entry.user.firstName} ${entry.user.lastName}`}
                    </span>
                    {i === 0 && <Crown className="h-4 w-4 shrink-0 text-amber-500" aria-label="Première place" />}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {entry.user.city || 'Membre PlanB'} · ⭐ {entry.user.averageRating.toFixed(1)} ({entry.user.totalRatings})
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-extrabold text-primary-600">{entry.score}</span>
                  <span className="block text-[10px] uppercase tracking-wide text-fg-muted">points</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
