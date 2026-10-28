---
titre: "Une seule règle pour dire quelle saison on est : quand trois copies de la même date se contredisent"
projet: "venaball"
bloc: 2
themes: ["metier", "architecture"]
source: "src/Service/SaisonService.php"
date: 2026-10-04
---

## Le concept

Dans un club de basket, tout dépend de la **saison** : « 2026-2027 ». Une cotisation appartient à une saison, une équipe aussi, l'XP d'une joueuse se calcule sur une saison. La question « quelle saison sommes-nous ? » a donc l'air triviale. Elle ne l'est pas : la saison ne suit pas l'année civile, et il faut décider à quelle date on bascule.

Jusqu'au 30/09/2026, Venaball avait **plusieurs réponses** à cette question. Le sélecteur de saison basculait au 1er juillet (début administratif FFBB : licences, mutations). Mais trois autres fichiers avaient chacun **leur propre copie** de la règle, avec une bascule au 1er septembre : `CotisationJoueur`, `XpCalculator` et `BadgeChecker` (on le voit dans le diff du commit `d00f6ed`, ils contenaient tous `$mois >= 9`). Conséquence concrète : une cotisation saisie le 15 juillet partait en 2025-2026 sur un écran et en 2026-2027 sur un autre. Pas de plantage, pas d'erreur : juste des chiffres faux selon la page.

C'est un problème classique de **duplication de règle métier** (une règle métier = une décision qui vient du monde réel, ici le calendrier fédéral). Quand une règle est copiée à trois endroits, elle finit toujours par diverger, parce que celui qui modifie la première copie ne sait pas que les deux autres existent.

La correction : **une source de vérité unique** (un seul endroit qui fait foi), dans `src/Service/SaisonService.php` :

```php
private const MOIS_BASCULE = 7;

public static function pourDate(\DateTimeInterface $date): string
{
    $mois  = (int) $date->format('n');
    $annee = (int) $date->format('Y');
    if ($mois >= self::MOIS_BASCULE) {
        return $annee . '-' . ($annee + 1);
    }
    return ($annee - 1) . '-' . $annee;
}

public static function bornes(string $saison): array
{
    $anneeDebut = (int) substr($saison, 0, 4);
    return [
        new \DateTimeImmutable(sprintf('%d-%02d-01 00:00:00', $anneeDebut, self::MOIS_BASCULE)),
        new \DateTimeImmutable(sprintf('%d-%02d-30 23:59:59', $anneeDebut + 1, self::MOIS_BASCULE - 1)),
    ];
}
```

Le mécanisme : `pourDate()` prend une date et rend la saison (« 10/07/2026 » donne « 2026-2027 », « 30/06/2026 » donne « 2025-2026 »). `bornes()` fait l'inverse : une saison donne sa date de début et de fin. Les trois anciens fichiers ne calculent plus rien, ils appellent ces deux méthodes. Par exemple `CotisationJoueur::getSaisonCourante()` se réduit à `return \App\Service\SaisonService::pourDate($ref);`.

Pourquoi des méthodes **statiques** (appelables sans créer d'objet) alors que Symfony pousse à l'injection de dépendances ? Parce qu'une **entité** Doctrine (une classe qui représente une ligne de la base, comme `CotisationJoueur`) ne peut pas recevoir de service injecté. Le commentaire du fichier le dit : « pour que les entités et la gamification (qui ne peuvent pas injecter le service) l'utilisent aussi ». La règle est une fonction pure (même entrée, même sortie, aucune dépendance), donc la rendre statique ne coûte rien.

Le même commit ajoute `src/EventListener/SaisonQueryListener.php` : un **écouteur d'événement** (du code que Symfony exécute automatiquement à chaque requête). Dès qu'une URL contient `?saison=2025-2026` valide, il l'écrit en session. Avant, choisir 2025-2026 sur la page Équipes puis ouvrir une joueuse ramenait en 2026-2027. Là aussi, une seule mémoire au lieu de dix lectures locales.

Sans ce travail : chaque été, les chiffres de juillet-août seraient incohérents entre écrans, et changer la date de bascule demanderait de retrouver toutes les copies à la main, en espérant n'en oublier aucune.

## Comment je l'explique au jury

« Dans Venaball, la saison sportive ne suit pas l'année civile. J'avais la règle de bascule écrite à quatre endroits, une au 1er juillet et trois au 1er septembre, et une cotisation saisie en juillet changeait de saison selon l'écran. J'ai regroupé la règle dans `SaisonService::pourDate()` et `bornes()`, avec une seule constante `MOIS_BASCULE`, et les autres fichiers appellent ces méthodes au lieu de recalculer. Je les ai faites statiques parce que les entités Doctrine ne peuvent pas recevoir de service injecté, et que la règle est une fonction pure. Si la fédération change sa date demain, je modifie une constante. »

## La question vicieuse du jury

**« Vous dites "règle unique". Si je cherche `-09-01` dans votre code, je ne trouve plus rien ? »**

Non, et je préfère le dire avant vous. Il reste deux calculs qui ne passent pas par `SaisonService` : `EvaluationMatchRepository::saisonBounds()` découpe encore la saison du 1er septembre au 31 août (il sert aux stats de match, via `ActionMatchRepository`), et `GenerateurSeancesService::bornesSaisonCourante()` génère les séances à partir du 1er septembre. Pour les séances, c'est défendable : on ne s'entraîne pas en juillet. Pour les stats, c'est sans effet tant qu'aucun match officiel n'a lieu en juillet ou août, mais c'est une deuxième règle, donc une dette. Même chose pour le commentaire d'en-tête de `SaisonService.php`, qui parle encore d'une « bascule au 1er septembre » alors que la constante vaut 7 : le code a raison, le commentaire ment.

Deuxième point honnête : `tests/Unit/Service/SaisonServiceTest.php` existe, mais il teste des invariants (format, ordre, choix en session) et n'appelle jamais `pourDate()` ni `bornes()`. Or `pourDate()` est justement facile à tester, puisqu'elle prend la date en paramètre au lieu de lire l'horloge : `30/06/2026` doit donner `2025-2026`, `01/07/2026` doit donner `2026-2027`. Ce test de frontière est la prochaine chose que j'écris. Il protégerait aussi `bornes()`, qui code en dur le jour « 30 » pour la fin de saison : correct pour juin, faux si quelqu'un repassait la bascule en septembre (la saison finirait le 30 août au lieu du 31).
