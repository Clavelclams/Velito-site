---
titre: "Conditions et comparaisons : le code qui décide"
parcours: "javascript"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais stocker (leçon 1) et transformer (leçon 2). Aujourd'hui, ton code apprend à **décider** : « SI le quiz est fini, affiche le score, SINON affiche la question suivante ». C'est le `if`.

```js
const score = 4;
const total = 4;

if (score === total) {
  console.log("Sans faute !"); // exécuté seulement si la condition est vraie
} else {
  console.log("Presque..."); // exécuté sinon
}
```

Un `if` évalue ce qu'il y a entre parenthèses : si c'est `true`, il exécute le premier bloc ; sinon le bloc `else` (optionnel). Tu peux enchaîner avec `else if` pour tester plusieurs cas dans l'ordre.

Pour fabriquer ces `true`/`false`, on **compare** :

```js
5 > 3;    // true (plus grand)
5 <= 4;   // false (plus petit ou égal)
5 === 5;  // true (égal)
5 !== 3;  // true (différent)
```

Le point qui tombe à CHAQUE entretien : pourquoi trois signes `===` et pas deux `==` ? Les deux existent, mais ils ne font pas la même chose :

- `==` compare en **convertissant les types si besoin** : `5 == "5"` vaut `true`, car JavaScript transforme le texte `"5"` en nombre avant de comparer. Pratique ? Non : imprévisible. `0 == ""` vaut aussi `true`. Personne ne retient ces règles de conversion par cœur.
- `===` compare **valeur ET type**, sans conversion : `5 === "5"` vaut `false`, un nombre n'est pas un texte. Prévisible, toujours.

La règle pro est simple : **toujours `===` et `!==`, jamais `==` et `!=`**. Ouvre n'importe quel fichier de ton projet : dans `progression.ts` tu trouves `typeof window === "undefined"`, dans `QuizFiche.tsx` `choixFait !== null`. Zéro `==` nulle part. Au jury : « j'utilise l'égalité stricte pour éviter les conversions implicites de type ».

Deuxième notion : **truthy et falsy**. Un `if` accepte n'importe quelle valeur, pas seulement `true`/`false`. JavaScript la convertit alors en booléen. Six valeurs sont « falsy » (considérées fausses) : `false`, `0`, `""` (texte vide), `null`, `undefined`, `NaN`. **Tout le reste est truthy**, y compris `"0"`, `[]` et `{}`.

```js
const requete = "";
if (requete) {
  // pas exécuté : "" est falsy → "l'utilisateur n'a rien tapé"
}
```

Ton code s'en sert : dans `chargerProgression()`, la ligne `if (!brut) return VIDE;` se lit « si `brut` est vide/null (falsy), renvoie la progression vide ». Le `!` inverse : `!true` → `false`, `!brut` → « brut est falsy ».

Trois opérateurs pour combiner ou raccourcir :

```js
a && b   // ET : vrai si les deux sont vrais
a || b   // OU : vrai si au moins un est vrai
x ?? y   // "nullish coalescing" : x, SAUF si x est null/undefined → alors y
```

La nuance `||` vs `??` : `0 || 10` donne `10` (car `0` est falsy), mais `0 ?? 10` donne `0` (car `0` n'est ni null ni undefined). Ton code utilise `??` dans `progression.ts` : `precedent?.meilleurScore ?? 0` — « le meilleur score précédent, ou 0 s'il n'existe pas ».

Enfin, le **ternaire**, un if-else en une expression : `condition ? valeurSiVrai : valeurSiFaux`. Dans `QuizFiche.tsx` : `parfait ? "🏆" : "💪"`. Tu le liras partout dans du React.

## À retenir

- `if / else if / else` exécute un bloc selon qu'une condition est vraie ou fausse.
- `===` compare valeur ET type sans conversion ; `==` convertit d'abord (imprévisible). Règle : toujours `===`.
- Six valeurs falsy : `false`, `0`, `""`, `null`, `undefined`, `NaN` — tout le reste est truthy.
- `&&` = ET, `||` = OU, `!` = inverse, `??` = valeur de repli si null/undefined uniquement.
- `condition ? a : b` est un if-else compact (ternaire), omniprésent dans React.

## Mise en pratique

Dans la console du navigateur (F12) :

1. Compare : tape `5 == "5"` puis `5 === "5"`. **Résultat attendu :** `true` puis `false`. Explique la différence à voix haute.
2. Tape `0 == ""`. **Résultat attendu :** `true` — c'est exactement pourquoi on bannit `==`.
3. Teste les falsy : `Boolean("")`, `Boolean(0)`, `Boolean("0")`, `Boolean([])`. **Résultat attendu :** `false`, `false`, `true`, `true`. Les deux derniers surprennent tout le monde.
4. Écris un if complet :
   ```js
   const score = 3; const total = 4;
   if (score === total) { console.log("Parfait") }
   else if (score > total / 2) { console.log("Bien") }
   else { console.log("À revoir") }
   ```
   **Résultat attendu :** `"Bien"`. Change `score` en `4` puis `1` et vérifie les deux autres branches.
5. Teste `??` vs `||` : `0 || 10` puis `0 ?? 10`. **Résultat attendu :** `10` puis `0`. Redis la règle : `??` ne remplace que null/undefined.
6. Bonus lecture : ouvre `app/components/QuizFiche.tsx` et trouve la ligne `bonnesReponses > questions.length / 2 ? "💪" : "📚"`. Tu sais maintenant la lire : c'est le ternaire qui choisit l'emoji de l'écran de fin.
