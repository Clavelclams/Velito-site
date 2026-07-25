---
titre: "Les variables : les boîtes qui gardent tes données"
parcours: "javascript"
ordre: 1
niveau: "debutant"
duree: 15
date: 2026-07-25
---

## Le cours

Tout programme, même ton site de cours ou ton app Pirb, ne fait que trois choses : il garde des données quelque part, il les transforme, et il les affiche. Aujourd'hui on s'occupe du « garder quelque part » : les variables.

Une variable, c'est une boîte avec une étiquette. Tu ranges quelque chose dedans, et plus tard tu la retrouves grâce à son nom. En JavaScript, tu crées une boîte avec `const` ou `let` :

```js
const prenom = "Clavel"; // une boîte "prenom" qui contient le texte "Clavel"
let xp = 0;              // une boîte "xp" qui contient le nombre 0
```

La différence entre les deux est simple et tu dois pouvoir la dire au jury sans hésiter :

- `const` = la boîte est **scellée**. Tu ne pourras jamais y remettre autre chose. Si tu essaies `prenom = "Autre"`, JavaScript refuse avec une erreur.
- `let` = la boîte est **ouverte**. Tu peux remplacer son contenu : `xp = 50` fonctionne.

Le réflexe pro : `const` par défaut, `let` seulement quand tu sais que la valeur va changer. Regarde ton propre fichier `lib/progression.ts` : tout en haut, `const XP_FICHE_LUE = 20`. C'est un barème, il ne doit jamais bouger en cours de route — donc `const`. Ce n'est pas un hasard, c'est un choix.

Tu croiseras aussi `var` dans de vieux tutos : c'est l'ancienne façon, on ne l'utilise plus. Si tu vois `var`, c'est du code d'avant 2015.

Maintenant, qu'est-ce qu'on peut mettre dans une boîte ? JavaScript a quelques **types** de base :

```js
const titre = "Ma fiche";   // string : du texte, entre guillemets
const score = 4;            // number : un nombre (entier ou décimal, même type)
const termine = false;      // boolean : vrai ou faux, rien d'autre
let resultat;               // undefined : déclaré mais rien dedans
const rien = null;          // null : "volontairement vide"
```

La nuance `undefined` / `null` : `undefined` = « personne n'a encore rien mis dans la boîte », `null` = « quelqu'un a mis exprès la valeur vide ». Dans ton `QuizFiche.tsx`, `choixFait` démarre à `null` : c'est un choix volontaire pour dire « pas encore répondu ».

Dernier outil du jour : la **concaténation** et les **template literals** (littéraux de gabarit). Pour fabriquer du texte à partir de variables :

```js
const jours = 5;
// Ancienne façon : coller des morceaux avec +
const message1 = "Série de " + jours + " jours";
// Façon moderne : backticks ` et ${...} pour injecter une variable
const message2 = `Série de ${jours} jours`;
```

Les backticks (`` ` ``, AltGr+7 sur ton clavier), tu les as déjà dans ton code : dans `progression.ts`, la fonction `aujourdhui()` fabrique la date avec `` `${d.getFullYear()}-${mois}-${jour}` ``. Tu comprends maintenant chaque symbole de cette ligne.

Pour vérifier le type d'une valeur, il y a `typeof` :

```js
typeof "Clavel"; // "string"
typeof 42;       // "number"
typeof true;     // "boolean"
```

C'est tout pour aujourd'hui. Une boîte, un nom, un contenu, un type. Tout le reste du parcours est construit là-dessus.

## À retenir

- Une variable est une boîte nommée qui contient une valeur.
- `const` = non réassignable, `let` = réassignable ; réflexe pro : `const` par défaut.
- Les types de base : string (texte), number (nombre), boolean (vrai/faux), undefined (rien encore), null (vide volontaire).
- Les backticks `` `Texte ${variable}` `` injectent une variable dans du texte : c'est un template literal.
- `var` existe mais est obsolète : on ne l'écrit plus.

## Mise en pratique

Dans la console du navigateur (F12, onglet Console) — n'importe quelle page fait l'affaire :

1. Crée une constante : tape `const prenom = "Clavel"` puis Entrée. Puis tape `prenom` seul : la console affiche `"Clavel"`.
2. Essaie de la modifier : `prenom = "Test"`. **Résultat attendu :** une erreur rouge `TypeError: Assignment to constant variable`. C'est `const` qui te protège.
3. Crée `let xp = 0`, puis `xp = 50`, puis `xp`. **Résultat attendu :** `50` — la boîte `let` accepte le changement.
4. Tape `typeof prenom`, `typeof xp`, `typeof true`. **Résultat attendu :** `"string"`, `"number"`, `"boolean"`.
5. Fabrique une phrase : `` `J'ai ${xp} XP` ``. **Résultat attendu :** `"J'ai 50 XP"`.
6. Bonus lecture : ouvre `lib/progression.ts` dans ton projet `apps/cours` et regarde les lignes `export const XP_FICHE_LUE = 20;` etc. Dis à voix haute pourquoi c'est `const` et pas `let`.
