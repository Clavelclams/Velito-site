---
titre: "Une entité lue ligne à ligne : Equipe"
parcours: "venaball-de-zero"
ordre: 6
niveau: "debutant"
duree: 35
date: 2026-10-04
---

## Le cours

Dans la leçon 5, tu as vu le classeur : des tables, des lignes, des colonnes. Mais dans le code PHP de Venaball, tu ne vois presque jamais de tables. Tu vois des fichiers comme `Equipe.php` ou `Joueur.php`. Ces fichiers s'appellent des **entités**. Cette leçon t'apprend à en lire une, ligne par ligne.

On prend `src/Entity/Sport/Equipe.php` (171 lignes) comme fil rouge. `Joueur.php` fait 619 lignes : trop long pour débuter, on n'en prendra que des morceaux.

### Le problème : PHP parle objets, MySQL parle tableaux

PHP manipule des **objets**. Un objet, c'est une petite boîte en mémoire qui regroupe des informations et des actions. Par exemple, une boîte « équipe » avec un nom, une catégorie, et l'action « donne-moi tes joueuses ».

MySQL, lui, ne connaît que des lignes dans des tables. Il faut donc un traducteur. Ce traducteur s'appelle **Doctrine**, et c'est un **ORM** (Object-Relational Mapper) : un outil qui transforme un objet PHP en ligne SQL quand on enregistre, et une ligne SQL en objet PHP quand on lit. Image du club : la secrétaire qui recopie la fiche papier dans le logiciel fédéral, et inversement, sans que le coach ait à connaître le logiciel.

L'entité, c'est la notice que Doctrine lit pour savoir comment traduire.

### Le haut du fichier

```php
namespace App\Entity\Sport;

use App\Entity\Core\Club;
use App\Entity\Core\ClubAwareInterface;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
```

- `namespace App\Entity\Sport;` : un **namespace**, c'est l'adresse du fichier dans le projet, comme « bâtiment Sport, couloir Entity ». Deux classes peuvent porter le même nom si elles sont dans des namespaces différents.
- `use ...;` : « je vais utiliser cette classe qui vit ailleurs, appelle-la par son nom court ». `as ORM` donne un surnom : on écrira `ORM\Column` au lieu du nom complet.

### La déclaration de la classe

```php
#[ORM\Entity(repositoryClass: EquipeRepository::class)]
#[ORM\Table(name: 'equipe')]
#[ORM\HasLifecycleCallbacks]
class Equipe implements ClubAwareInterface
{
    public const CATEGORIES = ['U7','U9','U11','U13','U14','U15','U16','U17','U18','Senior F','Senior H','Loisir Mixte'];
```

- Une **classe**, c'est le moule. `Equipe` est le moule, et chaque équipe réelle (U15 F, Seniors) est un objet fabriqué avec ce moule.
- Les lignes qui commencent par `#[` sont des **attributs** PHP : des étiquettes collées sur le code pour donner des consignes à un outil. Ici, elles parlent à Doctrine.
- `ORM\Entity(repositoryClass: ...)` : « cette classe est une entité, et pour aller chercher des équipes en base, utilise `EquipeRepository` ». Un **repository**, c'est l'archiviste spécialisé d'un classeur : on lui demande « trouve-moi toutes les équipes du club 2 pour 2026-2027 ».
- `ORM\Table(name: 'equipe')` : le nom de la table en base.
- `HasLifecycleCallbacks` : « cette classe a des réflexes automatiques », on les voit plus bas.
- `implements ClubAwareInterface` : la classe signe un contrat. On y revient à la fin.
- `public const CATEGORIES` : une **constante**, une liste fixe que tout le code peut lire. Elle sert à refuser une catégorie inventée.

### Les propriétés et l'attribut `#[ORM\Column]`

Une **propriété**, c'est une case de l'objet. Avec l'étiquette `#[ORM\Column]`, elle devient une colonne de la table.

```php
#[ORM\Column(length: 100)]
#[Assert\NotBlank]
private ?string $nom = null;

#[ORM\Column(length: 30)]
#[Assert\Choice(choices: self::CATEGORIES, message: 'Catégorie invalide.')]
private ?string $categorie = null;

/** Format ISO : "2025-2026" */
#[ORM\Column(length: 9)]
#[Assert\Regex('/^\d{4}-\d{4}$/')]
private ?string $saison = null;

#[ORM\Column(length: 80, nullable: true)]
private ?string $niveau = null;
```

