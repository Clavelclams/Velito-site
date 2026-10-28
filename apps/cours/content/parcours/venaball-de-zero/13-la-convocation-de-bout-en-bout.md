---
titre: "La convocation de bout en bout"
parcours: "venaball-de-zero"
ordre: 13
niveau: "debutant"
duree: 45
date: 2026-10-04
---

## Le cours

Jeudi soir. La coach des U15 prépare le match de samedi. Elle coche les joueuses qu'elle veut, appuie sur « Envoyer ». Le téléphone de Léa vibre : « Tu es convoquée ». Léa répond « présente ». Sa maman, elle, peut répondre à sa place depuis l'app Club. Samedi matin, la coach voit qui vient.

Ce geste traverse presque tout Venaball : la base, un service, trois contrôleurs, deux apps, un service de notifications. On va suivre le trajet complet, fichier par fichier.

### Le schéma du trajet

```
COACH (web ou app Club)
 1. coche l'effectif, appuie sur Envoyer
      web : formulaire de la fiche rencontre
      app : venaball club-store/app/convocation/[id].tsx  -> api.enregistrerConvocation()
 2. la requête arrive au serveur
      web : src/Controller/Manager/ConvocationController.php      (POST /rencontres/{id}/convocations)
      app : src/Controller/Api/Club/ApiClubConvocationController.php (POST /api/club/rencontres/{id}/convocation)
 3. LA règle métier, la même pour les deux
      src/Service/ConvocationManager.php  -> appliquer()
 4. on enregistre
      src/Entity/Sport/Convocation.php   (table convocation)
      src/Service/NotificationService.php -> Notification (cloche dans l'app)
 5. on prévient le téléphone
      src/Service/ExpoPushService.php    -> serveurs Expo -> Apple / Google
      (jetons rangés dans src/Entity/Core/PushToken.php)

JOUEUSE (app Venaball)
 6. tape la notification -> Pirb store/src/services/push.ts ouvre /convocations
 7. voit et répond      -> Pirb store/app/convocations.tsx
 8. le serveur vérifie  -> src/Controller/Api/PirbApiConvocationController.php

PARENT (app Club, vue parent)
 9. voit et répond pour l'enfant -> venaball club-store/src/components/VueParent.tsx
10. le serveur vérifie           -> src/Controller/Api/Club/ApiClubParentController.php
```

### Étape 0 : la convocation dans la base

Une **entité** (leçon 6) décrit une table. Voici l'essentiel de `src/Entity/Sport/Convocation.php` :

```php
#[ORM\UniqueConstraint(name: 'unique_convocation', columns: ['rencontre_id', 'joueur_id'])]
class Convocation
{
    public const REPONSE_PRESENT   = 'present';
    public const REPONSE_ABSENT    = 'absent';
    public const REPONSE_INCERTAIN = 'incertain';
    public const REPONSES = [self::REPONSE_PRESENT, self::REPONSE_ABSENT, self::REPONSE_INCERTAIN];

    // ...
    private ?Rencontre $rencontre = null;
    private ?Joueur $joueur = null;

    /** Réponse de la joueuse, null = pas encore répondu */
    private ?string $reponse = null;
```

- `UniqueConstraint(... ['rencontre_id', 'joueur_id'])` : une joueuse ne peut être convoquée qu'une fois au même match. La base elle-même refuse le doublon.
- `REPONSE_...` : les trois réponses possibles, écrites une seule fois. Ces **constantes** (des valeurs fixes avec un nom) servent de **liste blanche** : tout le reste est refusé.
- `$rencontre`, `$joueur` : la convocation relie un match et une joueuse.
- `$reponse = null` : tant que Léa n'a pas répondu, la case est vide.

Image du club : c'est la feuille de convocation punaisée au tableau. Une ligne par joueuse, une case « réponse » à cocher.

### Étapes 1 et 2 : deux portes d'entrée

Un **contrôleur** (leçon 8) reçoit la requête et renvoie une réponse. Il y en a deux pour convoquer.

