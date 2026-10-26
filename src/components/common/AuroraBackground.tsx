/**
 * Fond ambiant « Aurora » — trois halos colorés qui dérivent très lentement
 * derrière toute l'interface, plus un grain discret.
 *
 * 100 % CSS (aucun JS côté client), désactivé si l'utilisateur demande
 * `prefers-reduced-motion: reduce` (voir globals.css).
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Halo violet — coin haut gauche */}
      <div
        className="aurora-blob aurora-blob-1 bg-primary-500/45 dark:bg-primary-600/40"
        style={{ top: '-12rem', left: '-10rem', width: '34rem', height: '34rem' }}
      />
      {/* Halo cyan — droite */}
      <div
        className="aurora-blob aurora-blob-2 bg-secondary-400/40 dark:bg-secondary-500/30"
        style={{ top: '18%', right: '-12rem', width: '30rem', height: '30rem' }}
      />
      {/* Halo corail — bas */}
      <div
        className="aurora-blob aurora-blob-3 bg-accent-400/30 dark:bg-accent-500/25"
        style={{ bottom: '-14rem', left: '28%', width: '32rem', height: '32rem' }}
      />
      {/* Grain */}
      <div className="aurora-grain absolute inset-0" />
    </div>
  )
}
