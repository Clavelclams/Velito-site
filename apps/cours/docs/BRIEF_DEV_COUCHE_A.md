# Brief développeur — Finir la couche A de `cours.velito.fr`

> À coller tel quel dans une session de dev (Claude ou humain). Ce document est
> **autoportant** : tout le contexte nécessaire est dedans (arbo, conventions,
> API données, tokens, commandes, périmètre). Ne pas explorer au hasard.

---

## 0. Contexte en 30 secondes

`cours.velito.fr` est un **outil interne, privé, gratuit**. Deux usages : (1) la
révision perso de Clavel pour le titre **CDA** (jury avril 2027), (2) plus tard,
aider des jeunes en décrochage scolaire (couche B, **hors périmètre ici**).

La **couche A** = un site qui affiche des **fiches Markdown** (révision + suivi
projet) avec un dashboard, une auth par liste blanche, et des visionneuses. Elle
est **presque finie**. Ce brief couvre les **dernières briques** pour qu'elle
soit propre et utilisable au quotidien. **On ne construit ni quiz, ni
gamification, ni mascotte, ni éditeur** — c'est la couche B, plus tard.

---

## 1. Stack & emplacement

- **Monorepo Turborepo** : `Velito-site/`. L'app vit dans `apps/cours/`.
- **Next.js 16 (App Router, Server Components)** + **Tailwind CSS** + **Supabase**
  (auth uniquement pour l'instant ; le contenu, lui, n'est **pas** en base).
- Packages partagés du monorepo : `@repo/ui`, `@repo/eslint-config`,
  `@repo/typescript-config`. Ne pas les casser.
- **Port dev : 3007.**
- Contenu = **fichiers Markdown** lus au build/serveur via `gray-matter` +
  rendus par `react-markdown`. **Pas de base de données pour les fiches.**

---

## 2. Arborescence de `apps/cours/` (ce qui existe déjà)

```
apps/cours/
├─ app/
│  ├─ layout.tsx              → RootLayout (lang=fr, <body bg-cours-bg>). PAS de header pour l'instant.
│  ├─ page.tsx                → Dashboard : compte à rebours J−jury, projets (barres), fiches groupées par projet.
│  ├─ globals.css             → @tailwind + styles Markdown (.fiche-contenu). Typo déjà stylée.
│  ├─ login/                  → écran de connexion (auth Supabase).
│  ├─ fiches/[slug]/page.tsx  → visionneuse d'une fiche de révision (badges bloc/projet/thèmes + Markdown). DÉJÀ POLIE.
│  └─ projets/[slug]/page.tsx → visionneuse d'une fiche projet (barre d'avancement + Markdown). DÉJÀ POLIE.
├─ lib/
│  ├─ fiches/fiches.ts        → SEULE couche d'accès aux données (fs + gray-matter). Voir §4.
│  └─ supabase/               → clients Supabase (repris de l'app compta).
├─ content/
│  ├─ fiches/                 → 1 fichier .md = 1 concept de révision.
│  └─ projets/                → 1 fichier .md = 1 projet (mis à jour, jamais dupliqué).
├─ middleware.ts              → auth "default-deny" + liste blanche COURS_EMAILS_AUTORISES. NE PAS TOUCHER.
├─ tailwind.config.ts         → tokens couleur `cours.*` (voir §5).
├─ .env.example               → NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / COURS_EMAILS_AUTORISES.
├─ PROMPT_FICHES.md           → le prompt qui génère les .md (format frontmatter). Voir §4.
└─ README.md                  → explique le système "usine à fiches".
```

---

## 3. Ce qui est DÉJÀ fait (ne pas refaire)

- **Auth** : `middleware.ts` verrouille tout par défaut, redirige vers `/login`,
  et refuse (403) tout email hors `COURS_EMAILS_AUTORISES`. **Ne pas modifier.**
- **Dashboard** (`app/page.tsx`) : compte à rebours J−jury (`DATE_JURY`
  = 2027-04-01), compteur de fiches par bloc CDA, liste des projets avec barres
  d'avancement, fiches groupées par projet.
- **Page fiche** (`fiches/[slug]`) : lien retour « ← Toutes les fiches »,
  header avec badges (bloc / projet / thèmes) + source, rendu Markdown.
  `generateStaticParams()` pour le SSG. **C'est déjà propre.**
