---
titre: "Idempotence : une API qui survit à la 4G du gymnase"
parcours: "api-auth"
ordre: 8
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Le dernier sujet est celui que les tutoriels oublient et que le terrain impose : **le réseau perd des réponses**. L'app envoie, le serveur traite, la réponse n'arrive jamais. L'app ne sait pas si c'est passé. La seule chose sûre qu'elle puisse faire est **renvoyer**. Donc ton API doit savoir recevoir deux fois la même requête sans faire deux fois la même chose.

**Idempotent, définition.** Une opération est idempotente si l'appliquer une fois ou dix fois produit le **même état**. `GET` l'est par nature (lire ne change rien). `PUT` avec une valeur absolue l'est (« mets le score à 34 » — dix fois, c'est 34). `DELETE` l'est (supprimer un truc déjà supprimé : toujours supprimé). **`POST` ne l'est pas** : « crée une action » dix fois = dix actions. « Ajoute 2 » dix fois = +20.

**Le problème réel de Venaball, 9 septembre.** La saisie de stats au bord du terrain : `POST /api/club/rencontres/{id}/saisie` avec `{ "type": "panier", "joueuse": 12 }`. La réponse se perd en 4G. La file hors-ligne de l'app renvoie. Le serveur crée un second panier. Stats fausses — et **personne ne le voit**, parce qu'un panier en double ressemble à un panier.

**Solution 1 : la clé d'idempotence.** L'app génère un identifiant unique **avant** l'envoi (`clientUid`, un UUID court) et l'attache à la requête. Le serveur :

```php
$existante = $this->actionMatchRepository->findOneBy(['clientUid' => $clientUid]);
if ($existante !== null) {
    return new JsonResponse([ /* le même résultat que l'original */ 'deja' => true ]);
}
$action->setClientUid($clientUid);   // colonne UNIQUE en base
```

Premier envoi : rien en base, on crée. Renvoi : trouvé, on renvoie **la même réponse** sans rien créer. Le `deja: true` informe l'app sans changer son comportement (c'est un 200, pas une erreur — parcours API, leçon 2). L'index `UNIQUE` sur `client_uid` est la ceinture : si deux renvois arrivent dans la même milliseconde et passent tous deux le `findOneBy`, le second échoue sur la contrainte plutôt que de créer un doublon. (Le cas idéal attraperait cette exception et renverrait le « déjà là » — c'est la limite documentée dans la fiche.)

La colonne est **nullable** : le web n'envoie pas de clé (pas de file hors-ligne), seul le mobile en a besoin. MySQL et MariaDB acceptent plusieurs `NULL` dans un index unique.

**Solution 2 : envoyer des valeurs absolues, pas des deltas.** Le score adverse s'envoyait en delta (`{ "delta": 2 }`). Un delta renvoyé compte double, et une clé d'idempotence **ne règle rien** : deux `+2` successifs sont deux actions légitimes, indiscernables d'un renvoi. La solution est de changer la forme de la donnée : `{ "scoreAdverse": 34 }`, absolu. Renvoyé dix fois, c'est 34. **Une valeur absolue est idempotente par nature ; un delta ne l'est jamais.** Quand tu conçois un endpoint, préfère « voici l'état voulu » à « voici le changement ».

**Où mettre la clé.** Deux conventions : dans le corps (`clientUid`, ce que fait Venaball) ou dans un en-tête `Idempotency-Key: <uuid>` (ce que font Stripe et les API de paiement). L'en-tête est plus générique — il s'applique à n'importe quel endpoint sans toucher au corps — mais demande un middleware qui stocke la réponse complète. Le corps est plus simple pour un cas ciblé. Les deux marchent.

**La file hors-ligne côté app.** L'app stocke les actions dans une file locale, les envoie dans l'ordre, retire celles qui ont reçu une réponse (même `deja: true`), et **réessaie** les autres avec un délai croissant (1 s, 2 s, 4 s… — *exponential backoff*) pour ne pas marteler un serveur qui souffre. `venaball club-store` a une file « à réécrire » dans sa liste de blocages : c'est exactement ce mécanisme, et sans clé d'idempotence côté serveur, une file qui réessaie est une machine à doublons.

**Le lien avec les paiements.** Si un jour Venaball encaisse des cotisations en ligne : « payer 50 € » renvoyé = 100 € débités. Toutes les API de paiement exigent une clé d'idempotence pour cette raison. Le réflexe que tu prends sur des paniers de basket est celui qui évite un double débit.

**Ce que ça dit de la conception.** L'idempotence n'est pas une fonctionnalité qu'on ajoute : c'est une propriété qu'on **conçoit**. Un endpoint qui reçoit des valeurs absolues, avec une clé d'unicité, sur une ressource identifiée — il est idempotent sans effort. Un endpoint qui reçoit « fais ceci » avec un delta, sans identifiant — il ne le sera jamais sans bricolage. Pose-toi la question au moment d'écrire la route, pas au moment où les stats sont fausses.

## À retenir

- Le réseau perd des réponses. L'app renvoie. Le serveur doit reconnaître un renvoi.
- Idempotent = même état après 1 ou N applications. `POST` ne l'est pas par défaut.
- Clé d'idempotence : id généré par le client, colonne `UNIQUE` nullable, renvoi → même réponse + `deja`.
- Valeurs absolues plutôt que deltas : idempotent par construction.
- File hors-ligne + backoff côté app ; sans clé côté serveur, c'est une machine à doublons.
- Se conçoit à l'écriture de la route, pas après.

## Mise en pratique

Objectif : tester l'idempotence de Venaball, trouver un endpoint qui ne l'est pas, et le corriger.

1. Avec un jeton API et une rencontre de test : `POST …/api/club/rencontres/{id}/saisie` avec `{ "type": "panier", "joueuse": <id>, "clientUid": "test-001" }`. → 200, `deja` absent ou `false`. **Rejoue exactement la même requête** → 200, `deja: true`, même `actionId`. `SELECT COUNT(*) FROM action_match WHERE client_uid = 'test-001';` → 1.
2. Sans `clientUid` (comme le web) : deux envois → deux actions. Normal (le web n'a pas de file hors-ligne), mais note-le.
3. Score adverse : `{ "scoreAdverse": 34 }` trois fois → 34. Puis, si l'ancienne forme existe encore, `{ "delta": 2 }` trois fois → +6. Constate la différence. Si le delta est toujours accepté, il devrait être déprécié : ajoute un `@deprecated` en commentaire et un log quand il est utilisé.
4. Chasse : `php bin/console debug:router | findstr "POST"` sur `/api/`. Pour chaque `POST` : est-il idempotent ? (Crée-t-il quelque chose ? Reçoit-il un delta ? A-t-il une clé ?) Fais un tableau. Les « non » sont des doublons en attente.
5. Choisis-en un (confirmer une mission, placer un bénévole) et rends-le idempotent : soit par nature (confirmer une mission déjà confirmée → 200 sans changement, pas 409), soit par clé. Test fonctionnel : deux appels, un seul effet.
6. Côté app (club-store) : lis la file hors-ligne. Génère-t-elle un `clientUid` par action **avant** l'envoi ? Le garde-t-elle en cas de renvoi ? Fait-elle du backoff ? Si non, c'est la réécriture listée dans les blocages — et tu sais maintenant exactement ce qu'elle doit faire.

Résultat attendu : tu as vu l'idempotence tenir, tu as trouvé au moins un endpoint qui ne l'est pas, et tu l'as corrigé.
