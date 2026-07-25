---
titre: "map, filter, find, some : les outils qui font ton site"
parcours: "javascript"
ordre: 5
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Hier tu as parcouru des tableaux avec des boucles. Aujourd'hui, la version pro : les **méthodes de tableaux**. Au lieu d'écrire la boucle toi-même, tu dis au tableau CE que tu veux, et il fait la boucle pour toi. C'est la leçon la plus rentable du parcours : ton `RechercheFiches.tsx` est littéralement construit avec.

Le principe commun : chacune de ces méthodes prend une **fonction fléchée en argument** (leçon 2) et l'applique à chaque élément.

**`filter` — garder une partie.** Imagine un tamis : tu verses le tableau dedans, seuls les éléments qui passent le test restent.

```js
const notes = [12, 5, 17, 8, 15];
// "garde chaque note n telle que n >= 10"
const admis = notes.filter((n) => n >= 10); // → [12, 17, 15]
```

La fonction passée doit renvoyer `true` (je garde) ou `false` (je jette). Important : `filter` **renvoie un NOUVEAU tableau**, l'original n'est pas touché. C'est le cœur de ta recherche de fiches : `fiches.filter((f) => ...)` garde les fiches qui matchent les filtres actifs, sans jamais abîmer la liste complète.

**`map` — transformer chaque élément.** Une chaîne d'usine : chaque pièce entre, est transformée, ressort. Le tableau de sortie a TOUJOURS la même taille que l'entrée.

```js
const prix = [10, 20, 30];
const avecTva = prix.map((p) => p * 1.2); // → [12, 24, 36]

const slugs = ["intro", "props"];
const urls = slugs.map((s) => `/fiches/${s}`); // → ["/fiches/intro", "/fiches/props"]
```

Dans React, `map` sert à transformer une liste de données en liste d'affichage : dans `RechercheFiches.tsx`, `liste.map((fiche) => <li>...</li>)` transforme chaque fiche en ligne cliquable. Une donnée → un morceau d'écran.

**`find` — trouver LE premier qui correspond.** Comme `filter`, mais s'arrête au premier trouvé et renvoie **l'élément lui-même** (pas un tableau). S'il ne trouve rien : `undefined`.

```js
const notes = [12, 5, 17];
notes.find((n) => n > 10);  // → 12 (le premier, pas 17)
notes.find((n) => n > 20);  // → undefined
```

**`some` — au moins un ?** Renvoie juste `true` ou `false` : « est-ce qu'AU MOINS UN élément passe le test ? ».

```js
notes.some((n) => n < 10); // → true (le 5)
```

Ton code réel, dans le filtrage de recherche : `f.themes.some((t) => normaliser(t).includes(q))` — « est-ce qu'au moins un thème de la fiche contient le texte tapé ? ». (`includes` sur un texte teste « contient », comme sur un tableau.)

Le résumé à connaître par cœur :

| Méthode  | Question posée              | Renvoie                       |
|----------|-----------------------------|-------------------------------|
| `filter` | lesquels je garde ?         | un nouveau tableau (0 à n)    |
| `map`    | en quoi je transforme ?     | un nouveau tableau (taille n) |
| `find`   | le premier qui correspond ? | un élément ou `undefined`     |
| `some`   | au moins un correspond ?    | `true` / `false`              |

Et comme chacune renvoie quelque chose, on peut **chaîner** :

```js
const resultat = notes.filter((n) => n >= 10).map((n) => `${n}/20`);
// → ["12/20", "17/20", "15/20"] : d'abord le tamis, puis l'usine
```

C'est exactement le motif de ton `listerFiches()` dans `lib/fiches/fiches.ts` : `.filter(...)` (ne garder que les `.md`) puis `.map(...)` (transformer chaque fichier en métadonnées) puis `.sort(...)`.

## À retenir

- Ces méthodes prennent une fonction en argument et font la boucle à ta place.
- `filter` = tamis (garde ceux qui passent le test), `map` = usine (transforme chacun, même taille), `find` = le premier trouvé ou `undefined`, `some` = true/false « au moins un ».
- `filter` et `map` renvoient un NOUVEAU tableau : l'original n'est jamais modifié.
- On peut les chaîner : `liste.filter(...).map(...)` — motif omniprésent dans ton propre code.
- Dans React, `map` transforme des données en éléments d'affichage : une fiche → une ligne.

## Mise en pratique

Dans la console du navigateur (F12) :

1. Prépare : `const scores = [4, 8, 2, 10, 6]`.
2. Tamis : `scores.filter((s) => s >= 5)`. **Résultat attendu :** `[8, 10, 6]`. Vérifie ensuite que `scores` est intact.
3. Usine : `scores.map((s) => s * 10)`. **Résultat attendu :** `[40, 80, 20, 100, 60]` — 5 entrées, 5 sorties.
4. Prédiction AVANT de taper : que renvoie `scores.find((s) => s > 5)` ? Réfléchis, puis tape. **Résultat attendu :** `8` (le PREMIER qui dépasse 5, pas le plus grand).
5. `scores.some((s) => s === 10)` puis `scores.some((s) => s > 100)`. **Résultat attendu :** `true` puis `false`.
6. Chaîne les deux :
   ```js
   scores.filter((s) => s >= 5).map((s) => `${s}/10`)
   ```
   **Résultat attendu :** `["8/10", "10/10", "6/10"]`.
7. Bonus lecture : ouvre `app/components/RechercheFiches.tsx`, trouve le `.filter()` dans `fichesFiltrees` (vers la ligne 60) et explique à voix haute ce qu'il GARDE : quelles fiches survivent aux trois tests (bloc, projet, texte) ? Puis trouve le `.some()` juste en dessous et dis quelle question il pose.
