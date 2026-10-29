# Connexion Google / Facebook / Instagram — guide pour débutant

> **À qui s'adresse ce guide ?** À quelqu'un qui n'a jamais touché à l'OAuth.
> Aucune ligne de commande, aucun logiciel à installer : uniquement des clics
> dans des sites web. Comptez **15 minutes pour Google**, **20 pour Facebook**,
> **20 pour Instagram**. Tout est gratuit.
>
> Plan B côté code est **déjà prêt** : il ne manque que les identifiants, que
> vous seul pouvez créer (ce sont vos comptes Google/Meta).

---

## Partie 0 — Les mots que vous allez voir (à lire une fois, 3 minutes)

| Mot | Ce que ça veut vraiment dire |
| --- | --- |
| **OAuth / connexion sociale** | Un site délègue la vérification d'identité à Google ou Meta. Vous cliquez « Continuer avec Google », Google vous reconnaît, puis prévient Plan B : « c'est bien cette personne ». Plan B ne voit jamais votre mot de passe Google. |
| **Application (ou « app »)** | La fiche que vous créez chez Google/Meta pour *votre* site. C'est une déclaration : « Plan B a le droit de demander une connexion ». |
| **Client ID** | Le **nom public** de votre application. On peut le montrer sans risque. Analogy : le numéro de badge d'un visiteur à l'accueil. |
| **Client Secret** | La **clé privée** associée. Elle ne doit jamais être publiée. Analogy : la serrure qui va avec le badge. |
| **URI de redirection** (ou *redirect URI*, *callback*) | L'**adresse où le fournisseur renvoie la personne après connexion**. Vous la déclarez chez Google/Meta, et Plan B la connaît déjà. Si les deux ne sont pas identiques au caractère près, ça échoue. Analogy : l'adresse de retour sur une enveloppe. |
| **Variable d'environnement** | Un réglage secret stocké chez Vercel (pas dans le code). Exemple : `GOOGLE_CLIENT_ID = 1234-abc.apps.googleusercontent.com`. Plan B lit ces valeurs au démarrage. |
| **Redeploy (redéploiement)** | Reconstruire le site pour qu'il relise les variables d'environnement. **Sans redeploy, vos nouvelles variables sont ignorées.** C'est l'erreur n°1 des débutants. |
| **Mode Test / Développement** | Une application neuve n'est ouverte qu'aux comptes que vous autorisez explicitement (les « testeurs »). Tant que vous restez dans ce mode, **seuls ces comptes peuvent se connecter** — c'est parfait pour tester, et sans validation de Google/Meta. |
| **Mode Live / Production** | L'application accepte tous les comptes. Google peut demander une vérification si vous demandez des données sensibles ; Meta demande une « revue d'application ». Pour Plan B (nom, e-mail, photo) la revue n'est en général pas nécessaire côté Google. |

**Les adresses dont vous aurez besoin** (copiez-collez, ne retapez pas) :

```
Google     → https://planb-lord-hur-tv.vercel.app/api/oauth/google/callback
Facebook   → https://planb-lord-hur-tv.vercel.app/api/oauth/facebook/callback
Instagram  → https://planb-lord-hur-tv.vercel.app/api/oauth/instagram/callback
```

Et les 6 variables à remplir chez Vercel (elles arriveront au fil du guide) :

```
GOOGLE_CLIENT_ID        GOOGLE_CLIENT_SECRET
FACEBOOK_CLIENT_ID      FACEBOOK_CLIENT_SECRET
INSTAGRAM_CLIENT_ID     INSTAGRAM_CLIENT_SECRET
```

---

## Partie A — Google (le plus simple, à faire en premier)

### A.1 Créer le « projet »

