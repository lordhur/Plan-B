# Déploiement en production (Vercel + Supabase)

Ce dépôt est prêt à déployer. La base de données Supabase est **déjà provisionnée et
peuplée** (schéma + données de démonstration). Il ne reste que la connexion Vercel.

## État actuel

| Élément | État |
| --- | --- |
| Code sur `main` (GitHub `lordhur/Plan-B`) | ✅ à jour (Phases 1–5) |
| Base Supabase `planb` (`kwnqvyjrynlgokdcqmwi`, eu-west-1) | ✅ 41 tables, migration `init_planb_schema` |
| Données de démonstration | ✅ 206 lignes (8 utilisateurs, 15 événements, pages, groupes, forum…) |
| Rôle applicatif `planb_app` | ✅ créé avec droits sur le schéma `public` |
| Projet Vercel | ⏳ à créer (voir ci-dessous) |

## Variables d'environnement (à saisir dans Vercel)

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | `postgresql://planb_app:<mot de passe>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres` (pooler **session**, port 5432 — requis pour Prisma) |
| `DIRECT_URL` | `postgresql://planb_app:<mot de passe>@db.kwnqvyjrynlgokdcqmwi.supabase.co:5432/postgres` (connexion directe, pour les migrations futures) |
| `AUTH_SECRET` | chaîne aléatoire 64 hex (signe les cookies de session) |
| `CRON_SECRET` | chaîne aléatoire (authentifie `/api/cron/*`) |
| `NEXT_PUBLIC_APP_URL` | URL finale du déploiement (à renseigner **après** le 1er déploiement, puis redéployer) |
| `RESEND_API_KEY` | optionnel — sans elle, les codes de vérification email sont loggés côté serveur (les comptes de démo sont déjà vérifiés) |

> Les valeurs exactes (mots de passe et secrets générés) ne sont volontairement pas
> versionnées. Pour régénérer : `openssl rand -hex 32` (AUTH_SECRET),
> `openssl rand -hex 24` (CRON_SECRET). Changer `AUTH_SECRET` invalide les sessions existantes.

## Procédure Vercel (2 minutes)

1. [vercel.com/new](https://vercel.com/new) → importer le dépôt **lordhur/Plan-B** (branche `main`).
2. Framework détecté automatiquement (Next.js) — ne rien changer aux commandes de build.
3. Ajouter les variables d'environnement du tableau ci-dessus (toutes cibles).
4. Déployer. Puis renseigner `NEXT_PUBLIC_APP_URL` avec l'URL attribuée et redéployer.

Les 7 tâches planifiées de `vercel.json` (statuts d'événements, rappels, badges, score
de confiance, classement, purge RGPD) sont activées automatiquement. En plan Hobby,
Vercel les exécute une fois par jour (fréquences fines réservées au plan Pro).

## Vérification après déploiement

1. Ouvrir l'URL → la page d'accueil affiche les événements autour de Draguignan.
2. Connexion : `thomas@planb.app` / `planb1234`.
3. `GET /api/health` → `{"status":"ok"}`.

## Notes d'exploitation

- **Uploads de médias** : écrits sur le disque du conteneur (`data/uploads`), donc
  éphémères sur Vercel. Point de bascule prévu vers Supabase Storage dans
  `src/app/api/media/route.ts`. Les photos de démo utilisent des URLs externes.
- **Supabase free** : le projet se met en pause après ~1 semaine d'inactivité
  (réveil automatique à la première requête, ou via le dashboard).
- **Paiements** : `src/server/payments.ts` utilise un `PaymentProvider` simulé ;
  brancher Stripe (`STRIPE_*`) pour l'encaissement réel.
