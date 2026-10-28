---
titre: "Les services : là où vit la logique"
parcours: "venaball-de-zero"
ordre: 9
niveau: "debutant"
duree: 35
date: 2026-10-04
---

## Le cours

Le 15 juillet 2026, la secrétaire enregistre la cotisation de Léa, U15. Le même jour, la coach ouvre la page Équipes. Question simple : on est en quelle saison ? Avant le 30 septembre 2026, Venaball pouvait donner **deux réponses différentes** selon l'écran. La cotisation partait en 2025-2026, la page Équipes affichait 2026-2027. Cette leçon raconte pourquoi, et comment les **services** ont réglé le problème.

### Un service : un spécialiste qu'on appelle

Un **service**, c'est une classe PHP qui fait un seul métier, et que tout le reste du code peut appeler. Elle ne reçoit pas de requête, n'affiche pas de page. Elle sait faire une chose, bien.

Image du club : le contrôleur (leçon 8) est l'arbitre. Il ne calcule pas lui-même la catégorie d'âge d'une joueuse ou la saison en cours. Il demande au spécialiste : « l'officiel des licences, quelle catégorie pour Léa ? ». Ce spécialiste, c'est un service.

Venaball en compte une cinquantaine dans `src/Service/` (chiffre du doc maître `00_ECOSYSTEME.md`). On en lit deux : `src/Service/SaisonService.php` et `src/Service/Sport/CategorieCalculator.php`.

### Le problème : une règle recopiée

Le commit `d00f6ed` du 30 septembre 2026 s'intitule « saisons 3a: regle unique (juillet) ». Avec `git --no-optional-locks show d00f6ed`, on voit ce qui a été retiré. Dans `src/Entity/Sport/CotisationJoueur.php`, il y avait :

```php
// Avant septembre : on est encore sur la saison qui a démarré l'an passé.
// Septembre et après : nouvelle saison.
if ($mois < 9) {
    return sprintf('%d-%d', $annee - 1, $annee);
}
```

Dans `src/Gamification/XpCalculator.php`, une autre copie, aussi en septembre. Mais le sélecteur de saison, lui, basculait en **juillet**. Résultat, écrit dans le commentaire du service : « ce qui était saisi en juillet-août partait sur deux saisons différentes selon l'écran ».

Même chose pour les catégories. `EquipeController.php` avait sa propre grille d'âge, avec un « U17 » que la grille fédérale ne connaît pas. Le commentaire ajouté le 30/09 le dit : « deux réponses différentes pour la même joueuse selon l'écran ».

C'est le danger d'une règle recopiée : le jour où elle change, on corrige trois copies sur quatre. La quatrième ment en silence.

### `SaisonService` : la règle à un seul endroit

Voici le cœur du service, raccourci :

```php
class SaisonService
{
    private const PREMIERE_SAISON = '2023-2024';
    private const MOIS_BASCULE = 7;

    public function __construct(private RequestStack $requestStack) {}

    public static function pourDate(\DateTimeInterface $date): string
    {
        $mois  = (int) $date->format('n');
        $annee = (int) $date->format('Y');
        if ($mois >= self::MOIS_BASCULE) {
            return $annee . '-' . ($annee + 1);
        }
        return ($annee - 1) . '-' . $annee;
    }
    // ...
}
```

Ligne par ligne :
- `private const MOIS_BASCULE = 7;` : la règle elle-même. 7 = juillet. Le commentaire du fichier explique : juillet est le début administratif de la saison FFBB (licences, mutations), et l'outil de gestion doit basculer à ce moment-là, même si les matchs reprennent en septembre. Si un jour la règle change, on change ce seul chiffre.
- `public function __construct(private RequestStack $requestStack) {}` : le service a besoin d'un outil, la pile des requêtes, pour lire la session de l'utilisateur. Il ne va pas le chercher lui-même : il le **demande** dans son constructeur. On y revient juste après.
- `public static function pourDate(...)` : `static` veut dire qu'on peut appeler cette méthode sans fabriquer d'objet, avec `SaisonService::pourDate($date)`. Le commentaire explique pourquoi : les entités et la gamification ne peuvent pas recevoir de service, il leur fallait un accès direct à LA règle.
- `$date->format('n')` donne le mois (1 à 12), `format('Y')` l'année sur quatre chiffres. `(int)` transforme le texte en nombre.
- `if ($mois >= self::MOIS_BASCULE)` : à partir de juillet, la saison est « cette année - année suivante ». Le 15/07/2026 donne `2026-2027`.
- Sinon, « année précédente - cette année ». Le 30/06/2026 donne `2025-2026`.

