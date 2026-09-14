---
titre: "App Router : le système de fichiers est ton routeur"
parcours: "react-nextjs"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Dans Next.js, tu ne déclares pas tes routes dans un fichier de configuration. **L'arborescence du dossier `app/` est le routeur.** Chaque dossier est un segment d'URL, chaque `page.tsx` est une page.

Regarde `apps/cours/app/` :

```
app/
├── page.tsx                      → /
├── layout.tsx                    → enveloppe TOUTES les pages
├── login/page.tsx                → /login
├── fiches/[slug]/page.tsx        → /fiches/arena-elo-poules-equilibrees
├── parcours/page.tsx             → /parcours
├── parcours/[techno]/page.tsx    → /parcours/sql
└── parcours/[techno]/[lecon]/page.tsx → /parcours/sql/01-cest-quoi-une-base-de-donnees
```

**Les fichiers spéciaux.** Next.js reconnaît des noms précis dans chaque dossier :

- `page.tsx` — le contenu de la route. Sans lui, le dossier n'est pas une page (il peut servir juste à regrouper).
- `layout.tsx` — une enveloppe partagée par toutes les pages du dossier **et de ses sous-dossiers**. Le `layout.tsx` racine contient `<html>` et `<body>`. Un layout **ne se réaffiche pas** quand on navigue entre ses pages : c'est ce qui rend le header `EnTete` persistant sans clignotement.
- `loading.tsx` — affiché pendant le chargement de la page. `error.tsx` — affiché si la page plante. `not-found.tsx` — pour les 404.
- `route.ts` — un endpoint d'API, pas une page (exporte `GET`, `POST`…). C'est ce qu'utilise `arena/app/api/export/[token]/route.ts`.

**Les segments dynamiques : `[slug]`.** Un dossier entre crochets capture n'importe quelle valeur. `/fiches/[slug]/page.tsx` reçoit la valeur dans ses `params` :

```tsx
export default async function FichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fiche = getFiche(slug);
  if (!fiche) notFound();
  /* … */
}
```

Deux détails de Next.js 15+ : `params` est une **Promise** (il faut `await`), et la fonction est `async`. Le `notFound()` déclenche la page 404 — sans `return` après, Next s'en occupe.

Deux segments dynamiques imbriqués (`[techno]/[lecon]`) donnent deux clés dans `params`. Un segment `[...slug]` (*catch-all*) capture tout le reste du chemin dans un tableau — utile pour une doc à profondeur variable.

**La navigation : `<Link>`, jamais `<a>`.** Pour aller d'une page à l'autre **dans** l'app :

```tsx
import Link from "next/link";
<Link href={`/fiches/${fiche.slug}`}>{fiche.titre}</Link>
```

`<Link>` intercepte le clic et fait une navigation **côté client** : pas de rechargement complet, le layout reste, seul le contenu change, et Next a déjà pré-chargé la page cible quand le lien est entré dans le viewport. Un `<a href>` classique rechargerait toute la page et perdrait l'état client. Réserve `<a>` aux liens **externes** (c'est ce que fait `NavBar.tsx` du hub pour le lien vers `cours.velito.fr` : autre domaine, donc `<a>`).

**Pour naviguer depuis du code** (après un formulaire, par exemple) : `redirect("/")` côté serveur, `useRouter().push("/")` côté client.

**Les groupes de routes `(nom)`.** Un dossier entre parenthèses ne crée pas de segment d'URL — il sert à regrouper des pages sous un même layout sans changer leurs chemins. `app/(admin)/tournois/page.tsx` répond sur `/tournois`, pas sur `/(admin)/tournois`. Tu n'en as pas encore, mais c'est comme ça qu'on donne un layout différent à la partie publique et à la partie admin d'une app.

**Colocation.** Tu peux mettre n'importe quel fichier dans `app/` — composants, styles, tests. Seuls les noms réservés (`page`, `layout`…) deviennent des routes. C'est pourquoi `app/components/` existe sans créer de route `/components` : pas de `page.tsx` dedans.

## À retenir

- Dossier = segment d'URL, `page.tsx` = page, `layout.tsx` = enveloppe persistante.
- `[slug]` capture une valeur, disponible dans `params` (une Promise à `await`).
- `<Link>` pour l'interne (navigation client, sans rechargement), `<a>` pour l'externe.
- `route.ts` = endpoint d'API. `(groupe)` = organisation sans URL.
- Tout ce qui n'est pas un nom réservé peut vivre dans `app/` sans devenir une route.

## Mise en pratique

Objectif : ajouter une vraie route à ton site cours, avec un segment dynamique et un layout.

1. Crée `apps/cours/app/themes/page.tsx` : une page qui liste tous les thèmes distincts des fiches (utilise `listerFiches()` de `@/lib/fiches/fiches` et un `Set` sur `f.themes`). Chaque thème est un `<Link href={`/themes/${theme}`}>`. Ouvre `localhost:3007/themes`.
2. Crée `apps/cours/app/themes/[theme]/page.tsx` : reçoit `params`, filtre les fiches dont `themes` contient la valeur, les affiche. Si aucune, `notFound()`. Teste avec un thème existant puis un inventé.
3. Crée `apps/cours/app/themes/layout.tsx` qui rend `<div className="mx-auto max-w-3xl"><h1>Par thème</h1>{children}</div>`. Navigue entre `/themes` et `/themes/tests` : le titre reste, seul le contenu change.
4. Remplace un `<Link>` par un `<a>` dans la liste, clique : observe le rechargement complet (l'onglet clignote, le header se remonte). Remets `<Link>`.
5. Dans `app/fiches/[slug]/page.tsx`, trouve `generateStaticParams`. Ajoute la même fonction à `themes/[theme]/page.tsx` pour que chaque page thème soit pré-générée au build (leçon 6 pour le pourquoi).
6. Garde ces pages : c'est une vraie fonctionnalité utile. Ajoute un lien « Par thème » dans `EnTete.tsx`.

Résultat attendu : tu sais créer une route, un segment dynamique et un layout, et tu ne confonds plus `<Link>` et `<a>`.
