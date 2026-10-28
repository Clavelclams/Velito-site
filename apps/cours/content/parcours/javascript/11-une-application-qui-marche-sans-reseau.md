---
titre: "Une application qui marche sans réseau : service worker, cache et localStorage"
parcours: "javascript"
ordre: 11
niveau: "intermediaire"
duree: 35
date: 2026-10-10
---

## Le cours

Dans un gymnase, le wifi est souvent absent et la 4G passe mal. La table de marque UNSS que tu as faite pour VENA (`maquette/emarque-unss/`) doit pourtant se recharger et garder le match en cours, réseau ou pas. Pour ça, il faut régler **deux problèmes différents**, avec deux outils différents :

1. **Le code de l'app** (HTML, JS, CSS) doit pouvoir se charger sans Internet : c'est le rôle du **service worker** et de l'API **Cache**.
2. **Les données** (le match, les présences) doivent survivre à un rechargement : ici c'est le **localStorage**.

Les confondre est l'erreur classique : le cache du service worker ne garde pas tes données, et le localStorage ne garde pas ton code.

### 1. Le service worker : un intermédiaire entre la page et le réseau

Un service worker est un script que le navigateur installe à côté du site et qui tourne **en dehors de la page**. Il n'a pas accès au DOM. Il intercepte chaque requête de la page et décide quoi répondre : le réseau, un cache, ou autre chose.

Il s'enregistre depuis la page, dans `js/app.js` :

```js
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('Service worker non enregistré :', err);
  });
}
```

Le test `location.protocol` évite une erreur quand on ouvre `index.html` par double-clic (`file://`). Et le navigateur impose une autre condition : un **contexte sécurisé**, https ou `localhost`. En `http://` sur une vraie adresse, `register` échoue.

Sa vie a trois étapes, toutes visibles dans `sw.js` :

```js
const VERSION_CACHE = 'emarque-unss-v8';

self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(VERSION_CACHE);
    await cache.addAll(FICHIERS_APP);
    await cache.add(new Request(TAILWIND_CDN, { mode: 'no-cors' }));
    self.skipWaiting();
  })());
});

self.addEventListener('fetch', (evenement) => {
  if (evenement.request.method !== 'GET') return;
  evenement.respondWith((async () => {
    const enCache = await caches.match(evenement.request, { ignoreSearch: true });
    if (enCache) return enCache;
    try {
      return await fetch(evenement.request);
    } catch {
      if (evenement.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }
  })());
});
```

- **install** : à la première visite (avec réseau), il ouvre un cache nommé `emarque-unss-v8` et y range toute la liste `FICHIERS_APP`. `cache.addAll` est **tout ou rien** : si un seul fichier de la liste répond 404, l'installation échoue entière. Cette liste est tenue à la main ; un fichier JS ajouté et oublié dans la liste, et l'app casse hors ligne sans prévenir. Au 10/10/2026, les 37 fichiers de `js/` y sont bien.
- **activate** (dans le même fichier) : il supprime tous les caches dont le nom n'est pas `VERSION_CACHE`, puis `clients.claim()` prend le contrôle des pages ouvertes.
- **fetch** : stratégie **cache d'abord**. Si la ressource est en cache, il la sert sans toucher au réseau. Sinon il essaie le réseau. Hors ligne et pas en cache : pour une navigation, il renvoie `index.html`.

D'où la règle écrite en tête de `sw.js` : **à chaque modification d'un fichier, augmenter `VERSION_CACHE`**. Le navigateur ne réinstalle le service worker que si `sw.js` a changé d'un octet. Si tu modifies `js/match.js` sans toucher `sw.js`, les tablettes continuent de servir l'ancien `match.js` depuis leur cache, indéfiniment. Le prix du « cache d'abord » : c'est rapide et ça marche hors ligne, mais la mise à jour dépend d'une discipline humaine. L'autre stratégie courante, « réseau d'abord, cache en secours », se met à jour seule mais attend le réseau à chaque requête, ce qui est lent quand la connexion est mauvaise.

**Le cas Tailwind.** La page charge Tailwind depuis `https://cdn.tailwindcss.com`, un autre domaine. Le service worker le récupère en `mode: 'no-cors'` : il obtient une **réponse opaque**, qu'un `<script>` peut exécuter mais dont le code ne peut pas lire le contenu ni même le statut. Conséquence : si le CDN renvoyait une erreur ce jour-là, elle serait mise en cache sans que personne le sache. Et le CDN Tailwind est prévu pour le développement, pas la production. La version propre est un fichier CSS compilé, livré avec l'app et listé dans `FICHIERS_APP`.

### 2. Le localStorage : simple, synchrone, et fragile