- **Page projet** (`projets/[slug]`) : lien retour « ← Dashboard », titre +
  statut, **barre d'avancement**, date de MAJ, rendu Markdown. **Déjà propre.**
- **Typo Markdown** : `globals.css` style déjà h2/h3/p/ul/ol/code/pre/blockquote
  via la classe `.fiche-contenu`. Ne pas ajouter `@tailwindcss/typography`.

---

## 4. La couche données — `lib/fiches/fiches.ts` (à connaître par cœur)

C'est la **seule** porte d'accès au contenu. Elle utilise `fs` → **server-only**
(ne jamais l'importer dans un composant client `"use client"`).

**Exports :**

```ts
listerFiches(): FicheMeta[]        // toutes les fiches de révision (métadonnées, sans le corps)
getFiche(slug): Fiche | null       // une fiche + son contenu Markdown
listerProjets(): ProjetMeta[]      // toutes les fiches projet (métadonnées)
getProjet(slug): Projet | null     // une fiche projet + son contenu
```

**Interfaces :**

```ts
interface FicheMeta {
  slug: string;
  titre: string;
  projet: string;          // ex. "compta", "interactive", "venaball"
  bloc: 1 | 2 | 3;         // bloc CDA
  themes: string[];        // ex. ["sécurité", "SQL"]
  source?: string;         // fichier source dans le repo (optionnel)
  date: string;            // AAAA-MM-JJ
}
interface Fiche extends FicheMeta { contenu: string }   // contenu = Markdown brut

interface ProjetMeta {
  slug: string;
  titre: string;
  avancement: number;      // 0–100
  statut: string;          // "en cours" | "en prod" | "en pause" | "terminé"
  maj: string;             // AAAA-MM-JJ
}
interface Projet extends ProjetMeta { contenu: string }
```

**Sécurité déjà en place** : garde anti path-traversal sur le slug
(`/^[a-z0-9-]+$/`). La conserver si tu ajoutes un accès par slug.

**Format des fichiers Markdown** (frontmatter YAML strict — cf. `PROMPT_FICHES.md`) :

Fiche de révision (`content/fiches/<projet>-<concept>.md`) :
```markdown
---
titre: "Le concept en une phrase"
projet: "compta"
bloc: 1
themes: ["sécurité", "RLS"]
source: "apps/compta/sql/01_schema_noyau.sql"
date: 2026-07-10
---
## Contenu Markdown…
```

Fiche projet (`content/projets/<projet>.md`) :
```markdown
---
titre: "Velito Compta"
avancement: 70
statut: "en prod"
maj: 2026-07-12
---
## Contenu Markdown…
```

> Règle : un frontmatter non conforme = fiche mal affichée. Ne pas changer les
> noms de champs sans mettre à jour `fiches.ts` ET `PROMPT_FICHES.md`.

---

## 5. Tokens Tailwind (`tailwind.config.ts` → `colors.cours`)

Utiliser **uniquement** ces classes `cours-*`. Ne pas introduire de couleurs en
dur (`text-gray-500`, `#333`…). DA = « carnet d'étude », fond clair.

| Classe            | Hex       | Usage                              |
|-------------------|-----------|------------------------------------|
| `cours-bg`        | `#F8F8FC` | fond de page                       |
| `cours-surface`   | `#FFFFFF` | cartes                             |
| `cours-border`    | `#E5E4F0` | bordures, séparateurs              |
| `cours-text`      | `#1A1A1A` | texte principal                    |
| `cours-text-muted`| `#5B5A6E` | texte secondaire                   |
| `cours-accent`    | `#4F46E5` | accent (indigo), liens actifs      |
| `cours-accent-hover`| `#4338CA`| hover accent                       |
| `cours-bloc1`     | `#0E7490` | Bloc 1 · Développer (cyan)         |
| `cours-bloc2`     | `#7C3AED` | Bloc 2 · Concevoir (violet)        |
| `cours-bloc3`     | `#B45309` | Bloc 3 · Déployer (ambre)          |

Noms de blocs (déjà définis dans `page.tsx`) :
`{1:"Bloc 1 · Développer", 2:"Bloc 2 · Concevoir", 3:"Bloc 3 · Déployer"}`.

---

## 6. LES TÂCHES (le vrai travail à faire)

### Tâche 1 — Recherche + filtres sur le dashboard *(priorité haute)*
Aujourd'hui les fiches sont juste groupées par projet. Dès qu'il y en aura 20+,
c'est illisible. Ajouter en haut du dashboard :
- un **champ de recherche** texte qui filtre les fiches par `titre` et `themes` ;
- des **filtres** par **bloc** (1/2/3) et par **projet** (valeurs tirées de
  `listerFiches()`, pas codées en dur) ;
- un **état vide** clair quand aucun résultat (« Aucune fiche ne correspond »).

Contrainte technique : `fiches.ts` est server-only. Donc soit tu charges la liste
côté serveur puis passes les métadonnées (`FicheMeta[]`, sans le `contenu`) à un
petit composant client pour le filtrage, soit tu filtres via searchParams. La
première option (composant client qui reçoit `FicheMeta[]` en props) est la plus
simple et garde `fs` hors du client. Le filtrage se fait sur les **métadonnées
uniquement** — pas besoin du corps Markdown.

### Tâche 2 — Header commun *(priorité haute)*
`layout.tsx` n'a aucun header : chaque page a son propre lien retour bricolé.
Ajouter un **header persistant** dans le layout : logo/titre « Velito Cours »
cliquable → `/`, et un lien/bouton **Déconnexion** (réutiliser le flux Supabase
de l'app `compta` ; ne pas réinventer l'auth). Garder les liens retour des pages
de détail (ils restent utiles), mais le header donne une nav globale.

### Tâche 3 — Vérifs finales *(obligatoire avant de rendre)*
- `npm run check-types` passe **sans erreur**.
- `npm run build` passe.
- `npm run dev` → dashboard OK, recherche/filtres OK, une fiche et un projet
  s'ouvrent et s'affichent correctement.

---

## 7. Commandes (depuis la racine `Velito-site/`)

```bash
npm install                          # à la racine — indispensable pour lier les @repo/*
npm run dev  --workspace apps/cours  # ou : cd apps/cours && npm run dev  (port 3007)
npm run check-types --workspace apps/cours
npm run build --workspace apps/cours
```

> ⚠️ Si `check-types` remonte des dizaines d'erreurs « Cannot find module
> '@repo/...' », ce ne sont PAS de vrais bugs : c'est que les liens du workspace
> sont cassés. Lancer `npm install` **à la racine** du monorepo les répare.

---

## 8. Conventions & garde-fous

- **Commentaires et libellés UI en français.**
- **Server Components par défaut** ; `"use client"` uniquement pour
  l'interactivité (le filtre de recherche). Ne jamais importer `lib/fiches`
  (fs) dans un composant client.
- **Ne pas ajouter de base de données.** Le contenu reste en Markdown.
  Toute lecture de contenu passe par `lib/fiches/fiches.ts`.
- **Ne pas toucher** à `middleware.ts` ni au flux d'auth.
- **Couleurs** : exclusivement les tokens `cours-*`. Zéro couleur en dur.
- **Pas de nouvelle dépendance** sans raison forte (surtout pas
  `@tailwindcss/typography` : la typo Markdown est déjà gérée à la main).
- **Commit/push depuis la machine de Clavel**, pas depuis un sandbox (les fichiers
  peuvent y être lus tronqués). Message de commit en français, concis.

---

## 9. HORS PÉRIMÈTRE (ne pas faire ici)

- Quiz / QCM / texte à trous, XP, séries, mascotte → **couche B**, plus tard.
- Éditeur no-code pour créer des fiches sans passer par une conversation Claude
  → couche B, étape 2.
- Aide aux devoirs par IA → couche B, étape 3.
- App mobile / PWA / natif → couche B, étape 4.
- Contenu « matières scolaires » (maths, français…) → viendra avec la couche B.

Référence complète de la vision : `docs/CDC_COURS_VELITO.md` (à la racine du repo).

---

## 10. Définition de « terminé »

1. Dashboard avec recherche + filtres (bloc, projet) + état vide.
2. Header commun avec retour accueil + déconnexion.
3. `check-types` et `build` verts, app testée en local sur le port 3007.
4. Rien de la couche B n'a été commencé.