Et maintenant, `CotisationJoueur` ne calcule plus rien, il délègue :

```php
// [30/09/2026] Une seule règle de saison dans tout le projet :
// celle de SaisonService (bascule au 1er juillet). Avant : septembre ici.
return \App\Service\SaisonService::pourDate($ref);
```

Une recherche dans `src/` trouve cinq appels à `SaisonService::pourDate`. Tous posent la même question au même spécialiste.

Le service fait aussi le lien avec le choix de l'utilisateur :

```php
public function getSaisonActive(): string
{
    $session = $this->requestStack->getSession();
    $choix   = (string) $session->get('active_saison', '');

    if ($choix !== '' && $this->isValide($choix)) {
        return $choix;
    }
    return $this->getSaisonCourante();
}
```

- La **session**, c'est la mémoire du serveur pour un utilisateur connecté, d'une page à l'autre.
- Si la coach a choisi une autre saison dans le menu (pour consulter 2024-2025, par exemple) et que ce choix est valide, on le respecte.
- Sinon, on retombe sur la saison calculée par la date.

C'est cette méthode que l'`EquipeController` appelle dans son `getSaisonCourante()` (leçon 8), et que les templates appellent via la fonction Twig `saison_active()` (déclarée dans `src/Twig/SaisonExtension.php`).

### `CategorieCalculator` : U13, U15, calculé depuis l'âge

Deuxième spécialiste, l'officiel des catégories :

```php
private const TRANCHES = [7, 9, 11, 13, 15, 18];

public function ageReference(Joueur $joueur, string $saison): ?int
{
    $naissance = $joueur->getDateNaissance();
    if ($naissance === null) {
        return null;
    }
    $anneeFin = (int) explode('-', $saison)[1];
    return $anneeFin - (int) $naissance->format('Y');
}

public function categoriePourAge(int $age, bool $avecU21 = false): string
{
    foreach (self::TRANCHES as $borne) {
        if ($age <= $borne) {
            return 'U' . $borne;
        }
    }
    // ... U21 si demandé
    return 'Senior';
}
```

- `TRANCHES` : les bornes hautes des catégories fédérales. U7, U9, U11, U13, U15, puis U18.
- `ageReference` : règle FFBB, écrite dans le commentaire du fichier. On ne regarde pas l'anniversaire, seulement l'année de naissance, comparée à l'année de **fin** de saison. `explode('-', '2026-2027')` découpe le texte au tiret, `[1]` prend le second morceau : `2027`.
- Pas de date de naissance ? On renvoie `null` : le service ne devine pas.
- `categoriePourAge` : on parcourt les bornes dans l'ordre ; la première qui est supérieure ou égale à l'âge donne la catégorie. Léa, née en 2013, saison 2026-2027 : 2027 - 2013 = 14. 14 dépasse 7, 9, 11, 13, mais pas 15 : U15.
- Au-delà de 18 : Senior (ou U21 si le club engage une équipe U21).

Le commentaire dit « La grille, en un seul endroit. » C'est exactement la leçon de cette page.

### L'injection de dépendances : l'intendant du club

Comment `EquipeController` obtient-il ces deux spécialistes ? Il ne fait jamais `new SaisonService(...)`. Il les **demande** dans son constructeur :

```php
public function __construct(
    private readonly TenantResolver $tenantResolver,
    private readonly EquipeRepository $equipeRepository,
    private readonly EntityManagerInterface $em,
    private readonly \App\Service\SaisonService $saisonService,
    private readonly \App\Service\Sport\CategorieCalculator $categorieCalculator,
    // ...
) {}
```

C'est l'**injection de dépendances** : une classe déclare de quoi elle a besoin (ses **dépendances**), et quelqu'un d'autre les lui fournit. Ce quelqu'un s'appelle le **conteneur de services** de Symfony.

