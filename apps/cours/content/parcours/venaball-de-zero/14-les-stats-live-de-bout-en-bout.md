---
titre: "Les Stats Live de bout en bout"
parcours: "venaball-de-zero"
ordre: 14
niveau: "debutant"
duree: 45
date: 2026-10-04
---

## Le cours

Samedi, 15 h, gymnase en béton, 4G qui coupe. À la table de marque, quelqu'un du club tient l'app Venaball Club. Léa marque un panier à 2 points. Premier tap sur la carte « Léa », deuxième tap sur « 2 pts réussi ». C'est tout. Dimanche soir, la coach valide le match en deux taps. Lundi, Léa ouvre l'app Venaball et voit sa moyenne de points monter.

Entre ces deux moments, l'information traverse neuf fichiers. On les suit dans l'ordre.

### Le schéma du trajet

```
AU BORD DU TERRAIN (app Venaball Club)
 1. deux taps : Léa, puis « 2 pts réussi »
      venaball club-store/app/saisie/[id].tsx        -> envoyerAction()
 2. l'action entre dans la boîte d'envoi, avec un identifiant unique (uid)
      venaball club-store/src/services/fileAttente.ts -> ajouter(), synchroniser()
 3. envoi au serveur dès que le réseau le permet
      venaball club-store/src/services/api.ts         -> saisirAction() + clientUid

SERVEUR (mabb-site)
 4. réception, vérifications, anti-doublon
      src/Controller/Api/Club/ApiClubSaisieController.php -> action()
 5. une ligne par action, rangée dans la session du saisisseur
      src/Entity/Sport/ActionMatch.php  (colonne client_uid, unique)
      src/Entity/Sport/SessionStatsLive.php
      entrées / sorties du terrain : src/Entity/Sport/PresenceTerrain.php
 6. fin de saisie : la session passe COMPLETE
      ApiClubSaisieController::terminer() -> SessionStatsLivePromoteur::marquerComplete()

DIMANCHE SOIR (coach, app Club ou web)
 7. la coach promeut UNE session en OFFICIELLE
      src/Controller/Api/Club/ApiClubStatsLiveController.php -> promouvoir()
      src/Service/Stats/SessionStatsLivePromoteur.php       -> promouvoirOfficielle()
 8. calcul des totaux du match par joueuse
      src/Service/Stats/ActionMatchAggregator.php -> EvaluationMatch (source « live »)

LUNDI (app Venaball)
 9. moyennes de saison, matchs officiels seulement
      src/Service/Stats/JoueurStatsAggregator.php -> statsSaison()
      src/Controller/Api/PirbApiController.php    -> GET /api/pirb/stats/saison
      Pirb store/app/(tabs)/stats.tsx
```

### Étape 1 : deux taps, zéro attente

L'écran `venaball club-store/app/saisie/[id].tsx` affiche une grille de joueuses, puis une grille de grosses touches d'action. Son en-tête explique la règle : « À la table de marque, chaque seconde d'interface est une action de jeu ratée. » Au deuxième tap, la fonction `envoyerAction` ne parle **pas** au serveur. Elle confie l'action à la boîte d'envoi, puis met à jour le score à l'écran tout de suite.

### Étape 2 : la boîte d'envoi

Une **file d'attente** (ou boîte d'envoi), c'est une liste où l'on range ce qui doit partir, dans l'ordre, et qu'on vide dès que possible. Comme le carnet du marqueur : il note tout, même si le panneau électronique est en panne, et recopie plus tard.

Voici le cœur de `venaball club-store/src/services/fileAttente.ts` :

```ts
ajouter(element: { rencontreId: number; genre: ElementFile['genre']; payload: ElementFile['payload'] }): string {
  const uid = nouvelUid();
  void pret.then(() => {
    let elements = etat.elements;
    // ...
    const nouveau = { ...element, uid, creeA: Date.now(), tentatives: 0 } as ElementFile;
    changerEtat({ elements: [...elements, nouveau] });
    void sauvegarder();
    if (etat.enPause === null) programmer(0);
  });
  return uid;
},
```

