'use client'

import {
  CalendarCheck2,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FriendButton } from '@/components/friends/FriendButton'
import { formatFullDate } from '@/lib/date'

type Tab = 'amis' | 'recherche' | 'nouveau' | 'classement'

const TABS: { id: Tab; label: string }[] = [
  { id: 'amis', label: 'Se faire des amis' },
  { id: 'recherche', label: 'Recherche' },
  { id: 'nouveau', label: 'Nouveau' },
  { id: 'classement', label: 'Classement' },
]

const GENDER_LABEL: Record<string, string> = { MALE: 'Homme', FEMALE: 'Femme', NON_BINARY: 'Autre', OTHER: 'Autre' }
const ORIENTATION_LABEL: Record<string, string> = {
  HETEROSEXUAL: 'Hétéro',
  HOMOSEXUAL: 'Homo',
  BISEXUAL: 'Bi',
  OTHER: 'Autre',
}

interface DirectoryFilters {
  gender: string
  orientation: string
  minAge: string
  maxAge: string
  sort: 'recent' | 'rating' | 'active'
  verifiedOnly: boolean
  organizersOnly: boolean
}

const DEFAULT_FILTERS: DirectoryFilters = {
  gender: '',
  orientation: '',
  minAge: '',
  maxAge: '',
  sort: 'recent',
  verifiedOnly: false,
  organizersOnly: false,
}