Le contrôleur web, `src/Controller/Manager/ConvocationController.php`, vérifie le droit, le jeton CSRF (protection des formulaires web), puis :

```php
$bilan = $this->convocations->appliquer(
    $rencontre,
    array_map('intval', (array) $request->request->all('joueurs'))
);
```

Le contrôleur de l'API, `src/Controller/Api/Club/ApiClubConvocationController.php`, lit du JSON au lieu d'un formulaire, puis :

```php
$bilan = $this->convocations->appliquer($rencontre, $data['joueurs']);
```

Regarde bien : les deux appellent **la même méthode** du même service. Le commentaire de l'en-tête de `ConvocationController` le raconte : les règles « ont déménagé dans `ConvocationManager` » parce que « les recopier aurait garanti qu'elles divergent un jour ». Le contrôleur web ne garde que ce qui est propre au web (CSRF, message affiché, redirection). Celui de l'API ne fait que « traduire du JSON ».

Les deux portes ne contrôlent pas le droit de la même façon :

- Web : `denyAccessUnlessGranted(ClubVoter::CLUB_STAFF, $rencontre)`, donc dirigeant, coach ou staff **du club** (leçon 11).
- API : `rencontreAutorisee()` vérifie le club **et** que le compte encadre **cette équipe** (lien `CoachEquipe`), sauf pour un dirigeant. Sinon, 404.

L'API est donc plus stricte que le web. C'est un écart à connaître.

### Étape 3 : la règle métier, à un seul endroit

Un **service** (leçon 9) est une classe qui contient la logique, sans s'occuper de l'affichage. `src/Service/ConvocationManager.php` commence par le filtre de sécurité :

```php
$effectif = $this->effectifConvocable($rencontre);

// LE filtre de sécurité : on ne garde que ce qui appartient à l'effectif.
$retenus = array_values(array_intersect(
    array_map('intval', $idsSouhaites),
    array_keys($effectif)
));

$existantes = $this->convocationsExistantes($rencontre);
```

- `effectifConvocable($rencontre)` : la vraie liste des joueuses de l'équipe pour la saison, lue en base (par les affectations d'équipe).
- `array_map('intval', $idsSouhaites)` : on transforme ce que le client a envoyé en nombres entiers.
- `array_intersect(...)` : on ne garde que les numéros présents **à la fois** dans la demande et dans le vrai effectif. Si quelqu'un ajoute à la main le numéro d'une joueuse d'un autre club, il disparaît ici.
- `convocationsExistantes(...)` : les convocations déjà en base pour ce match, pour savoir qui ajouter et qui retirer.

Puis la boucle des ajouts :

```php
foreach ($retenus as $idJoueur) {
    if (isset($existantes[$idJoueur])) {
        continue; // déjà convoquée : on ne touche à rien, on ne re-notifie pas
    }
    $joueur = $effectif[$idJoueur];
    $convocation = new Convocation();
    $convocation->setRencontre($rencontre);
    $convocation->setJoueur($joueur);
    $this->em->persist($convocation);
    // ...
    $user = $joueur->getUser();
    if ($user !== null) {
        $this->notificationService->creer($user, $club, Notification::TYPE_CONVOCATION, /* ... */);
        $aPrevenir[] = $user;
    }
}
```

- `continue` si déjà convoquée : la coach peut rouvrir sa liste dix fois, Léa ne reçoit qu'une notification. Le commentaire du service : « Une notification qu'on spamme est une notification qu'on ignore. »
- `new Convocation()` puis les `set...` : on remplit la nouvelle ligne.
- `persist` : on la prépare pour l'enregistrement.
- `getUser()` : la fiche joueuse est-elle reliée à un compte ? Si non, pas de notification, mais la convocation existe quand même.
- `notificationService->creer(...)` : crée la notification de la cloche (table `notification`).
- `$aPrevenir[] = $user` : on garde la personne de côté pour le push.

