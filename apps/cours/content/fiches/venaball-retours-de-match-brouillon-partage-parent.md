---
titre: "Un retour de coach en deux temps, et c'est la joueuse mineure qui décide si son parent le lit"
projet: "venaball"
bloc: 2
themes: ["rgpd", "metier", "modelisation"]
source: "src/Entity/Sport/RetourMatch.php"
date: 2026-10-10
---

## Le concept

Après un match, le coach écrit un mot à chaque joueuse. Avant le 04/10, ce texte vivait dans un champ `notesCoach` de la ligne de stats : visible dès qu'il était tapé, sans auteur, impossible à écrire à une joueuse qui n'avait pas de stats sur le match. Je l'ai sorti dans une entité à part, `src/Entity/Sport/RetourMatch.php` (commits `9b7f4ef` puis `1c95825`), avec trois idées.

**Un retour par auteur.** Index unique `joueur_id + rencontre_id + auteur_id` : si deux coachs écrivent à la même joueuse, ce sont deux retours, chacun signé par son compte (`getSignature()` affiche « Prénom N. »).

**Deux colonnes de texte au lieu d'une : `brouillon` et `publie`.** Le coach tape dans le brouillon, que seul le staff voit. Le bouton « Enregistrer et envoyer les retours » copie le brouillon dans `publie` :

```php
// src/Entity/Sport/RetourMatch.php
/** Brouillon non vide et différent de ce que la joueuse a reçu (rien envoyé, ou modifié depuis). */
public function isAEnvoyer(): bool
{
    return $this->brouillon !== null && $this->brouillon !== $this->publie;
}

/** Copie le brouillon dans la version lue par la joueuse. */
public function publier(\DateTimeImmutable $quand): static
{
    $this->publie = $this->brouillon;
    $this->publieLe = $quand;
    return $this;
}
```

`RetourCoachService::envoyer()` (`src/Service/Stats/RetourCoachService.php`) parcourt les retours de l'auteur connecté sur ce match, publie seulement ceux pour lesquels `isAEnvoyer()` est vrai, flush, puis prévient chaque joueuse par la cloche (`Notification::TYPE_RETOUR_MATCH`) et par un push Expo envoyé **après** le flush : si Expo est en panne, le retour est quand même enregistré. Un retour inchangé n'est pas renvoyé, donc cliquer deux fois ne spamme pas la joueuse. Et si le coach vide son brouillon, la version déjà reçue reste lisible : on ne retire jamais en silence ce que la joueuse a lu.

**Le partage au parent, décidé par la joueuse.** Colonne `visibleParent`, `false` par défaut. Seule une mineure avec au moins un lien parent actif peut la changer (`peutPartagerAvecParent()` : moins de 18 ans aujourd'hui et un `ParentJoueur` actif). La route de l'app, `POST /api/pirb/retours/{id}/parent` dans `src/Controller/Api/PirbApiController.php`, vérifie que le retour est publié et appartient bien à la joueuse connectée (sinon 404), puis applique la règle. Côté parent, `retoursEnvoyes(..., seulementPartages: true)` ajoute `rm.visibleParent = true` dans la requête : le filtre est fait par le serveur, pas par l'écran. Les parents ne sont jamais notifiés.

Sans ce découpage, un coach qui écrit sous le coup de l'émotion serait lu tout de suite, et le parent d'une ado de 16 ans lirait tout ce que le coach lui dit, sans qu'elle ait son mot à dire.

## Comment je l'explique au jury

J'ai modélisé le retour de match comme une entité à part, `RetourMatch`, avec un brouillon et une version publiée, parce qu'un coach doit pouvoir écrire, relire et corriger avant que la joueuse ne lise. L'envoi est un acte explicite : un bouton, qui publie seulement ce qui a changé, puis prévient la joueuse par notification et push, le push étant fait après l'écriture en base pour qu'une panne d'Expo ne fasse rien perdre. Pour les mineures, j'ai choisi que ce soit la joueuse qui décide, retour par retour, si son parent peut le lire : non par défaut, et c'est le serveur qui filtre ce que le parent reçoit. Chaque retour est signé par le compte qui l'a écrit grâce à un index unique joueuse, match, auteur. Toutes les règles de lecture sont dans un seul service, `RetourCoachService`, utilisé par le web, l'espace coach et l'API mobile.

## La question vicieuse du jury

**« Le parent est le représentant légal d'une mineure. De quel droit tu l'empêches de lire ce que le coach écrit à sa fille ? »**

C'est un choix produit que j'ai fait le 04/10, écrit dans `instruction/00_ECOSYSTEME.md` §10.2 (ligne 22) : le retour de match est un échange sportif entre la joueuse et son coach, pas un document administratif. Je ne prétends pas que c'est une obligation du RGPD ; c'est de la minimisation : le parent garde l'accès à tout ce qui relève de sa responsabilité (convocations, autorisations, documents), et ce texte-là n'est partagé que si la joueuse le veut. Le jour de ses 18 ans, la règle se referme d'elle-même : `retoursCoachVisibles()` dans `src/Controller/Manager/JoueurController.php` rappelle `peutPartagerAvecParent()` avant de lire, donc un parent ne voit plus rien, même les retours partagés avant. Je dois aussi être honnête sur trois limites. Un : la majorité est calculée sur la date de naissance saisie dans la fiche ; une date fausse ou absente (`null` donne « pas mineure ») ferme le partage. Deux : aucun test automatisé ne couvre encore `RetourCoachService`, alors que c'est une règle d'accès ; c'est le premier test que j'écrirais (un parent ne voit pas un retour non partagé). Trois : tout le lot est marqué « fait, à tester » dans le journal au 04/10, il n'a pas encore été éprouvé en conditions réelles.
