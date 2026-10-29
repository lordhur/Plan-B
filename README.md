# 🅱️ PlanB — Le réseau social du futur

> **Ne postez plus ce que vous avez fait. Postez ce que vous allez faire.**
> Les autres rejoignent en un clic.

PlanB est une PWA (Progressive Web App) inspirée de onvasortir.com, entièrement modernisée :
création de plans géolocalisés, inscription en un clic, liste d'attente automatique,
liens de partage viraux (QR code, sans compte requis), système de confiance et badges.

---

## ✨ Phase 1 (MVP) — implémentée

| Fonctionnalité | Statut |
|---|---|
| Inscription / connexion / vérification email + téléphone | ✅ |
| Mot de passe oublié (code par email) | ✅ |
| Profil utilisateur (édition, localisation, passions, badges) | ✅ |
| Création d'événement (formulaire 6 étapes) | ✅ |
| Fil d'actualité intelligent (score proximité/intérêt/récence/popularité) | ✅ |
| Explorer : carte Leaflet/OpenStreetMap + filtres (catégorie, distance, prix, accessibilité) | ✅ |
| Détail événement (carte, participants, restrictions âge/genre/note) | ✅ |
| Rejoindre / se désister / demande de validation / sur invitation | ✅ |
| Liste d'attente automatique avec promotion + notification | ✅ |
| Boucle virale : `/join/[shareToken]` (sans compte) + QR code + Web Share | ✅ |
| Notifications in-app (centre + cloche avec compteur) | ✅ |
| Restrictions d'accessibilité (PMR, malentendants, malvoyants) | ✅ |
| Thème clair / sombre / automatique | ✅ |
| PWA installable (manifest, service worker, mode hors-ligne) | ✅ |
| SEO : sitemap dynamique, robots, Open Graph | ✅ |
| Rate limiting (login, inscription, création d'événements) | ✅ |

## 🤝 Phase 2 (Social) — implémentée

| Fonctionnalité | Statut |
|---|---|
| Système d'amis : demande / acceptation / refus / retrait (`friendCount` maintenu) | ✅ |
| Demandes croisées acceptées automatiquement | ✅ |
| Messagerie privée 1-1 (conversations, non-lus, `lastReadAt`) | ✅ |
| Chat d'événement (organisateur + participants confirmés uniquement) | ✅ |
| Confidentialité : qui peut m'écrire (tous / amis d'amis / amis / personne), demandes d'amis on/off | ✅ |
| Notation post-événement (1-5 ★ + commentaire, moyenne recalculée, doublons bloqués) | ✅ |
| Signalement de comportement (harcelement, no-show, spam…) | ✅ |
| Moteur de badges automatique (critères JSON dans `src/lib/constants.ts`) | ✅ |
| Score de confiance (note pondérée, présence, no-shows, signalements, ancienneté) | ✅ |
| Tâches CRON (`vercel.json` + `/api/cron/[job]`, protégées par `CRON_SECRET`) : | ✅ |
| — `update-event-status` (UPCOMING → ONGOING → COMPLETED + passage ATTENDED) | ✅ |
| — `promote-waitlist`, `send-reminders` (J-1 / H-1), `update-badges`, `update-trust-scores`, `cleanup-expired` | ✅ |
| Temps réel : polling React Query (3,5-4 s) — compatible serverless, swap WebSocket possible | ✅ |

## 📸 Phase 3 (Albums & Covoiturage) — implémentée

| Fonctionnalité | Statut |
|---|---|
| Albums photos d'événement (upload multipart, miniatures sharp, verrouillage 30 j) | ✅ |
| Stockage local `data/uploads` servi par `/api/media/file` (anti path-traversal) — swap Supabase Storage documenté | ✅ |
| Identification sur photos + confirmation | ✅ |
| Covoiturage : offres (géocodage Nominatim), demandes, acceptation conducteur, notifications | ✅ |
| Classements hebdo/mensuel/global (moteur + cron + page `/leaderboard`) | ✅ |
| Calendrier mensuel des plans (`/events/calendar`) | ✅ |

## 💳 Phase 4 (Monétisation) — implémentée

