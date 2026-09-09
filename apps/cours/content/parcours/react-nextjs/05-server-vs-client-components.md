---
titre: "Server Components vs Client Components : la frontière qui change tout"
parcours: "react-nextjs"
ordre: 5
niveau: "intermediaire"
duree: 30
date: 2026-09-09
---

## Le cours

C'est la leçon la plus importante du parcours. Si tu ne comprends qu'une chose de Next.js, c'est celle-ci : **par défaut, tes composants tournent sur le serveur, et leur code n'est jamais envoyé au navigateur.**

**Deux mondes.** Dans `app/`, tout composant est un **Server Component** sauf s'il commence par `"use client"`. Un Server Component :

- s'exécute sur le serveur (au build ou à la requête, leçon 6) ;
- peut lire des fichiers, interroger une base, utiliser des secrets — parce qu'il **n'est jamais dans le navigateur** ;
- produit du HTML, envoyé au client ;
- **ne peut pas** avoir de state, d'effets, d'événements (`onClick`) — il n'y a personne pour cliquer sur un serveur.

Un **Client Component** (`"use client"` en première ligne) :

- est rendu une première fois sur le serveur (pour le HTML initial), puis **envoyé au navigateur** en JavaScript et « hydraté » (leçon 10) ;
- peut avoir `useState`, `useEffect`, `onClick`, lire `window` et `localStorage` ;
- **ne peut pas** importer `node:fs`, `gray-matter`, ou quoi que ce soit qui n'existe que côté serveur — sinon le build échoue ou, pire, ton secret part dans le bundle.

Regarde ton site cours. `app/page.tsx` (dashboard) est un Server Component : il appelle `listerFiches()` qui lit des `.md` sur le disque avec `node:fs`. Ce code ne quitte jamais Vercel. `RechercheFiches.tsx` est un Client Component : il a un `useState` pour le texte tapé et un `onChange`. Il **reçoit** les fiches en props — déjà lues par le serveur — et se contente de filtrer.

**La règle de composition.** Un Server Component peut contenir des Client Components (c'est le cas normal : la page serveur inclut la barre de recherche cliente). Un Client Component **ne peut pas importer un Server Component** — mais il peut en recevoir un via `children`. En pratique : **la frontière `"use client"` est contagieuse vers le bas**. Tout ce qu'un Client Component importe devient du code client.

C'est ce qui explique `lib/fiches/blocs.ts` : les constantes des blocs CDA (`NOMS_BLOCS`, `COULEURS_BLOCS`) ont été sorties de `fiches.ts` dans un fichier séparé **sans `fs`**, pour que `RechercheFiches` puisse les importer sans tirer `node:fs` dans le bundle client.

**`import type` efface l'import.** `RechercheFiches` a besoin du type `FicheMeta`, défini dans `fiches.ts` qui importe `fs`. Solution :

```tsx
import type { FicheMeta } from "@/lib/fiches/fiches";
```

Un `import type` disparaît à la compilation — TypeScript l'utilise pour vérifier, mais aucun code n'est émis. `fs` ne part pas dans le navigateur. **Toujours `import type` pour un type venant d'un module serveur.**

**Où placer la frontière.** Le réflexe est de mettre `"use client"` sur la page entière dès qu'on a besoin d'un clic. C'est une erreur : tu perds tout le bénéfice serveur (lecture directe des données, zéro JavaScript envoyé). La bonne pratique : **pousser `"use client"` le plus bas possible**, sur le plus petit composant qui a besoin d'interactivité. La page reste serveur, elle lit les données, et passe en props ce dont la petite île cliente a besoin.

`app/parcours/[techno]/[lecon]/page.tsx` est l'exemple parfait : page serveur qui lit le Markdown et le quiz, contient `<QuizFiche>` (client, interactif) et `<BoutonLeconFaite>` (client, un bouton). Deux petites îles dans une mer de HTML statique.

**Comment savoir dans quel monde je suis.** Trois tests :

- Le fichier commence par `"use client"` ? → client.
- Il est importé (pas via `children`) par un fichier `"use client"` ? → client, par contagion.
- Sinon → serveur.

Et deux erreurs qui te diront que tu t'es trompé de monde : `Module not found: Can't resolve 'fs'` (tu as tiré du serveur dans le client) et `useState is not a function` / `Hooks can only be called inside… ` (tu as mis un hook dans un Server Component).

**Ce que ça change pour la sécurité.** Un Server Component peut lire `process.env.SUPABASE_SERVICE_ROLE_KEY` : la valeur reste sur le serveur. Un Client Component ne voit que les variables préfixées `NEXT_PUBLIC_` (leçon 9). Si tu mets `"use client"` sur un fichier qui utilise un secret, le build échoue — ou pas, et le secret est dans ton JavaScript public. Le fait que la frontière soit explicite (`"use client"`) est ce qui rend ce risque visible.

## À retenir

- Par défaut = serveur. `"use client"` = navigateur. La frontière est contagieuse vers le bas.
- Serveur : données, fichiers, secrets, pas de hooks. Client : hooks, événements, `window`, pas de `fs`.
- `import type` pour prendre un type d'un module serveur sans tirer son code.
- Pousser `"use client"` le plus bas possible : petites îles interactives dans une page serveur.
- Un Client Component reçoit ses données en props (ou via `children`), il ne les lit pas lui-même.

## Mise en pratique

Objectif : franchir la frontière dans les deux sens, provoquer les deux erreurs, et restructurer un composant.

1. Ouvre `apps/cours/app/page.tsx`. Ajoute `"use client";` en première ligne. Lance le dev server : erreur `Can't resolve 'node:fs'` (ou similaire) — tu viens de tirer la couche de données dans le navigateur. Retire la ligne.
2. Ouvre `apps/cours/app/components/EnTete.tsx`. Retire `"use client"`. Erreur sur `usePathname` (un hook dans un Server Component). Remets.
3. Dans `RechercheFiches.tsx`, remplace `import type { FicheMeta }` par `import { FicheMeta }`. Selon la config, erreur de build ou warning : le module `fiches.ts` avec `fs` est tiré côté client. Remets `import type`.
4. Restructure : crée `app/components/CarteFiche.tsx` **sans** `"use client"` (serveur) qui rend une carte à partir d'une `FicheMeta`. Dans `RechercheFiches` (client), tu ne peux pas l'importer directement… Constate l'erreur, puis comprends pourquoi ce cas précis est mieux résolu en gardant `CarteFiche` client (elle n'a pas besoin du serveur) — ou en passant des cartes pré-rendues via `children`. Choisis, justifie en commentaire.
5. Lis `app/fiches/[slug]/page.tsx`. Liste les composants importés et classe-les : serveur ou client ? Vérifie en ouvrant chaque fichier. Explique pourquoi `BarreLecture` et `QuizFiche` sont clients et `ReactMarkdown` peut rester serveur.
6. Question de jury à rédiger en 5 lignes : « Pourquoi ne pas mettre `"use client"` partout ? » Utilise les mots : bundle, secrets, données, hydratation.

Résultat attendu : tu sais dans quel monde tourne chaque fichier, tu reconnais les deux erreurs de frontière, et tu places `"use client"` au bon endroit.
