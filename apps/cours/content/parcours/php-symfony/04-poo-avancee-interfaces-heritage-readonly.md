---
titre: "POO avancée : interfaces, héritage, readonly, constantes"
parcours: "php-symfony"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-25
---

## Le cours

Ta classe `ApiToken` vivait seule. En vrai projet, les classes **collaborent**, et la POO avancée fournit les règles du jeu : interfaces, héritage, immutabilité.

**Une interface est un contrat.** Elle liste des méthodes SANS les coder, et dit : « toute classe qui me signe s'engage à fournir ces méthodes ». Analogie : le règlement FFBB dit « tout arbitre doit savoir siffler une faute » — peu importe QUI arbitre, la table de marque sait qu'elle peut compter dessus.

```php
interface ClubAwareInterface
{
    public function getClub(): ?Club;   // juste la signature, pas de corps
}

class Equipe implements ClubAwareInterface   // « implements » = je signe le contrat
{
    public function getClub(): ?Club { return $this->club; }
}
```

Pourquoi c'est puissant ? Regarde ton `ClubVoter` : il protège les équipes, joueuses, séances… sans connaître AUCUNE de ces classes. Il vérifie juste `$subject instanceof ClubAwareInterface`, puis appelle `$subject->getClub()`. Pour protéger une nouvelle entité demain, tu lui fais implémenter l'interface — **zéro modification du Voter**. Ton propre commentaire dans le fichier le nomme : c'est l'*Open/Closed Principle* (ouvert à l'extension, fermé à la modification), une des lettres de SOLID que le jury adore entendre. Ton `User` signe d'ailleurs deux contrats de Symfony : `implements UserInterface, PasswordAuthenticatedUserInterface` — c'est ce qui permet au système de sécurité de manipuler TON user sans le connaître.

**L'héritage** : `class ClubVoter extends Voter` signifie « ClubVoter EST un Voter, il hérite de tout ce que Voter sait faire, et complète les trous ». La classe parente `Voter` (fournie par Symfony) est dite *abstraite* : elle contient la mécanique générale et déclare deux méthodes que l'enfant DOIT remplir — chez toi `supports()` et `voteOnAttribute()`. Même logique pour tes contrôleurs : `extends AbstractController` leur offre `json()`, `render()`, `denyAccessUnlessGranted()` gratuitement. Règle de choix à retenir : l'héritage dit « JE SUIS un… » (un ClubVoter est un Voter), l'interface dit « JE SAIS FAIRE… » (une Equipe sait donner son club).

**`readonly`** : une propriété `readonly` ne peut être écrite qu'une fois, à la construction. Ton `TenantResolver` combine ça avec la *promotion de propriétés* de PHP 8 :

```php
public function __construct(
    private readonly RequestStack $requestStack,   // déclare + assigne + verrouille, en 1 ligne
    private readonly ClubRepository $clubRepository,
    private readonly Security $security,
) {}
```

Sans promotion, il faudrait déclarer chaque propriété en haut PUIS l'assigner dans le corps du constructeur : trois lignes au lieu d'une. Le `readonly` garantit que personne ne remplacera le repository en cours de route — l'objet est stable de sa naissance à sa mort.

**`final`** : `final class CategorieCalculator` interdit d'hériter de cette classe. Message aux futurs développeurs : « cette règle FFBB ne se personnalise pas par héritage sauvage ».

**Constantes de classe comme énumération.** PHP 8.1 a introduit `enum`, mais ton projet utilise le pattern historique — parfaitement défendable — des constantes groupées :

```php
public const ROLE_COACH = 'COACH';
public const ROLES_DISPONIBLES = [self::ROLE_DIRIGEANT, self::ROLE_COACH, /* ... */];

public static function isValidRole(string $role): bool
{
    return in_array($role, self::ROLES_DISPONIBLES, true);  // la liste se valide elle-même
}
```

Avantage sur des chaînes en vrac : une typo comme `'COCH'` devient impossible (on écrit `UserClubRole::ROLE_COACH`, et l'IDE complète). Si le jury demande « pourquoi pas un enum ? » : réponse honnête — les constantes étaient en place avant, elles font le même travail de centralisation, et une migration vers `enum` serait une évolution propre mais non prioritaire.

## À retenir

- Interface = contrat (« je sais faire »), héritage = filiation (« je suis un ») ; `ClubVoter extends Voter`, `Equipe implements ClubAwareInterface`.
- Grâce à `ClubAwareInterface`, protéger une nouvelle entité ne demande AUCUNE modification du Voter : c'est l'Open/Closed Principle (le O de SOLID).
- `private readonly` dans le constructeur (promotion PHP 8) : dépendances déclarées, assignées et verrouillées en une ligne.
- Les constantes de classe (`UserClubRole::ROLE_COACH`) centralisent les valeurs métier et éliminent les typos — même rôle qu'un enum.

## Mise en pratique

1. Ouvre `src/Security/Voter/ClubVoter.php` : repère `extends Voter` (héritage), les deux méthodes imposées `supports()` et `voteOnAttribute()`, et le test `$subject instanceof ClubAwareInterface`.
2. Dans ce même fichier, lis le commentaire de classe qui mentionne l'Open/Closed Principle, et reformule-le à voix haute avec tes mots : « pour protéger une nouvelle entité, je… ».
3. Retrouve l'interface dans ton projet : dans les `use` en haut du fichier, elle s'appelle `App\Entity\Core\ClubAwareInterface` — clique dessus dans ton IDE (Ctrl+clic) et constate qu'elle ne contient qu'une signature `getClub()`.
4. Ouvre `src/Security/Tenant/TenantResolver.php` et `src/Entity/Core/UserClubRole.php` : dans le premier, identifie les trois propriétés promues `readonly` ; dans le second, la constante `ROLES_DISPONIBLES` et son usage dans `isValidRole()`.

Résultat attendu : tu peux répondre sans hésiter à la question de jury « quelle est la différence entre une interface et une classe abstraite, et où utilisez-vous chacune dans votre projet ? ».
