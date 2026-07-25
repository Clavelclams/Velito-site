---
titre: "Unions, optionnels et null : pourquoi ton code est plein de « | null » et de « ?. »"
parcours: "typescript-react-native"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

En leçon 2, tu as vu `PosteBasket = 'Meneuse' | 'Arrière' | ...`. Ce `|` s'appelle une **union** : « l'un OU l'autre ». Elle ne sert pas qu'aux listes de chaînes — son usage le plus important dans Pirb, c'est de dire honnêtement qu'une donnée peut être absente.

Regarde `JoueurProfil` dans `src/types/pirb.ts` :

```ts
poste: PosteBasket | null;     // une joueuse peut ne pas avoir de poste défini
numeroMaillot: number | null;  // ni de numéro
photoUrl: string | null;       // ni de photo
```

`| null` n'est pas un détail technique : c'est une règle métier écrite dans le type. Et TypeScript la fait respecter : si tu écris `profil.poste.toUpperCase()`, il refuse de compiler — « poste est peut-être null ». Il t'OBLIGE à traiter le cas absent avant d'utiliser la valeur. C'est ça, la null-safety : le fameux crash JavaScript `Cannot read property of null` devient une erreur de compilation.

Encore plus parlant, `pourcentages` dans `StatsSaison` :

```ts
pourcentages: {
  tirs2: number | null; // null quand AUCUN tir tenté (même règle que le serveur)
  tirs3: number | null;
  lf: number | null;
};
```

Le commentaire du fichier explique le choix : null si aucun tir tenté. Pourquoi pas `0` ? Parce que 0 % voudrait dire « elle a tout raté », alors que null veut dire « elle n'a pas tenté ». Confondre les deux serait un mensonge statistique — le type interdit cette confusion. Même logique dans `CritereBilan` : « null = non évalué. Ce n'est PAS un zéro ».

Deuxième notation : le point d'interrogation. Dans `StatsSaison` :

```ts
saison?: string; // propriété OPTIONNELLE : peut ne pas exister du tout
```

Nuance avec `| null` : `poste: PosteBasket | null` = la propriété existe toujours, sa valeur peut être null. `saison?: string` = la propriété peut carrément être absente de l'objet (le serveur ne l'envoie pas encore). À la lecture, les deux se traitent pareil : vérifier avant d'utiliser.

Pour vérifier sans s'alourdir, TypeScript (et le JavaScript moderne) offre deux opérateurs que ton code utilise partout :

```ts
// ?. : "optional chaining" — si c'est null/undefined, renvoie undefined au lieu de crasher
const nomClub = profil.equipe?.nom; // string | undefined

// ?? : "nullish coalescing" — valeur de repli si null/undefined
const source = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock'; // src/services/data/index.ts
```

La deuxième ligne est réelle : la factory de ta couche données dit « si la variable d'environnement est absente, pars sur le mock ». Un `??` = une décision par défaut, documentée dans le code.

Dernier exemple, subtil et réel : dans `src/components/EcranHorsLigne.tsx`, l'état réseau `isInternetReachable` peut valoir `true`, `false`... ou `null` (« le système ne s'est pas encore prononcé »). Le code ne bascule hors-ligne que sur un `false` explicite :

```ts
const horsLigne = reseau.isConnected === false || reseau.isInternetReachable === false;
```

Si on avait testé `!reseau.isInternetReachable`, le `null` du démarrage aurait été traité comme « pas de réseau » et l'écran hors-ligne aurait clignoté à chaque ouverture. Trois états ≠ deux états : c'est l'union qui te force à y penser.

## À retenir

- `| null` dans un type est une règle métier : la donnée peut légitimement être absente, et TypeScript m'oblige à gérer ce cas avant de compiler.
- null ≠ 0 : dans Pirb, un pourcentage null veut dire « aucun tir tenté », pas « 0 % de réussite » — le type empêche le mensonge statistique.
- `prop?: T` = propriété qui peut ne pas exister ; `prop: T | null` = propriété toujours là mais parfois nulle. Les deux se vérifient avant usage.
- `?.` lit une valeur peut-être nulle sans crasher ; `??` fournit une valeur de repli (ex. `?? 'mock'` dans la factory de données).
- Certaines données ont TROIS états (`true | false | null`) : comparer explicitement (`=== false`) évite de traiter « pas encore su » comme « non ».

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre `src/types/pirb.ts` et liste à voix haute, dans l'interface `Convocation`, toutes les propriétés qui contiennent `| null`. Pour chacune, explique ce que null signifie côté métier (aide-toi des commentaires : `reponse: null` = « pas encore répondu »).
2. Dans `RencontreConvocation`, la propriété `date` est `string | null`. Prédis : que doit afficher l'écran des convocations quand `date` vaut null ? Vérifie ton intuition avec le commentaire du fichier (« le staff n'a pas encore posé la date »).
3. Ouvre `src/services/data/index.ts` et lis la ligne `const source = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';`. Explique ce que vaut `source` si la variable d'environnement n'est pas définie, et pourquoi ce défaut est un bon choix pour une démo sans réseau.
4. Ouvre `src/components/EcranHorsLigne.tsx` et lis la ligne du `const horsLigne = ...`. Explique pourquoi le code compare avec `=== false` au lieu d'écrire `!reseau.isInternetReachable` (le commentaire d'en-tête du fichier te donne la réponse — reformule-la avec tes mots).
5. Test dans l'éditeur (sans rien lancer) : dans `src/types/pirb.ts`, retire temporairement `| null` de `photoUrl: string | null;` puis regarde les fichiers qui s'ouvrent en erreur (ou lance `npm run typecheck`). Résultat attendu : les mocks ou services qui assignent `null` à `photoUrl` passent au rouge — la chaîne de vérification remonte toute seule. Remets `| null` et vérifie que tout redevient vert.
