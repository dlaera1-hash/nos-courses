# Nos courses

Liste de courses partagée pour la maison. Elle range chaque produit dans son rayon, apprend votre rythme d'achat et vous propose ce qu'il est temps de racheter.

- Page statique hébergée sur GitHub Pages : `index.html`, `style.css`, `app.js`, `logic.js`.
- Données dans un projet Supabase dédié (table `items`), visibles uniquement par les adresses de la table `members`.
- Connexion par code à 6 chiffres reçu par e-mail. Un code plutôt qu'un lien : sur iPhone, un lien s'ouvrirait dans Safari et non dans l'appli de l'écran d'accueil.

## Mise en place (une seule fois)

### 1. Projet Supabase

1. Sur [supabase.com](https://supabase.com), crée un nouveau projet gratuit `nos-courses`, région Europe.
2. **SQL Editor** > New query : colle `supabase/schema.sql`, remplace les 2 adresses e-mail en haut, puis Run.
3. **Authentication > Users** > Add user > Create new user : crée ton adresse, puis celle de ta compagne. Coche « Auto Confirm User ». Le mot de passe est inutile.
4. **Authentication > Sign In / Providers** : laisse Email activé et désactive « Allow new users to sign up ». Personne d'autre ne pourra créer de compte.
5. **Authentication > Emails > Templates > Magic Link** : remplace le contenu par le modèle ci-dessous, pour que l'e-mail contienne le code.

   ```html
   <h2>Ton code pour Nos courses</h2>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Il expire dans une heure.</p>
   ```

6. **Project Settings > API Keys** : copie l'URL du projet et la clé publique (`sb_publishable_...`, ou l'ancienne clé `anon`) dans `config.js`. Jamais la clé secrète.

### 2. GitHub Pages

1. Pousse le dépôt sur GitHub (dépôt public `nos-courses`).
2. **Settings > Pages** : Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. L'appli est alors en ligne à `https://<ton-compte>.github.io/nos-courses/`.

### 3. Sur l'iPhone

1. Ouvre l'adresse dans **Safari**, puis Partager > **Sur l'écran d'accueil**.
2. Ouvre l'appli depuis l'icône, saisis ton e-mail, puis le code reçu.

## Bon à savoir

- Le forfait gratuit de Supabase met en pause un projet resté 7 jours sans activité. Il se relance depuis le tableau de bord.
- L'envoi d'e-mails par défaut de Supabase est limité à quelques messages par heure. Ça suffit pour 2 personnes qui se connectent une fois.
- Ajouter un membre : insère son adresse dans `members` (SQL Editor) et crée son compte dans Authentication > Users.

## Tests

```bash
node tests/logic.test.mjs
```