Ligne par ligne :
- `ORM\Column(length: 100)` : une colonne texte de 100 caractères maximum.
- `Assert\NotBlank` : une **contrainte de validation**. Ce n'est pas Doctrine, c'est le validateur de Symfony : si la coach laisse le nom vide dans le formulaire, il refuse et affiche une erreur.
- `private` : seule la classe elle-même peut toucher directement à cette case. Les autres doivent passer par des méthodes (les getters et setters, plus bas).
- `?string` : « du texte, ou rien (`null`) ». Le `?` veut dire « peut être vide ».
- `Assert\Choice(choices: self::CATEGORIES)` : la catégorie doit faire partie de la liste constante.
- `Assert\Regex('/^\d{4}-\d{4}$/')` : une **expression régulière**, un motif de texte. Ici : quatre chiffres, un tiret, quatre chiffres. `2026-2027` passe, `2026/27` est refusé.
- `nullable: true` : en base, la colonne `niveau` peut rester vide. Sans cette option, elle serait obligatoire.

Doctrine transforme aussi les noms : la propriété `createdAt` devient la colonne `created_at` (stratégie de nommage `underscore_number_aware`, réglée dans `config/packages/doctrine.yaml`).

### La relation `#[ORM\ManyToOne]`

```php
#[ORM\ManyToOne(targetEntity: Club::class)]
#[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
private ?Club $club = null;
```

- `ManyToOne(targetEntity: Club::class)` : plusieurs équipes vers un club. Côté PHP, la propriété contient un **objet** `Club` entier, pas un numéro. Côté MySQL, Doctrine stocke seulement le numéro dans la colonne `club_id`. C'est tout le travail du traducteur.
- `JoinColumn(nullable: false, ...)` : la colonne `club_id` est obligatoire.
- `onDelete: 'CASCADE'` : si le club disparaît, ses équipes aussi.

Dans `Joueur.php`, tu trouves la même chose pour l'équipe, avec une nuance :

```php
/** Affectation équipe, peut être null (joueuse en attente d'équipe) */
#[ORM\ManyToOne(targetEntity: Equipe::class, inversedBy: 'joueurs')]
#[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
private ?Equipe $equipe = null;
```

Ici, `nullable: true` et `SET NULL` : si l'équipe est supprimée, la joueuse n'est pas effacée, sa case équipe est juste vidée. Logique : on ne jette pas une licenciée parce que son équipe a disparu. `inversedBy: 'joueurs'` dit à Doctrine que l'autre côté de cette relation s'appelle `joueurs` dans `Equipe`.

### L'autre côté : `#[ORM\OneToMany]`

```php
/** @var Collection<int, JoueurEquipe> */
#[ORM\OneToMany(targetEntity: JoueurEquipe::class, mappedBy: 'equipe', cascade: ['remove'])]
private Collection $affectations;
```

- `OneToMany` : une équipe vers plusieurs affectations. C'est le miroir du `ManyToOne` qui se trouve dans `JoueurEquipe.php`.
- `mappedBy: 'equipe'` : « la vraie colonne est de l'autre côté, dans la propriété `equipe` de `JoueurEquipe` ». Ce côté-ci ne crée aucune colonne dans la table `equipe`.
- `Collection` : une liste d'objets que Doctrine remplit quand on la lit.
- `cascade: ['remove']` : si on supprime l'équipe avec Doctrine, ses affectations sont supprimées aussi.

### Le constructeur et le réflexe automatique

```php
public function __construct()
{
    $this->joueurs = new ArrayCollection();
    $this->seances = new ArrayCollection();
    $this->rencontres = new ArrayCollection();
    $this->affectations = new ArrayCollection();
}

#[ORM\PrePersist]
public function onPrePersist(): void
{
    $this->createdAt = new \DateTimeImmutable();
}
```

- Le **constructeur** (`__construct`) s'exécute à chaque `new Equipe()`. Il prépare des listes vides, pour qu'on puisse y ajouter des éléments sans erreur.
- `#[ORM\PrePersist]` : le réflexe annoncé par `HasLifecycleCallbacks`. Juste avant le premier enregistrement, Doctrine appelle cette méthode, qui note la date de création. Personne n'a à y penser.

### Getters et setters

```php
public function getNom(): ?string { return $this->nom; }
public function setNom(string $nom): static { $this->nom = $nom; return $this; }
```

- Un **getter** (`getNom`) lit une case privée et renvoie sa valeur.
- Un **setter** (`setNom`) écrit dans la case. `: static` et `return $this` permettent d'enchaîner : `$equipe->setNom('U15 F')->setSaison('2026-2027');`.

