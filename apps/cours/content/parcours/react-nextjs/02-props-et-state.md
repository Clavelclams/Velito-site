---
titre: "Props et state : ce qu'un composant reçoit, ce qu'il retient"
parcours: "react-nextjs"
ordre: 2
niveau: "debutant"
duree: 25
date: 2026-09-09
---

## Le cours

Un composant qui affiche toujours la même chose ne sert à rien. Deux mécanismes lui donnent de la vie : les **props** (ce qu'on lui passe de l'extérieur) et le **state** (ce qu'il retient de l'intérieur).

**Les props sont les paramètres de la fonction.** Rien de plus. `<BadgeNiveau niveau="debutant" />` appelle `BadgeNiveau({ niveau: "debutant" })`. Les attributs JSX deviennent les clés d'un objet, reçu en premier argument. En TypeScript on le type :

```tsx
interface Props {
  niveau: string;
  gros?: boolean;      // le ? = optionnel
}

export default function BadgeNiveau({ niveau, gros = false }: Props) {
  return <span className={gros ? "text-base" : "text-xs"}>{niveau}</span>;
}
```

Le `{ niveau, gros = false }` est du *destructuring* (parcours JavaScript, leçon 6) : on extrait les clés de l'objet, avec une valeur par défaut. Regarde `apps/cours/app/components/ListeLecons.tsx` : `{ lecons }: { lecons: LeconMeta[] }` — le composant reçoit un tableau de leçons et les affiche.

**Règle absolue : les props sont en lecture seule.** Un composant ne modifie jamais ce qu'il reçoit. Si `ListeLecons` faisait `lecons.push(...)`, il modifierait le tableau du parent — et React ne le saurait pas, donc rien ne se réafficherait. Les données descendent, du parent vers l'enfant. C'est le *flux unidirectionnel*, et c'est ce qui rend React prévisible.

**Le state est ce que le composant retient entre deux rendus.** Un composant est une fonction : à chaque rendu, elle est réexécutée du début, ses variables locales sont recréées. Si tu écris `let ouvert = false` puis `ouvert = true` au clic, le prochain rendu repart avec `false`. Il faut un mécanisme qui **survit** aux rendus : `useState`.

```tsx
"use client";
import { useState } from "react";

export default function Accordeon({ titre, children }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div>
      <button onClick={() => setOuvert(!ouvert)}>{titre}</button>
      {ouvert && <div>{children}</div>}
    </div>
  );
}
```

`useState(false)` retourne une paire : la valeur actuelle et une fonction pour la changer. Appeler `setOuvert(true)` fait deux choses : stocke la nouvelle valeur, et **demande à React de réexécuter le composant**. Au rendu suivant, `useState` retourne `true`. C'est la seule façon de déclencher un réaffichage. Modifier une variable normale ne réaffiche rien.

Le `"use client"` en haut est obligatoire : `useState` n'existe que dans les Client Components (leçon 5). Retiens-le pour l'instant comme une règle : **un composant qui utilise un hook (`use…`) commence par `"use client"`.**

**`children` est une prop spéciale.** Ce qui est écrit entre `<Accordeon>` et `</Accordeon>` arrive dans `props.children`. C'est ce qui permet d'écrire des composants « enveloppe » : une carte, un layout, un accordéon, sans savoir ce qu'ils contiendront.

**Faire remonter une information.** Les props descendent. Comment un enfant prévient-il son parent ? En recevant une **fonction** en prop et en l'appelant :

```tsx
// Parent
const [filtre, setFiltre] = useState("");
<BarreRecherche onChange={setFiltre} />

// Enfant
function BarreRecherche({ onChange }) {
  return <input onChange={(e) => onChange(e.target.value)} />;
}
```

L'enfant ne connaît pas le state du parent, il appelle juste `onChange`. C'est exactement ce que fait `RechercheFiches.tsx` : un `useState` pour le texte tapé, un `<input onChange>`, et un `.filter()` sur les fiches reçues en props. Le state est dans le composant, les données viennent des props.

**Où mettre le state ?** Au niveau le plus bas qui en a besoin — mais si deux composants frères ont besoin de la même information, le state monte dans leur parent commun, qui le redistribue en props. On appelle ça *lift state up*. Si tu te retrouves à passer une prop à travers cinq niveaux qui ne l'utilisent pas, c'est le moment de penser à un Context (hors programme, mais sache que ça existe).

## À retenir

- Props = paramètres de la fonction, en lecture seule, typés avec une interface.
- State = `useState`, la seule mémoire qui survit aux rendus et le seul déclencheur de réaffichage.
- Un hook (`useState`, `useEffect`…) ⇒ `"use client"` en première ligne.
- `children` = ce qu'on écrit entre les balises du composant.
- L'enfant prévient le parent en appelant une fonction reçue en prop.

## Mise en pratique

Objectif : ajouter un state à ton `BadgeNiveau` et le faire communiquer avec son parent.

1. Reprends `apps/cours/app/components/BadgeNiveau.tsx`. Ajoute `"use client"` en ligne 1 et un `useState` : au clic sur le badge, il alterne entre le libellé court (`"deb"`) et long (`"debutant"`). Vérifie dans le navigateur que ça bascule.
2. Type les props avec une interface `Props { niveau: string; onClic?: () => void }`. Appelle `onClic` s'il existe, au clic : `onClic?.()`.
3. Dans `app/parcours/[techno]/page.tsx`, ce composant est un Server Component (pas de `"use client"`) — tu ne peux pas y mettre de `useState`. Crée donc `app/components/CompteurClics.tsx` en Client Component avec un state `n`, qui rend `<BadgeNiveau niveau="test" onClic={() => setN(n + 1)} />` et affiche `Cliqué {n} fois`. Place `<CompteurClics />` dans la page.
4. Ouvre `RechercheFiches.tsx`. Repère : le `useState` du texte, l'`onChange` de l'input, le `.filter()`. Réponds par écrit : où est le state ? D'où viennent les fiches ? Pourquoi le composant ne modifie-t-il jamais le tableau `fiches` ?
5. Casse : dans `CompteurClics`, remplace `const [n, setN] = useState(0)` par `let n = 0` et `setN(n+1)` par `n = n + 1`. Clique : rien ne bouge. Tu viens de vivre « une variable normale ne déclenche pas de rendu ». Remets `useState`.
6. Supprime `CompteurClics` de la page.

Résultat attendu : tu distingues props et state, tu sais où les mettre, et tu as vu pourquoi seul `setState` réaffiche.