`localStorage` est un petit magasin clé-valeur, par origine (protocole + domaine + port). Il ne stocke que des **chaînes** : d'où le couple `JSON.stringify` / `JSON.parse`. Il est **synchrone** : un `setItem` bloque la page le temps d'écrire. Et sa taille est limitée, de l'ordre de 5 Mo par origine selon les navigateurs.

`js/store.js` l'utilise prudemment :

```js
function sauvegarder(e) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(e));
    erreurSauvegarde = null;
  } catch (err) {
    erreurSauvegarde = 'Sauvegarde impossible sur cet appareil : ne fermez pas la page.';
  }
}
```

`setItem` peut lever une exception (quota dépassé, certains modes de navigation privée) : elle est attrapée et un bandeau rouge prévient l'utilisateur, au lieu de perdre le match en silence. À la lecture, `charger()` entoure aussi `JSON.parse` d'un `try` : un JSON abîmé ne bloque pas le démarrage.

Ce que tu dois savoir et dire honnêtement :
- **Le localStorage peut être effacé sans que l'app le décide.** L'utilisateur peut vider les données du site. Et Safari (donc tous les navigateurs sur iPad et iPhone) applique une règle de WebKit : les données écrites par script (localStorage, IndexedDB, cache du service worker) d'un site avec lequel l'utilisateur n'a pas interagi pendant 7 jours d'utilisation de Safari peuvent être supprimées. Une app ajoutée à l'écran d'accueil est traitée à part, mais n'en fais pas une garantie. `app.js` appelle `navigator.storage.persist()` pour demander au navigateur de ne pas effacer ; c'est une **demande**, que le navigateur peut refuser.
- **La taille.** Les signatures sont des images PNG en base64 (`js/signature.js`, `toDataURL`), stockées dans le match. Plusieurs matchs signés sur la même tablette peuvent approcher la limite. Le bandeau d'erreur existe pour ça, mais l'utilisateur ne peut alors plus rien sauvegarder.
- **Le changement de format.** Dans `charger()`, si `lu.version !== VERSION`, l'app repart d'un état vide. Passer `VERSION` de 2 à 3 dans une mise à jour effacerait les matchs en cours sur les tablettes. Une vraie app écrit une **migration** (lire la v2, la transformer en v3).
- **Ce n'est pas une sauvegarde.** Une tablette cassée, c'est un match perdu. La table de marque propose un export JSON du match (`js/gestes-cloture.js`, partage ou téléchargement), mais l'envoi vers un serveur n'existe pas encore.

**Et IndexedDB ?** C'est la base du navigateur : asynchrone, structurée, beaucoup plus grande. Elle aurait été plus adaptée aux signatures. Le localStorage a été choisi pour sa simplicité dans une maquette ; IndexedDB est soumis aux mêmes règles d'effacement de Safari, donc il ne règle pas le problème de fond, qui est l'absence de copie serveur.

## À retenir

- Hors ligne = deux problèmes : le code (service worker + Cache) et les données (localStorage ou IndexedDB).
- Un service worker exige https (ou localhost), tourne hors de la page et intercepte les requêtes : install, activate, fetch.
- « Cache d'abord » marche sans réseau mais ne se met à jour que si `sw.js` change : augmenter `VERSION_CACHE` à chaque livraison.
- `cache.addAll` est tout ou rien, et une réponse `no-cors` est opaque : on ne voit pas si elle est en erreur.
- localStorage : chaînes seulement, synchrone, environ 5 Mo, peut lever une exception, et peut être effacé (Safari, utilisateur). Ce n'est jamais la seule copie d'une donnée importante.

## Mise en pratique

Objectif : vérifier toi-même le hors ligne de la table de marque et mesurer ses limites. Moins d'une heure, dans Chrome sur ton PC.

1. Ouvre `https://tabledemarque.velito.fr`, puis F12, onglet **Application**. Dans « Service workers », note le statut. Dans « Cache storage », ouvre `emarque-unss-v8` et compte les entrées : retrouve la réponse Tailwind et regarde ce qui est affiché pour une réponse opaque.
2. Coche « Offline » (onglet Application ou Réseau), recharge : l'app doit s'afficher. Crée un match, marque trois paniers, recharge encore : le score doit être là.
3. Dans « Local storage », ouvre la clé `emarque-unss` et repère `version`, `matchs` et `prochainSeq`. Dans la console, tape `localStorage.getItem('emarque-unss').length` pour voir la taille en caractères. Signe une feuille de test et mesure à nouveau.
4. Dans un fichier de notes (pas dans la maquette), écris en cinq lignes ce qui arriverait à un match en cours si la prochaine version passait `VERSION` à 3, et comment l'éviter.

C'est réussi quand l'app se recharge en mode « Offline » avec le match intact, que tu sais dire combien de caractères pèse une signature, et que ta note décrit une migration v2 vers v3 au lieu d'un état vide.