Ensuite, une boucle de **retraits** : une joueuse décochée perd sa convocation, même si elle avait répondu. Dans ce cas, le service l'écrit dans le journal (`logger->warning`) pour garder une trace en cas de litige. L'app Club prévient d'ailleurs la coach avant (`retraitsAvecReponse` dans `app/convocation/[id].tsx`).

### Étapes 4 et 5 : enregistrer, puis prévenir

```php
$this->em->flush();

if ($aPrevenir !== []) {
    $this->pushService->envoyerAUsers(
        $aPrevenir,
        'Tu es convoquée',
        $texteNotif,
        ['type' => 'convocation'], // lu par l'app au tap pour ouvrir le bon écran
    );
}
```

- `flush()` : tout part en base d'un coup, convocations et notifications ensemble.
- Le push vient **après** : on ne prévient jamais quelqu'un d'une convocation qui n'existe pas encore.
- `['type' => 'convocation']` : une étiquette cachée dans la notification, pour que l'app sache quel écran ouvrir.

Un **push**, c'est une notification qui s'affiche sur le téléphone même quand l'app est fermée. `src/Service/ExpoPushService.php` ne parle pas directement à Apple et Google : il passe par les serveurs d'**Expo** (l'outil qui fabrique les apps), qui font le pont. Il lit les jetons de chaque appareil dans la table `push_token` (`src/Entity/Core/PushToken.php`). Ces jetons arrivent par `POST /api/pirb/push/token` (`PirbApiPushController.php`), que les deux apps appellent à l'ouverture. Règle écrite en tête du service : « un push ne doit jamais faire échouer l'action métier ». Si Expo est en panne, l'erreur est notée, la convocation reste enregistrée.

### Étapes 6 à 8 : Léa répond

Au tap sur la notification, `Pirb store/src/services/push.ts` lit `data.type === 'convocation'` et ouvre l'écran `/convocations`. Cet écran (`Pirb store/app/convocations.tsx`) appelle `GET /api/pirb/convocations`, puis, quand Léa touche « présente », `POST /api/pirb/convocations/{id}/repondre`. Après chaque réponse, il recharge depuis le serveur : « le serveur est la seule source de vérité ».

Côté serveur, `PirbApiConvocationController.php` applique trois garde-fous :

```php
if ($convocation->getJoueur()?->getId() !== $joueur->getId()) {
    // ... log de la tentative
    return new JsonResponse(['error' => 'Cette convocation ne te concerne pas.'], Response::HTTP_FORBIDDEN);
}
// ...
if (!in_array($reponse, Convocation::REPONSES, true)) {
    return new JsonResponse(['error' => 'Réponse invalide. ...'], Response::HTTP_BAD_REQUEST);
}
if (!$this->peutRepondre($convocation)) {
    return new JsonResponse(['error' => 'Cette rencontre est déjà passée, ...'], Response::HTTP_CONFLICT);
}
```

- Premier `if` : la convocation est-elle bien **à elle** ? Sinon, 403 et la tentative est notée. C'est la protection **IDOR** (changer le numéro dans l'adresse, leçon 11).
- Deuxième `if` : la réponse est-elle dans la liste blanche `REPONSES` ? Sinon, 400.
- Troisième `if` : le match est-il passé ? Si oui, 409 (« conflit » : la demande contredit l'état actuel).

L'app reçoit aussi un champ `peutRepondre` calculé par le serveur, et se contente de griser ses boutons (`CarteConvocation.tsx`).

### Étapes 9 et 10 : le parent répond

Une U11 n'a souvent pas de téléphone. Dans l'app Club, la vue parent (`VueParent.tsx`) appelle `GET /api/club/parent` puis `POST /api/club/parent/convocations/{id}/repondre`. `ApiClubParentController.php` vérifie que la convocation concerne un de **ses** enfants, par un lien `ParentJoueur` validé par le club, et répond 404 sinon. Puis les mêmes règles : liste blanche et match pas encore passé.

### Ce qui est partagé, et ce qui ne l'est pas

Le côté coach est bien centralisé : web et API passent par `ConvocationManager::appliquer()`. Le côté **réponse**, lui, est écrit trois fois : `PirbConvocationsController.php` (web joueuse), `PirbApiConvocationController.php` (app joueuse) et `ApiClubParentController.php` (app parent). Les règles sont les mêmes, mais recopiées. Et elles ne répondent pas pareil à une convocation qui n'est pas la tienne : 403 chez la joueuse, 404 chez le parent.

Autre point lu dans `appliquer()` : seule la joueuse (`$joueur->getUser()`) reçoit notification et push. Les parents ne reçoivent rien au moment de la convocation, ils la voient en ouvrant la vue parent.

### Ce qui n'a jamais été testé en vrai

D'après `instruction/00_ECOSYSTEME.md`, l'app Club n'a jamais été compilée (`eas init` pas fait, pas de `projectId`), et son `push.ts` le dit : sans `projectId`, le push « abandonne, proprement ». L'app joueuse a eu un premier build Android de test le 30/09. Mais aucun document lu ne confirme qu'un push de convocation soit arrivé sur un vrai téléphone : c'est **non vérifié**. Le push ne marche pas non plus dans Expo Go (l'app de test), comme l'explique `Pirb store/src/services/push.ts`. Enfin, aucun test automatique ne couvre `ConvocationManager` ni les contrôleurs de convocation.

### Ce que tu dis au jury

« Quand la coach convoque, que ce soit sur le web ou dans l'app Club, les deux contrôleurs appellent le même service, `ConvocationManager`, donc une seule règle métier. Ce service filtre la liste reçue contre l'effectif réel de l'équipe, ne re-notifie jamais une joueuse déjà convoquée, journalise une réponse effacée, enregistre en une transaction puis envoie le push par Expo, sans jamais faire échouer la convocation si le push rate. La joueuse répond par l'API, qui vérifie que la convocation est la sienne, que la réponse est dans la liste blanche et que le match n'est pas passé. Je sais que la partie réponse est encore recopiée dans trois contrôleurs, et que le push n'a pas encore été validé sur un vrai téléphone. »

## À retenir

- Une convocation = une ligne (rencontre, joueuse), unique, avec une réponse `present`, `absent`, `incertain` ou vide.
- Web et API appellent la même méthode `ConvocationManager::appliquer()` : zéro duplication côté coach.
- Le service filtre les identifiants reçus contre l'effectif réel, ne re-notifie pas, et envoie le push après le `flush`.
- La réponse vérifie trois choses : c'est ta convocation, la réponse est autorisée, le match n'est pas passé.
- Le côté réponse est recopié dans trois contrôleurs, et les parents ne reçoivent pas de push à la convocation.
- Le push n'a jamais été vérifié sur un vrai téléphone ; l'app Club n'a jamais été compilée.

## Mise en pratique

Sur tes dossiers, en lecture seulement (environ 50 minutes) :

1. Recopie le schéma du trajet sur une feuille, sans regarder la leçon. Puis ouvre chaque fichier cité et vérifie que tu ne t'es pas trompé.
2. Dans `mabb-site/src/Service/ConvocationManager.php`, lis la méthode `appliquer()` en entier. Écris en français, une ligne par bloc, ce qu'elle fait (filtre, ajouts, retraits, flush, push, bilan).
3. Ouvre côte à côte `PirbApiConvocationController.php` et `ApiClubParentController.php`. Fais un tableau : garde-fou, code HTTP renvoyé dans chaque fichier. Entoure les différences.
4. Dans `src/Controller/Manager/ConvocationController.php` et `src/Controller/Api/Club/ApiClubConvocationController.php`, note comment chacun vérifie le droit. Écris en deux phrases pourquoi l'API est plus stricte.
5. Rédige une fiche « avant le premier test réel du push » : ce qu'il faut (build EAS, `projectId`, permission acceptée, jeton enregistré) et comment vérifier dans la table `push_token` que le jeton est arrivé.

C'est réussi quand tu peux dérouler, à voix haute et dans l'ordre, les dix étapes du schéma avec le nom du fichier de chaque étape, et citer les deux limites honnêtes (réponse recopiée, push non vérifié).
