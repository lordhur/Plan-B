import Link from 'next/link'

export const metadata = {
  title: 'Conditions d’utilisation — Plan B',
  description:
    'Les règles d’usage de Plan B : respect, contenu publié, modération et responsabilité.',
}

/** Conditions d'utilisation — page publique (requise par les fournisseurs OAuth). */
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-fg">
      <h1 className="text-2xl font-extrabold tracking-tight">Conditions d’utilisation</h1>
      <p className="mt-2 text-fg-muted">Dernière mise à jour : 29 octobre 2026.</p>

      <h2 className="mt-6 text-lg font-bold">1. Le service</h2>
      <p className="mt-2">
        Plan B est un réseau social gratuit permettant de créer, rejoindre et organiser des plans
        entre voisins. Le service est fourni « en l’état », sans engagement de disponibilité.
      </p>

      <h2 className="mt-6 text-lg font-bold">2. Votre compte</h2>
      <p className="mt-2">
        Vous devez avoir au moins 18 ans, fournir des informations exactes et garder votre mot de
        passe confidentiel. Un compte par personne ; les comptes automatisés ou usurpant une
        identité sont supprimés.
      </p>

      <h2 className="mt-6 text-lg font-bold">3. Contenus</h2>
      <p className="mt-2">
        Vous restez propriétaire de vos photos, vidéos et messages, et accordez à Plan B une licence
        limitée pour les afficher aux personnes autorisées. Sont interdits : contenus haineux,
        harcèlement, contenus illégaux, spam et propos discriminant. Tout contenu signalé peut être
        masqué et le compte suspendu.
      </p>

      <h2 className="mt-6 text-lg font-bold">4. Rencontres entre membres</h2>
      <p className="mt-2">
        Plan B facilite la mise en relation : chaque participant reste responsable de ses rencontres
        et des informations qu’il partage. Privilégiez les lieux publics pour un premier plan.
      </p>

      <h2 className="mt-6 text-lg font-bold">5. Résiliation</h2>
      <p className="mt-2">
        Vous pouvez supprimer votre compte à tout moment. Nous pouvons suspendre un compte en cas de
        manquement grave à ces conditions, après notification sauf urgence manifeste.
      </p>

      <h2 className="mt-6 text-lg font-bold">6. Droit applicable</h2>
      <p className="mt-2">
        Les présentes conditions sont régies par le droit français. En cas de litige, une solution
        amiable sera recherchée en priorité.
      </p>

      <p className="mt-8 text-sm text-fg-muted">
        <Link href="/" className="font-semibold text-accent-600 hover:underline">
          ← Retour à l’accueil
        </Link>
        {' · '}
        <Link href="/legal/privacy" className="font-semibold text-accent-600 hover:underline">
          Politique de confidentialité
        </Link>
      </p>
    </article>
  )
}
