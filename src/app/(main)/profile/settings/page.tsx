'use client'

import { Bell, Moon, Palette, Shield, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hardSignOut } from '@/lib/logout'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

/**
 * ÉTAT DES CONNEXIONS SOCIALES
 * Affiche en un coup d'œil quels fournisseurs OAuth sont réellement actifs
 * (variables d'environnement posées sur Vercel). Guide : docs/oauth-setup.md
 */
function SocialProvidersCard() {
  const { data } = trpc.auth.providers.useQuery(undefined, { staleTime: 60_000 })
  const { data: delivery } = trpc.auth.deliveryStatus.useQuery(undefined, { staleTime: 60_000 })
  const rows = [
    { key: 'google', label: 'Google' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary-600" aria-hidden /> Connexions sociales
        </CardTitle>
        <CardDescription>
          Boutons affichés sur la page de connexion. Ils s’activent dès que les identifiants sont
          renseignés dans Vercel (guide : <code className="text-[11px]">docs/oauth-setup.md</code>).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {rows.map(({ key, label }) => {
            const active = Boolean(data?.[key])
            return (
              <li key={key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-semibold">{label}</span>
                <span
                  className={
                    active
                      ? 'rounded-full bg-success-500/15 px-2.5 py-1 text-[11px] font-bold text-success-700 dark:text-success-400'
                      : 'rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-bold text-fg-muted'
                  }
                >
                  {active ? 'Activé' : 'Non configuré'}
                </span>
              </li>
            )
          })}
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm font-semibold">E-mail (codes)</span>
            <span
              className={
                delivery?.email
                  ? 'rounded-full bg-success-500/15 px-2.5 py-1 text-[11px] font-bold text-success-700 dark:text-success-400'
                  : 'rounded-full bg-warning-500/15 px-2.5 py-1 text-[11px] font-bold text-warning-700 dark:text-warning-400'
              }
            >
              {delivery?.email ? 'Envoi actif' : 'Code affiché à l’écran'}
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}

/** PARAMÈTRES — thème, notifications, confidentialité, déconnexion. */
export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, isLoading } = useCurrentUser()
  const utils = trpc.useUtils()

  useEffect(() => setMounted(true), [])

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // Déconnexion dure : caches vidés + rechargement complet (voir lib/logout).
      utils.auth.me.setData(undefined, undefined as never)
      toast.info('À bientôt sur Plan B 👋')
      await hardSignOut()
    },
    onError: () => {
      void hardSignOut()
    },
  })

  if (isLoading) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) {
    router.replace('/login?next=/profile/settings')
    return null
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Paramètres</h1>

      {/* Apparence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary-600" aria-hidden /> Apparence
          </CardTitle>
          <CardDescription>Choisissez votre thème préféré.</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Thème" className="grid grid-cols-3 gap-2">
            {(
              [
                ['light', Sun, 'Clair'],
                ['dark', Moon, 'Sombre'],
                ['system', Monitor, 'Auto'],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                role="radio"
                aria-checked={mounted && theme === value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition-colors ${
                  mounted && theme === value
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'border-border text-fg-muted hover:bg-bg-secondary'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary-600" aria-hidden /> Notifications
          </CardTitle>
          <CardDescription>Gérez vos alertes in-app (push web en Phase 2).</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl bg-bg-secondary p-3.5 text-sm text-fg-muted">
            Vous recevez une notification quand quelqu’un rejoint votre plan, quand une place se
            libère en liste d’attente, et avant le début de vos plans. Les notifications push
            arriveront dans une prochaine version.
          </p>
        </CardContent>
      </Card>

      {/* Réglages sociaux */}
      <SocialPrivacyCard />

      <SocialProvidersCard />

      {/* Confidentialité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary-600" aria-hidden /> Confidentialité & sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-fg-muted">
            PlanB est conforme au RGPD : export et suppression de vos données disponibles sur simple
            demande (support@planb.app). Aucune donnée bancaire n’est stockée chez nous.
          </p>
          <div className="rounded-xl border border-border p-3.5">
            <Label htmlFor="delete-account" className="text-sm font-semibold text-danger-500">
              Zone sensible
            </Label>
            <p className="mt-1 text-xs text-fg-muted">
              La suppression définitive du compte sera disponible dans l’espace RGPD complet.
            </p>
            <Button
              id="delete-account"
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() =>
                toast.info('Bientôt disponible', 'Écrivez à support@planb.app en attendant.')
              }
            >
              Supprimer mon compte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Déconnexion */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        Se déconnecter
      </Button>
    </div>
  )
}

const MESSAGE_OPTIONS = [
  ['EVERYONE', 'Tout le monde'],
  ['FRIENDS_OF_FRIENDS', 'Amis d’amis'],
  ['FRIENDS_ONLY', 'Mes amis uniquement'],
  ['NOBODY', 'Personne'],
] as const

/** Réglages amitié + messagerie (spec Phase 2 : allowMessagesFrom / allowFriendRequests). */
function SocialPrivacyCard() {
  const { user } = useCurrentUser()
  const utils = trpc.useUtils()
  const update = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate()
      toast.success('Préférences enregistrées')
    },
    onError: (e) => toast.error(e.message),
  })
  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary-600" aria-hidden /> Amis & messages
        </CardTitle>
        <CardDescription>Qui peut vous écrire et vous ajouter en ami ?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="allow-messages">Qui peut m’envoyer un message ?</Label>
          <Select
            id="allow-messages"
            className="mt-1.5"
            value={user.allowMessagesFrom}
            disabled={update.isPending}
            onChange={(e) =>
              update.mutate({
                allowMessagesFrom: e.target.value as (typeof MESSAGE_OPTIONS)[number][0],
              })
            }
          >
            {MESSAGE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="allow-friend-requests" className="cursor-pointer">
            Autoriser les demandes d’amis
          </Label>
          <Switch
            id="allow-friend-requests"
            checked={user.allowFriendRequests}
            disabled={update.isPending}
            onCheckedChange={(checked) => update.mutate({ allowFriendRequests: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
