'use client'

import {
  CalendarCheck2,
  CheckCircle2,
  Flame,
  MapPin,
  Megaphone,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Users,
  X,
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
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { formatFullDate } from '@/lib/date'
import { IntroCardView, type IntroCardItem } from '@/components/friends/IntroCardView'
import { useLocationFilter } from '@/lib/locationFilter'
import { useLang } from '@/lib/i18n'

type Tab = 'amis' | 'recherche' | 'nouveau' | 'classement'

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

/** Panneau de filtres (onglet Recherche uniquement). */
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
          {m.interests.length > 0 && <p className="mt-1 truncate text-xs text-fg-muted">{m.interests.join(' · ')}</p>}
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

/** Liste annuaire (onglet Recherche). */
/** Bannière de la zone géographique validée sur la carte du fil. */
function ZoneBanner() {
  const { filter, clear } = useLocationFilter()
  if (!filter) return null
  return (
    <div className="flex items-center justify-between rounded-xl border border-primary-500/40 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
      <span className="flex items-center gap-2">
        <MapPin className="h-4 w-4" aria-hidden />
        Membres filtrés : {filter.name}
      </span>
      <button
        type="button"
        onClick={clear}
        className="ml-3 rounded-lg p-1 hover:bg-primary-500/20"
        aria-label="Retirer le filtre géographique"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

function DirectoryList({
  filters,
  query,
  emptyHint,
  onMessage,
}: {
  filters: DirectoryFilters
  query?: string
  emptyHint: string
  onMessage: (userId: string) => void
}) {
  // Zone validée sur la carte du fil : filtre géographique partagé
  const zoneFilter = useLocationFilter((s) => s.filter)
  const zoneBox =
    zoneFilter && (zoneFilter.type === 'region' || zoneFilter.type === 'dept')
      ? zoneFilter.bbox
      : null
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
    newThisMonth: false,
    minLat: zoneBox?.minLat,
    maxLat: zoneBox?.maxLat,
    minLon: zoneBox?.minLon,
    maxLon: zoneBox?.maxLon,
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

/** Podium / liste de classement. */
function RankList({
  rows,
  unit,
}: {
  rows: { userId: string; count: number; user: { id: string; firstName: string; lastName: string; displayName: string | null; avatarUrl: string | null; city: string | null } }[]
  unit: string
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-muted">Pas encore d’activité sur cette période.</p>
  }
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((r, i) => (
        <li key={r.userId} className="flex items-center gap-3 p-3">
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
          <Link href={`/profile/${r.user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              src={r.user.avatarUrl}
              name={r.user.displayName || `${r.user.firstName} ${r.user.lastName}`}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {r.user.displayName || `${r.user.firstName} ${r.user.lastName}`}
              </span>
              <span className="block truncate text-xs text-fg-muted">{r.user.city || 'Membre PlanB'}</span>
            </span>
          </Link>
          <span className="shrink-0 text-sm font-bold tabular-nums">
            {r.count} {unit}
          </span>
        </li>
      ))}
    </ol>
  )
}

type RankPeriod = 'mois' | 'general'

/** Onglet Classement — tous les classements affichés ensemble, 3 encarts par ligne. */
function RankingsTab() {
  const [period, setPeriod] = useState<RankPeriod>('mois')
  const rankings = trpc.leaderboard.rankings.useQuery({ limit: 10 })

  if (rankings.isLoading) return <LoadingSpinner label="Chargement des classements" />
  if (!rankings.data) return null

  return (
    <div className="space-y-4">
      {/* Période : mois / général */}
      <div className="flex justify-center" role="group" aria-label="Période du classement">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {[
            { id: 'mois' as const, label: 'Ce mois-ci' },
            { id: 'general' as const, label: 'Général' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
                period === p.id
                  ? 'bg-primary-600 text-white'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Encarts : 3 par ligne */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-4" aria-label="Les plus actifs">
          <h3 className="mb-2 flex items-center gap-2 font-bold">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden />
            Les plus actifs
            <span className="text-xs font-semibold text-fg-muted">
              · {period === 'mois' ? 'ce mois-ci' : 'depuis toujours'}
            </span>
          </h3>
          <RankList
            rows={period === 'mois' ? rankings.data.activesMonth : rankings.data.activesAll}
            unit="participations"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4" aria-label="Organisateurs">
          <h3 className="mb-2 flex items-center gap-2 font-bold">
            <Megaphone className="h-4 w-4 text-primary-600" aria-hidden />
            Organisateurs
            <span className="text-xs font-semibold text-fg-muted">
              · {period === 'mois' ? 'ce mois-ci' : 'depuis toujours'}
            </span>
          </h3>
          <RankList
            rows={period === 'mois' ? rankings.data.organizersMonth : rankings.data.organizersAll}
            unit="plans créés"
          />
        </section>

        {rankings.data.byCategory.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card p-4" aria-label="Par catégorie">
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              Par catégorie
            </h3>
            <p className="text-sm text-fg-muted">
              Pas encore de champions — participez à des plans pour décrocher la première place de
              votre catégorie !
            </p>
          </section>
        ) : (
          rankings.data.byCategory.map((cat) => (
            <section
              key={cat.slug}
              className="rounded-2xl border border-border bg-card p-4"
              aria-label={`Classement ${cat.name}`}
            >
              <h3 className="mb-2 flex items-center gap-2 font-bold">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                  aria-hidden
                >
                  <CategoryIcon name={cat.icon} className="h-4 w-4" />
                </span>
                {cat.name}
                <span className="text-xs font-semibold text-fg-muted">· ce mois-ci</span>
              </h3>
              <RankList rows={cat.top} unit="plans" />
            </section>
          ))
        )}
      </div>

      <p className="text-center text-xs text-fg-muted">
        💡 Le classement se met à jour automatiquement selon vos participations réelles.
      </p>
    </div>
  )
}

/** Page « Les Membres » — fiches de présentation, recherche, nouveaux, classements. */
export default function FriendsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const { t } = useLang()
  const [tab, setTab] = useState<Tab>('amis')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS)

  const friends = trpc.friends.list.useQuery(undefined, { enabled: isAuthenticated })
  const requests = trpc.friends.receivedRequests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const introCards = trpc.introCards.list.useQuery()
  const myCard = trpc.introCards.me.useQuery(undefined, { enabled: isAuthenticated })
  const newMembers = trpc.users.directory.useQuery({
    newThisMonth: true,
    sort: 'recent',
    limit: 40,
  })

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

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'amis', label: t('members_tab_friends'), icon: UserPlus },
    { id: 'recherche', label: t('members_tab_search'), icon: Search },
    { id: 'nouveau', label: t('members_tab_new'), icon: Sparkles },
    { id: 'classement', label: t('members_tab_ranking'), icon: Trophy },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">{t('members_title')}</h1>
        <p className="text-sm text-fg-muted">{t('members_subtitle')}</p>
      </header>

      {/* Sous-onglets en boutons */}
      <nav className="flex flex-wrap gap-2" aria-label="Onglets Les Membres">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'true' : undefined}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-colors',
              tab === id
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {id === 'amis' && (requests.data?.length ?? 0) > 0 && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  tab === id ? 'bg-white text-primary-700' : 'bg-danger-500 text-white',
                )}
              >
                {requests.data!.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ---------- SE FAIRE DES AMIS : fiches de présentation ---------- */}
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
                      {requests.data!.length} demande{requests.data!.length > 1 ? 's' : ''} d’ami en attente
                    </span>
                    <span className="text-sm text-fg-muted">Acceptez ou refusez en un clic</span>
                  </span>
                  <Button size="sm">Voir</Button>
                </Link>
              )}

              {/* Ma fiche de présentation */}
              <section aria-labelledby="my-card-heading">
                <h2 id="my-card-heading" className="mb-3 text-lg font-bold">
                  Ma fiche de présentation
                </h2>
                {myCard.isLoading ? (
                  <LoadingSpinner label="Chargement de ma fiche" />
                ) : myCard.data ? (
                  <div className="card-sheen overflow-hidden rounded-2xl border-2 border-primary-200 bg-card dark:border-primary-900">
                    {myCard.data.photos.length > 0 ? (
                      <div className="flex h-36 w-full overflow-x-auto">
                        {myCard.data.photos.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p} src={p} alt="" className="h-full w-1/2 shrink-0 object-cover" />
                        ))}
                      </div>
                    ) : (
                      myCard.data.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={myCard.data.photoUrl} alt="" className="h-36 w-full object-cover" />
                      )
                    )}
                    <div className="space-y-2 p-4">
                      <p className="font-bold text-primary-700 dark:text-primary-300">{myCard.data.title}</p>
                      {(myCard.data.profession || myCard.data.education) && (
                        <p className="text-xs font-semibold text-fg-muted">
                          {myCard.data.profession}
                          {myCard.data.profession && myCard.data.education ? ' · ' : ''}
                          {myCard.data.education ? `🎓 ${myCard.data.education}` : ''}
                        </p>
                      )}
                      {myCard.data.passions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {myCard.data.passions.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm text-fg-muted">{myCard.data.about}</p>
                      {myCard.data.lookingFor && (
                        <p className="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs font-semibold">
                          🔎 Recherche : {myCard.data.lookingFor}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/friends/card">Modifier ma fiche</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-6 text-center dark:border-primary-800 dark:bg-primary-950/30">
                    <Sparkles className="mx-auto h-8 w-8 text-primary-600" aria-hidden />
                    <p className="mt-2 font-bold">Créez votre fiche de présentation</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
                      C’est le meilleur moyen de vous faire des amis : présentez-vous en quelques
                      lignes et dites ce que vous cherchez. Seuls les membres avec une fiche
                      apparaissent ici.
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/friends/card">
                        <UserPlus className="h-4 w-4" aria-hidden /> Créer ma fiche
                      </Link>
                    </Button>
                  </div>
                )}
              </section>

              {/* Mes amis */}
              <section aria-labelledby="amis-heading">
                <h2 id="amis-heading" className="mb-3 text-lg font-bold">
                  Mes amis{friends.data ? ` (${friends.data.length})` : ''}
                </h2>
                {friends.isLoading ? (
                  <LoadingSpinner label="Chargement des amis" />
                ) : !friends.data || friends.data.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Pas encore d’amis"
                    description="Parcourez les fiches de présentation ci-dessous pour trouver vos premiers amis."
                  />
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {friends.data.map(({ friend, since }) => (
                      <li key={friend.id} className="flex flex-wrap items-center gap-3 p-4">
                        <Link href={`/profile/${friend.id}`} className="flex min-w-0 flex-1 items-center gap-3">
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
                              {friend.city ? `${friend.city} · ` : ''}Amis depuis {formatFullDate(since)}
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

              {/* Fiches des autres membres */}
              <section aria-labelledby="cards-heading">
                <h2 id="cards-heading" className="mb-3 text-lg font-bold">
                  Ils se présentent 👋
                </h2>
                {introCards.isLoading ? (
                  <LoadingSpinner label="Chargement des fiches" />
                ) : !introCards.data || introCards.data.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="Aucune fiche pour le moment"
                    description="Soyez le premier à créer votre fiche de présentation !"
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {introCards.data
                      .filter((c) => c.user.id !== user?.id)
                      .map((c) => (
                        <IntroCardView key={c.id} card={c} onMessage={startConversation} />
                      ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* ---------- RECHERCHE ---------- */}
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
              placeholder={t('members_search_ph')}
              className="pl-12"
              aria-label="Rechercher un membre"
            />
          </div>
          <ZoneBanner />
          <FiltersPanel value={filters} onChange={setFilters} />
          <DirectoryList
            filters={filters}
            query={search}
            emptyHint="Essayez d’autres mots-clés ou élargissez les filtres."
            onMessage={startConversation}
          />
        </div>
      )}

      {/* ---------- NOUVEAU : derniers membres du mois, sans filtres ---------- */}
      {tab === 'nouveau' && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            🆕 Les membres qui ont rejoint PlanB ce mois-ci — souhaitez-leur la bienvenue !
          </p>
          {newMembers.isLoading ? (
            <LoadingSpinner label="Chargement des nouveaux membres" />
          ) : !newMembers.data || newMembers.data.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Aucun nouveau membre ce mois-ci"
              description="Revenez bientôt ou invitez vos amis à rejoindre PlanB !"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {newMembers.data.map((m) => (
                <MemberCard key={m.id} m={m} onMessage={startConversation} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- CLASSEMENT ---------- */}
      {tab === 'classement' && <RankingsTab />}
    </div>
  )
}
