# Nos courses

Liste de courses partagée pour la maison. Elle range chaque produit dans son rayon, apprend votre rythme d'achat et vous propose ce qu'il est temps de racheter.

- Page statique hébergée sur GitHub Pages : `index.html`, `style.css`, `app.js`, `logic.js`.
- Données dans le projet Supabase `nos-courses` (organisation Perso, forfait gratuit, Europe).
- Seules les adresses de la table `members` lisent et écrivent la liste (règles d'accès dans `supabase/schema.sql`).
- Connexion par e-mail et mot de passe. Un seul e-mail de confirmation à la création du compte.

Appli en ligne : https://dlaera1-hash.github.io/nos-courses/

## Première connexion (chacun, une fois)

1. Sur l'iPhone, ouvre l'adresse dans **Safari**, puis Partager > **Sur l'écran d'accueil**.
2. Ouvre l'appli depuis l'icône, touche « Première fois ? Créer mon mot de passe », saisis ton e-mail et un mot de passe.
3. Ouvre l'e-mail de confirmation de Supabase et touche le lien.
4. Reviens dans l'appli et connecte-toi. L'iPhone peut mémoriser le mot de passe.

Une fois vos 2 comptes créés, ferme les inscriptions : Supabase > Authentication > Sign In / Providers > désactiver « Allow new users to sign up », puis Save. Les inscriptions ouvertes ne donnent accès à rien (seule la table `members` compte), mais autant fermer la porte.

## Bon à savoir

- Le forfait gratuit de Supabase met en pause un projet resté 7 jours sans activité. Il se relance depuis le tableau de bord.
- L'envoi d'e-mails par défaut de Supabase est limité à quelques messages par heure. Suffisant pour 2 comptes.
- Mot de passe oublié : Supabase > Authentication > Users > l'utilisateur > Send password recovery.
- Ajouter un membre : insère son adresse dans `members` (SQL Editor) et rouvre les inscriptions le temps qu'il crée son compte.
- `config.js` contient l'adresse du projet et la clé publique (`sb_publishable_...`). Elles sont faites pour être visibles. Ne jamais y mettre la clé secrète.

## Publier une modification

GitHub Pages laisse les téléphones garder chaque fichier 10 minutes en cache. Avant chaque commit qui change l'appli, donne un nouveau numéro de version aux fichiers, pour qu'une page récente ne charge jamais un script ancien :

```bash
sh scripts/version.sh
```

## Tests

```bash
node tests/logic.test.mjs
```
