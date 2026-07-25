---
titre: "Les Voters Symfony : des droits qui n'existent que dans UN club"
projet: "venaball"
bloc: 1
themes: ["securite-applicative", "autorisation"]
source: "src/Security/Voter/ClubVoter.php"
date: 2026-07-25
---

## Le concept

Dans Symfony, un **Voter** est une classe qui répond à une seule question : « cet utilisateur a-t-il le droit de faire ça sur cet objet ? ». Dans Venaball, les rôles ne sont pas globaux : un utilisateur est COACH **dans un club précis**, via la table pivot `UserClubRole` (`src/Entity/Core/UserClubRole.php`, décision ADR-0006 — un user peut être COACH dans le club A et PARENT dans le club B). Le `ClubVoter` (`src/Security/Voter/ClubVoter.php`) vérifie donc toujours le couple (rôle, club) :

```php
private function hasMetaRole(User $user, Club $club, string $metaRole): bool
{
    foreach ($user->getUserClubRoles() as $ucr) {
        if (
            $ucr->getClub()?->getId() === $club->getId()
            && $ucr->getRole() === $metaRole
            && $ucr->isActive()
            && $ucr->isStatusActive()   // un rôle "pending" ne donne AUCUN droit
        ) {
            return true;
        }
    }
    return false;
}
```

Le Voter accepte soit un `Club`, soit **n'importe quelle entité** qui implémente `ClubAwareInterface` (Equipe, Joueur, Seance...) — il extrait le club via `getClub()`. Pour protéger une nouvelle entité, il suffit de lui faire implémenter l'interface, sans toucher au Voter : c'est l'Open/Closed Principle, écrit noir sur blanc dans le commentaire de classe. Les attributs disponibles graduent l'accès : `CLUB_MEMBER`, `CLUB_COACH`, `CLUB_STAFF`, `CLUB_ADMIN`, `CLUB_STAFF_ELARGI`, et `CLUB_SECRETARIAT` (dirigeant + secrétaire uniquement, car les contacts de mineures ne sont pas ouverts aux coachs).

## Comment je l'explique au jury

J'ai centralisé toute l'autorisation métier dans un Voter Symfony plutôt que de disperser des `if` dans mes contrôleurs. Mon `ClubVoter` répond à une question simple : est-ce que cet utilisateur a ce rôle-là, dans ce club-là, avec un statut validé. Un rôle en attente de validation par un dirigeant ne donne aucun droit — c'est le workflow pending/active/rejected de mon entité `UserClubRole`. Le Voter est extensible sans modification : toute entité qui implémente `ClubAwareInterface` est automatiquement protégée, le Voter remonte au club par `getClub()`. Et j'ai testé le point critique en unitaire : un coach du club A qui demande un droit sur le club B reçoit `ACCESS_DENIED` — c'est le test `testCoachDuClubANeVotePasPourLeClubB` dans `tests/Unit/Security/Voter/ClubVoterTest.php`.

## La question vicieuse du jury

**« Pourquoi ne pas avoir simplement utilisé les rôles Symfony (`ROLE_COACH`) et la `role_hierarchy` de `security.yaml` ? »**

Parce qu'un rôle Symfony est **global** : si je donnais `ROLE_COACH` à un utilisateur, il serait coach partout, dans tous les clubs — c'est exactement la fuite inter-club que je dois empêcher (risque documenté RT-0009). Mes rôles métier vivent donc en base dans `UserClubRole`, rattachés à un club, avec horodatage et statut de validation : ça me donne en plus un audit (qui a quel rôle, depuis quand) et la possibilité de suspendre un rôle sans le supprimer. Les rôles Symfony ne me servent que pour le transverse : `ROLE_USER` (authentifié) et `ROLE_SUPER_ADMIN` (support cross-club, qui court-circuite le Voter — et ce court-circuit est lui-même testé).
