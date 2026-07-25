---
titre: "La gamification calculée côté serveur : ne jamais laisser le client compter ses points"
projet: "venaball"
bloc: 1
themes: ["securite-applicative", "logique-metier"]
source: "src/Gamification/XpCalculator.php"
date: 2026-07-25
---

## Le concept

Venaball motive les joueuses avec de l'XP, des niveaux et des badges. La règle d'or : **tout est calculé côté serveur**, jamais côté client. L'app mobile ne fait qu'afficher ce que renvoient `GET /api/pirb/niveau` et `/api/pirb/badges` — si le calcul vivait dans le client, n'importe qui pourrait forger une requête et se donner 10 000 XP.

`src/Gamification/XpCalculator.php` recalcule l'XP **à la volée** depuis la table `Presence`, sans jamais stocker le total :

```php
public const XP_SEANCE_PRESENT    = 10;
public const XP_RENCONTRE_PRESENT = 25;
public const XP_ABSENT_SANS_MOTIF = -5;   // pénalité légère pour discipline
public const XP_BONUS_STREAK_5    = 20;   // série de 5 séances consécutives
```

Le commentaire du fichier résume le choix : « L'XP est calculé à la volée depuis la table Presence (single source of truth). Pas de stockage = pas de désynchronisation possible. Si on change le barème, tout le monde voit son XP changer immédiatement. » `src/Gamification/BadgeChecker.php` suit la même logique pour les badges : sa méthode `syncBadges()` est **idempotente** (appelée dix fois, elle ne crée aucun doublon — elle vérifie le couple code+saison avant chaque persist) et elle charge les présences UNE fois en cache local pour ne pas multiplier les requêtes. Subtilité métier défendable : les missions des salariés (`estBenevole=false`) n'alimentent pas l'XP bénévolat mais un axe séparé — sinon on dévaloriserait les vrais bénévoles.

## Comment je l'explique au jury

Ma gamification est entièrement côté serveur : l'app mobile est un simple écran, elle affiche l'XP et les badges que mon API renvoie, et il n'existe aucun endpoint pour « déclarer » de l'XP. La seule matière première, ce sont les présences pointées par le coach — une donnée que la joueuse ne contrôle pas. J'ai fait deux choix structurants. Un : l'XP n'est jamais stocké, il est recalculé à chaque demande depuis la table Presence, donc aucune désynchronisation possible, et si je change le barème tout le monde est à jour instantanément. Deux : mon `BadgeChecker` est idempotent — je peux le rappeler après chaque pointage sans jamais créer un badge en double, parce qu'il vérifie l'existence du couple code+saison avant de persister. Le barème est centralisé en constantes dans une seule classe, ce qui me permet de le tuner sans chercher des valeurs magiques dans tout le code.

## La question vicieuse du jury

**« Recalculer tout l'XP à chaque requête, ça ne va pas s'écrouler avec 1 000 joueuses ? »**

Question anticipée dans le commentaire même de la classe : pour une joueuse normale, moins de 200 présences, le calcul prend quelques millisecondes — et il est fait par joueuse connectée, pas en masse. J'ai appliqué une règle d'ingénierie assumée : ne pas payer aujourd'hui le coût d'une optimisation pour un problème que je n'ai pas encore. Le jour où le club dépasse le millier de joueuses très actives, le plan est déjà écrit : cache Redis ou compteurs matérialisés, et comme tout passe par l'unique `XpCalculator`, l'optimisation se fera à un seul endroit sans toucher ni les contrôleurs ni l'app. À l'inverse, stocker l'XP dès maintenant m'aurait exposé tout de suite au vrai risque : un compteur désynchronisé qui affiche faux — et une gamification qui affiche faux perd toute crédibilité auprès des joueuses.