1. Aller sur <https://console.cloud.google.com> et se connecter avec votre compte Google.
2. En haut à gauche, un menu déroulant affiche « Sélectionner un projet » (ou le nom d'un projet existant).
   Cliquer dessus → bouton **« Nouveau projet »** (en haut à droite de la fenêtre qui s'ouvre).
3. **Nom du projet** : `Plan B`. Emplacement : *Aucune organisation*. Cliquer **Créer**.
4. Attendre ~10 secondes, puis sélectionner le projet « Plan B » dans ce même menu déroulant.
   ⚠️ Tout ce que vous ferez ensuite concerne **le projet sélectionné** : vérifiez toujours « Plan B » en haut.

### A.2 Remplir la fiche de consentement (ce que verra l'utilisateur)

5. Menu ☰ (en haut à gauche) → **API et services** → **Écran de consentement OAuth**.
   (Dans les versions récentes, cette page s'appelle **« Plateforme d'authentification Google »**,
   avec un menu à gauche : *Marque*, *Audience*, *Accès aux données*, *Clients*.)
6. Si un bouton **« Commencer »** / **« Get started »** apparaît, cliquer dessus et suivre l'assistant :
   - **Nom de l'application** : `Plan B`
   - **E-mail d'assistance utilisateur** : votre adresse Gmail
   - **Audience** (type d'utilisateur) : **Externe** *(« Interne » n'existe que pour les comptes Google Workspace d'entreprise ; si vous ne le voyez pas, c'est normal)*
   - **Coordonnées du développeur** : votre adresse Gmail
   - Cocher l'acceptation de la politique, puis **Créer**.
7. Aller dans l'onglet **« Audience »** → section **« Utilisateurs testeurs »** → **« Ajouter des utilisateurs »**
   → saisir **votre propre adresse Gmail** → **Enregistrer**.
   *Sans cette étape, vous verrez « Accès bloqué : cette application n'a pas été validée par Google ».*
8. (Facultatif mais recommandé) Onglet **« Accès aux données »** → **« Ajouter ou supprimer des champs d'application »**
   → cocher `openid`, `email`, `profile` → **Mettre à jour**. Plan B n'utilise que ces trois-là.

### A.3 Créer les identifiants (le Client ID + le Secret)

9. Onglet **« Clients »** → bouton **« Créer un client »** (en haut de la liste).
10. **Type d'application** : **Application Web**. **Nom** : `Plan B web`. → **Créer**.
11. Sur l'écran suivant, deux champs à remplir **avant** de valider :

    - **Origines JavaScript autorisées** → **« Ajouter un URI »** → coller :
      ```
      https://planb-lord-hur-tv.vercel.app
      ```
      *(sans `/` à la fin, sans `/api`…)*

    - **URI de redirection autorisés** → **« Ajouter un URI »** → coller :
      ```
      https://planb-lord-hur-tv.vercel.app/api/oauth/google/callback
      ```

12. Cliquer **Créer**. Une fenêtre affiche **« ID client »** et **« Code secret du client »**.
    - Copier les deux **tout de suite** dans un brouillon (Bloc-notes / gestionnaire de mots de passe).
    - Le secret ressemble à `GOCSPX-xxxxxxxxxxxx`. Si vous fermez la fenêtre, vous pourrez le
      retrouver : liste des clients → cliquer sur « Plan B web » → colonne de droite.
13. Passer à la **Partie B** (poser les variables dans Vercel) — ou continuer avec Facebook d'abord,
    les deux fonctionnent.

---

## Partie B — Poser les identifiants dans Vercel (obligatoire pour les 3 fournisseurs)

> À faire **une fois par variable**, à répéter pour Google, Facebook et Instagram.

1. Aller sur <https://vercel.com> → se connecter (compte **tanzipierre-4387**).
2. Ouvrir le projet **planb** (tableau de bord → cliquer sur la carte « planb »).
3. Onglet **Settings** (en haut) → dans le menu de gauche : **Environment Variables**.
4. Vous voyez un formulaire **« Key » / « Value »** :
   - **Key** : `GOOGLE_CLIENT_ID`
   - **Value** : coller l'ID client copié à l'étape A.3 (aucun espace avant/après)
   - **Environments** : laisser coché **Production** (+ **Preview** si vous voulez)
   - Cliquer **Save**.
5. Répéter pour `GOOGLE_CLIENT_SECRET` avec le code secret.
6. ⚠️ **Étape la plus oubliée** : onglet **Deployments** → sur la ligne du déploiement le plus récent
   → menu **« ⋯ »** à droite → **Redeploy** → confirmer. Attendre 2 à 5 minutes (statut *Ready*).

### B.3 Vérifier que ça a marché (sans se connecter)

7. Ouvrir dans un nouvel onglet :
   <https://planb-lord-hur-tv.vercel.app/api/trpc/auth.providers>

   - `{"google":false,"facebook":false,"instagram":false}` → rien n'est encore actif.
   - `{"google":true,"facebook":false,"instagram":false}` → **Google est prêt** : le bouton va apparaître.
8. Aller sur <https://planb-lord-hur-tv.vercel.app/login> (en navigation privée si possible) :
   un bouton **« Continuer avec Google »** doit apparaître sous le formulaire.

> Vous pouvez aussi voir l'état en direct dans l'application :
> **Profil → Paramètres → « Connexions sociales »** (Activé / Non configuré).

---

## Partie C — Facebook (Meta for Developers)

1. Aller sur <https://developers.facebook.com/apps> → **se connecter avec votre compte Facebook**
   (le compte qui gérera l'app). Si c'est la première fois, accepter l'inscription développeur.
2. Bouton **« Créer une app »** (en haut à droite de « Mes apps »).
3. **Nom de l'app** : `Plan B`. **E-mail de contact** : le vôtre.
4. **Cas d'usage** : choisir **« S'authentifier et demander des données aux utilisateurs avec Facebook Login »**
   *(en anglais : « Authenticate and request data from users with Facebook Login »)* → **Suivant**.
5. Si la question « Vous créez un jeu ? » apparaît → **Non** → **Suivant**.
6. **Type d'app** (si demandé) : **Consommateur** / *Business* uniquement si vous avez une entreprise.
   → **Créer l'app** (mot de passe Facebook parfois redemandé).
7. Une fois dans l'app : menu de gauche → **« Cas d'usage »** → carte **« S'authentifier et créer un compte »**
   → **« Personnaliser »**.
8. Dans la section **« Connexion Facebook »** → **« Accéder aux paramètres »** :
   - **URI de redirection OAuth valides** → coller :
     ```
     https://planb-lord-hur-tv.vercel.app/api/oauth/facebook/callback
     ```
   - Vérifier que **« Connexion OAuth côté client »** et **« Connexion OAuth côté web »** sont sur **Oui**,
     et **« Appliquer HTTPS »** sur **Oui**.
   - **Enregistrer les modifications**.
9. Récupérer les identifiants : menu de gauche → **« Paramètres de l'app »** → **« Général »**
   → lignes **« ID de l'app »** et **« Clé secrète de l'app »** (cliquer sur *Afficher*).
10. Poser dans Vercel (Partie B) : `FACEBOOK_CLIENT_ID` = ID de l'app, `FACEBOOK_CLIENT_SECRET` = clé secrète.
    → **Redeploy** → vérifier `/api/trpc/auth.providers` (`facebook:true`).
11. **Rendre votre compte testeur** (sinon « L'application est en mode développement ») :
    menu de gauche → **« Rôles de l'app »** → **« Rôles »** → **« Ajouter des personnes »** → **Testeurs**
    → saisir le nom de votre profil Facebook → Envoyer.
    Puis, sur Facebook, ouvrir les **notifications** → accepter l'invitation.
12. **Ouvrir à tout le monde** : bouton **« En direct »** (ou *Live*) en haut du tableau de bord.

> **Options recommandées** (facultatif, mais Meta les réclame souvent avant le mode Live) :
> **Paramètres de l'app → Général** → *Domaine de l'app* `planb-lord-hur-tv.vercel.app`,
> *URL de la politique de confidentialité* `https://planb-lord-hur-tv.vercel.app/legal/privacy`,
> *Conditions d'utilisation* `https://planb-lord-hur-tv.vercel.app/legal/terms`,
> catégorie *Réseau social*, icône 1024×1024.

---

## Partie D — Instagram (compte professionnel obligatoire)

> **À savoir avant de commencer** : Instagram n'autorise la connexion que pour des
> **comptes professionnels** (Business ou Créateur). Un compte personnel **ne peut pas**
> se connecter. C'est une règle d'Instagram, pas de Plan B.

1. **Passer votre compte Instagram en professionnel** (2 minutes, gratuit, réversible) :
   app Instagram → **Paramètres** → **Compte** → **Passer à un compte professionnel** → choisir **Créateur**
   (ou *Entreprise*) → suivre les écrans.
2. Aller sur <https://developers.facebook.com/apps> → **créer une app** (ou réutiliser celle de Facebook)
   avec le cas d'usage **« Autres » / « Tout autre cas d'usage »** ou *Business*.
3. Menu de gauche → **« Ajouter des produits »** → trouver **Instagram** → **Configurer**
   → choisir **« API setup with Instagram login »**
   *(« API avec connexion Instagram »)*.
4. Toujours dans le produit Instagram → section **« 3. Set up Instagram business login »**
   → **Redirect URL** → coller :
   ```
   https://planb-lord-hur-tv.vercel.app/api/oauth/instagram/callback
   ```
   → **Save**. Puis bouton **« Business login settings »** → **OAuth Redirect URIs** → même adresse.
5. Récupérer l'**Instagram App ID** et l'**Instagram App Secret** (affichés dans
   *API setup with Instagram login*). → les coller dans Vercel :
   `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` → **Redeploy**.
6. **Ajouter votre compte Instagram comme testeur** : **« Rôles de l'app » → « Rôles »** →
   section Instagram → **Ajouter** → votre compte.
   Puis dans l'app Instagram : **Paramètres → Applications et sites web → Testeur d'applications** → **Accepter**.
7. Pour ouvrir à tous : passer l'app en **Live** (une revue peut être demandée si vous demandez
   plus que la permission de base `instagram_business_basic`).

> **Limite connue** : Instagram ne transmet **aucune adresse e-mail**. Un compte créé par
> Instagram reçoit une adresse technique (`+instagram-…@social.planb.app`) ; la personne
> peut en renseigner une vraie ensuite dans **Profil → Modifier → Informations**.

---

## Partie E — Les e-mails (codes à 6 chiffres) — pourquoi vous ne receviez rien

Sans service d'envoi, **aucun e-mail ne peut partir** : c'est physiquement impossible.
Plan B a donc été modifié pour **afficher le code directement dans la page `/verify`**
(avec un bouton « Copier »). Vous pouvez donc créer un compte et vérifier votre adresse
dès maintenant, sans rien configurer.

Pour recevoir les codes par e-mail (et les e-mails de « mot de passe oublié ») :

1. <https://resend.com> → **Sign up** avec votre adresse → gratuit (**100 e-mails/jour**, 3 000/mois).
2. Menu **API Keys** → **Create API key** → nom `planb` → permission *Sending access* → **Add**.
3. Copier la clé affichée (elle commence par `re_`) — **elle n'est montrée qu'une fois**.
4. Vercel → **Environment Variables** → `RESEND_API_KEY` = cette clé → **Save** → **Redeploy**.
5. ⚠️ **Tant que vous n'avez pas de domaine**, Resend n'envoie qu'**à l'adresse de votre compte Resend**
   (c'est une protection anti-spam). Donc : créez un compte Plan B avec **la même adresse** que votre
   compte Resend pour tester l'envoi réel. Pour envoyer à n'importe qui :
   Resend → **Domains → Add domain** → acheter/utiliser un domaine → ajouter les enregistrements
   DNS (SPF + DKIM) chez votre registrar → puis Vercel : `EMAIL_FROM = "Plan B <no-reply@votre-domaine.fr>"` → Redeploy.

---

## Partie F — Tester en 6 étapes

1. Ouvrir une fenêtre de **navigation privée** (Chrome : Ctrl+Maj+N / Safari : Cmd+Maj+N)
   — cela évite les caches et les sessions existantes.
2. Aller sur <https://planb-lord-hur-tv.vercel.app/login>.
3. Vérifier que le bouton du fournisseur configuré est visible.
   → S'il n'apparaît pas : `/api/trpc/auth.providers` doit afficher `true` ; sinon c'est
   le **Redeploy** qui manque (ou une faute de frappe dans le nom de la variable).
4. Cliquer sur le bouton → choisir son compte → lire l'écran de consentement → **Continuer/Autoriser**.
5. Vous devez revenir sur `https://planb-lord-hur-tv.vercel.app/?welcome=1`, **connecté**,
   avec votre nom et votre photo.
6. Se déconnecter (Profil → menu ⋮⋮⋮ → Se déconnecter), puis se reconnecter avec le bouton :
   la session doit s'ouvrir **directement**, sans redemander mot de passe (le compte est déjà relié).

---

## Partie G — Dépannage : le message exact → la cause → la solution

| Ce que vous voyez | Cause | Solution |
| --- | --- | --- |
| Bouton absent de la page de connexion | Variables absentes ou pas de redéploiement | Vérifier `/api/trpc/auth.providers`, puis **Redeploy** |
| Google : `Erreur 400 : redirect_uri_mismatch` | L'URI déclarée ne correspond pas exactement | Recopier `https://planb-lord-hur-tv.vercel.app/api/oauth/google/callback` (https, pas de slash final) |
| Google : « Accès bloqué : cette application n'a pas terminé la procédure de validation » | Vous n'êtes pas dans les testeurs | Google Auth Platform → **Audience** → Test users → ajouter votre Gmail |
| Facebook : « URL bloquée : la redirection a échoué » | URI non déclarée, ou HTTPS non activé | Cas d'usage → Connexion Facebook → URI + « Appliquer HTTPS : Oui » |
| Facebook : « L'application est en mode développement » | Compte non testeur | Rôles de l'app → Rôles → Testeurs → accepter l'invitation dans les notifications |
| Page Plan B « Connexion impossible — Le fournisseur a refusé la connexion » | Échange de jeton refusé (secret faux, URI fausse) | Revérifier le **Secret** dans Vercel (pas d'espace avant/après) |
| Instagram : « Le fournisseur a refusé la connexion » | Compte personnel | Passer le compte en **Créateur/Business** |
| Instagram : pas d'e-mail reçu | Comportement normal d'Instagram | Renseigner une adresse dans Modifier mon profil |
| Aucun e-mail de code | Pas de `RESEND_API_KEY`, ou domaine non vérifié | Le code s'affiche sur `/verify` ; configurer Resend (Partie E) |
| Tout a marché hier, plus rien aujourd'hui | Le déploiement a changé mais les variables ont été supprimées/renommées | Vercel → Environment Variables → vérifier les 6 clés exactes |

### Les 7 erreurs de débutant à éviter

1. **Oublier le Redeploy** après avoir ajouté une variable (le plus fréquent, de très loin).
2. Mettre des **guillemets** ou un **espace** dans la valeur (`"abc"` au lieu de `abc`).
3. Se tromper de **projet Google** (celui en haut de la console doit être « Plan B »).
4. Confondre **Client ID** et **Client Secret** (le secret commence souvent par `GOCSPX-` chez Google).
5. Mettre un **slash final** ou `www.` dans l'URI de redirection.
6. Croire que le bouton doit apparaître **avant** d'avoir configuré quoi que ce soit (non : c'est volontaire, il n'apparaît qu'une fois le fournisseur prêt).
7. Tester sans **navigation privée** et voir une vieille version mise en cache.

---

## Récapitulatif en une page

```
1. Google Auth Platform → Marque + Audience (test user) + Clients (Application Web)
   → coller l'URI de redirection → copier ID + Secret
2. Vercel → Settings → Environment Variables → GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET → Save
3. Vercel → Deployments → ⋯ → Redeploy → attendre « Ready »
4. Vérifier https://planb-lord-hur-tv.vercel.app/api/trpc/auth.providers  → google:true
5. Tester dans une fenêtre privée → « Continuer avec Google »
6. Répéter avec Facebook (Partie C) puis Instagram (Partie D)
7. Pour les codes par e-mail : Resend → RESEND_API_KEY → Redeploy
```

Une fois tout cela fait, les trois boutons apparaissent sur `/login` et `/register`, et
**n'importe quel visiteur** peut créer un compte en deux clics (si les apps sont en mode *Live*
/ *En direct*).
