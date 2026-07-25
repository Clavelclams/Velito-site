---
titre: "Une interface entre mes écrans et mes données : je développe l'app sans attendre le serveur"
projet: "pirb"
bloc: 2
themes: ["architecture en couches", "inversion de dependance"]
source: "src/services/data/PirbDataService.ts"
date: 2026-07-25
---

## Le concept

Dans Pirb, aucun écran ne fait de `fetch` directement. Tous passent par un **contrat** : l'interface TypeScript `PirbDataService` (`src/services/data/PirbDataService.ts`), qui liste toutes les opérations de données de l'app (`getProfil()`, `getStatsSaison()`, `getConvocations()`, `repondreConvocation()`, etc.), toutes asynchrones (`Promise`) même quand la réponse est instantanée.

Ce contrat a deux implémentations :
- `src/services/data/MockPirbDataService.ts` : des données réalistes en mémoire, zéro réseau — pour développer et faire des démos sans serveur ;
- `src/services/data/ApiPirbDataService.ts` : les vraies données du club via l'API Symfony `pirb.mabb.fr`, avec authentification et retry.

Le choix se fait à UN seul endroit, la **factory** `src/services/data/index.ts` :

```ts
const source = process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock';
switch (source) {
  case 'api':
    instance = new ApiPirbDataService(baseUrl);
    break;
  case 'mock':
  default:
    instance = new MockPirbDataService();
}
```

C'est le principe **D de SOLID** (inversion de dépendance) : les écrans dépendent d'une abstraction, pas d'une implémentation. Le commentaire du fichier le dit : « on change UNE ligne dans la factory — et AUCUN écran n'est modifié ». Bonus documenté dans `ApiPirbDataService.ts` : les domaines pas encore couverts par l'API (social, carte) sont délégués à un mock interne (`private fallback = new MockPirbDataService()`) — stratégie hybride assumée, invisible pour les écrans.

## Comment je l'explique au jury

J'ai commencé l'app mobile alors que l'API Symfony n'existait pas encore. Plutôt que d'attendre, j'ai défini un contrat, l'interface PirbDataService, et une implémentation mock qui le respecte : tous mes écrans ont été développés contre ce contrat. Quand j'ai livré l'API, j'ai écrit ApiPirbDataService qui respecte le même contrat, et j'ai basculé via une variable d'environnement dans la factory — sans toucher un seul écran. C'est l'inversion de dépendance de SOLID : mes écrans dépendent d'une abstraction, pas d'une source de données concrète. Ça me sert encore aujourd'hui : le mode mock reste mon mode démo, et les endpoints qui n'existent pas encore côté serveur sont servis par un mock interne, de façon transparente. J'ai aussi rendu toutes les méthodes asynchrones dès le départ, même dans le mock, pour ne rien avoir à réécrire quand le réseau est arrivé.

## La question vicieuse du jury

**« Votre mock et votre API peuvent diverger : qu'est-ce qui vous garantit que les deux implémentations respectent vraiment le même contrat ? »**

C'est TypeScript qui le garantit à la compilation : les deux classes déclarent `implements PirbDataService`, donc si une méthode manque ou change de signature, `tsc --noEmit` (mon script `typecheck`) refuse de compiler. Ce que le typage ne garantit pas, c'est la sémantique des données — c'est pourquoi les types de `src/types/pirb.ts` sont calqués sur les structures réelles du backend Symfony (JoueurStatsAggregator, ShotChartCalculator), relevées dans le code serveur : le contrat client est celui que l'API sert réellement. La limite que j'assume : des tests de contrat automatisés comparant mock et API renforceraient encore cette garantie, c'est une piste d'amélioration.
