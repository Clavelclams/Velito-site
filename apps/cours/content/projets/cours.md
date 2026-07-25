---
titre: "Velito Cours"
avancement: 80
statut: "en cours"
maj: 2026-07-24
---

## C'est quoi

Mon outil de révision personnel pour le titre CDA (jury avril 2027) :
un site privé qui affiche des fiches Markdown produites par les sessions de
dev de chacun de mes projets. Deux types de contenu : fiches de révision
(un concept défendable au jury par fiche) et fiches projet (état réel de
chaque application). Couche A codée et vérifiée ; pas encore déployée.

## Comment c'est construit

- **Stack** : Next.js 16 (App Router, Server Components), Tailwind CSS,
  Supabase (auth uniquement), dans le monorepo Turborepo `Velito-site/`
  (`apps/cours/`, port dev 3007).
- **Contenu sans base de données** : les fiches sont des fichiers Markdown
  dans `content/fiches/` et `content/projets/`, lus par la seule couche
  d'accès `lib/fiches/fiches.ts` (`fs` + gray-matter, server-only, garde
  anti path-traversal sur les slugs). Versionnées par Git : l'historique
  des fiches EST l'historique de ma progression.
- **Sécurité** : `middleware.ts` en default-deny — toute route sans session
  → `/login`, et liste blanche `COURS_EMAILS_AUTORISES` (authentifié ≠
  autorisé, car `auth.users` est partagé avec tout Velito).
- **Pages** : dashboard (`app/page.tsx`) avec compte à rebours J−jury,
  stats par bloc CDA, projets avec barres d'avancement, et fiches
  filtrables ; visionneuses `fiches/[slug]` et `projets/[slug]`
  pré-générées au build (`generateStaticParams`).
- **UI** : tokens Tailwind `cours-*` exclusivement (DA « carnet d'étude »),
  typo Markdown stylée à la main dans `globals.css` (pas de
  @tailwindcss/typography).

## Les décisions techniques et POURQUOI

- **2026-07-10 — Markdown plutôt qu'une base de données** : n'importe quelle
  conversation Claude peut produire une fiche (déposer un .md suffit),
  zéro table/migration/RLS à maintenir pour un outil perso, et la couche
  `fiches.ts` isolée est le seul point à réécrire si multi-utilisateurs
  un jour.
- **2026-07-10 — Auth par liste blanche dans le middleware** : le projet
  Supabase est partagé ; être connecté à Velito ne doit pas donner accès à
  mes fiches. Pattern repris de compta, non réinventé.
- **2026-07-24 — Recherche côté client sur métadonnées seules** : le Server
  Component lit les fiches et passe `FicheMeta[]` (sans corps Markdown) en
  props au composant client `RechercheFiches` ; filtrage instantané,
  `fs` jamais dans le bundle (`import type` pour les interfaces).
- **2026-07-24 — Header en composant client** (`EnTete.tsx`) : vérifier la
  session via `cookies()` dans le layout racine aurait rendu tout le site
  dynamique et tué le SSG des fiches. `usePathname()` masque le header sur
  `/login` ; la déconnexion réutilise la server action existante.

## État d'avancement honnête

- **Fait et vérifié** (types + build verts, rendu testé) : auth complète,
  dashboard avec recherche/filtres/état vide, header commun avec
  déconnexion, visionneuses fiche et projet, SSG préservé.
- **En attente** : test local sur le port 3007 et commit (sur la machine de
  Clavel), déploiement `cours.velito.fr` (Vercel + env vars + liste
  blanche).
- **Le vrai manque** : le contenu. 6 fiches de révision (compta, cours) et
  2 fiches projet — l'usine à fiches doit tourner sur les autres projets
  (mabb, hub, vea, vena, arena, interactive).

## Prochaines étapes

1. Tester en local (recherche, filtres, déconnexion) puis commit.
2. Déployer sur `cours.velito.fr` avec la liste blanche en prod.
3. Passer `PROMPT_FICHES.md` dans les conversations des autres projets
   pour alimenter le stock de fiches.
4. Utiliser l'outil au quotidien quelques semaines avant toute couche B.
