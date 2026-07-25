---
titre: "Fonctions et typage PHP moderne"
parcours: "php-symfony"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Une fonction, c'est une recette : des ingrédients en entrée (les paramètres), une préparation (le corps), un plat en sortie (le retour). En PHP moderne — celui de ton projet, PHP 8.3 — on **annonce le type** de chaque ingrédient et du plat. C'est ce qu'on appelle le typage, et c'est visible sur quasiment chaque ligne de Venaball.

```php
function calculerXp(int $seances, int $rencontres): int
{
    return $seances * 10 + $rencontres * 25;
}
```

Décodage : `int $seances` signifie « ce paramètre DOIT être un entier », et le `: int` après la parenthèse signifie « cette fonction promet de renvoyer un entier ». Si on lui passe une chaîne quelconque, PHP lève une erreur immédiatement au lieu de laisser un bug silencieux se balader. En JS, rien de tout ça n'existe nativement — c'est un des grands conforts de PHP typé : le langage vérifie ton contrat à ta place.

**Le nullable** est le type que tu verras le plus dans ton code. Un point d'interrogation devant le type signifie « ce type OU null » :

```php
function ageReference(Joueur $joueur, string $saison): ?int
{
    $naissance = $joueur->getDateNaissance();
    if ($naissance === null) {
        return null;   // pas de date connue → on renvoie null, pas un faux zéro
    }
    // ...calcul et retour d'un int
}
```

C'est ta vraie méthode de `CategorieCalculator` : `?int` dit honnêtement « parfois je ne sais pas ». Le code appelant est alors obligé de gérer le cas null — le compilateur de types devient ton filet de sécurité.

Trois outils qui accompagnent le nullable, tous présents dans ton projet :

```php
$appareil = $data['appareil'] ?? null;     // « null coalescing » : valeur si elle existe, sinon null
$date = $p->getSeance()?->getDate();       // « nullsafe » : si getSeance() rend null, on renvoie null sans planter
$xp = self::XP_PAR_TYPE[$type] ?? 10;      // valeur par défaut si la clé n'existe pas
```

Le `?->` (opérateur nullsafe) est l'équivalent du `?.` de JavaScript : il évite le fameux « call on null ».

**Paramètres optionnels** : on leur donne une valeur par défaut, et l'appelant peut les omettre.

```php
function xpSaison(Joueur $joueur, ?string $saison = null): int { /* ... */ }

xpSaison($joueur);              // saison = null → saison courante
xpSaison($joueur, '2025-2026'); // saison explicite
```

**Les fonctions fléchées** `fn` sont les cousines des arrow functions JS, en plus court : une seule expression, et elles capturent automatiquement les variables extérieures :

```php
$sansParent = array_filter($roles, fn($r) => $r !== 'PARENT');
```

Enfin, tu verras en tête de plusieurs de tes fichiers (`ApiToken.php`, `CategorieCalculator.php`) la ligne `declare(strict_types=1);`. Elle dit à PHP : « ne convertis JAMAIS les types en douce ». Sans elle, passer `'10'` (chaîne) à un paramètre `int` serait toléré ; avec elle, c'est une erreur franche. Devant le jury, c'est un argument de rigueur : tu préfères une erreur immédiate et claire à un bug caché.

## À retenir

- `function f(int $a): ?string` : types des paramètres avant leur nom, type de retour après `:`, et `?` = « peut être null ».
- Retourner `null` est un choix métier honnête (« je ne sais pas ») ; les opérateurs `??` et `?->` permettent de le gérer sans planter.
- `declare(strict_types=1)` interdit les conversions de type implicites : erreur immédiate plutôt que bug silencieux.
- `fn($x) => ...` est l'arrow function de PHP : une expression unique, capture automatique des variables.

## Mise en pratique

1. Ouvre `src/Service/Sport/CategorieCalculator.php`.
2. Liste sur papier la signature complète des 4 méthodes publiques (`ageReference`, `categorie`, `categoriePourNaissance`, `estCompatible`) : pour chacune, note les types d'entrée et le type de retour.
3. Pour `categorie()`, explique à voix haute POURQUOI le retour est `?string` et pas `string` (indice : que se passe-t-il si la joueuse n'a pas de date de naissance ?).
4. Ouvre `src/Gamification/XpCalculator.php` et trouve la ligne `$date = $p->getSeance()?->getDate() ?? $p->getRencontre()?->getDate();` — décompose-la : que vaut `$date` si la présence est liée à une rencontre et pas à une séance ?

Résultat attendu : tu sais lire n'importe quelle signature du projet et expliquer au jury que `?int` + `strict_types` = contrat explicite vérifié par le langage.
