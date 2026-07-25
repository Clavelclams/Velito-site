---
titre: "Un jeton d'authentification, ça se range dans un coffre-fort, pas dans un fichier"
projet: "pirb"
bloc: 1
themes: ["securite applicative", "authentification mobile"]
source: "src/services/auth/session.ts"
date: 2026-07-25
---

## Le concept

Quand une joueuse se connecte, l'app échange email + mot de passe contre un **jeton Bearer valable 30 jours** (`POST /api/auth/login`). La question sécurité : où stocker ce jeton sur le téléphone ? Dans `src/services/auth/session.ts`, la réponse est **expo-secure-store** — le coffre-fort chiffré du système (Keychain sur iOS, Keystore sur Android) — et surtout PAS AsyncStorage, qui est un stockage en clair lisible :

```ts
await Promise.all([
  SecureStore.setItemAsync(CLE_TOKEN, data.token),
  SecureStore.setItemAsync(CLE_EMAIL, email),
]);
```

Le module est un **store sans React** : un état (`statut: 'chargement' | 'connectee' | 'deconnectee'`), une liste d'abonnés, et un hook `useSession()` basé sur `useSyncExternalStore` pour que les composants se re-rendent quand la session change. Avantage : la couche données (`ApiPirbDataService`) peut lire le jeton (`getToken()`) et signaler une expiration (`invaliderSession()`) sans dépendre de React.

Le cycle de vie complet est géré : au démarrage, `chargerSession()` relit le coffre (jeton présent = déjà connectée, pas de re-login) ; à la déconnexion, `seDeconnecter()` vide le coffre ; sur un 401 de l'API, `invaliderSession()` détruit le jeton et la garde de `app/_layout.tsx` raffiche l'écran de connexion (`if (MODE_API && session.statut === 'deconnectee') return <LoginScreen />`). Les erreurs de login sont traduites en messages humains : 401 → « Email ou mot de passe incorrect », 403 → « Ton compte attend la validation du club ».

## Comment je l'explique au jury

Mon app s'adresse à des joueuses souvent mineures, donc la protection de la session n'est pas négociable. Le jeton d'authentification est stocké dans expo-secure-store, c'est-à-dire le Keychain d'iOS ou le Keystore d'Android : un stockage chiffré par le système, et pas AsyncStorage qui est un simple fichier lisible. J'ai conçu la session comme un store indépendant de React, avec un hook useSession par-dessus : comme ça, ma couche HTTP peut lire le jeton et invalider la session sur un 401 sans dépendre de l'interface. Concrètement, si le jeton expire, l'app retombe toute seule sur l'écran de connexion — pas de re-login caché avec des identifiants stockés, c'est la joueuse qui détient son mot de passe, pas l'app. Et à la déconnexion, je vide le coffre et je désinscris aussi le jeton push, pour que le téléphone ne reçoive plus les convocations de quelqu'un d'autre.

## La question vicieuse du jury

**« Vous stockez un jeton valable 30 jours sur le téléphone : si le téléphone est volé, le voleur a accès au compte pendant 30 jours, non ? »**

D'abord, le jeton est dans le Keychain/Keystore : il est chiffré par le système et protégé par le verrouillage de l'appareil — sans déverrouiller le téléphone, on ne le lit pas, contrairement à un stockage en clair. Ensuite, le jeton est révocable côté serveur : sur toute requête, un 401 déclenche `invaliderSession()` et l'app détruit sa copie locale — le serveur reste maître de la validité, l'app ne fait qu'afficher ce qu'il décide. Enfin c'est un compromis assumé entre sécurité et usage : demander son mot de passe à une adolescente à chaque ouverture, c'est la garantie qu'elle abandonne l'app. Trente jours avec stockage chiffré et révocation serveur, c'est le standard des apps mobiles grand public.
