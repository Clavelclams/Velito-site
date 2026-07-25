---
titre: "Stockage et session mobile : SecureStore vs localStorage"
parcours: "typescript-react-native"
ordre: 9
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Question de jury garantie : « où stockez-vous le jeton d'authentification, et pourquoi là ? ». Tu as la chance d'avoir DEUX réponses dans tes propres projets — une web, une mobile — et la comparaison est ta meilleure défense.

Côté web, ton site de cours stocke la progression dans `localStorage` (`apps/cours/lib/progression.ts`) :

```ts
const brut = window.localStorage.getItem(CLE);        // lecture SYNCHRONE
window.localStorage.setItem(CLE, JSON.stringify(p));  // écriture
```

Simple, synchrone, mais **non chiffré** et lisible par tout JavaScript de la page. Pour de l'XP et des fiches lues, aucun problème — le fichier l'assume : un seul utilisateur, données sans enjeu. Pour un jeton d'authentification, ce serait une faute.

Côté mobile, il n'y a pas de `localStorage`. React Native offre `AsyncStorage` (l'équivalent, non chiffré) et, pour les secrets, **expo-secure-store** : une API au-dessus des coffres-forts du système — Keychain sur iOS, Keystore sur Android. Données chiffrées par l'OS, liées à l'app. C'est le choix de `src/services/auth/session.ts`, et son commentaire le formule pour toi : « PAS un fichier lisible, PAS AsyncStorage : un jeton d'auth se protège. »

```ts
import * as SecureStore from 'expo-secure-store';
const CLE_TOKEN = 'pirb_token';

await SecureStore.setItemAsync(CLE_TOKEN, data.token); // écriture chiffrée
const t = await SecureStore.getItemAsync(CLE_TOKEN);   // lecture (async !)
await SecureStore.deleteItemAsync(CLE_TOKEN);          // suppression (déconnexion)
```

Différence visible : tout est asynchrone (`await`), car parler au coffre du système prend du temps — d'où l'état `'chargement'` au démarrage de l'app, le temps de relire le coffre.

Maintenant, l'architecture du fichier — très défendable. `session.ts` est un **store sans React** : trois variables de module (`etat`, `token`, `abonnes`) et une fonction `notifier` qui prévient les abonnés à chaque changement. Les composants s'y branchent via un hook :

```ts
export function useSession(): EtatSession {
  return useSyncExternalStore(
    (cb) => { abonnes.add(cb); return () => abonnes.delete(cb); }, // s'abonner / se désabonner
    getEtatSession, // lire l'état courant
    getEtatSession,
  );
}
```

`useSyncExternalStore` est le hook React officiel pour brancher un état EXTERNE à React : quand `notifier()` tourne, tous les composants abonnés re-rendent. Pourquoi ne pas avoir mis la session dans un `useState` d'un composant ? Parce que la couche données (`ApiPirbDataService`) doit lire le jeton et invalider la session **sans dépendre de React** : `getToken()` et `invaliderSession()` sont de simples fonctions, appelables depuis n'importe où.

Le cycle de vie complet, à savoir raconter : au démarrage, `chargerSession()` relit le coffre — jeton présent = statut `'connectee'`, l'app s'ouvre directement. À la connexion, `seConnecter()` envoie email + mot de passe à `POST /api/auth/login`, reçoit un jeton Bearer valable 30 jours, le range dans SecureStore et notifie. À la déconnexion, on vide le coffre. Et le cas d'or : un **401** en cours de route (jeton expiré ou révoqué) → la couche données appelle `invaliderSession()` → statut `'deconnectee'` → la garde du layout racine (leçon 8) raffiche l'écran de connexion. Personne n'a « navigué » vers le login : l'état a changé, l'interface a suivi.

Note aussi les messages d'erreur de `seConnecter` : un 401 devient « Email ou mot de passe incorrect », un 403 « Ton compte attend la validation du club ». On ne balance pas un code HTTP à une joueuse — la sécurité n'excuse pas la mauvaise UX.

## À retenir

- Web : `localStorage`, synchrone et non chiffré — acceptable pour ma progression de cours, inacceptable pour un secret.
- Mobile : expo-secure-store range le jeton dans le coffre chiffré du système (Keychain iOS / Keystore Android) ; tout y est asynchrone.
- `session.ts` est un store hors React (état + abonnés + `notifier`), exposé aux composants par `useSyncExternalStore` via le hook `useSession`.
- Intérêt : la couche données lit le jeton et invalide la session sans dépendre de React — sur un 401, l'app retombe seule sur l'écran de connexion.
- Les erreurs d'auth deviennent des messages humains (401 → « Email ou mot de passe incorrect ») : la sécurité n'excuse pas la mauvaise UX.

## Mise en pratique

1. Ouvre côte à côte `src/services/auth/session.ts` (Pirb) et `apps/cours/lib/progression.ts` (ton site). Compare à voix haute : où sont stockées les données ? chiffré ou non ? synchrone ou asynchrone ? qu'est-ce qui justifie chaque choix vu la sensibilité des données ?
2. Dans `session.ts`, surligne les trois états possibles du type `StatutSession` (`'chargement' | 'connectee' | 'deconnectee'`) et raconte le parcours d'une joueuse qui ouvre l'app avec un jeton déjà en coffre : quelles fonctions s'exécutent, quels états se succèdent ?
3. Prédis : dans `chargerSession()`, pourquoi les deux lectures SecureStore sont-elles lancées avec `Promise.all` plutôt que l'une après l'autre ? (Réponse : elles sont indépendantes — en parallèle, le démarrage est plus rapide.)
4. Explique la différence entre `seDeconnecter()` et `invaliderSession()` en lisant leur code : qui les appelle, laquelle est `async`, pourquoi `invaliderSession` garde-t-elle l'email dans l'état (`email: etat.email`) ? (Indice : pré-remplir le champ email au re-login.)
5. Modification sans risque : dans `seConnecter()`, ajoute un mot au message du 401 (ex. « Email ou mot de passe incorrect, vérifie tes identifiants. ... ») puis lance `npm run typecheck`. Résultat attendu : aucun problème — c'est une chaîne, pas un type. Remets le message d'origine. Bonus : cite de mémoire les deux clés utilisées dans le coffre (`pirb_token`, `pirb_email`).
