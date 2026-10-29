'use client'

import { Loader2 } from 'lucide-react'

import { trpc } from '@/lib/trpc'

/**
 * Boutons de connexion sociale — Google, Facebook, Instagram.
 * Seuls les fournisseurs réellement configurés (variables d'environnement
 * Vercel) sont proposés : plus de bouton qui mène à une page d'erreur.
 */
export function SocialAuthButtons({ label }: { label: 'login' | 'register' }) {
  const { data, isLoading } = trpc.auth.providers.useQuery(undefined, { staleTime: 300_000 })
  const verb = label === 'login' ? 'Continuer avec' : 'S’inscrire avec'

  if (isLoading) {
    return (
      <div className="mt-4 flex h-11 items-center justify-center text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="sr-only">Chargement des connexions</span>
      </div>
    )
  }

  const providers = (['google', 'facebook', 'instagram'] as const).filter((p) => data?.[p])
  if (providers.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-border bg-bg-secondary/60 px-3 py-2.5 text-center text-[11px] leading-relaxed text-fg-muted">
        Connexion Google, Facebook et Instagram : à activer avec vos identifiants (
        <code>GOOGLE_CLIENT_ID</code>/<code>SECRET</code>, etc.) dans les variables d’environnement
        Vercel.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <div className="relative mb-3 flex items-center">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="px-3 text-xs font-medium text-fg-muted">ou</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="grid gap-2">
        {providers.includes('google') && (
          <a
            href="/api/oauth/google/start"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-semibold text-[#1f1f1f] transition-colors hover:bg-neutral-100"
          >
            <span className="text-base font-black" aria-hidden>
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </span>
            {verb} Google
          </a>
        )}

        {providers.includes('facebook') && (
          <a
            href="/api/oauth/facebook/start"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-black leading-none text-[#1877F2]"
              aria-hidden
            >
              f
            </span>
            {verb} Facebook
          </a>
        )}

        {providers.includes('instagram') && (
          <a
            href="/api/oauth/instagram/start"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-white"
              aria-hidden
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {verb} Instagram
          </a>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-muted">
        Facebook et Instagram synchronisent vos photos pour vos photos de profil et albums.
      </p>
    </div>
  )
}
