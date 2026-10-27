'use client'

/**
 * Boutons de connexion sociale — Google, Facebook, Instagram.
 * Chaque fournisseur s'active via ses variables d'environnement (voir src/lib/oauth.ts).
 */
export function SocialAuthButtons({ label }: { label: 'login' | 'register' }) {
  const verb = label === 'login' ? 'Continuer avec' : 'S’inscrire avec'
  return (
    <div className="mt-4">
      <div className="relative mb-3 flex items-center">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="px-3 text-xs font-medium text-fg-muted">ou</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="grid gap-2">
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
      </div>
      <p className="mt-2 text-center text-[11px] text-fg-muted">
        Facebook et Instagram synchronisent vos photos pour vos photos de profil et albums.
      </p>
    </div>
  )
}
