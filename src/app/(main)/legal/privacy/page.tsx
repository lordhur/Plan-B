import Link from 'next/link'

export const metadata = {
  title: 'Confidentialité — Plan B',
  description:
    'Quelles données Plan B collecte, pourquoi, combien de temps, et comment exercer vos droits RGPD.',
}

/** Politique de confidentialité — page publique (requise par les fournisseurs OAuth). */
export default function PrivacyPage() {
  return (
    <article className="prose-planb mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-fg">
      <h1 className="text-2xl font-extrabold tracking-tight">Politique de confidentialité</h1>
      <p className="mt-2 text-fg-muted">Dernière mise à jour : 29 octobre 2026.</p>

      <h2 className="mt-6 text-lg font-bold">1. Données collectées</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong>Compte</strong> : prénom, nom, date de naissance, genre, adresse e-mail, mot de
          passe chiffré (argon2id), photo de profil et de couverture.
        </li>
        <li>
          <strong>Profil public</strong> : pseudo, bio, ville, centres d’intérêt, liens vers vos
          réseaux sociaux (uniquement ceux que vous renseignez).
        </li>
        <li>
          <strong>Activité</strong> : plans créés ou rejoints, messages, stories, albums, avis et
          signalements.
        </li>
        <li>
          <strong>Technique</strong> : date de dernière connexion, adresse IP tronquée pour les
          limites anti-abus.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-bold">2. Pourquoi</h2>
      <p className="mt-2">
        Ces données servent uniquement à faire fonctionner le service : afficher votre profil,
        proposer des plans près de chez vous, vous notifier des messages et assurer la sécurité des
        comptes. Aucune revente, aucun profilage publicitaire.
      </p>

      <h2 className="mt-6 text-lg font-bold">3. Connexion Google, Facebook, Instagram</h2>
      <p className="mt-2">
        Si vous utilisez une connexion sociale, nous recevons de ce service votre identifiant, votre
        nom, votre adresse e-mail et votre photo de profil. Nous ne publions jamais rien en votre
        nom et n’accédons à aucune autre donnée sans votre accord explicite.
      </p>

      <h2 className="mt-6 text-lg font-bold">4. Durée de conservation</h2>
      <p className="mt-2">
        Les données sont conservées tant que votre compte existe. La suppression du compte entraîne
        l’effacement des données personnelles sous 30 jours, à l’exception des écritures comptables
        éventuelles.
      </p>

      <h2 className="mt-6 text-lg font-bold">5. Vos droits (RGPD)</h2>
      <p className="mt-2">
        Accès, rectification, portabilité, effacement et opposition : écrivez à{' '}
        <a className="font-semibold text-accent-600 underline" href="mailto:support@planb.app">
          support@planb.app
        </a>
        . Réponse sous un mois maximum.
      </p>

      <h2 className="mt-6 text-lg font-bold">6. Hébergement</h2>
      <p className="mt-2">
        Application hébergée par Vercel, base de données PostgreSQL hébergée par Supabase (Union
        européenne). Aucune donnée n’est revendue ni transmise à des tiers à des fins commerciales.
      </p>

      <p className="mt-8 text-sm text-fg-muted">
        <Link href="/" className="font-semibold text-accent-600 hover:underline">
          ← Retour à l’accueil
        </Link>
        {' · '}
        <Link href="/legal/terms" className="font-semibold text-accent-600 hover:underline">
          Conditions d’utilisation
        </Link>
      </p>
    </article>
  )
}
