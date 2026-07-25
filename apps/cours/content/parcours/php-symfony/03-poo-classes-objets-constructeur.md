---
titre: "POO : classes, propriétés, méthodes, constructeur"
parcours: "php-symfony"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Jusqu'ici on a manipulé des variables en vrac. La programmation orientée objet (POO) consiste à les **regrouper avec les fonctions qui les manipulent** dans une même boîte : la classe. Analogie : une classe est le *moule* (la fiche de licence vierge de la FFBB), un objet est un *exemplaire* rempli (la licence de Naomi). Ton fichier `src/Entity/Core/ApiToken.php` est un exemple parfait et court — c'est notre fil rouge.

```php
class ApiToken
{
    public const VALIDITE = '+30 days';          // constante : partagée par tous les jetons

    private ?int $id = null;                     // propriété : une donnée DE CET objet
    private string $tokenHash = '';
    private \DateTimeImmutable $expiresAt;

    public function __construct()                // constructeur : appelé par « new »
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->expiresAt = new \DateTimeImmutable(self::VALIDITE);
    }

    public function estExpire(): bool            // méthode : un comportement de l'objet
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }
}
```

Décodons les mots-clés un par un.

**`private`** : la propriété n'est lisible et modifiable QUE depuis l'intérieur de la classe. De l'extérieur, on passe par des méthodes publiques (`getTokenHash()`). C'est l'**encapsulation** : la classe garde le contrôle de ses données, comme un trésorier qui ne laisse personne écrire directement dans le cahier de comptes — on lui remet la dépense, il l'enregistre selon SES règles. Preuve dans ton code : `setRole()` de `UserClubRole` refuse un rôle invalide en lançant une exception. Si la propriété était publique, n'importe qui pourrait y mettre `'NIMPORTEQUOI'`.

**`$this`** : à l'intérieur d'une méthode, `$this` désigne l'objet courant, « moi-même ». `$this->expiresAt` = « MA date d'expiration » (celle de ce jeton précis, pas d'un autre).

**Le constructeur `__construct()`** : exécuté automatiquement quand on écrit `new ApiToken()`. C'est le moment d'installer un état de départ valide. Ici, chaque jeton naît avec sa date de création et son expiration à +30 jours — impossible de créer un jeton « sans date ».

**`static` et `self`** : une méthode `static` appartient à la classe elle-même, pas à un objet. On l'appelle avec `NomClasse::methode()`. Regarde la fabrique de ton fichier :

```php
// Appel : [$token, $clair] = ApiToken::creerPour($user);
public static function creerPour(User $user, ?string $appareil = null): array
{
    $clair = bin2hex(random_bytes(32));   // le jeton lisible, montré UNE fois
    $token = new self();                  // self = « cette classe » → new ApiToken()
    $token->tokenHash = hash('sha256', $clair);
    return [$token, $clair];              // l'objet ET le jeton en clair
}
```

Pourquoi une méthode statique plutôt qu'un simple `new` ? Parce que créer un jeton correct demande plusieurs étapes indissociables (générer l'aléa, hasher, associer l'utilisateur). La *fabrique* (« factory method ») garantit qu'aucun jeton mal construit ne peut exister. Note aussi `self::VALIDITE` : c'est ainsi qu'on lit une constante de sa propre classe.

Différence avec le JS que tu connais : les classes JS existent aussi (`class`, `constructor`, `this`), mais PHP ajoute la visibilité (`private`/`public`) et le typage des propriétés (`private ?int $id`), ce qui rend les contrats beaucoup plus stricts — et plus faciles à défendre devant un jury.

## À retenir

- Une classe est un moule, un objet est un exemplaire créé avec `new` ; `$this` désigne l'objet courant.
- `private` + getters/setters = encapsulation : la classe contrôle ses données (ex. `setRole()` qui rejette un rôle invalide).
- Le constructeur `__construct()` garantit qu'un objet naît dans un état valide (un `ApiToken` a TOUJOURS ses dates).
- Une méthode `static` comme `ApiToken::creerPour()` est une fabrique : elle encapsule toutes les étapes d'une création correcte.

## Mise en pratique

1. Ouvre `src/Entity/Core/ApiToken.php` dans ton projet.
2. Surligne (mentalement ou sur une copie) : les constantes, les propriétés, le constructeur, les méthodes d'instance, la méthode statique.
3. Explique à voix haute, comme au jury, le trajet complet de `creerPour()` : d'où vient le jeton en clair, pourquoi on stocke `hash('sha256', $clair)` et jamais `$clair`, et pourquoi la méthode retourne un tableau de deux éléments.
4. Ouvre `src/Controller/Api/ApiAuthController.php` et retrouve la ligne `[$token, $clair] = ApiToken::creerPour($user, ...)` : c'est l'appel réel de ta fabrique. Vérifie que `$clair` part dans la réponse JSON et que `$token` (qui ne contient que le hash) part en base.

Résultat attendu : tu sais raconter sans notes « pourquoi le jeton en clair n'est jamais persisté » — c'est à la fois une leçon de POO (fabrique + encapsulation) et un argument sécurité pour le jury.
