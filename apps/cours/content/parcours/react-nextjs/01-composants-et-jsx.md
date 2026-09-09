---
titre: "Composants et JSX : une fonction qui rend du HTML"
parcours: "react-nextjs"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Tout ce que tu vois sur `cours.velito.fr`, `arena.velito.fr` ou `hub.velito.fr` est fait de **composants React**. Un composant est une idée simple qu'on complique souvent : **c'est une fonction JavaScript qui retourne du HTML**.

```tsx
function Bonjour() {
  return <p>Bonjour Clavel</p>;
}
```

Ce `<p>…</p>` dans du JavaScript, c'est du **JSX**. Ce n'est pas du HTML — c'est une syntaxe que le compilateur transforme en appels de fonction (`React.createElement("p", null, "Bonjour Clavel")`). Tu n'as jamais besoin de voir cette forme, mais il faut savoir qu'elle existe, parce qu'elle explique les règles bizarres du JSX :

- **`className` au lieu de `class`**, `htmlFor` au lieu de `for` : parce que `class` et `for` sont des mots réservés en JavaScript.
- **Un seul élément racine** : une fonction retourne une valeur, pas deux. Si tu veux deux éléments côte à côte, tu les enveloppes dans un fragment `<>…</>`.
- **Les accolades `{}` ouvrent une parenthèse JavaScript** : `<p>{2 + 2}</p>` affiche 4, `<p>{fiche.titre}</p>` affiche la propriété. Tout ce qui est entre accolades est évalué comme du JS.
- **Les balises se ferment toujours** : `<img />`, `<br />`, pas `<img>`.

Regarde un vrai composant de ton site, `apps/cours/app/components/CompteARebours.tsx`, réduit à l'essentiel :

```tsx
export default function CompteARebours() {
  const jours = 204;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-cours-accent to-cours-bloc2 px-6 py-4 text-center text-white">
      <p className="text-2xl font-bold">J−{jours}</p>
      <p className="text-xs uppercase">avant le jury</p>
    </div>
  );
}
```

Trois choses à voir : c'est une fonction (`function CompteARebours`), elle est **exportée** (`export default`) pour être utilisable ailleurs, et elle retourne un arbre JSX avec une variable insérée (`{jours}`). Les `className` sont du Tailwind — tu les connais du parcours HTML & CSS.

**Utiliser un composant = écrire son nom comme une balise.** Dans `apps/cours/app/page.tsx` :

```tsx
import CompteARebours from "@/app/components/CompteARebours";

export default function DashboardPage() {
  return (
    <div>
      <h1>Tableau de bord</h1>
      <CompteARebours />
    </div>
  );
}
```

La majuscule est obligatoire : `<compteARebours />` serait interprété comme une balise HTML inconnue. `<CompteARebours />` est reconnu comme un composant. Le `@/` est un alias configuré dans `tsconfig.json` qui pointe vers la racine de l'app — ça évite les `../../../`.

**La composition, c'est tout React.** Une page est un composant qui contient des composants qui contiennent des composants. `DashboardPage` contient `CompteARebours`, `ProgressionDashboard`, `RechercheFiches`. Chacun est petit, fait une chose, et peut être testé et réutilisé seul. Quand tu ouvres un fichier `.tsx` de 400 lignes, c'est un composant qui aurait dû être découpé.

**Les conditions et les listes en JSX.** Deux motifs que tu verras partout :

```tsx
{quiz && <QuizFiche questions={quiz.questions} />}        // affiche si quiz existe
{fiches.map((f) => <CarteFiche key={f.slug} fiche={f} />)} // une carte par fiche
```

Le premier utilise `&&` : si `quiz` est `null`, l'expression vaut `null` et React n'affiche rien. Le second transforme un tableau de données en tableau d'éléments. Le `key` est obligatoire dans une liste : React s'en sert pour savoir quel élément est lequel quand la liste change. Utilise un identifiant stable (`slug`, `id`), jamais l'index du tableau.

## À retenir

- Un composant = une fonction qui retourne du JSX. Majuscule obligatoire.
- JSX ≈ HTML, avec `className`, un seul élément racine, `{}` pour du JS.
- On compose : une page = des composants imbriqués, chacun petit.
- `{cond && <X />}` pour afficher sous condition, `.map()` + `key` pour les listes.

## Mise en pratique

Objectif : lire un vrai composant de ton site, puis en écrire un de zéro.

1. Ouvre `apps/cours/app/components/EnTete.tsx` dans VS Code. Repère : la fonction exportée, le JSX retourné, chaque `{…}`. Note sur papier ce que chaque accolade affiche.
2. Ouvre `apps/cours/app/page.tsx`. Liste tous les composants utilisés (les balises avec majuscule). Pour chacun, trouve le fichier correspondant via l'`import` en haut.
3. Crée `apps/cours/app/components/BadgeNiveau.tsx` :
   ```tsx
   export default function BadgeNiveau({ niveau }: { niveau: string }) {
     return <span className="rounded-full border px-2 py-0.5 text-xs">{niveau}</span>;
   }
   ```
   (Les `{ niveau }: { niveau: string }` sont les props typées — leçon 2.)
4. Utilise-le : dans `app/parcours/[techno]/page.tsx`, importe-le et place `<BadgeNiveau niveau="debutant" />` à côté du titre. Lance `npm run dev --filter=cours` depuis la racine, ouvre `localhost:3007/parcours/sql`. Le badge apparaît.
5. Casse-le exprès : retire le `return`, ou écris `class=` au lieu de `className=`. Lis l'erreur dans le terminal et dans le navigateur. Remets. Ces deux erreurs, tu les reverras.
6. Supprime `BadgeNiveau` de la page (garde le fichier pour la leçon 2).

Résultat attendu : tu sais lire n'importe quel `.tsx` de ton monorepo comme une fonction qui rend du HTML, et tu as écrit ton premier composant.