Image : l'intendant du club. Le coach arrive au gymnase et dit « il me faut un sifflet, un chrono et la feuille de match ». Il ne fabrique pas le chrono : l'intendant le lui donne. Et pour fabriquer le `SaisonService`, l'intendant voit qu'il réclame un `RequestStack`, le lui fournit d'abord, puis donne le service prêt à l'emploi au contrôleur.

Comment le conteneur connaît-il tout ça ? Par `config/services.yaml` :

```yaml
services:
    _defaults:
        autowire: true
        autoconfigure: true
    App\:
        resource: '../src/'
```

- `autowire: true` : « regarde les types demandés dans les constructeurs et fournis-les tout seul ».
- `App\: resource: '../src/'` : « toute classe de `src/` peut être un service ».

Résultat : créer un nouveau service, c'est écrire une classe dans `src/Service/`. Aucune déclaration à ajouter.

### Pourquoi c'est mieux

- **Une règle, un endroit** : changer `MOIS_BASCULE` change la saison partout.
- **Testable seul** : `tests/Unit/Service/SaisonServiceTest.php` et `tests/Unit/Service/Sport/CategorieCalculatorTest.php` existent. Le second vérifie par exemple qu'une joueuse peut jouer au-dessus de sa catégorie mais pas en dessous. On teste la règle sans navigateur ni base. Je n'ai pas lancé ces tests : qu'ils passent aujourd'hui n'est pas vérifié ici.
- **Contrôleurs plus minces** : c'est le remède au contrôleur obèse de la leçon 8.

Deux limites honnêtes. D'abord, aucun test ne vise directement `pourDate()`, la règle de bascule elle-même (une recherche de `pourDate` dans `tests/` ne trouve rien). Ensuite, le commentaire d'en-tête de `SaisonService.php` dit encore « bascule au 1er septembre », alors que la constante dit juillet. Le code a raison, le commentaire est périmé, et un commentaire faux est un piège pour le prochain lecteur.

### Ce que tu dis au jury

« La logique métier vit dans des services, pas dans les contrôleurs. Par exemple, `SaisonService` contient la seule règle de saison du projet, bascule au 1er juillet, et `CategorieCalculator` la seule grille de catégories FFBB. Avant le 30 septembre, la règle de saison était recopiée en trois endroits avec des mois différents, ce qui envoyait une même saisie sur deux saisons ; je l'ai centralisée. Les contrôleurs reçoivent ces services par injection de dépendances, avec l'autowiring de Symfony, ce qui les rend aussi testables séparément. »

## À retenir

- Un service est une classe qui fait un seul métier et que tout le code peut appeler ; ici, `SaisonService` et `CategorieCalculator`.
- Une règle recopiée finit toujours par diverger : avant `d00f6ed`, la saison basculait en septembre dans certains fichiers et en juillet ailleurs.
- `SaisonService::pourDate()` est la règle unique (bascule au 1er juillet) ; `getSaisonActive()` respecte en plus le choix mémorisé en session.
- `CategorieCalculator` : âge = année de fin de saison moins année de naissance, puis grille U7 à U18, U21 en option, Senior.
- Injection de dépendances : la classe déclare ses besoins dans son constructeur, le conteneur (`autowire: true` dans `config/services.yaml`) les fournit.

## Mise en pratique

Vérifie à la main que la règle unique donne les bonnes réponses, puis cherche s'il reste des copies.

1. Avec `pourDate()` sous les yeux, calcule sur papier la saison pour le 30/06/2026, le 01/07/2026 et le 15/01/2027.
2. Avec `CategorieCalculator`, calcule la catégorie en 2026-2027 de trois joueuses fictives nées en 2016, 2013 et 2008.
3. Ouvre `tests/Unit/Service/Sport/CategorieCalculatorTest.php` et compare tes résultats avec les cas testés.
4. Dans `src/`, cherche `'n')` et `>= 9` puis `< 9` : regarde si un fichier calcule encore une saison lui-même au lieu d'appeler `SaisonService`.

C'est réussi quand tes six calculs sont justes et justifiés par une ligne de code, et que tu peux dire, preuve à l'appui, s'il reste ou non une copie de la règle de saison dans `src/`.
