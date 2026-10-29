# Connexion Google / Facebook / Instagram — mode d'emploi

Plan B utilise **son propre flux OAuth** (aucune dépendance payante). Tant
qu'un fournisseur n'a pas d'identifiants, son bouton n'apparaît pas sur les
pages Connexion / Inscription : c'est normal, et ça évite une page d'erreur.

Adresse de production : **https://planb-lord-hur-tv.vercel.app**
URI de redirection à déclarer chez chaque fournisseur :

| Fournisseur | URI de redirection à déclarer |
| --- | --- |
| Google | `https://planb-lord-hur-tv.vercel.app/api/oauth/google/callback` |
| Facebook | `https://planb-lord-hur-tv.vercel.app/api/oauth/facebook/callback` |
| Instagram | `https://planb-lord-hur-tv.vercel.app/api/oauth/instagram/callback` |

> Les URI doivent être **identiques au caractère près** (https, pas de `/` final,
> pas de `www`). Une différence = erreur `redirect_uri_mismatch` côté Google ou
> « URL bloquée » côté Facebook.

---

## 1. Où poser les identifiants (Vercel)

1. Ouvrir <https://vercel.com> → projet **planb** → **Settings** → **Environment Variables**.
2. Pour chaque paire, créer **deux** variables, cochées au minimum pour
   **Production** (et **Preview** si vous voulez tester sur les branches) :

   ```
   GOOGLE_CLIENT_ID          / GOOGLE_CLIENT_SECRET
   FACEBOOK_CLIENT_ID        / FACEBOOK_CLIENT_SECRET
   INSTAGRAM_CLIENT_ID       / INSTAGRAM_CLIENT_SECRET
   ```

