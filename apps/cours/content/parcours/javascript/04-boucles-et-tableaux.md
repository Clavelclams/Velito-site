---
titre: "Tableaux et boucles : gérer des listes"
parcours: "javascript"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-25
---

## Le cours

Jusqu'ici, une variable contenait UNE valeur. Mais ton site gère des LISTES : la liste des fiches lues, la liste des questions d'un quiz. En JavaScript, une liste s'appelle un **tableau** (array) :

```js
const fichesLues = ["intro-react", "les-props", "le-state"];
```

Des crochets, des valeurs séparées par des virgules. C'est exactement le type du champ `fichesLues` dans ton `lib/progression.ts` : un tableau de slugs.

Chaque élément a une position, son **index** — et attention, ça commence à **0** :

```js
fichesLues[0];      // "intro-react" (le premier !)
fichesLues[2];      // "le-state"
fichesLues[3];      // undefined (n'existe pas)
fichesLues.length;  // 3 (le nombre d'éléments)
```

Le dernier élément est donc à l'index `length - 1`. Ce décalage explique des lignes de ton code : dans `QuizFiche.tsx`, `indexQuestion + 1 >= questions.length` se lit « la question affichée est-elle la dernière ? ». Et l'affichage `{indexQuestion + 1} / {questions.length}` ajoute 1 parce que l'humain compte à partir de 1, pas la machine.

Quelques opérations de base :

```js
const liste = ["a", "b"];
liste.push("c");        // ajoute à la fin → ["a", "b", "c"]
liste.includes("b");    // true : est-ce que "b" est dedans ?
liste.indexOf("c");     // 2 : à quelle position ?
```

Subtilité `const` : `liste.push(...)` fonctionne même si `liste` est `const`. Pourquoi ? `const` scelle la BOÎTE (tu ne peux pas remplacer le tableau par un autre), pas le CONTENU du tableau. Ton code fait ça : `p.fichesLues.push(slug)` dans `marquerFicheLue`. Et `includes`, tu l'as aussi : `if (p.fichesLues.includes(slug)) return 0;` — « si la fiche est déjà lue, pas d'XP ».

Maintenant les **boucles** : répéter une action pour chaque élément. La boucle classique `for` :

```js
for (let i = 0; i < fichesLues.length; i++) {
  console.log(fichesLues[i]);
}
```

Lis-la en trois temps : « pars de `i = 0` ; continue tant que `i < length` ; ajoute 1 à `i` après chaque tour » (`i++` veut dire `i = i + 1`). Le corps s'exécute une fois par valeur de `i` : 0, 1, 2.

Cette forme est puissante mais verbeuse. Quand tu veux juste parcourir les éléments, il y a **`for...of`** :

```js
for (const slug of fichesLues) {
  console.log(slug); // slug prend chaque valeur, une par tour
}
```

Ton `RechercheFiches.tsx` l'utilise : `for (const f of fichesFiltrees) { ... }` pour regrouper les fiches par projet. Lis-le « pour chaque fiche f de la liste filtrée... ».

Le `for` classique reste utile quand tu as besoin de l'index ou d'un ordre spécial. La preuve dans ton propre `QuizFiche.tsx`, le mélange des questions :

```ts
for (let i = indices.length - 1; i > 0; i--) {
  // part de la FIN (length - 1), descend jusqu'à 1 (i--)
}
```

C'est l'algorithme de Fisher-Yates : il parcourt le tableau à l'envers pour mélanger. Impossible avec `for...of` — il faut contrôler l'index.

Dernier réflexe : une boucle infinie (condition jamais fausse) gèle le programme. Si ta console se fige, c'est souvent ça — vérifie que ta condition finit par devenir fausse.

## À retenir

- Un tableau `[a, b, c]` stocke une liste ordonnée ; les index commencent à 0, le dernier est à `length - 1`.
- `push` ajoute, `includes` teste la présence, `length` compte.
- `const` sur un tableau interdit de remplacer le tableau, pas de modifier son contenu.
- `for (const x of liste)` parcourt les éléments ; le `for (let i = 0; ...)` classique sert quand on a besoin de l'index.
- L'affichage « question 2/8 » de ton quiz, c'est `index + 1` : la machine compte depuis 0, l'humain depuis 1.

## Mise en pratique

Dans la console du navigateur (F12) :

1. Crée un tableau : `const fiches = ["intro-react", "les-props", "le-state"]`. Tape `fiches[0]` puis `fiches.length` puis `fiches[fiches.length - 1]`. **Résultat attendu :** `"intro-react"`, `3`, `"le-state"`.
2. Tape `fiches[3]`. **Résultat attendu :** `undefined` — pas d'erreur, juste « rien ici ».
3. Ajoute : `fiches.push("le-jsx")` puis `fiches`. **Résultat attendu :** le tableau a 4 éléments, malgré le `const`. Redis pourquoi à voix haute.
4. Teste : `fiches.includes("les-props")` puis `fiches.includes("inconnu")`. **Résultat attendu :** `true` puis `false`.
5. Boucle classique : `for (let i = 0; i < fiches.length; i++) { console.log(i, fiches[i]) }`. **Résultat attendu :** 4 lignes, numérotées de 0 à 3.
6. Même chose en `for...of` : `for (const f of fiches) { console.log(f) }`. **Résultat attendu :** les 4 slugs, sans les numéros.
7. Bonus lecture : ouvre `app/components/QuizFiche.tsx`, trouve la boucle `for (let i = indices.length - 1; i > 0; i--)` et dis à voix haute : d'où part `i`, où s'arrête-t-il, et pourquoi ce n'est pas faisable en `for...of`.
