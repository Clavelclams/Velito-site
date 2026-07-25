---
titre: "Doctrine : entités, repositories, relations"
parcours: "php-symfony"
ordre: 7
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Ta base de données parle en tables et en SQL ; ton code PHP parle en objets. **Doctrine** est le traducteur entre les deux — un ORM (Object-Relational Mapper). Grâce à lui, tu n'écris quasiment jamais de SQL : tu manipules des objets `User`, `Club`, et Doctrine génère les `INSERT`, `SELECT`, `UPDATE` correspondants.

**Une entité = une table.** Une entité est une classe PHP ordinaire décorée d'attributs `#[ORM\...]` qui décrivent le mapping :

```php
#[ORM\Entity(repositoryClass: UserRepository::class)]  // « je suis une table »
#[ORM\Table(name: '`user`')]
class User
{
    #[ORM\Id]                          // clé primaire
    #[ORM\GeneratedValue]              // auto-incrémentée par la base
    #[ORM\Column]
    private ?int $id = null;           // null tant que non enregistré

    #[ORM\Column(length: 180, unique: true)]   // colonne VARCHAR(180) + contrainte UNIQUE
    private ?string $email = null;
}
```

Chaque propriété `#[ORM\Column]` devient une colonne, avec ses options (`length`, `nullable: true`, `unique: true`). Détail qui a son importance : `id` est `?int` car un objet fraîchement créé n'a PAS encore d'id — c'est la base qui l'attribuera au moment de l'enregistrement.

**Le duo persist/flush.** Tu l'as vu dans `ApiAuthController` :

```php
$em->persist($token);  // « Doctrine, prends ce nouvel objet en charge »
$em->flush();          // « exécute maintenant le SQL » (INSERT ici)
```

Analogie : `persist` pose l'article dans le caddie, `flush` passe à la caisse. On peut persister dix objets puis flusher UNE fois : une seule transaction, c'est atomique et performant. Pour un objet déjà connu de Doctrine qu'on modifie, `flush()` seul suffit — Doctrine détecte les changements.

**Le repository = le guichet de lecture.** Chaque entité a son repository, la classe qui sait la retrouver : `find($id)`, `findOneBy(['email' => $email])`, `findBy([...])`, plus tes méthodes maison comme `ApiTokenRepository::findValide()`. Écriture via l'EntityManager, lecture via le repository : la séparation est nette.

**Les relations — le cœur de ton modèle.** Ton trio `User` ↔ `UserClubRole` ↔ `Club` est un cas d'école à savoir dessiner au tableau. Un utilisateur peut avoir plusieurs rôles dans plusieurs clubs ; un club a plusieurs membres. C'est du plusieurs-à-plusieurs, mais avec des données EN PLUS sur le lien (le rôle, le statut de validation, la date). La solution classique : une **table pivot** qui est elle-même une entité, `UserClubRole`, avec deux relations `ManyToOne` :

```php
// Dans UserClubRole (côté « propriétaire », celui qui porte la clé étrangère) :
#[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'userClubRoles')]
#[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
private ?User $user = null;      // colonne user_id en base

// Dans User (côté « inverse », la collection miroir) :
#[ORM\OneToMany(targetEntity: UserClubRole::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
private Collection $userClubRoles;
```

Lecture : *plusieurs* UserClubRole pointent vers *un* User (`ManyToOne`), et en miroir un User possède *plusieurs* UserClubRole (`OneToMany`). `inversedBy`/`mappedBy` relient les deux faces de la même relation. En base, seule la table `user_club_role` porte les clés étrangères `user_id` et `club_id`. Le `onDelete: 'CASCADE'` signifie : si on supprime le User, la base supprime ses lignes de rôle — pas de lignes orphelines.

Résultat côté code : `$user->getUserClubRoles()` te donne la collection, et ton `TenantResolver` la parcourt avec un simple `foreach` pour trouver les clubs de l'utilisateur — sans une ligne de SQL. La contrainte `#[ORM\UniqueConstraint(columns: ['user_id', 'club_id', 'role'])]` verrouille le tout : impossible d'être deux fois COACH du même club.

## À retenir

- Doctrine est un ORM : une entité (classe + attributs `#[ORM\...]`) = une table ; tu manipules des objets, il génère le SQL.
- `persist()` met au caddie, `flush()` passe à la caisse (exécute le SQL en une transaction) ; la lecture passe par les repositories.
- `User` ↔ `UserClubRole` ↔ `Club` : un plusieurs-à-plusieurs enrichi via une entité pivot portant deux `ManyToOne` — nécessaire car le LIEN porte des données (rôle, statut, dates).
- `ManyToOne` (porte la clé étrangère, `inversedBy`) et `OneToMany` (collection miroir, `mappedBy`) sont les deux faces d'UNE même relation.

## Mise en pratique

1. Ouvre côte à côte `src/Entity/Core/User.php`, `src/Entity/Core/UserClubRole.php` et `src/Entity/Core/Club.php`.
2. Dessine sur papier le schéma : trois rectangles (tables), les flèches `user_id` et `club_id` partant de `user_club_role`, et les attributs importants du pivot (role, status, roleDemande, valideAt).
3. Dans `UserClubRole.php`, retrouve les deux `#[ORM\ManyToOne]` et leurs `JoinColumn` ; dans `User.php` et `Club.php`, retrouve les `#[ORM\OneToMany]` miroirs. Vérifie la cohérence des paires `inversedBy`/`mappedBy` à voix haute.
4. Question jury à te poser devant le schéma : « pourquoi ne pas avoir utilisé un simple ManyToMany entre User et Club ? » Réponds avec tes mots (le lien porte des données : rôle, workflow de validation pending/active/rejected, audit).

Résultat attendu : ton schéma papier correspond au mapping réel, et la réponse « pivot enrichi » sort naturellement — c'est LA question de modélisation la plus probable sur Venaball.