Pourquoi ne pas rendre les propriétés publiques ? Parce qu'un setter peut contrôler ce qu'on lui donne. Dans `JoueurEquipe.php`, `setType()` refuse un type qui n'est pas dans la liste et lance une erreur. Dans `Joueur.php`, `setEmailParent1()` met l'adresse en minuscules et retire les espaces. Le guichet filtre ce qui entre.

### Ce que fait vraiment Doctrine

Dans un contrôleur (leçon 8), créer une équipe ressemble à ça :

```php
$this->em->persist($equipe);
$this->em->flush();
```

`em` est l'**EntityManager**, le chef du traducteur. `persist` dit « surveille ce nouvel objet ». `flush` dit « maintenant, écris tout en base ». C'est à ce moment-là que Doctrine fabrique l'ordre SQL `INSERT INTO equipe ...` à ta place. Tu ne l'as jamais écrit, mais il existe.

### `ClubAwareInterface` : le contrat du tampon club

Une **interface**, c'est un contrat : une liste de méthodes qu'une classe promet d'avoir. Le fichier `src/Entity/Core/ClubAwareInterface.php` ne contient qu'une promesse :

```php
interface ClubAwareInterface
{
    public function getClub(): ?Club;
}
```

« Toute classe qui signe ce contrat sait dire à quel club elle appartient. » `Equipe`, `Joueur`, `Seance` et `Rencontre` le signent. Pourquoi c'est utile ? Le gardien des droits, `ClubVoter` (leçon 11), n'a pas besoin de connaître chaque type d'objet. Il demande juste `getClub()` et compare avec les clubs de l'utilisateur. Le commentaire du fichier parle d'**Open/Closed Principle** : on protège une nouvelle entité en lui faisant signer le contrat, sans modifier le gardien.

Un point honnête : le commentaire de l'interface cite `Presence` comme exemple d'entité qui « délègue » son club via sa séance ou sa rencontre. En lisant `src/Entity/Sport/Presence.php`, on voit qu'elle ne signe pas le contrat (`class Presence` sans `implements`). Le commentaire décrit donc une intention, pas l'état du code. C'est à corriger, ou au moins à savoir.

### Ce que tu dis au jury

« Une entité est une classe PHP que Doctrine sait traduire en table. Les attributs `#[ORM\Column]` décrivent les colonnes, `#[ORM\ManyToOne]` crée une clé étrangère, et les contraintes `Assert` valident les saisies avant l'enregistrement. Les propriétés sont privées et passent par des getters et setters, qui peuvent nettoyer ou refuser une valeur. Mes entités métier implémentent `ClubAwareInterface`, ce qui permet à un seul voter de vérifier le club de n'importe quel objet. »

## À retenir

- Une entité est une classe PHP décrite par des attributs `#[ORM\...]` ; Doctrine, l'ORM, la traduit en table et en lignes SQL.
- `#[ORM\Column]` = une colonne ; `nullable: true` = elle peut être vide ; les `#[Assert\...]` valident les saisies côté Symfony.
- `#[ORM\ManyToOne]` crée la clé étrangère (`club_id`) ; `#[ORM\OneToMany(mappedBy: ...)]` est le miroir, sans colonne.
- Propriétés privées, accès par getters et setters : le setter peut filtrer (`setType()` refuse un type inconnu).
- `persist()` puis `flush()` : c'est au `flush` que Doctrine écrit vraiment en base.
- `ClubAwareInterface` impose `getClub()`, ce qui permet au `ClubVoter` de contrôler n'importe quelle entité métier.

## Mise en pratique

Lis `src/Entity/Sport/Seance.php` (160 lignes) seule, avec cette leçon à côté.

1. Note le nom de la table et le contrat que la classe signe.
2. Pour chaque propriété jusqu'à `$notes`, écris en une phrase : son type PHP, si elle peut être vide en base, et la contrainte `Assert` éventuelle.
3. Trouve les deux `ManyToOne` vers `Club` et `Equipe` et explique la différence avec le `ManyToOne` vers `ContenuSeance` (regarde `nullable` et `onDelete`).
4. Explique ce qui se passe pour les présences d'une séance si on la supprime (indice : `OneToMany` vers `Presence`, option `cascade`).

C'est réussi quand tu peux expliquer à voix haute, sans notes, ce que deviennent une séance, ses présences et sa joueuse si le club est supprimé, et justifier chaque réponse par une ligne précise du fichier.
