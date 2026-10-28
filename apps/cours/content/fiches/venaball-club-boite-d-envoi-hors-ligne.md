---
titre: "La boîte d'envoi de Stats Live : le tap est instantané, le réseau rattrape derrière"
projet: "venaball-club"
bloc: 1
themes: ["resilience", "mobile", "api"]
source: "src/services/fileAttente.ts"
date: 2026-10-10
---

## Le concept

À la table de marque, la bénévole saisit les stats d'un match sur l'app Venaball Club, en 4G de gymnase. La v1 attendait la réponse du serveur à chaque tap et n'utilisait sa file hors ligne qu'une fois le réseau tombé. Résultat écrit dans `instruction/01_STATS_LIVE_V2_2026-09-09.md` : des actions perdues en silence, des doublons quand une réponse se perdait, et une file qui se vidait dans le vide sur un jeton expiré.

La v2 (commit `126ff55`, 09/09/2026) est une **boîte d'envoi** (en anglais *outbox*) : toute écriture de la saisie passe par `fileAttente.ajouter()`. L'écran se met à jour tout de suite, l'élément est rangé en fin de file, la file est sauvegardée sur le téléphone (AsyncStorage) et l'envoi part en arrière-plan, dans l'ordre du match (FIFO). Ce fichier traite le côté app ; le côté serveur de l'idempotence (colonne `client_uid` unique, réponse `deja: true`) est dans la fiche `venaball-idempotence-cle-client-valeurs-absolues`.

Tout repose sur un tri des échecs, dans `synchroniser()` :

```ts
// src/services/fileAttente.ts
} catch (err) {
  const status = err instanceof ApiError ? err.status : -1;
  const message = err instanceof ApiError ? err.message : 'Erreur inattendue.';

  if (status === 401) {
    // Jeton mort : on n'insiste pas, on garde tout, on attend la reconnexion.
    changerEtat({ enPause: 'auth', derniereErreur: 'Session expirée : reconnecte-toi, la saisie repartira.' });
    return false;
  }
  if (status === 0 || status >= 500 || status === -1) {
    const tentatives = premier.tentatives + 1;
    changerEtat({
      elements: etat.elements.map((e) => (e.uid === premier.uid ? { ...e, tentatives } : e)),
      derniereErreur: message,
    });
    programmer(backoffMs);
    backoffMs = Math.min(BACKOFF_MAX_MS, backoffMs * 2);
    return false;
  }
  // 4xx : le serveur a compris et a refusé. On le garde VISIBLE, et la file continue.
  changerEtat({
    elements: etat.elements.filter((e) => e.uid !== premier.uid),
    rejetes: [...etat.rejetes, { element: premier, raison: message, status, a: Date.now() }].slice(-MAX_REJETS_GARDES),
  });
```

Ligne par ligne, les quatre cas :

- **Réseau absent ou serveur en panne** (status 0 ou 5xx) : on garde tout et on réessaie plus tard, de 2 s à 30 s d'écart en doublant à chaque échec (*backoff exponentiel*), pour ne pas marteler un serveur qui souffre.
- **401** : le jeton n'est plus bon. La file se met **en pause** sans rien jeter ; l'écran de connexion appelle `fileAttente.reprendre()` après une reconnexion réussie (`src/components/EcranConnexion.tsx`).
- **Autre 4xx** : le serveur a refusé en connaissance de cause. L'élément passe dans `rejetes`, gardé et affiché en bandeau rouge, et la file continue avec le suivant.
- **409 sur une sortie de terrain ou sur « terminer »** : traité comme un succès dans `envoyer()`, parce qu'un renvoi de ces deux gestes après une réponse perdue reçoit justement un 409 (« déjà fait »).

Trois détails rendent ce tri possible. Le **timeout** d'abord : `appeler()` dans `src/services/api.ts` coupe une requête au bout de 8 s en lecture et 12 s en écriture (`AbortController`) et la transforme en `ApiError` de status 0. Sans lui, une 4G qui « pend » ne rejetait jamais et la file ne démarrait pas. Ensuite le **`clientUid`** : `ajouter()` génère un identifiant avant l'envoi et le garde à chaque renvoi, c'est lui que le serveur reconnaît. Enfin le **score adverse en absolu** : deux mises à jour en attente pour le même match, la file garde seulement la dernière.

## Comment je l'explique au jury

Au bord du terrain, le réseau coupe tout le temps, et une bénévole qui perd trois actions arrête de saisir. J'ai donc fait de la saisie une boîte d'envoi : chaque tap met l'écran à jour tout de suite, range l'action dans une file sauvegardée sur le téléphone, et l'envoi se fait derrière, dans l'ordre du match. Quand l'envoi échoue, je trie : pas de réseau ou serveur en panne, je réessaie avec un délai qui double jusqu'à 30 secondes ; jeton expiré, je mets la file en pause et je reprends après la reconnexion, sans rien perdre ; refus du serveur, je garde l'action visible en rouge pour que la bénévole sache ce qui n'est pas passé. Chaque action porte un identifiant créé avant l'envoi, donc un renvoi après une réponse perdue ne crée pas de doublon. Et j'ai ajouté un timeout, parce qu'une requête qui ne répond jamais ne déclenchait aucun de ces mécanismes.

## La question vicieuse du jury

**« Si une action provoque une erreur 500 à chaque envoi, votre file en FIFO strict est bloquée pour toujours. Et vous avez testé tout ça comment ? »**

Oui, c'est le défaut connu du FIFO strict, on l'appelle le blocage en tête de file. Une erreur 500 qui se répète sur un élément précis le fait réessayer toutes les 30 secondes, et tout ce qui suit attend derrière. J'ai choisi le FIFO parce que l'ordre compte : les règles en tête du fichier disent que le serveur reçoit le match dans l'ordre où il s'est joué, et qu'un « terminer » ne part jamais avant ce qui le précède. La correction que je ferais : au-delà d'un nombre de tentatives (le compteur `tentatives` existe déjà), passer l'élément dans `rejetes` avec un message clair, plutôt que de bloquer le match entier. En relisant le code le 10/10, j'ai vu deux autres limites que je n'ai pas encore vérifiées sur un téléphone. Si la bénévole tape « Annuler la dernière » pendant que l'action est en cours d'envoi, `retirer()` la trouve encore dans la file et l'annule à l'écran, alors que le serveur va la créer. Et la déconnexion (`app/compte.tsx`) ne vide pas la file : sur un téléphone partagé, elle repartirait avec le jeton du compte suivant. Pour les tests : il n'y en a aucun d'automatisé. La doc `01_STATS_LIVE_V2` le liste comme reste à faire : un test d'intégration avec une `api` simulée (réseau coupé, rétabli, 401). La logique est isolée dans `fileAttente.ts` exprès pour ça, et mon `CLAUDE.md` interdit de toucher à cette file sans spec, donc ces corrections passeront par une spec validée.
