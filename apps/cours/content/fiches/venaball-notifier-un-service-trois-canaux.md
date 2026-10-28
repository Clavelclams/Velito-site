---
titre: "Un seul service pour prévenir les gens : les contrôleurs agissent, OtmNotifier décide comment le dire"
projet: "venaball"
bloc: 1
themes: ["architecture", "mobile"]
source: "src/Service/Otm/OtmNotifier.php"
date: 2026-10-04
---

## Le concept

Le week-end, un club de basket a besoin de bénévoles à la table de marque : chrono, feuille de match, 24 secondes. Ce sont les **OTM** (officiels de table de marque). Avant le 30/09/2026, le dirigeant plaçait un bénévole sur un poste dans Venaball et... personne ne le prévenait. Il découvrait sa mission le samedi, ou pas du tout.

Prévenir quelqu'un, ça a l'air simple. En réalité il y a **trois canaux** possibles : une notification **in-app** (la cloche du site, enregistrée dans l'entité `Notification`), un **push** (le message qui s'affiche sur le téléphone, envoyé via `ExpoPushService`), et un **mail**. Et il y a au moins **neuf événements** : placé, déplacé, retiré, candidature validée, rejetée, placé d'office, rappel de la veille, nouvelle candidature, indisponibilité. Ces événements partent de plusieurs endroits : le site web (`ManagerRencontreStaffController`), l'API de l'app Club (`ApiClubOrgaController`, `ApiClubMissionController`) et deux commandes lancées par cron (`OtmCloturerCommand`, `OtmRappelCommand`).

Si chacun de ces endroits envoyait lui-même ses push et ses mails, on aurait la même logique copiée cinq fois, avec cinq façons de se tromper. Le commit `c5621ac` fait l'inverse : **un seul point d'entrée**, `src/Service/Otm/OtmNotifier.php`. Les contrôleurs et les commandes disent seulement *ce qui s'est passé* (`$this->notifier->placeAuto($a)`), le service décide *comment* le dire. Tout passe par une méthode privée commune :

```php
// src/Service/Otm/OtmNotifier.php, méthode envoyer()
try {
    foreach ($users as $user) {
        $this->notifications->creer($user, $club, $type, $message, $lienRoute);
    }
    $this->em->flush();
} catch (\Throwable $e) {
    $this->logger->error('OTM : notification in-app non enregistrée', [...]);
}

try {
    $this->push->envoyerAUsers($users, $titre, $message, $data);
} catch (\Throwable $e) {
    $this->logger->error('OTM : push non envoyé', [...]);
}

foreach ($users as $user) {
    try {
        if ($this->tokenRepo->findByUser($user) !== []) {
            continue; // il a l'app, le push suffit
        }
        // (lecture de $email, on saute s'il est vide)
        $this->envoyerMail($email, $titre, $message, $lienRoute);
    } catch (\Throwable $e) {
        $this->logger->warning('OTM : mail non envoyé', [...]);
    }
}
```

Le mécanisme : d'abord la notification in-app pour tout le monde, ensuite le push, enfin le mail **seulement** pour ceux qui n'ont pas de jeton push (pas d'app installée). Celui qui a l'app n'est pas prévenu deux fois. Chaque canal est dans **son propre** `try/catch` : si l'enregistrement in-app échoue, on tente quand même le push ; si le mail d'une personne échoue, on passe à la suivante. Rien ne remonte vers l'appelant.

Le service pose trois règles, écrites dans son en-tête. Une notification ratée ne fait **jamais** échouer l'action métier (le bénévole est placé, même si le mail ne part pas). On n'appelle le service qu'**après** le `flush()` de l'action : on ne prévient pas quelqu'un d'une affectation qui n'existe pas encore en base. Et les responsables à prévenir sont calculés au même endroit (`responsables()` : dirigeants et responsables OTM actifs), avec la même liste que le droit `ClubVoter::CLUB_OTM`.

Sans ce service : ajouter un canal (SMS demain) ou corriger un texte demanderait de modifier cinq fichiers. C'est vérifiable dans le code : aucun des contrôleurs OTM n'injecte `MailerInterface` ni `ExpoPushService`, ils ne connaissent que `OtmNotifier`. La règle vaut pour le domaine OTM, pas pour tout le projet : `ManagerShotChartController` et `AccueilController`, par exemple, utilisent encore directement `NotificationService` ou le mailer.

## Comment je l'explique au jury

« Pour l'organisation du week-end, neuf événements doivent prévenir quelqu'un, et ils partent du web, de l'API mobile et de deux crons. J'ai mis toute la décision dans un seul service, `OtmNotifier` : les contrôleurs disent ce qui s'est passé, le service choisit les canaux. Il crée la notification in-app, envoie un push, et ne fait un mail qu'à ceux qui n'ont pas l'app, pour ne pas doubler. Chaque canal a son propre try/catch, parce qu'un mail en échec ne doit ni bloquer le push ni annuler le placement du bénévole. Et on n'appelle le service qu'après l'enregistrement en base, pour ne jamais annoncer quelque chose qui n'existe pas. »

## La question vicieuse du jury

**« Votre mail envoyé depuis le cron de 2 h 30, le lien dedans pointe vers où ? Et vous êtes sûr qu'il part ? »**

Sur les deux points, je n'ai pas de preuve, et ma propre documentation le dit. En ligne de commande il n'y a pas de requête HTTP, donc Symfony ne connaît pas le domaine : `urlGenerator->generate(..., ABSOLUTE_URL)` s'appuie sur `default_uri` (dans `config/packages/routing.yaml`, lu depuis la variable `DEFAULT_URI`). Si elle est mal réglée sur le serveur, le lien peut sortir en `http://localhost/...`. Le document `45_OTM_NOTIFICATIONS` le signale en §8, et sa liste de vérifications du §9 (lint, migrations, scénarios, pose des crons, lecture des logs) commence par « aucun PHP n'a tourné » et n'est pas cochée.

Pour « il part » : `config/packages/messenger.yaml` route les mails (`SendEmailMessage`) vers un transport `async`. Si ce transport est vraiment asynchrone, `mailer->send()` ne fait que **mettre le mail en file**, et il faut un processus `messenger:consume` pour l'envoyer ; je n'en ai trouvé aucun dans `bin/` ni dans la doc. Mon `try/catch` attrape alors seulement l'échec de mise en file, pas l'échec réel d'envoi. Dernière limite : « a un jeton push » ne veut pas dire « a encore l'app ». Un jeton périmé fait sauter le mail, et le push échoue ; `ExpoPushService` supprime le jeton à la réponse `DeviceNotRegistered`, mais cette première notification est perdue.

Ce que je ferais : un test du rendu d'URL en CLI, la vérification de `DEFAULT_URI` et du transport sur chaque instance, et dérouler la checklist du §9 en cochant chaque ligne avec sa date. Le principe « un seul point d'entrée » reste bon : c'est justement parce qu'il est unique que ces trois corrections tiennent en un seul fichier.
