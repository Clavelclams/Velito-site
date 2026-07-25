---
titre: "RGPD par design : anonymiser plutôt que supprimer, exporter plutôt que promettre"
projet: "venaball"
bloc: 3
themes: ["rgpd", "donnees-personnelles"]
source: "src/Service/Rgpd/RgpdAnonymizer.php"
date: 2026-07-25
---

## Le concept

Le RGPD donne deux droits concrets à implémenter : le **droit à l'effacement** (art. 17) et le **droit d'accès/portabilité** (art. 15 et 20). Dans Venaball, deux services dédiés les portent.

`src/Service/Rgpd/RgpdAnonymizer.php` applique une stratégie assumée : **on anonymise, on ne supprime pas**. Supprimer physiquement le `User` casserait toutes les clés étrangères (présences, stats, convocations) et donc l'historique du club. À la place :

```php
$user->setEmail(sprintf('deleted-%d@anonyme.local', $userId));
$user->setPrenom('Anonyme');
$user->setNom('Utilisateur');
$user->setTelephone(null);
$user->setDateNaissance(null);
// photo : fichier physique supprimé + path null
// puis DELETE dur des UserClubRole, ResetPasswordRequest, ParentJoueur
```

La personne devient non identifiable, mais les stats d'équipe restent exactes — c'est couvert par l'art. 17 §3 (conservation à des fins d'archivage), et le log d'audit ne garde qu'un **hash** de l'ancien email. `src/Service/Rgpd/RgpdExporter.php` fait l'inverse : il assemble en JSON tout ce que l'app détient sur l'utilisateur (profil, rôles par club, logs de connexion, demandes de reset), en excluant les données purement techniques comme le hash de token. Le RGPD irrigue aussi la conception en amont : les décharges de sorties (données de mineures) sont stockées **hors de `public/`** et servies via contrôleur + Voter (RGPD-0010), la pré-inscription publique évite même de collecter l'IP (honeypot au lieu d'un captcha, RGPD-0012).

## Comment je l'explique au jury

Quand un utilisateur demande la suppression de son compte, je n'efface pas sa ligne : je l'anonymise. Son email devient `deleted-{id}@anonyme.local`, son identité devient « Anonyme Utilisateur », sa photo est physiquement supprimée du disque, et tous ses rôles de club sont supprimés en dur. Pourquoi ? Parce qu'une suppression physique casserait l'intégrité référentielle : les feuilles de match et la comptabilité du club pointent vers ce compte. Le règlement le permet explicitement — l'article 17 prévoit la conservation pseudonymisée à des fins d'archivage. En face, mon `RgpdExporter` sert le droit d'accès : un JSON complet et lisible de tout ce que je détiens. Et je suis transparent sur mes limites : mon audit RGPD de juillet a identifié que sept uploaders sur huit écrivent encore dans `public/`, et que le cron de purge annuelle n'est pas versionné — ce sont mes deux priorités avant toute ouverture à d'autres clubs, parce qu'un club, ça contient des mineures.

## La question vicieuse du jury

**« Vous dites "anonymisé", mais l'ID est conservé et les stats restent liées. N'est-ce pas juste de la pseudonymisation, donc toujours des données personnelles ? »**

C'est la bonne distinction, et je l'assume dans le code même : le commentaire de `RgpdAnonymizer` parle bien d'historique « conservé sous forme pseudonymisée ». Juridiquement, la question est de savoir si quelqu'un peut ré-identifier la personne avec des moyens raisonnables : après passage du service, il ne reste ni nom, ni email, ni téléphone, ni date de naissance, ni photo, ni rôle — l'ID seul ne relie plus à personne à l'extérieur de la base. Je connais d'ailleurs le même compromis ailleurs dans mon projet : l'anonymat du feedback de séance est « réel mais faible par design » (documenté dans `07_REGISTRE_SECURITE_RGPD.md`) — la table anti-doublon permettrait en théorie une corrélation temporelle, donc j'ai interdit d'écrire « anonymat garanti » dans l'interface. Savoir nommer précisément ce qui est anonymisé, pseudonymisé ou seulement masqué, c'est exactement ce que le RGPD demande.
