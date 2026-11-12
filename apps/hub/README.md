# HUB Velito (hub.velito.fr)

Porte d'entrée de l'écosystème Velito et **compte unique** de toutes les apps
du monorepo. App Next.js, port dev **3000**.

## Ce que fait le hub

- **Accueil** (`/`) : présentation des modules de l'écosystème (sphère 3D
  WebGL, avec une liste accessible et une grille statique si l'utilisateur
  préfère réduire les animations). Les modules et leurs liens sont dans
  `src/components/galaxy/modules.ts` : un module en ligne pointe vers son
  site, un module pas prêt vers `/construction?slug=...`.
- **Compte unique** : inscription, connexion, mot de passe oublié, page
  `/account` (apps activées, apps à découvrir). Après connexion, le cookie
  de session est posé sur `.velito.fr` (variable `COOKIE_DOMAIN`) : on est
  connecté sur VEA, Arena, Interactive, Compta sans se reconnecter.
- **Retour sûr après connexion** (`src/lib/return-to.ts`) : `?return=` n'accepte
  qu'un chemin local ou un domaine de la liste blanche (`ALLOWED_HOSTS`).
  Empêche qu'un lien trafiqué renvoie l'utilisateur vers un site pirate
  après sa connexion (open redirect).
- **Fournisseur OpenID Connect** (`/oauth/*`, `/.well-known/*`) : authorize,
  consent, token, userinfo, découverte et clés publiques (RS256, PKCE S256).
  Sert aux applications HORS de velito.fr ; les sous-domaines n'en ont pas
  besoin, le cookie partagé suffit (choix fait pour l'espace joueur Arena le
  12/11/2026).
- **Projets** (`/projets`, connexion requise) : suivi de tous les projets
  (étapes, journal, cahiers des charges). Le pourcentage d'avancement n'est
  jamais saisi : il se calcule à partir des étapes et de leur poids
  (`src/lib/projets/avancement.ts`, fonctions pures testées).

## Architecture (à savoir défendre)

- **Un seul projet Supabase** pour toutes les apps. L'identité repose sur
  `auth.users` et le schéma `shared` (`users`, `organizations`,
  `user_permissions`, `app_memberships`). Chaque app a son propre schéma
  (`vea`, `arena`, `interactive`, `public` pour Compta).
- **Droits partagés** : `shared.user_permissions` (owner, editor, viewer par
  organisation) est lu par toutes les apps. Être responsable de VEA donne
  automatiquement les droits d'organisateur sur Arena.
- **Le middleware ne fait que rafraîchir la session** (`src/middleware.ts`) :
  chaque page protégée vérifie elle-même la connexion. La sécurité ne dépend
  pas d'un seul point.
- **SEO** : `robots.ts` refuse les robots d'entraînement d'IA, autorise
  moteurs et robots de recherche, ferme les pages de compte, de connexion et
  OAuth. Même politique sur velito.fr, VEA, Arena, Interactive et venaball.fr.

## Dev local

```bash
npm install          # à la racine du monorepo
npm run dev          # http://localhost:3000 (construit aussi l'index de recherche)
node --experimental-strip-types src/lib/projets/avancement.test.ts
node sql/test_projets.mjs   # schéma Projets sur un vrai Postgres (PGlite)
```

Variables : la liste est dans `.env.example` (noms seulement, aucune
valeur), à copier en `.env.local`. Une variable ajoutée doit aussi figurer dans
la liste `env` de `turbo.json` à la racine, sinon elle est masquée au build.

## SQL

Fichiers dans `sql/`, exécutés à la main dans l'éditeur SQL Supabase :
`shared-identity-v1.sql`, `oauth-tables-v1.sql`, `projets-v1.sql`, puis les
mises à jour datées des projets (`projets-maj-*.sql`, idempotentes).
