---
titre: "Une app qui ne meurt jamais en silence : crash, panne réseau et erreurs ont chacun leur écran"
projet: "pirb"
bloc: 3
themes: ["resilience", "gestion des erreurs"]
source: "src/components/EcranCrash.tsx"
date: 2026-07-25
---

## Le concept

Une app mobile vit dans un monde hostile : réseau qui coupe dans un gymnase, serveur mutualisé qui hoquette, bug JavaScript imprévu. Pirb traite les trois cas, chacun à son niveau :

1. **Le crash JS** — `src/components/EcranCrash.tsx` est un **error boundary** : expo-router détecte automatiquement un export nommé `ErrorBoundary` dans `app/_layout.tsx` (la racine), et s'en sert pour attraper toute erreur de rendu de l'app. Au lieu de fermer l'app sans un mot, on affiche « BALLE PERDUE » avec un bouton Réessayer ; le détail technique (stack) n'est montré qu'en dev (`const EST_DEV = __DEV__`), jamais en production.

2. **La panne réseau** — `src/components/EcranHorsLigne.tsx` surveille `Network.useNetworkState()` et recouvre l'app quand `isConnected === false`. Subtilité documentée dans le code : `isInternetReachable` vaut `null` tant que le système ne s'est pas prononcé, donc on ne bascule hors-ligne que sur un `false` explicite — sinon l'écran clignoterait au démarrage. Cet écran est aussi la seule porte d'entrée de l'easter egg offline « Panier plein » (`/arcade`).

3. **L'erreur de requête** — `src/hooks/useAsyncData.ts` impose à chaque écran les 3 états de tout chargement : `{ data, loading, error }` + un `reload()`. Et en dessous, `src/services/data/ApiPirbDataService.ts` fait du **retry** : 3 essais avec backoff (`300 * essai` ms) et timeout de 8 s (AbortController) sur les erreurs transitoires (coupure, timeout, 5xx) — mais jamais sur un 401 ou un 4xx, qui sont de vraies erreurs.

Point clé (commenté dans `EcranCrash.tsx`) : un error boundary n'attrape QUE les erreurs de rendu — pas les `onPress` ni le code asynchrone. Ceux-là sont couverts par les try/catch de `useAsyncData` et du retry. Les trois mécanismes sont complémentaires, pas redondants.

## Comment je l'explique au jury

Je suis parti d'un constat : en production, une erreur JavaScript non rattrapée ferme l'app sans un mot, et moi je ne le saurais jamais. J'ai donc mis trois filets complémentaires. Un error boundary global exporté depuis mon layout racine attrape les erreurs de rendu et affiche un écran de secours avec un bouton Réessayer. Un écran hors-ligne détecte la perte de réseau et, plutôt qu'un mur d'erreur, propose un mini-jeu 100 % offline — je transforme la panne en moment de marque. Et pour les requêtes, mon hook useAsyncData impose les trois états loading, error, data à chaque écran, pendant que ma couche API fait du retry avec backoff et timeout sur les erreurs transitoires, parce que mon serveur OVH mutualisé a des à-coups. Je sais aussi ce que chaque filet ne couvre pas : l'error boundary n'attrape ni les erreurs asynchrones ni les gestionnaires d'événements, c'est le rôle des try/catch de la couche données. La prochaine étape, c'est Sentry branché sur cet error boundary, pour ne plus être aveugle en production.

## La question vicieuse du jury

**« Vous faites du retry automatique sur les erreurs : et si la requête qui a échoué était une écriture, vous risquez de l'exécuter deux fois, non ? »**

Le retry avec backoff est implémenté dans la méthode `get<T>()` privée d'`ApiPirbDataService`, donc il ne s'applique qu'aux lectures — une lecture rejouée est sans effet de bord. Pour les écritures, la règle est différente et je l'ai pensée : le marquage des notifications comme lues est volontairement un POST séparé et non un effet de bord du GET, précisément pour que mon retry de lecture ne modifie jamais rien ; et l'enregistrement du jeton push est documenté comme idempotent côté serveur, donc le rejouer est sans danger. C'est le vrai critère : on ne rejoue automatiquement que ce qui est sûr à rejouer — les GET par nature, et les écritures uniquement si elles sont idempotentes.