- `nouvelUid()` : fabrique un identifiant unique (l'heure plus du hasard). C'est la future **clé anti-doublon**.
- `pret.then(...)` : on attend que la file sauvegardée la veille soit rechargée, pour ne rien écraser.
- `{ ...element, uid, creeA, tentatives: 0 }` : l'action, plus son uid, son heure de création, et un compteur d'essais.
- `[...elements, nouveau]` : on l'ajoute **à la fin**. L'ordre du match est respecté.
- `sauvegarder()` : on écrit la file dans la mémoire du téléphone (AsyncStorage). Si l'app se ferme, rien n'est perdu.
- `programmer(0)` : on tente l'envoi tout de suite, sauf si la file est en pause.

Quand l'envoi échoue, `synchroniser()` applique des règles écrites en tête du fichier :

- pas de réseau, ou serveur en panne (code 500 et plus) : on garde tout et on réessaie, de 2 secondes jusqu'à 30 secondes d'écart ;
- **401** (jeton expiré en plein match) : la file se met en **pause** et attend la reconnexion, sans rien jeter ;
- autre refus (4xx) : l'action passe dans une liste `rejetes`, **visible** à l'écran, et la file continue.

Le CLAUDE.md de l'app Club le rappelle : cette file « ne se touche pas sans spec ».

### Étapes 3 et 4 : l'idempotence, ou comment ne pas compter deux fois

Voici le piège. La bénévole tape « 2 pts ». L'app envoie. Le serveur enregistre le panier. Mais la réponse se perd dans la 4G. L'app croit que l'envoi a raté, et **renvoie**. Sans protection, le serveur enregistre un deuxième panier. Léa a 4 points au lieu de 2.

La solution s'appelle l'**idempotence** : une opération est idempotente si la faire deux fois donne le même résultat que la faire une fois. Pour ça, l'app joint l'uid à chaque action (`clientUid` dans `api.ts`), et le serveur s'en sert. C'est le commit `36a8beb` du 9 septembre 2026, dans `src/Controller/Api/Club/ApiClubSaisieController.php` :

```php
$clientUid = isset($data['clientUid']) && is_string($data['clientUid']) && $data['clientUid'] !== ''
    ? substr($data['clientUid'], 0, 40) : null;
if ($clientUid !== null) {
    $existante = $this->actionMatchRepository->findOneBy(['clientUid' => $clientUid]);
    if ($existante !== null) {
        return new JsonResponse([
            'actionId'  => $existante->getId(),
            'points'    => $this->pointsJoueuse($joueur->getId(), $rencontre, $session),
            'scoreNous' => $this->scoreSession($rencontre, $session),
            'deja'      => true,
        ]);
    }
}
```

- Première ligne : on lit `clientUid` s'il est présent, c'est un texte non vide, coupé à 40 caractères. Sinon `null` (le web n'en envoie pas).
- `findOneBy(['clientUid' => ...])` : une action avec cet uid existe-t-elle déjà ?
- Si oui : on **ne crée rien**. On renvoie l'action existante et les scores, avec `'deja' => true`. L'app est contente, le panier n'est compté qu'une fois.
- Si non : le code continue et crée l'action normalement.

La même migration, `migrations/Version20260909180000.php`, ajoute un **index unique** sur `action_match.client_uid` : même si deux envois arrivaient exactement en même temps, la base refuserait le second. Le score adverse suit la même idée : l'app envoie le score **total** (« 34 ») et pas « +2 », car renvoyer « 34 » deux fois donne toujours 34.

Avant d'arriver là, `action()` a fait ses vérifications : la rencontre est dans ton club et tu encadres l'équipe (`rencontreAutorisee()`), la joueuse appartient au club du match, le type d'action est dans la liste `ActionMatch::TYPES`.

### Étape 5 : une ligne par action, une session par saisisseur

Chaque tap devient une ligne `ActionMatch` : la joueuse, le match, le type (par exemple `tir_2pt_ext_reussi`), le quart-temps, la minute. Le barème est écrit dans l'entité : `TYPES_QUI_MARQUENT` donne 2 points aux tirs à 2 réussis, 3 au tir à 3, 1 au lancer franc.

Chaque ligne est rangée dans une **session** (`SessionStatsLive`) : la saisie d'une personne sur un match. Deux bénévoles qui saisissent le même match ont chacun la leur, et ne se mélangent pas. Une session a quatre états : `EN_COURS`, `COMPLETE`, `OFFICIELLE`, `ARCHIVEE`. L'en-tête de l'entité le dit : seule la session **officielle** alimente les stats des joueuses.

Pour les **minutes jouées**, un appui long sur une carte joueuse enregistre une entrée ou une sortie du terrain. Chaque passage sur le terrain est une ligne `PresenceTerrain`, avec le temps d'entrée et de sortie en secondes depuis le début du match. Le temps de jeu, c'est la somme des « sortie moins entrée ».

### Étapes 6 et 7 : terminer, puis promouvoir

À la fin, « Terminer » appelle `terminer()`, qui passe la session en `COMPLETE`. Le message renvoyé est clair : « Pensez à la valider dans « Stats à valider » pour publier les stats. »

Car rien ne remonte encore. Il faut un geste humain : la **promotion**. Dans l'app Club, l'onglet Stats Live liste les matchs « à valider » (`GET /api/club/stats-live/a-valider`), avec le nombre d'actions de chaque session pour choisir la plus complète. La coach choisit une session et la valide, ce qui appelle `POST /api/club/sessions/{id}/promouvoir`. Le web a le même bouton (`src/Controller/Manager/SessionStatsLiveController.php`). Les deux appellent `promouvoirOfficielle()` dans `src/Service/Stats/SessionStatsLivePromoteur.php` :

```php
$this->em->beginTransaction();
try {
    $existante = $this->sessionRepository->findOfficielleByRencontre($rencontre);
    if ($existante !== null && $existante->getId() !== $session->getId()) {
        $existante->setStatut(SessionStatsLive::STATUT_ARCHIVEE);
        // ...
    }

    $session->setStatut(SessionStatsLive::STATUT_OFFICIELLE);
    $session->setPromotedAt(new \DateTimeImmutable());
    $session->setPromotedBy($promoteur);

    $this->em->flush();
    $this->em->commit();
```

- `beginTransaction()` : une **transaction**, c'est un paquet de modifications qui passe en entier ou pas du tout.
- `findOfficielleByRencontre(...)` : y a-t-il déjà une session officielle pour ce match ?
- Si oui, elle passe `ARCHIVEE`. Il n'y a **jamais deux** sessions officielles pour un même match.
- `STATUT_OFFICIELLE`, `setPromotedAt`, `setPromotedBy` : la nouvelle devient officielle, avec la date et l'auteur.
- `flush()` puis `commit()` : on enregistre, et on valide le paquet.

Juste après, toujours dans `promouvoirOfficielle()`, deux choses se passent :

1. les présences restées ouvertes (le cinq sur le terrain au buzzer, que personne ne fait « sortir ») sont fermées à la fin estimée du match ;
2. `regenererToutesPourRencontre()` de `ActionMatchAggregator.php` calcule, pour chaque joueuse, les totaux du match (tirs, rebonds, passes, minutes) et les écrit dans une ligne `EvaluationMatch` avec la source `live`. Il ne compte que les actions de la session officielle.

### Étape 8 : la moyenne de Léa

`EvaluationMatch`, c'est la feuille de match d'une joueuse : une ligne par joueuse et par match. Pour la moyenne de saison, `src/Service/Stats/JoueurStatsAggregator.php` les additionne, mais pas toutes :

```php
public function statsSaison(
    Joueur $joueur,
    ?string $saison = null,
    array $typesRencontre = [\App\Entity\Sport\Rencontre::TYPE_OFFICIEL],
): array {
    $qb = $this->em->createQueryBuilder()
        ->select('e')
        ->from(\App\Entity\Sport\EvaluationMatch::class, 'e')
        ->leftJoin('e.rencontre', 'r')->addSelect('r')
        ->where('e.joueur = :j')
        ->setParameter('j', $joueur)
        ->orderBy('r.date', 'DESC');

    if ($typesRencontre !== []) {
        $qb->andWhere('r.typeRencontre IN (:types)')
           ->setParameter('types', $typesRencontre);
    }
```

- `$typesRencontre = [TYPE_OFFICIEL]` : par défaut, seuls les matchs **officiels** comptent. Un amical ou un match interne ne gonfle pas la moyenne (convention FFBB, dit le commentaire).
- `createQueryBuilder()` : on construit une requête à la base, morceau par morceau.
- `from(EvaluationMatch)` et `leftJoin('e.rencontre', 'r')` : on prend les feuilles de match, avec le match associé.
- `where('e.joueur = :j')` : seulement celles de Léa.
- `andWhere('r.typeRencontre IN (:types)')` : le filtre « officiel seulement ».

Plus loin, la méthode filtre aussi par saison (du 1er juillet au 1er juillet suivant), puis `compute()` fait les totaux et les moyennes. `PirbApiController::statsSaison()` envoie le résultat en JSON sur `GET /api/pirb/stats/saison`, et l'onglet Stats de l'app (`Pirb store/app/(tabs)/stats.tsx`) affiche « Points / match », « Rebonds / match », les pourcentages. Les matchs non officiels ne disparaissent pas : ils sont renvoyés à part, dans `horsCompetition`.

### Ce qui reste fragile

- **La promotion est manuelle.** Si personne ne promeut, rien ne remonte chez les joueuses. L'en-tête de `ApiClubStatsLiveController.php` raconte qu'au 04/08/2026, en production, aucune session n'avait jamais été promue.
- **Qui peut saisir dans l'app.** La saisie passe par `rencontreAutorisee()` : il faut un rôle coach, staff ou dirigeant, et, sauf dirigeant, être relié à l'équipe. Un compte seulement « bénévole » ne peut donc pas saisir depuis l'app aujourd'hui.
- **Un point à vérifier.** `regenererToutesPourRencontre()` choisit les joueuses qui ont une action dans **n'importe quelle** session du match, puis ne compte que la session officielle. Une joueuse saisie seulement par un second bénévole pourrait donc recevoir une feuille de match à zéro, qui compterait dans sa moyenne. À tester avant d'affirmer quoi que ce soit.
- **Aucun test automatique** ne couvre la saisie, l'idempotence ou la promotion, et l'app Club n'a jamais été compilée (`instruction/00_ECOSYSTEME.md`).

### Ce que tu dis au jury

« Au bord du terrain, chaque action part dans une boîte d'envoi persistée sur le téléphone, avec un identifiant unique, et l'écran ne bloque jamais. Côté serveur, cet identifiant est stocké avec un index unique : si le réseau coupe et que l'app renvoie, on ne compte pas deux fois le panier. Chaque saisisseur a sa session, et un coach promeut la bonne en officielle, dans une transaction qui garantit une seule officielle par match, puis le service calcule une feuille de match par joueuse. Les moyennes de saison ne prennent que les matchs officiels. La limite que j'assume : la promotion est un geste manuel, et sans elle rien ne remonte aux joueuses. »

## À retenir

- Deux taps dans l'app Club, puis l'action part dans `fileAttente.ts` : persistée, envoyée dans l'ordre, en pause sur 401, rejets visibles.
- Idempotence : chaque action a un `clientUid` ; le serveur renvoie l'existante au lieu d'en créer une, et un index unique protège la base (commit 36a8beb).
- Une `ActionMatch` par action, rangée dans la `SessionStatsLive` du saisisseur ; `PresenceTerrain` donne les minutes jouées.
- Promotion manuelle (`SessionStatsLivePromoteur::promouvoirOfficielle`) : une seule officielle par match, puis génération des `EvaluationMatch`.
- `JoueurStatsAggregator::statsSaison` ne compte que les matchs officiels ; l'app joueuse lit `/api/pirb/stats/saison`.
- Sans promotion, rien ne remonte : c'est la faiblesse principale du circuit.

## Mise en pratique

Sur tes dossiers, en lecture seulement (environ 55 minutes) :

1. Recopie le schéma des neuf étapes sans regarder. Puis vérifie chaque nom de fichier dans tes dossiers.
2. Dans `venaball club-store/src/services/fileAttente.ts`, lis `synchroniser()`. Fais un tableau : code reçu (0, 401, 404, 500), ce que fait la file, et pourquoi.
3. Lance `git --no-optional-locks show 36a8beb` dans `mabb-site`. Liste les quatre fichiers modifiés et explique en une phrase le rôle de chacun.
4. Écris un scénario à la main : « Léa, 2 pts, envoi réussi, réponse perdue, renvoi ». Pour chaque étape, note ce que contient la table `action_match` (une ligne ou deux ?) et pourquoi.
5. Dans `SessionStatsLivePromoteur.php`, trouve les trois choses que fait `promouvoirOfficielle()` après le `commit()`. Puis lis `regenererToutesPourRencontre()` dans `ActionMatchAggregator.php` et dis si le « point à vérifier » de la leçon te semble réel.

C'est réussi quand tu peux expliquer, à quelqu'un qui n'a jamais codé, pourquoi un panier renvoyé deux fois n'est compté qu'une fois, et pourquoi Léa ne voit rien tant que la coach n'a pas validé le match.
