---
titre: "Statique ou dynamique : quand ta page est construite, et le bug du J−230"
parcours: "react-nextjs"
ordre: 6
niveau: "solide"
duree: 30
date: 2026-09-09
---

## Le cours

Une page Next.js peut être générée à deux moments : **au build** (une fois, sur Vercel, quand tu déploies) ou **à la requête** (à chaque visite). Le choix est fait par Next.js selon ce que ta page utilise, et ne pas le savoir produit des bugs invisibles — tu en as eu un.

**Statique (SSG — Static Site Generation).** Si une page ne dépend de rien qui varie d'une requête à l'autre, Next la rend **au build** et stocke le HTML. Chaque visiteur reçoit ce fichier depuis le CDN, en quelques millisecondes, sans exécuter une ligne de code serveur. C'est le mode par défaut, et le plus rapide possible.

Ton dashboard cours est statique : il lit des `.md` sur le disque — le disque du build, qui ne change pas entre deux déploiements. Les pages de fiches aussi, grâce à :

```tsx
export function generateStaticParams() {
  return listerFiches().map((f) => ({ slug: f.slug }));
}
```

Cette fonction dit à Next : « voici toutes les valeurs de `[slug]` possibles, génère une page pour chacune ». 51 fiches → 51 fichiers HTML au build. Sans elle, Next ne saurait pas quelles pages générer et les rendrait à la demande.

**Dynamique (SSR — Server-Side Rendering).** Si une page utilise quelque chose qui **varie par requête**, Next bascule automatiquement en rendu à la demande. Ce qui déclenche la bascule :

- `cookies()`, `headers()` — lire la requête ;
- `searchParams` dans une page ;
- `fetch` avec `cache: "no-store"` ;
- `export const dynamic = "force-dynamic"` — explicite.

Le hub est dynamique : `NavBarSlot` appelle `createClient()` qui lit les cookies pour savoir qui est connecté. Impossible de pré-générer une page qui dépend du visiteur.

**Le bug du J−230, expliqué avec ce modèle.** Le dashboard faisait :

```tsx
const joursRestants = Math.ceil((DATE_JURY.getTime() - Date.now()) / 86_400_000);
```

`Date.now()` ne déclenche **pas** la bascule dynamique — ce n'est pas une lecture de requête, c'est juste l'horloge. Donc la page est restée statique, `Date.now()` a été évalué **une fois, au build du 14 août**, et le HTML contenait `J−230` figé jusqu'au déploiement suivant. La règle : **toute valeur qui dépend de « maintenant » ne peut pas vivre dans du HTML statique.** Trois solutions, dans l'ordre de coût :

1. Calculer **côté client** dans un `useEffect` (ce qui a été fait) : la page reste statique, le navigateur calcule avec sa propre horloge.
2. `export const revalidate = 3600` : ISR (*Incremental Static Regeneration*), la page est régénérée au plus toutes les heures. Statique mais rafraîchie.
3. `force-dynamic` : rendu à chaque requête. Le plus coûteux — ici, relire 120 fichiers Markdown pour afficher un nombre.

**Le cache de `fetch`.** Dans un Server Component, `fetch()` est mis en cache par défaut au build, comme le reste. `fetch(url, { cache: "no-store" })` désactive et rend la page dynamique. `fetch(url, { next: { revalidate: 60 } })` garde le cache 60 secondes. Le piège : oublier que ton `fetch` vers une API est figé au build, et voir des données périmées en prod pendant des jours.

**Le piège du layout.** Si tu lis les cookies dans `layout.tsx` racine, **toutes** les pages deviennent dynamiques, y compris celles qui pourraient être statiques. C'est pour ça que `EnTete` est un Client Component qui lit l'état côté navigateur, plutôt qu'un Server Component qui lirait les cookies dans le layout — le choix a préservé le SSG de tout le site.

**Comment savoir.** Après `next build`, le terminal affiche un tableau : `○` (statique), `●` (SSG avec params), `ƒ` (dynamique). Regarde-le à chaque build. Une page que tu croyais statique marquée `ƒ`, c'est une lecture de cookies ou un `no-store` qui a fuité quelque part.

## À retenir

- Statique = généré au build, servi par CDN, le défaut. Dynamique = à chaque requête, déclenché par cookies/headers/searchParams/no-store.
- `generateStaticParams` liste les valeurs d'un segment dynamique à pré-générer.
- `Date.now()` ne rend pas dynamique : il est figé au build. → `useEffect`, `revalidate`, ou `force-dynamic`.
- Lire les cookies dans le layout racine rend tout le site dynamique.
- Le tableau `○ ● ƒ` de `next build` est ta vérité.

## Mise en pratique

Objectif : reproduire le bug du J−230, le voir dans le tableau de build, et le corriger de deux façons.

1. `cd "C:\Users\Velito Adventure\Documents\Velito-site"` puis `npx turbo run build --filter=cours`. Lis le tableau final : repère `/` et `/fiches/[slug]`. Note leur symbole.
2. Dans `app/page.tsx`, ajoute en haut du composant : `const heure = new Date().toLocaleTimeString("fr-FR");` et affiche `{heure}` quelque part. `npm run build` (toujours `--filter=cours`), puis `npm run start --filter=cours`. Ouvre `localhost:3007`, recharge cinq fois : l'heure ne change pas. Tu as reproduit le bug.
3. Correction 1 : `export const revalidate = 10;` en haut du fichier. Rebuild, start, recharge après 15 s : l'heure a changé. Le tableau de build montre maintenant un temps de revalidation.
4. Correction 2 : retire `revalidate`, crée `app/components/Heure.tsx` en Client Component avec `useState<string|null>(null)` + `useEffect` qui met l'heure. Place `<Heure />` dans la page. Rebuild : la page est redevenue `○` statique, et l'heure est juste. C'est le motif de `CompteARebours`.
5. Rends tout dynamique par accident : dans `app/layout.tsx`, ajoute `import { cookies } from "next/headers"` et `await cookies()` dans le composant (rends-le `async`). Rebuild : **toutes** les pages passent `ƒ`. Retire. C'est le piège du layout.
6. Retire `Heure` et `heure` de la page. Rebuild une dernière fois pour vérifier que tout est revenu `○`/`●`.

Résultat attendu : tu lis le tableau de build, tu sais ce qui rend une page dynamique, et tu as trois façons de traiter une donnée qui dépend du temps.
