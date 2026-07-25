---
titre: "Fonctions typées et génériques : comprendre useAsyncData<T>"
parcours: "typescript-react-native"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-25
---

## Le cours

Une fonction TypeScript se lit comme une fonction JavaScript, avec deux annotations en plus : le type de chaque paramètre, et le type de retour après la parenthèse fermante.

```ts
function scoreSeance(reussis: number): number {
  return reussis * 10; // la règle produit de Pirb : réussis × 10
}
```

Pour une fonction `async`, le retour est toujours une **Promise** — et on écrit ce qu'elle contiendra une fois résolue : `Promise<string>`, `Promise<JoueurProfil>`. Tu as déjà vu ça sans le savoir : dans `src/services/auth/session.ts`, `chargerSession(): Promise<void>` (« promesse qui ne rapporte rien, juste l'attente »).

Ces chevrons `< >` sont LA notation à maîtriser aujourd'hui : les **génériques**. Un générique, c'est un type à trou. La fonction dit « je travaille avec un type T, tu me diras lequel ». Exemple réel, dans `src/services/data/MockPirbDataService.ts` :

```ts
function simulerReseau<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), LATENCE_MS));
}
```

Lecture : « donne-moi une donnée de n'importe quel type T, je te rends une Promise du MÊME type T, 300 ms plus tard ». Appelée avec un `JoueurProfil`, elle renvoie `Promise<JoueurProfil>` ; avec un `Badge[]`, une `Promise<Badge[]>`. Une seule fonction, typée précisément pour chaque usage — sans générique, il aurait fallu la dupliquer ou renoncer à la sécurité des types.

Tu utilises des génériques depuis tes débuts React : `useState<T>`. Quand l'inférence suffit (`useState(true)`), pas besoin de préciser. Mais quand la valeur initiale ne dit pas tout, on remplit le trou à la main. Dans `src/hooks/useAsyncData.ts` :

```ts
const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
```

Sans le `<AsyncState<T>>`, TypeScript inférerait `data: null` pour toujours — impossible d'y ranger un profil plus tard. Le générique dit : « data pourra être un T ou null ».

Maintenant, lis le hook entier — c'est un générique de bout en bout :

```ts
interface AsyncState<T> {
  data: T | null;      // la donnée chargée, ou null tant que ça charge
  loading: boolean;
  error: string | null;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,       // une FONCTION qui promet un T
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void } {
```

Trois choses à décortiquer. D'abord `fetcher: () => Promise<T>` : le type d'une fonction se décrit avec une flèche — « fonction sans argument qui renvoie une Promise de T ». Le hook ne sait pas ce qu'il charge, il sait juste comment. Ensuite `deps: unknown[] = []` : `unknown` = « type inconnu, à vérifier avant usage » (la version prudente de `any`, qui lui désactive toute vérification — à éviter). Enfin le retour `AsyncState<T> & { reload: () => void }` : le `&` est une **intersection**, « les deux à la fois » — l'état ET une fonction de rechargement.

Résultat dans un écran : `useAsyncData(() => getDataService().getProfil())` — TypeScript voit que `getProfil()` renvoie `Promise<JoueurProfil>`, en déduit `T = JoueurProfil`, et donc `data: JoueurProfil | null`. Tu n'écris le type nulle part : il circule tout seul du service jusqu'à l'écran. C'est ça, la puissance des génériques : écrire UNE fois la mécanique (charger, gérer loading/error), et la réutiliser typée pour chacune des données de l'app.

## À retenir

- Une fonction typée déclare le type de ses paramètres et de son retour ; une fonction `async` renvoie toujours `Promise<CeQuelleRapporte>`.
- Un générique `<T>` est un type à trou : la fonction garde le même type en entrée et en sortie sans le connaître d'avance (ex. `simulerReseau<T>`).
- `useState<T>` sert quand la valeur initiale ne suffit pas à l'inférence : `useState<AsyncState<T>>({ data: null, ... })` permet à `data` d'accueillir un T plus tard.
- `() => Promise<T>` est le type d'une fonction : mon `useAsyncData` reçoit la façon de charger, pas la donnée elle-même.
- Grâce à l'inférence, le type circule du service à l'écran sans annotation : `getProfil()` renvoie `Promise<JoueurProfil>`, donc `data` est `JoueurProfil | null`.

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre `src/hooks/useAsyncData.ts` et lis-le en entier à voix haute, en t'arrêtant sur chaque `T` : à chaque occurrence, dis « ici, T représente la donnée que l'écran veut charger ».
2. Prédis : si un écran appelle `useAsyncData(() => getDataService().getBadges())`, que vaut `T` ? Et quel est donc le type exact de `data` ? (Aide : ouvre `src/services/data/PirbDataService.ts` et cherche la signature de `getBadges`.) Réponse attendue : `T = Badge[]`, donc `data: Badge[] | null`.
3. Ouvre `src/services/data/MockPirbDataService.ts`, lis `simulerReseau` et la méthode `getNiveau()`. Explique pourquoi `simulerReseau(MOCK_NIVEAU)` renvoie précisément `Promise<NiveauInfo>` sans qu'on l'écrive.
4. Vérification par l'éditeur : dans n'importe quel fichier `.tsx` d'écran qui utilise `useAsyncData`, survole la variable `data` avec la souris (VS Code affiche le type inféré). Résultat attendu : tu vois le type précis (ex. `JoueurProfil | null`), jamais `any`.
5. Modification sans risque : dans `useAsyncData.ts`, remplace temporairement le message `'Erreur inconnue'` par `'Erreur inconnue (test)'`, lance `npm run typecheck` (aucune erreur attendue : c'est une valeur, pas un type), puis remets le texte d'origine.
