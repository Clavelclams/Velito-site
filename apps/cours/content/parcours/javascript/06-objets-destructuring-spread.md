---
titre: "Objets, destructuring, spread : les données de ton site"
parcours: "javascript"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Un tableau, c'est une liste. Mais comment représenter UNE fiche, avec son titre, son projet, sa date ? Avec un **objet** : une fiche cartonnée avec des champs étiquetés.

```js
const fiche = {
  titre: "Le state React",   // clé "titre" → valeur "Le state React"
  projet: "cours",
  bloc: 1,
};
```

Accolades, paires `clé: valeur` séparées par des virgules. Pour lire ou modifier un champ, le **point** :

```js
fiche.titre;        // "Le state React"
fiche.bloc = 2;     // modification (autorisée même avec const : la boîte
                    // est scellée, pas l'intérieur — comme les tableaux)
```

Ouvre `lib/progression.ts` : l'objet `VIDE` est exactement ça — un objet avec `xp`, `fichesLues`, `quiz`, `serie`. Et `serie` contient lui-même un objet : `{ jours: 0, derniereActivite: "" }`. Les objets s'imbriquent : `p.serie.jours` descend de deux niveaux. Toute la progression de ton site est UN objet comme ça, sauvegardé dans le navigateur.

Deux garde-fous quand un champ peut manquer :

```js
p.serie?.jours   // "optional chaining" : si p.serie est null/undefined,
                 // renvoie undefined au lieu de planter
```

Ton code s'en sert : `precedent?.meilleurScore ?? 0` — « le meilleur score du passage précédent s'il existe, sinon 0 ». Deux leçons combinées en une ligne (`?.` d'aujourd'hui, `??` de la leçon 3).

**Le destructuring** : extraire des champs d'un objet en une ligne, au lieu de répéter `objet.champ` :

```js
const { titre, projet } = fiche;
// équivaut à : const titre = fiche.titre; const projet = fiche.projet;
```

Tu l'utilises partout sans le savoir. Dans `lib/fiches/fiches.ts` : `const { data, content } = matter(brut);` — la bibliothèque renvoie un objet, on en extrait directement deux champs. Et dans TOUS tes composants React, les props arrivent comme ça : `function QuizFiche({ idQuiz, titre, questions })` — les accolades dans les paramètres, c'est du destructuring. On peut même donner une valeur par défaut : `{ slugsAvecQuiz = [] }` dans `RechercheFiches.tsx` — « si le champ manque, prends un tableau vide ».

**Le spread `...`** : étaler le contenu d'un objet ou d'un tableau dans un autre. Trois points, lis-les « tout ce qu'il y a dedans » :

```js
const meta = { titre: "Le state", bloc: 1 };
const fiche = { ...meta, contenu: "..." };
// → { titre: "Le state", bloc: 1, contenu: "..." } : copie de meta + un champ

const a = [1, 2];
const b = [...a, 3]; // → [1, 2, 3] : copie du tableau + un élément
```

Ton code réel, dernière ligne de `getFiche()` : `return { ...versMeta(slug, data), contenu: content };` — « toutes les métadonnées, plus le contenu ». Le spread sert à **copier en ajoutant**, sans modifier l'original — réflexe central en React, où on ne modifie jamais les données directement.

Dernier morceau : **JSON**, le format texte pour stocker ou envoyer un objet. Un objet vit en mémoire ; pour le mettre dans `localStorage` (le petit espace de stockage du navigateur, conservé même après fermeture), il faut le transformer en texte, puis le retransformer en objet à la lecture :

```js
JSON.stringify({ xp: 50 }); // → le TEXTE '{"xp":50}'
JSON.parse('{"xp":50}');    // → l'OBJET { xp: 50 }
```

C'est le duo exact de ta progression : `sauvegarder()` fait `localStorage.setItem(CLE, JSON.stringify(p))`, et `chargerProgression()` fait `JSON.parse(brut)`. Aller-retour objet ↔ texte.

## À retenir

- Un objet `{ cle: valeur }` regroupe des champs nommés ; on y accède avec le point, et ils peuvent s'imbriquer.
- `obj?.champ` évite le plantage si l'objet est null/undefined (optional chaining).
- Le destructuring `const { a, b } = obj` extrait des champs ; c'est la syntaxe des props React.
- Le spread `{ ...obj, extra: 1 }` copie un objet en ajoutant/écrasant des champs, sans toucher l'original.
- `JSON.stringify` (objet → texte) et `JSON.parse` (texte → objet) : le duo qui fait vivre ton localStorage.

## Mise en pratique

Ouvre TON site de cours dans le navigateur, puis la console (F12) — on va lire ta vraie progression :

1. Tape `localStorage.getItem("velito-cours-progression-v1")`. **Résultat attendu :** un long TEXTE JSON (ta progression brute). C'est la clé `CLE` définie dans `lib/progression.ts`.
2. Transforme-le en objet : `const p = JSON.parse(localStorage.getItem("velito-cours-progression-v1"))` puis `p`. **Résultat attendu :** un objet dépliable avec `xp`, `fichesLues`, `quiz`, `serie`.
3. Navigue dedans : `p.xp`, `p.serie.jours`, `p.fichesLues.length`. **Résultat attendu :** tes vrais chiffres.
4. Destructure : `const { xp, serie } = p` puis `xp` puis `serie.derniereActivite`. **Résultat attendu :** les mêmes valeurs, extraites en une ligne.
5. Spread : `const copie = { ...p, xp: 9999 }` puis `copie.xp` puis `p.xp`. **Résultat attendu :** `9999` puis ton vrai XP — la copie est modifiée, l'original intact. (Rien n'est sauvegardé : tu n'as pas touché localStorage.)
6. Dans VS Code, ouvre `lib/progression.ts` : trouve `JSON.stringify` dans `sauvegarder()` et `JSON.parse` dans `chargerProgression()`. Explique à voix haute l'aller-retour objet ↔ texte. Puis ouvre `lib/fiches/fiches.ts` ligne finale de `getFiche()` et lis le spread `{ ...versMeta(slug, data), contenu: content }` : que contient l'objet renvoyé ?
