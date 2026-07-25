---
titre: "Le contrat d'interface : implements, Mock vs Api, et la factory"
parcours: "typescript-react-native"
ordre: 5
niveau: "intermediaire"
duree: 30
date: 2026-07-25
---

## Le cours

Voici LE morceau d'architecture de ton app — celui que tu dois savoir défendre les yeux fermés au jury, et que ta fiche `pirb-couche-donnees-interface` résume déjà. Aujourd'hui on le lit dans le code.

Le problème de départ : quand tu as construit Pirb, l'API Symfony n'existait pas encore (chantier B4). Il fallait pourtant construire les écrans. Solution naïve : mettre des fausses données dans chaque écran, puis TOUT réécrire à l'arrivée de l'API. Solution retenue : séparer le « quoi » du « comment » avec une interface.

En leçon 2, une interface décrivait des données. Elle peut aussi décrire un **service** : la liste des méthodes qu'un objet promet d'offrir. Ouvre `src/services/data/PirbDataService.ts` :

```ts
export interface PirbDataService {
  getProfil(): Promise<JoueurProfil>;
  getStatsSaison(saison?: string): Promise<StatsSaison>;
  getBadges(): Promise<Badge[]>;
  saveSeancePractice(seance: SeancePractice): Promise<void>;
  // ... ~30 méthodes : TOUT ce que l'app sait demander comme données
}
```

Aucun code dedans : que des signatures. C'est un contrat. Détail malin relevé dans les commentaires : tout est `Promise` dès aujourd'hui, même si le mock pourrait répondre instantanément — parce qu'une API réseau sera forcément asynchrone, les écrans sont écrits en async dès le départ, rien à réécrire plus tard.

Ensuite, deux classes signent ce contrat avec le mot-clé `implements` :

```ts
// MockPirbDataService.ts — fausses données locales, latence simulée de 300 ms
export class MockPirbDataService implements PirbDataService { ... }

// ApiPirbDataService.ts — les vraies données via l'API Symfony
export class ApiPirbDataService implements PirbDataService { ... }
```

`implements PirbDataService` veut dire : « je jure d'avoir TOUTES les méthodes du contrat, avec exactement ces signatures ». Si tu ajoutes `getClassement()` à l'interface, les deux classes passent au rouge tant qu'elles ne l'ont pas implémentée. Le compilateur est le gardien du contrat.

Troisième pièce : qui choisit l'implémentation ? La **factory**, dans `src/services/data/index.ts` :

```ts
let instance: PirbDataService | null = null; // singleton : une seule instance partagée

export function getDataService(): PirbDataService {
  if (instance) return instance;
  const source = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
  // 'api' → new ApiPirbDataService(baseUrl) ; sinon → new MockPirbDataService()
```

Note le type de retour : `PirbDataService`, l'interface — jamais une classe concrète. Les écrans appellent `getDataService().getProfil()` sans savoir (ni pouvoir savoir) si c'est le mock ou l'API qui répond. La bascule tient dans une variable d'environnement : `EXPO_PUBLIC_DATA_SOURCE=api`. Zéro modification d'écran — le commentaire du fichier le dit : « c'était la promesse de l'interface, tenue ».

Le nom savant pour le jury : **principe d'inversion de dépendance**, le D de SOLID. Les écrans (haut niveau) ne dépendent pas des détails (mock, HTTP) : les deux dépendent d'une abstraction, l'interface. Bénéfices concrets à citer : développer sans backend, faire des démos sans réseau, tester les écrans avec des données maîtrisées, et brancher l'API réelle en changeant une ligne.

Dernier raffinement, très défendable : `ApiPirbDataService` contient `private fallback = new MockPirbDataService();`. Les cinq domaines cœur (profil, stats, shot chart, badges, niveau) viennent de l'API ; le reste (social, carte, attributs), dont les endpoints n'existent pas encore côté serveur, est délégué au mock interne. Stratégie hybride assumée et documentée : quand un endpoint naît, on remplace UNE méthode — et les écrans, encore une fois, ne voient rien.

## À retenir

- Une interface peut décrire un service : la liste des méthodes promises, sans aucun code — c'est un contrat vérifié par le compilateur.
- `class X implements PirbDataService` oblige X à fournir toutes les méthodes du contrat : oublier une méthode = erreur de compilation.
- Les écrans dépendent de l'interface, jamais d'une classe concrète : c'est l'inversion de dépendance (le D de SOLID).
- La factory (`index.ts`) est le SEUL endroit qui choisit mock ou API, via `EXPO_PUBLIC_DATA_SOURCE` — basculer ne modifie aucun écran.
- Tout le contrat est `Promise` dès le mock : les écrans sont async dès le premier jour, rien à réécrire à l'arrivée du réseau.

## Mise en pratique

Dans ton projet Pirb :

1. Ouvre côte à côte `src/services/data/PirbDataService.ts` et `src/services/data/MockPirbDataService.ts`. Choisis 3 méthodes du contrat (ex. `getProfil`, `getSaisons`, `getBadges`) et retrouve leur implémentation dans le mock. Vérifie à voix haute que les signatures correspondent exactement.
2. Ouvre `src/services/data/index.ts` et déroule le scénario à voix haute : « au premier appel de `getDataService()`, si `EXPO_PUBLIC_DATA_SOURCE` vaut..., alors... ». Explique aussi pourquoi `instance` est gardée en dehors de la fonction (le commentaire parle de singleton : le mock doit garder ses séances practice en mémoire).
3. Prédis : que se passe-t-il si `EXPO_PUBLIC_DATA_SOURCE=api` mais que `EXPO_PUBLIC_API_URL` est absente ? Vérifie dans le code — et explique pourquoi une erreur « bruyante » est ici un choix volontaire.
4. La preuve par le contrat : dans `PirbDataService.ts`, ajoute temporairement une méthode fictive `getTest(): Promise<string>;` puis lance `npm run typecheck`. Résultat attendu : DEUX erreurs — `MockPirbDataService` et `ApiPirbDataService` ne respectent plus le contrat. C'est exactement la garantie que tu vendras au jury. Supprime la ligne et vérifie que tout repasse au vert.
5. Pour finir, relis ta fiche `pirb-couche-donnees-interface` sur ton site de cours : tu dois maintenant pouvoir la réexpliquer en citant les trois fichiers réels (interface, implémentations, factory) sans la relire.
