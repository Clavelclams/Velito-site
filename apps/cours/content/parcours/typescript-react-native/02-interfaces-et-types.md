---
titre: "Interfaces et types : lire src/types/pirb.ts comme un plan d'architecte"
parcours: "typescript-react-native"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais déjà créer des objets en JavaScript : `{ prenom: "Léa", points: 12 }`. Le problème : rien ne garantit leur forme. Un écran attend `joueuse.prenom`, quelqu'un envoie `joueuse.nom`... et ça casse à l'exécution. La réponse de TypeScript : l'**interface**, un contrat qui décrit la forme exacte d'un objet.

```ts
interface Joueuse {
  prenom: string;      // obligatoire, du texte
  numeroMaillot: number; // obligatoire, un nombre
}

const lea: Joueuse = { prenom: "Léa", numeroMaillot: 7 }; // OK
const bug: Joueuse = { prenom: "Léa" }; // ERREUR : numeroMaillot manque
```

Une interface ne « fait » rien : elle disparaît au build (leçon 1). C'est une promesse vérifiée par le compilateur.

Ton fichier `src/types/pirb.ts` est exactement ça : 440 lignes qui décrivent TOUTES les données de Pirb. Lis le vrai `JoueurProfil` :

```ts
export interface JoueurProfil {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance: string;            // date ISO "YYYY-MM-DD"
  poste: PosteBasket | null;        // on verra le "| null" en leçon 3
  club: { id: number; nom: string }; // un objet imbriqué, décrit sur place
  // ...
}
```

`export` rend l'interface importable ailleurs : c'est pour ça que `useAsyncData`, les services et les écrans peuvent tous parler du même `JoueurProfil`. Remarque `club` : une interface peut contenir un objet décrit directement entre accolades.

Deuxième outil : le **type alias**, mot-clé `type`. Pour les objets, c'est quasi équivalent à `interface`. Mais il permet une chose que l'interface ne fait pas : nommer une liste de valeurs autorisées. Toujours dans `pirb.ts` :

```ts
export type PosteBasket = 'Meneuse' | 'Arrière' | 'Ailière' | 'Ailière forte' | 'Pivot';
```

Lis le `|` comme « ou » : un `PosteBasket` est l'une de ces cinq chaînes, rien d'autre. Écrire `poste = 'Gardienne'` est refusé à la compilation. Le commentaire du fichier le dit : « champ libre côté serveur, on borne côté app » — le type documente une règle métier.

Troisième motif que tu croises dans ce fichier : `Record<Cle, Valeur>`, un objet-dictionnaire dont on décrit le type des clés et des valeurs :

```ts
export const ZONE_LIBELLES: Record<ZoneTir, string> = {
  raquette: 'Raquette',
  // ... une entrée OBLIGATOIRE pour chacune des 8 zones
};
```

Si une zone est ajoutée au type `ZoneTir` et oubliée ici, TypeScript hurle. Le type force l'exhaustivité.

Pourquoi ce fichier est la clé de ton app : son commentaire d'en-tête dit que les types sont « calqués sur les structures RÉELLES du backend Symfony ». `StatsSaison` reproduit la sortie exacte de `JoueurStatsAggregator::statsSaison()` côté serveur. Autrement dit, `pirb.ts` est le **contrat entre l'app mobile et l'API** : si les deux respectent ces formes, le passage du mock à l'API réelle ne change rien dans les écrans. C'est un argument d'architecture que tu dois savoir dérouler au jury — et on le développera en leçon 5.

Réflexe à prendre dès maintenant : quand tu ne comprends pas un écran de Pirb, commence par lire l'interface des données qu'il affiche. La forme des données explique presque toujours le code.

## À retenir

- Une interface décrit la forme exacte d'un objet : propriétés, types, imbrications. Elle est vérifiée à la compilation puis effacée.
- `type X = 'a' | 'b' | 'c'` borne une valeur à une liste finie : impossible de passer autre chose (ex. `PosteBasket`, `ZoneTir`).
- `Record<Cle, Valeur>` type un dictionnaire et force l'exhaustivité des clés (ex. `ZONE_LIBELLES`).
- `src/types/pirb.ts` est le contrat mobile ↔ backend Symfony : mêmes formes des deux côtés, donc zéro écran à réécrire au branchement de l'API.
- Pour comprendre un écran, je lis d'abord l'interface de ses données : c'est la documentation la plus fiable du projet.

## Mise en pratique

Dans ton projet Pirb, ouvre `src/types/pirb.ts` :

1. Lis l'interface `StatsSaison` (vers la ligne 47) et explique à voix haute chaque propriété de `moyennes` et `totaux` : quel type, et ce qu'elle représente au basket.
2. Prédis : dans `moyennes`, peut-on écrire `points: "12,4"` (avec des guillemets) ? Vérifie ta réponse en lisant le type déclaré.
3. Trouve l'interface `Badge` et son type `AxeBadge`. Compte combien d'axes de badges existent dans l'app et cite-les de mémoire ensuite.
4. Petite modification sans risque : dans `ZONE_LIBELLES`, change le libellé `'Mi-distance'` en `'Mi-distance (test)'`, puis lance `npm run typecheck`. Résultat attendu : aucune erreur — tu as changé une VALEUR, pas une clé ni un type.
5. Maintenant supprime temporairement la ligne entière `mi_distance: 'Mi-distance (test)',` et relance `npm run typecheck`. Résultat attendu : une erreur signalant que la propriété `mi_distance` manque dans le `Record<ZoneTir, string>` — c'est l'exhaustivité forcée. Restaure la ligne d'origine (`'Mi-distance'`) et vérifie que le typecheck repasse.