3. **Redeploy** obligatoire : Deployments → « … » du dernier déploiement →
   **Redeploy** (les variables ne sont lues qu'au démarrage).
4. Vérification immédiate, sans interface :
   <https://planb-lord-hur-tv.vercel.app/api/trpc/auth.providers>
   → `{"google":true,"facebook":false,"instagram":false}` par exemple.
   Les boutons correspondants apparaissent alors sur `/login` et `/register`,
   et l'état est aussi affiché dans **Profil → Paramètres → Connexions sociales**.

> Astuce : `NEXT_PUBLIC_APP_URL=https://planb-lord-hur-tv.vercel.app` évite
> toute ambiguïté sur l'origine utilisée pour construire les URI de retour.

---

## 2. Google (le plus simple — 10 minutes, gratuit, immédiat)

1. <https://console.cloud.google.com> → créer un projet (ex. `Plan B`).
2. **API et services → Écran de consentement OAuth** :
   - Type d'utilisateur : **Externe**.
   - Nom de l'application : `Plan B`, e-mail d'assistance, e-mail du développeur.
   - **Scopes** : ajouter `openid`, `email`, `profile` (ce sont les trois seuls
     utilisés par l'application ; aucun accès aux fichiers, à Gmail, etc.).
   - **Utilisateurs de test** : ajoutez votre adresse Gmail (obligatoire tant
     que l'application est en mode « Test » ; jusqu'à 100 testeurs).
3. **API et services → Identifiants → Créer des identifiants → ID client OAuth** :
   - Type d'application : **Application Web**.
   - **Origines JavaScript autorisées** : `https://planb-lord-hur-tv.vercel.app`
   - **URI de redirection autorisés** :
     `https://planb-lord-hur-tv.vercel.app/api/oauth/google/callback`
4. Copier **ID client** → `GOOGLE_CLIENT_ID`, **Code secret du client** →
   `GOOGLE_CLIENT_SECRET` dans Vercel, puis Redeploy.

Ce que l'application récupère : nom, prénom, e-mail, photo de profil. Si un
compte Plan B existe déjà avec le même e-mail, les deux sont reliés
automatiquement.

---

## 3. Facebook (Meta for Developers)

1. <https://developers.facebook.com/apps> → **Créer une app**.
   - Nom, e-mail de contact, puis cas d'usage **« Authentification et demande de
     données auprès des utilisateurs »** (Facebook Login), type **Consommateur**.
2. Dans l'app : **Ajouter des produits → Connexion Facebook → Configurer**.
3. **Connexion Facebook → Paramètres** (Facebook Login → Settings) :
   - `Connexion OAuth côté client` : **Oui**
   - `Connexion OAuth côté web` : **Oui**
   - `Appliquer HTTPS` : **Oui**
   - **URI de redirection OAuth valides** :
     `https://planb-lord-hur-tv.vercel.app/api/oauth/facebook/callback`
4. **Paramètres de l'app → Général** :
   - **Domaine de l'app** : `planb-lord-hur-tv.vercel.app`
   - URL de la politique de confidentialité + conditions d'utilisation
     (obligatoires) : `https://planb-lord-hur-tv.vercel.app/legal/privacy` et
     `https://planb-lord-hur-tv.vercel.app/legal/terms`.
   - Catégorie : « Réseau social ».
5. **Paramètres → Général → ID de l'app / Clé secrète de l'app** →
   `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`, puis Redeploy.
6. Tant que l'app est en mode **Développement**, seuls les comptes ajoutés dans
   **Rôles → Testeurs** peuvent se connecter. Ajoutez votre compte, acceptez
   l'invitation, et le bouton fonctionne immédiatement.
   Pour ouvrir à tout le monde : passer l'app en **Live** (bouton en haut du
   tableau de bord). Les permissions de base `public_profile` et `email` sont
   accordées d'office ; `user_photos` (utilisé pour l'import d'albums) exige une
   **revue d'application** — sans elle, la connexion fonctionne mais l'import de
   photos renvoie une liste vide (aucune erreur bloquante).

Ce que l'application récupère : nom, prénom, e-mail, photo de profil, et — si
la permission photos est accordée — vos photos publiques pour les albums.

---

## 4. Instagram (compte professionnel obligatoire)

Depuis 2024, l'API utilise **« Instagram API with Instagram Login »** : c'est la
seule méthode encore supportée (l'ancienne *Basic Display* est arrêtée). Elle
exige un **compte Instagram professionnel (Business ou Créateur)** — un compte
personnel ne peut pas se connecter.

1. Sur Instagram (app mobile) : **Paramètres → Compte → Passer à un compte
   professionnel → Créateur** (gratuit, réversible).
2. <https://developers.facebook.com/apps> → **Créer une app** (ou réutiliser
   celle de Facebook), type **Business**, puis
   **Ajouter des produits → Instagram → API setup with Instagram login**.
3. **3. Set up Instagram business login** → **Redirect URL** :
   `https://planb-lord-hur-tv.vercel.app/api/oauth/instagram/callback`
   (puis **Business login settings → OAuth Redirect URIs** : même valeur).
4. **App roles → Roles** : ajouter votre compte Instagram comme **testeur**
   (l'acceptation se fait dans l'app Instagram : Paramètres → Applications et
   sites web → Testeur d'applications).
5. Récupérer **Instagram App ID** et **Instagram App Secret** (onglet
   *API setup with Instagram login*) → `INSTAGRAM_CLIENT_ID` /
   `INSTAGRAM_CLIENT_SECRET`, puis Redeploy.
6. Passage en **Live** pour tout le monde (mêmes règles que Facebook : revue
   si vous demandez plus que la permission de base `instagram_business_basic`).

Limite connue : Instagram **ne transmet pas d'adresse e-mail**. Un compte créé
via Instagram reçoit donc un e-mail technique
(`+instagram-<id>@social.planb.app`) ; l'utilisateur peut renseigner une vraie
adresse dans **Profil → Modifier → Informations**.

---

## 5. Rappel : envoi des e-mails (codes à 6 chiffres)

Sans service e-mail, Plan B n'a plus de blocage : le code de vérification est
**affiché directement dans la page** (et dans les logs Vercel). Pour recevoir
les codes par e-mail :

1. <https://resend.com> → compte gratuit (**100 e-mails/jour**, 3 000/mois).
2. **API Keys → Create API key** → copier la clé `re_…`.
3. Vercel → `RESEND_API_KEY=re_…` → Redeploy.
4. `EMAIL_FROM` : par défaut `PlanB <onboarding@resend.dev>`. Cette adresse
   n'envoie **que vers l'adresse du compte Resend** tant qu'aucun domaine n'est
   vérifié. Pour envoyer à n'importe qui : **Domains → Add domain** →
   renseigner les enregistrements DNS (SPF/DKIM) → puis
   `EMAIL_FROM="Plan B <no-reply@votre-domaine.fr>"`.

---

## 6. Dépannage express

| Message | Cause | Correction |
| --- | --- | --- |
| `redirect_uri_mismatch` (Google) | URI absente ou différente | Recopier l'URI exacte du tableau ci-dessus |
| « URL bloquée » (Facebook) | URI non déclarée / HTTPS non coché | Paramètres Facebook Login + « Appliquer HTTPS » |
| « Le fournisseur a refusé la connexion » | App en mode Développement et compte non testeur | Ajouter le compte dans Rôles → Testeurs |
| Bouton absent de `/login` | Variables non posées ou pas de Redeploy | Vérifier `/api/trpc/auth.providers` |
| Instagram : « compte non professionnel » | Compte personnel | Passer en Créateur/Business |
| Aucun e-mail reçu | Pas de `RESEND_API_KEY` ou domaine non vérifié | Le code s'affiche à l'écran ; configurer Resend |
