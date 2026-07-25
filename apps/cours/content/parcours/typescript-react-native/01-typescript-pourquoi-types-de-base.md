---
titre: "TypeScript, pourquoi : des erreurs attrapées avant l'exécution"
parcours: "typescript-react-native"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

Ton app Pirb est écrite en TypeScript, ton site de cours aussi. Avant de lire une seule interface, il faut comprendre POURQUOI ce choix — parce que le jury te le demandera.

TypeScript, c'est JavaScript plus une chose : les types. Tout ce que tu as appris dans le parcours JavaScript (variables, fonctions, `map`, objets, `async/await`) marche à l'identique. La différence : TypeScript vérifie ton code AVANT de l'exécuter. En JavaScript, cette erreur explose au moment où l'utilisatrice ouvre l'écran :

```js
const joueuse = { prenom: "Léa" };
console.log(joueuse.prenmo); // undefined... faute de frappe découverte en prod
```

En TypeScript, la même faute est soulignée en rouge dans l'éditeur, avant même de lancer l'app : « la propriété `prenmo` n'existe pas ». Sur une app mobile, c'est vital : une fois publiée sur les stores, tu ne peux pas corriger un bug en cinq minutes comme sur un site web. Chaque erreur attrapée à la compilation est un crash évité chez une joueuse.

Concrètement, un type s'écrit après deux-points :

```ts
const prenom: string = "Léa";   // du texte
let points: number = 12;        // un nombre
let titulaire: boolean = true;  // vrai ou faux
```

Mais tu remarqueras que ton code Pirb n'écrit presque jamais ça. Pourquoi ? L'inférence : TypeScript devine le type tout seul.

```ts
const prenom = "Léa"; // TypeScript SAIT que c'est un string, sans qu'on lui dise
points = "douze";     // ERREUR : on ne range pas du texte dans un number
```

Règle pratique : on laisse TypeScript inférer quand c'est évident, et on écrit le type quand il apporte une information (paramètres de fonction, données qui viennent du réseau).

Important à dire au jury : TypeScript ne s'exécute jamais sur le téléphone. Au moment du build, les types sont vérifiés puis EFFACÉS — il ne reste que du JavaScript. Les types sont un filet de sécurité pour le développeur, pas un coût pour l'utilisatrice.

Ton projet a d'ailleurs une commande dédiée à cette vérification. Ouvre `package.json` à la racine de Pirb :

```json
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

`tsc` est le compilateur TypeScript ; `--noEmit` veut dire « vérifie tout, ne produis aucun fichier ». C'est ton contrôle qualité : si `npm run typecheck` passe, aucune faute de type ne traîne dans les ~30 fichiers de l'app. Tu retrouves aussi la dépendance `"typescript": "~5.9.2"` dans les `devDependencies` : dépendance de développement, car le téléphone n'en a pas besoin — preuve que les types disparaissent au build.

Dernier point de vocabulaire : les fichiers `.ts` contiennent du TypeScript pur (logique, services), les fichiers `.tsx` contiennent du TypeScript + du JSX (les composants React, comme `app/_layout.tsx`). C'est exactement la même distinction que `.js` / `.jsx` que tu connais déjà.

Dans les prochaines leçons, on va lire les vrais types de Pirb : tu verras que `src/types/pirb.ts` n'est pas du code qui « fait » quelque chose — c'est la description de toutes les données de ton app, et c'est la meilleure documentation du projet.

## À retenir

- TypeScript = JavaScript + types : les erreurs sont attrapées à l'écriture du code, pas à l'exécution chez l'utilisatrice.
- L'inférence : TypeScript devine le type d'une variable initialisée — on n'annote que quand ça apporte de l'information.
- Les types sont effacés au build : sur le téléphone, il ne tourne que du JavaScript, zéro coût en performance.
- `npm run typecheck` (`tsc --noEmit`) vérifie tout le projet sans rien produire — c'est mon contrôle qualité avant chaque commit.
- Crucial en mobile : une app publiée sur les stores ne se corrige pas en cinq minutes, chaque erreur évitée en amont compte double.

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre `package.json` et lis à voix haute la ligne `"typecheck": "tsc --noEmit"`. Explique ce que fait chaque partie (`tsc` ? `--noEmit` ?).
2. Lance `npm run typecheck` dans un terminal à la racine du projet. Résultat attendu : la commande se termine sans erreur (silence = tout est bien typé).
3. Ouvre `src/hooks/useAsyncData.ts` et repère la ligne `const [state, setState] = useState<AsyncState<T>>(...)`. Sans chercher à tout comprendre, note simplement que le type est écrit entre chevrons `< >` — on décortiquera ça en leçon 4.
4. Provoque une erreur volontaire : dans `useAsyncData.ts`, change temporairement `loading: true` en `loading: "oui"` dans le `useState`. Prédis à voix haute ce qui va se passer, puis relance `npm run typecheck`.
5. Résultat attendu : une erreur du genre `Type 'string' is not assignable to type 'boolean'`, SANS avoir lancé l'app. C'est exactement la promesse de TypeScript. Annule ta modification (Ctrl+Z) et relance `typecheck` pour vérifier que tout est redevenu propre.