/** Panneau de filtres « type de personne / âge / sexe / genre » partagé par les onglets. */
function FiltersPanel({
  value,
  onChange,
}: {
  value: DirectoryFilters
  onChange: (next: DirectoryFilters) => void
}) {
  const set = (patch: Partial<DirectoryFilters>) => onChange({ ...value, ...patch })
  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
      active
        ? 'border-primary-600 bg-primary-600 text-white'
        : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
    )

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-fg-muted">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filtres
      </div>

      {/* Sexe / genre */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par genre">
        {[
          { id: '', label: 'Tous' },
          { id: 'MALE', label: '👨 Hommes' },
          { id: 'FEMALE', label: '👩 Femmes' },
          { id: 'OTHER', label: '🌈 Autre' },
        ].map((g) => (
          <button
            key={g.id || 'all'}
            type="button"
            className={chip(value.gender === g.id)}
            aria-pressed={value.gender === g.id}
            onClick={() => set({ gender: g.id })}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Orientation */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par orientation">
        {[
          { id: '', label: 'Orientation : toutes' },
          { id: 'HETEROSEXUAL', label: 'Hétéro' },
          { id: 'HOMOSEXUAL', label: 'Homo' },
          { id: 'BISEXUAL', label: 'Bi' },
          { id: 'OTHER', label: 'Autre' },
        ].map((o) => (
          <button
            key={o.id || 'all-orient'}
            type="button"
            className={chip(value.orientation === o.id)}
            aria-pressed={value.orientation === o.id}
            onClick={() => set({ orientation: o.id })}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Type de personne + âge + tri */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold text-fg-muted">
          Âge min
          <Input
            type="number"
            inputMode="numeric"
            min={15}
            max={120}
            value={value.minAge}
            onChange={(e) => set({ minAge: e.target.value })}
            placeholder="18"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-fg-muted">
          Âge max
          <Input
            type="number"
            inputMode="numeric"
            min={15}
            max={120}
            value={value.maxAge}
            onChange={(e) => set({ maxAge: e.target.value })}
            placeholder="65"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-fg-muted">
          Type de personne
          <Select
            value={value.verifiedOnly ? 'verified' : value.organizersOnly ? 'org' : 'all'}
            onChange={(e) =>
              set({
                verifiedOnly: e.target.value === 'verified',
                organizersOnly: e.target.value === 'org',
              })
            }
          >
            <option value="all">Tout le monde</option>
            <option value="verified">Profils vérifiés</option>
            <option value="org">Organisateurs</option>
          </Select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-fg-muted">
          Trier par
          <Select
            value={value.sort}
            onChange={(e) => set({ sort: e.target.value as DirectoryFilters['sort'] })}
          >
            <option value="recent">Les plus récents</option>
            <option value="rating">Les mieux notés</option>
            <option value="active">Les plus actifs</option>
          </Select>
        </label>
      </div>
    </div>
  )
}

/** Carte membre dans l'annuaire. */
function MemberCard({
  m,
  onMessage,
}: {
  m: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    avatarUrl: string | null
    city: string | null
    age: number | null
    gender: string | null
    orientation: string | null
    averageRating: number
    totalRatings: number
    eventsCreated: number
    isVerified: boolean
    interests: string[]
  }
  onMessage: (userId: string) => void
}) {
  const name = m.displayName || `${m.firstName} ${m.lastName}`
  return (
    <Card className="card-sheen">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <Link href={`/profile/${m.id}`}>
          <Avatar src={m.avatarUrl} name={name} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${m.id}`} className="block truncate font-bold hover:underline">
            {name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            {m.age != null && <span>{m.age} ans</span>}
            {m.age != null && m.city && <span aria-hidden>·</span>}
            {m.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden /> {m.city}
              </span>
            )}
            {m.gender && <Badge variant="secondary">{GENDER_LABEL[m.gender] ?? m.gender}</Badge>}
            {m.orientation && (
              <Badge variant="outline">{ORIENTATION_LABEL[m.orientation] ?? m.orientation}</Badge>
            )}
          </div>
          {m.interests.length > 0 && (
            <p className="mt-1 truncate text-xs text-fg-muted">
              {m.interests.join(' · ')}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {m.averageRating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                <Star className="h-3 w-3 fill-current" aria-hidden />
                {m.averageRating.toFixed(1)}
                <span className="font-normal text-fg-muted">({m.totalRatings})</span>
              </span>
            )}
            {m.eventsCreated > 0 && (
              <span className="inline-flex items-center gap-1 text-fg-muted">
                <CalendarCheck2 className="h-3 w-3" aria-hidden /> {m.eventsCreated} plan{m.eventsCreated > 1 ? 's' : ''}
              </span>
            )}
            {m.isVerified && (
              <span className="inline-flex items-center gap-1 font-semibold text-primary-600">
                <CheckCircle2 className="h-3 w-3" aria-hidden /> Vérifié
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Envoyer un message à ${name}`}
            onClick={() => onMessage(m.id)}
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
          </Button>
          <FriendButton userId={m.id} size="sm" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Liste annuaire partagée (onglets recherche / nouveau / suggestions). */
function DirectoryList({
  filters,
  query,
  newThisMonth,
  emptyHint,
  onMessage,
}: {
  filters: DirectoryFilters
  query?: string
  newThisMonth?: boolean
  emptyHint: string
  onMessage: (userId: string) => void
}) {
  const directory = trpc.users.directory.useQuery({
    q: query && query.trim().length >= 2 ? query.trim() : undefined,
    gender:
      filters.gender === ''
        ? undefined
        : filters.gender === 'OTHER'
          ? 'OTHER'
          : (filters.gender as 'MALE' | 'FEMALE'),
    orientation:
      filters.orientation === ''
        ? undefined
        : (filters.orientation as 'HETEROSEXUAL' | 'HOMOSEXUAL' | 'BISEXUAL' | 'OTHER'),
    minAge: filters.minAge ? Number(filters.minAge) : undefined,
    maxAge: filters.maxAge ? Number(filters.maxAge) : undefined,
    sort: filters.sort,
    verifiedOnly: filters.verifiedOnly,
    organizersOnly: filters.organizersOnly,
    newThisMonth: newThisMonth ?? false,
    limit: 40,
  })

  if (directory.isLoading) return <LoadingSpinner label="Chargement des membres" />
  if (!directory.data || directory.data.length === 0) {
    return <EmptyState icon={Users} title="Aucun membre trouvé" description={emptyHint} />
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {directory.data.map((m) => (
        <MemberCard key={m.id} m={m} onMessage={onMessage} />
      ))}
    </div>
  )
}

/** Page « Les Membres » — amis, annuaire filtrable, nouveaux et classement. */
export default function FriendsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const [tab, setTab] = useState<Tab>('amis')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS)

  const friends = trpc.friends.list.useQuery(undefined, { enabled: isAuthenticated })
  const requests = trpc.friends.receivedRequests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const leaderboard = trpc.leaderboard.top.useQuery({ period: 'MONTHLY', limit: 10 })

  const startConversation = async (friendId: string) => {
    const res = await fetch('/api/trpc/messages.startWith?batch=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 0: { json: { userId: friendId } } }),
    })
    const data = await res.json()
    const conversationId = data?.[0]?.result?.data?.json?.conversationId as string | undefined
    if (conversationId) router.push(`/messages/${conversationId}`)
    else router.push('/messages')
  }

  if (loadingMe) return <LoadingSpinner label="Chargement" />

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Les Membres</h1>
        <p className="text-sm text-fg-muted">
          Trouvez des gens qui vous ressemblent, autour de vous.
        </p>
      </header>

      {/* Sous-onglets */}
      <nav
        className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1"
        aria-label="Onglets Les Membres"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'true' : undefined}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
            )}
          >
            {t.label}
            {t.id === 'amis' && (requests.data?.length ?? 0) > 0 && (
              <span
                className={cn(
                  'ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  tab === t.id ? 'bg-white text-primary-700' : 'bg-danger-500 text-white',
                )}
              >
                {requests.data!.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ---------- ONGLET : SE FAIRE DES AMIS ---------- */}
      {tab === 'amis' && (
        <div className="space-y-6">
          {!isAuthenticated ? (
            <div className="py-10 text-center">
              <p className="text-fg-muted">Connectez-vous pour retrouver vos amis.</p>
              <Button asChild className="mt-4">
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Demandes reçues */}
              {(requests.data?.length ?? 0) > 0 && (
                <Link
                  href="/friends/requests"
                  className="card-sheen flex items-center gap-3 rounded-2xl border-2 border-primary-200 bg-primary-50/60 p-4 transition-colors hover:border-primary-400 dark:border-primary-900 dark:bg-primary-950/40"
                >
                  <UserPlus className="h-8 w-8 text-primary-600" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">
                      {requests.data!.length} demande{requests.data!.length > 1 ? 's' : ''} d’ami
                      en attente
                    </span>
                    <span className="text-sm text-fg-muted">Acceptez ou refusez en un clic</span>
                  </span>
                  <Button size="sm">Voir</Button>
                </Link>
              )}

              {/* Mes amis */}
              <section aria-labelledby="amis-heading">
                <h2 id="amis-heading" className="mb-3 text-lg font-bold">
                  Mes amis
                  {friends.data ? ` (${friends.data.length})` : ''}
                </h2>
                {friends.isLoading ? (
                  <LoadingSpinner label="Chargement des amis" />
                ) : !friends.data || friends.data.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Pas encore d’amis"
                    description="Parcourez l’annuaire ci-dessous pour trouver vos premiers amis."
                  />
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {friends.data.map(({ friend, since }) => (
                      <li key={friend.id} className="flex flex-wrap items-center gap-3 p-4">
                        <Link
                          href={`/profile/${friend.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <Avatar
                            src={friend.avatarUrl}
                            name={`${friend.firstName} ${friend.lastName}`}
                            size="md"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {friend.displayName || `${friend.firstName} ${friend.lastName}`}
                            </span>
                            <span className="block text-xs text-fg-muted">
                              {friend.city ? `${friend.city} · ` : ''}Amis depuis{' '}
                              {formatFullDate(since)}
                            </span>
                          </span>
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Envoyer un message à ${friend.firstName}`}
                            onClick={() => void startConversation(friend.id)}
                          >
                            <MessageCircle className="h-5 w-5" aria-hidden />
                          </Button>
                          <FriendButton userId={friend.id} size="sm" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Suggestions */}
              <section aria-labelledby="suggestions-heading">
                <h2 id="suggestions-heading" className="mb-3 text-lg font-bold">
                  <Sparkles className="mr-1 inline h-4 w-4 text-primary-600" aria-hidden />
                  Découvrez des membres
                </h2>
                <FiltersPanel value={filters} onChange={setFilters} />
                <div className="mt-4">
                  <DirectoryList
                    filters={filters}
                    emptyHint="Élargissez vos filtres pour découvrir plus de membres."
                    onMessage={startConversation}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ---------- ONGLET : RECHERCHE ---------- */}
      {tab === 'recherche' && (
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-muted"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, pseudo, ville, passion…"
              className="pl-12"
              aria-label="Rechercher un membre"
            />
          </div>
          <FiltersPanel value={filters} onChange={setFilters} />
          <DirectoryList
            filters={filters}
            query={search}
            emptyHint="Essayez d’autres mots-clés ou élargissez les filtres."
            onMessage={startConversation}
          />
        </div>
      )}

      {/* ---------- ONGLET : NOUVEAU ---------- */}
      {tab === 'nouveau' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            🆕 Les membres qui ont rejoint PlanB ce mois-ci — soyez les premiers à leur souhaiter
            la bienvenue !
          </p>
          <FiltersPanel value={filters} onChange={setFilters} />
          <DirectoryList
            filters={filters}
            newThisMonth
            emptyHint="Aucun nouveau membre ce mois-ci pour ces filtres."
            onMessage={startConversation}
          />
        </div>
      )}

      {/* ---------- ONGLET : CLASSEMENT ---------- */}
      {tab === 'classement' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              🏆 Les membres les plus actifs du mois, toutes catégories confondues.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/leaderboard">
                <Trophy className="h-4 w-4" aria-hidden /> Classements par catégorie
              </Link>
            </Button>
          </div>
          {leaderboard.isLoading ? (
            <LoadingSpinner label="Chargement du classement" />
          ) : !leaderboard.data || leaderboard.data.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Pas encore d’activité"
              description="Créez des plans et participez pour apparaître au classement !"
            />
          ) : (
            <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {leaderboard.data.map((entry, i) => (
                <li key={entry.user.id} className="flex items-center gap-3 p-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black',
                      i === 0
                        ? 'bg-amber-400/20 text-amber-600'
                        : i === 1
                          ? 'bg-slate-300/30 text-slate-500'
                          : i === 2
                            ? 'bg-orange-400/20 text-orange-600'
                            : 'bg-bg-secondary text-fg-muted',
                    )}
                  >
                    {i + 1}
                  </span>
                  <Link
                    href={`/profile/${entry.user.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Avatar
                      src={entry.user.avatarUrl}
                      name={entry.user.displayName || `${entry.user.firstName} ${entry.user.lastName}`}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {entry.user.displayName || `${entry.user.firstName} ${entry.user.lastName}`}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        {entry.user.city || 'Membre PlanB'}
                        {entry.user.averageRating > 0 && ` · ⭐ ${entry.user.averageRating.toFixed(1)}`}
                      </span>
                    </span>
                  </Link>
                  <span className="shrink-0 font-bold tabular-nums">
                    {Math.round(entry.score)} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
