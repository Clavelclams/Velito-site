---
titre: "« Ce cas ne se produira qu'en V2 » — et la V2 est arrivée"
projet: "venaball"
bloc: 3
themes: ["multi-tenant", "securite-applicative", "architecture"]
source: "src/EventListener/AutoLinkBenevoleListener.php, doc 42 §2.2"
date: 2026-09-09
---

## Le concept

Quand un utilisateur crée un compte, `AutoLinkBenevoleListener` le rattache automatiquement à un club pour qu'il ne se retrouve pas devant une application vide. Le code :

```php
// V1 : on attache à l'unique club actif (forcément MABB en V1).
// Si plusieurs clubs actifs existaient, on prendrait le 1er
// alphabétiquement — mais ce cas ne se produira qu'en V2 quand
// ce listener sera remplacé par une page de choix.
$clubs = $this->em->getRepository(Club::class)->findBy(
    ['isActive' => true],
    ['nom' => 'ASC']
);
$club = $clubs[0];
```

Le commentaire dit tout, et il le dit honnêtement : cette logique repose sur l'hypothèse **« il n'y a qu'un club actif »**. Le développeur savait qu'elle expirerait, l'a écrit, et a décrit ce qui devrait la remplacer.

Le 9 septembre, l'instance Venaball ouvre les inscriptions de clubs. Dès le **deuxième** club validé, l'hypothèse tombe : un nouvel utilisateur — un parent, un bénévole — est rattaché au premier club par ordre alphabétique. Pas à son club. Il voit les joueuses, les séances, les documents d'un club qui n'est pas le sien. C'est une **fuite inter-clubs**, et elle est automatique, silencieuse, et se produit à chaque inscription.

Ce que ce cas enseigne dépasse le bug :

**Une hypothèse écrite en commentaire ne se vérifie jamais.** Le commentaire est juste, mais rien ne le fait respecter. Le jour où la condition change, le code continue de tourner comme si de rien n'était. Une hypothèse vitale doit être une **assertion** : `if (count($clubs) > 1) throw new \LogicException('AutoLink V1 ne gère pas le multi-club')`. Le système se serait arrêté bruyamment à la première inscription sur Venaball, au lieu de rattacher quelqu'un au mauvais club.

**Le multi-tenant se casse aux frontières.** L'isolation entre clubs est bien faite au cœur — Voters, filtrage par `club_id`, tests anti-IDOR. Elle a été oubliée sur un chemin d'entrée : la création de compte. Les fuites multi-tenant sont rarement dans les contrôleurs principaux, elles sont dans les *listeners*, les *commandes*, les *imports*, les *mails* — partout où on a écrit du code « pratique » sans se demander pour quel tenant.

**Une V2 arrive rarement par une décision, souvent par un déploiement.** Personne n'a déclaré « nous passons en V2 ». Un second hébergement a été monté, et le code de V1 s'est retrouvé dans les conditions de V2.

## Comment je l'explique au jury

« J'ai un listener qui rattache un nouvel utilisateur au seul club actif. Le commentaire disait explicitement que ça ne tiendrait qu'en V1, et que plusieurs clubs feraient prendre le premier par ordre alphabétique. Le 9 septembre, l'instance multi-club est en ligne, et ce cas est devenu réel : dès le deuxième club validé, chaque nouvel inscrit est rattaché au mauvais club. C'est une fuite inter-clubs sur un chemin d'entrée que mes Voters et mes tests anti-IDOR ne couvraient pas. La leçon que j'en tire : une hypothèse vitale ne se documente pas, elle s'affirme dans le code — une exception si plus d'un club actif — pour que le système s'arrête bruyamment au lieu de continuer faux. »

## La question vicieuse du jury

**« Vous saviez. C'est écrit dans le commentaire. Pourquoi c'est encore en production ? »**

Parce que je l'ai retrouvé dans un audit de 286 constats, pas en le cherchant, et que j'ai priorisé la mise en ligne de l'instance sur la relecture de tout ce qui suppose « le club = la MABB ». C'est une décision, et elle est discutable. Ce qui l'atténue : aujourd'hui l'instance Venaball n'a qu'un club validé plus un club de démonstration, donc le rattachement tombe soit sur le bon, soit sur la démo — pas encore sur le club d'un tiers. Ce qui ne l'excuse pas : le jour où le deuxième vrai club est validé, la fuite est active, et rien ne me préviendra. La correction est courte — remplacer le rattachement automatique par une page de choix ou un code d'invitation, exactement ce que le commentaire prévoyait — et elle est en tête de la liste des blocages du document d'avancement. Ce que je retiens pour la suite, c'est le réflexe : chaque commentaire qui commence par « en V1 » ou « pour l'instant » est une dette datée, et une dette datée mérite une assertion qui explose à l'échéance plutôt qu'une phrase qu'on relit trop tard.