| Fonctionnalité | Statut |
|---|---|
| Couche paiement abstraite : MockProvider (démo) / StripeProvider (production, points d'intégration documentés) | ✅ |
| Billetterie : achat de billet (plan payant), doublons bloqués, remboursement + départ | ✅ |
| Abonnements PREMIUM / ORGANIZER_PRO / BUSINESS (période 1 mois, annulation en fin de période) | ✅ |
| Offres partenaires : bons plans locaux, code promo, une utilisation par membre, stocks | ✅ |

## 🏪 Phase 5 (Pages & Groupes) — implémentée

| Fonctionnalité | Statut |
|---|---|
| Pages organisateurs/commerces : annuaire, profil, suivi (followerCount), vérification | ✅ |
| Publication de plans au nom d'une page + notification des abonnés (PAGE_NEW_EVENT) | ✅ |
| Groupes d'intérêt : annuaire, création (ADMIN), rôles, groupes privés | ✅ |
| Forum : sujets épinglés, réponses, modération (auteur/staff), notification staff | ✅ |

**L'ensemble des 5 phases du cahier des charges est implémenté.**
Extensions possibles : WebSocket temps réel, Supabase Storage, Stripe live,
push web (PushSubscription déjà au schéma), modération admin des signalements.

## 🧱 Stack

- **Frontend** : Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS · Framer Motion · Zustand · next-themes
- **API** : tRPC 11 (typage end-to-end) · Zod 4 · React Query 5
- **Base** : PostgreSQL via Prisma 7 (client TypeScript pur, driver adapter `pg`)
- **Cartes** : Leaflet + OpenStreetMap (sans clé API) · géocodage Nominatim
- **Auth** : Argon2id + sessions JWT (cookie httpOnly) — couche isolée, swap Supabase Auth possible
- **PWA** : @ducanh2912/next-pwa (Workbox)
- **Local sans Docker** : PGlite (PostgreSQL compilé en WASM) exposé en TCP

## 🚀 Démarrage rapide (sans Docker, sans compte cloud)

```bash
npm install

# Terminal 1 — PostgreSQL local (WASM, persisté dans data/pgdata/)
npm run db:local

# Terminal 2 — schéma + données de démo + serveur
npm run db:push
npm run db:seed
npm run dev        # http://localhost:3000
```

**Comptes de démo** (mot de passe : `planb1234`) :
`thomas@planb.app` (vérifié email+tel) · `marie@planb.app` · `julie@planb.app` ·
`pierre@planb.app` · `sophie@planb.app` · `karim@planb.app` · `lea@planb.app` · `antoine@planb.app`

Les événements de démo sont situés autour de **Draguignan (Var)**.

> 💡 Mode démo : sans `RESEND_API_KEY`, les codes de vérification s'affichent dans le
> terminal serveur et sont pré-remplis dans l'UI.

### Alternative Docker

```bash
docker compose up -d
DATABASE_URL="postgresql://planb:planb@localhost:5432/planb" npm run db:push:prisma
npm run db:seed && npm run dev
```

## ☁️ Déploiement (gratuit)

1. **Supabase** (PostgreSQL gratuit) : créer un projet, récupérer `DATABASE_URL` / `DIRECT_URL`
2. **Migrations** : `npx prisma migrate dev` (machine avec accès réseau complet) puis `prisma migrate deploy`
3. **Vercel** : importer le repo, définir les variables (voir `.env.example`)
4. Optionnel : `RESEND_API_KEY` (emails), Stripe (Phase 4)
5. **Connexion Google / Facebook / Instagram** : guide pas à pas dans
   [`docs/oauth-setup.md`](docs/oauth-setup.md) (identifiants, URI de redirection,
   mode test, dépannage).

Le fichier `.env.example` documente toutes les variables.

> Sans `RESEND_API_KEY`, les codes de vérification à 6 chiffres sont **affichés
> directement dans l'interface** (page `/verify`) : aucun compte ne reste bloqué
> et la connexion n'exige pas d'e-mail vérifié.

## 📁 Architecture

```
prisma/
  schema.prisma          # 39 modèles : users, events, waitlist, badges, pages,
                         # groupes, covoiturage, Stripe, notifications… (spec complète)
  seed.ts                # Données de démo (Var)
scripts/
  pglite-server.ts       # PostgreSQL WASM en TCP (dev local)
  db-push.ts             # DDL depuis le schéma (via prisma-schema-wasm, sans binaire Rust)
  generate-icons.tsx     # Icônes PWA
src/
  server/
    db.ts                # Singleton Prisma (driver adapter pg)
    auth.ts              # Argon2, JWT, codes de vérification, rate limiting
    trpc.ts              # init + procédures public/protected/verified
    routers/             # auth, events, users, notifications
  lib/
    feed.ts              # Algorithme du fil (score 0-100)
    validators.ts        # Schémas Zod partagés client/serveur
  app/
    (auth)/              # login, register, verify, forgot-password
    (main)/              # fil, explore, events/[slug], profile, notifications…
    join/[shareToken]/   # Boucle virale (accessible sans compte)
    api/trpc/            # Point d'entrée HTTP tRPC
  components/            # ui/, layout/, events/, common/
```

### Décisions techniques notables

- **Prisma 7** : client TypeScript pur (pas de binaire Rust à télécharger) — fonctionne
  dans les environnements sandboxés. En environnement classique, `prisma migrate` fonctionne normalement.
- **PGlite** : vrai PostgreSQL (WASM) pour le dev local — mêmes types, arrays `text[]`,
  `jsonb`, contraintes — aucune divergence avec la production.
- **`scripts/db-push.ts`** : génère le DDL via le parseur officiel Prisma en WASM
  (`@prisma/prisma-schema-wasm`) lorsque le moteur Rust de la CLI n'est pas téléchargeable.
  Avec un réseau complet : utilisez `npm run db:push:prisma`.

## 🔐 Sécurité

- Argon2id (memory-hard) pour les mots de passe
- Sessions JWT signées HS256, cookie httpOnly + SameSite=Lax
- Rate limiting : 8 tentatives de login / 10 min, 10 inscriptions / h, 5 plans / 24 h (comptes récents)
- Codes de vérification hachés, 15 min d'expiration, 5 essais max
- Anti-énumération d'emails sur forgot-password
- Procédures tRPC `protectedProcedure` / `verifiedProcedure` (email vérifié requis pour créer/rejoindre)

## 🧪 Vérifications

```bash
npm run typecheck   # TypeScript strict : 0 erreur
npm run build       # Build production complet
npm run lint        # ESLint (next/core-web-vitals)
```

## 📄 Licence

AGPL-3.0 — fait en France 🇫🇷
