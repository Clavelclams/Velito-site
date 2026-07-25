---
titre: "Les fonctions : des machines qui transforment"
parcours: "javascript"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Hier tu as appris à ranger des valeurs dans des boîtes. Aujourd'hui : les **fonctions**, les machines qui transforment ces valeurs.

Une fonction, c'est une machine à café. Tu mets quelque chose en entrée (une capsule), la machine fait son travail, et elle te rend quelque chose en sortie (un café). En code :

```js
// "function" = je fabrique une machine nommée "doubler"
// "n" = le paramètre : le nom de ce qui entre dans la machine
function doubler(n) {
  return n * 2; // "return" = ce qui SORT de la machine
}

doubler(5);  // j'appelle la machine avec 5 → elle renvoie 10
doubler(21); // → 42
```

Trois mots à maîtriser :

- **Paramètre** : le nom de la valeur attendue en entrée (`n` dans la définition).
- **Argument** : la valeur réelle qu'on envoie à l'appel (`5`, `21`).
- **`return`** : la valeur renvoyée. Sans `return`, la fonction renvoie `undefined` — elle a travaillé, mais n'a rien rendu.

Point crucial : définir une fonction ne l'exécute PAS. La machine est posée sur le comptoir, elle attend. C'est l'appel avec des parenthèses `doubler(5)` qui la fait tourner. `doubler` (sans parenthèses) désigne la machine elle-même ; `doubler(5)` la fait fonctionner.

Ton fichier `lib/progression.ts` est rempli de machines comme ça :

```ts
export function marquerFicheLue(slug: string): number {
  // ... entrée : un slug de fiche · sortie : le nombre d'XP gagnés
  return XP_FICHE_LUE;
}
```

Entrée : le slug. Sortie : un nombre d'XP. Machine à café, exactement.

Maintenant, la deuxième écriture, que tu vois PARTOUT dans ton code React : la **fonction fléchée** (arrow function). C'est la même machine, écrite plus court :

```js
// Version classique
function doubler(n) {
  return n * 2;
}

// Version fléchée : on range la machine dans une variable
const doubler = (n) => {
  return n * 2;
};

// Version fléchée COURTE : sans accolades, le résultat est renvoyé
// automatiquement (return implicite)
const doubler = (n) => n * 2;
```

Lis la flèche comme « donne » : « n donne n fois 2 ». Le raccourci sans accolades est ultra-courant : dès que le corps tient sur une expression, pas besoin de `return` ni d'accolades.

Tu en as déjà écrit sans le savoir. Dans `RechercheFiches.tsx` :

```ts
const rafraichir = () => setProgression(chargerProgression());
```

C'est une machine sans entrée (parenthèses vides) qui, quand on l'appelle, exécute `setProgression(...)`. Et dans `QuizFiche.tsx` :

```ts
setBonnesReponses((n) => n + 1);
```

Ici on passe une fonction fléchée EN ARGUMENT d'une autre fonction : « prends la valeur actuelle `n`, donne `n + 1` ». Une fonction est une valeur comme une autre en JavaScript — on peut la ranger dans une variable, la passer en argument. C'est déroutant au début, mais c'est le cœur du langage, et tout React repose dessus.

Une fonction peut avoir plusieurs paramètres, séparés par des virgules :

```js
const additionner = (a, b) => a + b;
additionner(20, 30); // → 50
```

Regarde `enregistrerQuiz(slug, score, total)` dans ta progression : trois entrées, une sortie (l'XP gagnée). Tu sais maintenant lire sa signature.

## À retenir

- Une fonction = une machine : des entrées (paramètres), un traitement, une sortie (`return`).
- Définir une fonction ne l'exécute pas ; ce sont les parenthèses de l'appel qui l'exécutent.
- Sans `return`, une fonction renvoie `undefined`.
- `(n) => n * 2` est une fonction fléchée avec return implicite : « n donne n fois 2 ».
- Une fonction est une valeur : on peut la stocker dans une variable et la passer en argument — React repose là-dessus.

## Mise en pratique

Dans la console du navigateur (F12) :

1. Fabrique une machine : `function doubler(n) { return n * 2 }` puis Entrée. **Résultat attendu :** `undefined` (normal : définir n'exécute rien).
2. Appelle-la : `doubler(21)`. **Résultat attendu :** `42`.
3. Tape `doubler` sans parenthèses. **Résultat attendu :** la console t'affiche la fonction elle-même — la machine, pas son résultat.
4. Version fléchée : `const tripler = (n) => n * 3` puis `tripler(10)`. **Résultat attendu :** `30`.
5. Piège du return : `function saluer(nom) { console.log("Salut " + nom) }` puis `const r = saluer("Clavel")` puis `r`. **Résultat attendu :** « Salut Clavel » s'affiche, mais `r` vaut `undefined` — afficher n'est pas renvoyer.
6. Recode une vraie fonction à toi : `const calculerXp = (score, total) => score * 10 + (score === total ? 20 : 0)` puis `calculerXp(4, 4)` et `calculerXp(3, 4)`. **Résultat attendu :** `60` puis `30`. C'est le barème exact de `enregistrerQuiz` dans ton `lib/progression.ts` — ouvre-le et compare.
