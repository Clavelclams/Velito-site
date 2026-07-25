---
titre: "Clés primaires et clés étrangères : le squelette des relations"
parcours: "sql"
ordre: 4
niveau: "debutant"
duree: 25
date: 2026-07-25
---

## Le cours

Reprends l'image de la leçon 1 : les tables se référencent entre elles. Aujourd'hui on regarde le mécanisme exact qui rend ça possible : les **clés**.

La **clé primaire** (PRIMARY KEY) est la carte d'identité d'une ligne : une colonne (souvent `id`) dont la valeur est **unique** et **jamais NULL**. Deux utilisateurs ne peuvent pas avoir le même id. Dans toutes tes entités Venaball, tu retrouves le même trio d'attributs Doctrine :

```php
#[ORM\Id]              // cette propriété est la clé primaire
#[ORM\GeneratedValue]  // la base génère la valeur (auto-incrément)
#[ORM\Column]
private ?int $id = null;
```

Côté SQL, ça devient `id INT AUTO_INCREMENT PRIMARY KEY` en MySQL, `id SERIAL PRIMARY KEY` (ou `GENERATED ALWAYS AS IDENTITY`) en PostgreSQL. L'auto-incrément signifie que la base attribue elle-même 1, 2, 3… à chaque insertion — tu ne choisis jamais l'id à la main.

La **clé étrangère** (FOREIGN KEY) est un renvoi : une colonne qui contient la clé primaire d'une ligne d'une **autre** table. Ouvre `UserClubRole.php` de Venaball :

```php
#[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'userClubRoles')]
#[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
private ?User $user = null;
```

Traduction SQL : la table `user_club_role` a une colonne `user_id` qui contient l'id d'une ligne de `user`. `ManyToOne` se lit « plusieurs UserClubRole pour un User » : Jean (1 user) peut avoir 2 lignes dans `user_club_role` (COACH au MABB, PARENT au MABB). Côté User.php, tu trouves le miroir :

```php
#[ORM\OneToMany(targetEntity: UserClubRole::class, mappedBy: 'user', ...)]
private Collection $userClubRoles;
```

`OneToMany` est la même relation vue de l'autre bout — et détail important pour le jury : cette collection **n'existe pas en base**. Seule la colonne `user_id` (côté ManyToOne) existe ; le OneToMany est une commodité PHP pour naviguer.

La clé étrangère n'est pas qu'un renvoi : c'est une **contrainte d'intégrité référentielle**. La base **refuse** un `user_id` qui ne correspond à aucun utilisateur — impossible de créer un rôle pour un membre fantôme. Et que se passe-t-il si on supprime l'utilisateur référencé ? C'est le `onDelete` qui décide :

- `onDelete: 'CASCADE'` (sur `$user` et `$club` de UserClubRole) : la suppression se propage — supprimer un user supprime ses rôles. Logique : un rôle sans utilisateur n'a aucun sens.
- `onDelete: 'SET NULL'` (sur `$valideParUser` de UserClubRole, ou `$createur` de Club) : la colonne passe à NULL — on garde le rôle validé, on perd juste la trace de QUI l'a validé. La colonne doit être `nullable: true` pour ça.
- Sans règle : la base **bloque** la suppression tant que des lignes référencent l'enregistrement (RESTRICT).

Choisir entre CASCADE et SET NULL est une vraie décision de conception que le jury peut te demander de justifier : « les rôles d'un user supprimé n'ont plus de raison d'exister → CASCADE ; l'historique d'audit doit survivre à la suppression du valideur → SET NULL ».

Une clé peut aussi être **unique sans être primaire** : `email` dans User est `unique: true`. Même garantie d'unicité, mais ce n'est pas l'identifiant de référence des relations.

## À retenir

- **Clé primaire** = identifiant unique et non-NULL d'une ligne, généré par auto-incrément (`#[ORM\Id]` + `#[ORM\GeneratedValue]` dans Doctrine).
- **Clé étrangère** = colonne qui contient la clé primaire d'une autre table (`ManyToOne` + `JoinColumn` → colonne `user_id` en base).
- La clé étrangère est une **contrainte d'intégrité référentielle** : impossible de référencer une ligne qui n'existe pas.
- `onDelete: CASCADE` propage la suppression ; `SET NULL` garde la ligne mais vide la référence ; par défaut la base bloque (RESTRICT). C'est un **choix de conception à justifier**.
- Le côté `OneToMany` n'existe pas en base : seule la colonne du côté `ManyToOne` est réelle.

## Mise en pratique

Objectif : lire les clés dans une entité réelle de Venaball, puis les tester dans Supabase.

1. Ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/UserClubRole.php`. Repère : (a) la clé primaire, (b) les DEUX ManyToOne en CASCADE (`$user`, `$club`), (c) le ManyToOne en SET NULL (`$valideParUser`). Pour chacun, dis à voix haute pourquoi ce choix de `onDelete` est le bon.
2. Ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/ApiToken.php` et trouve sa clé étrangère. Question : pourquoi CASCADE ici ? (Indice : un jeton d'API d'un compte supprimé, ça sert à quoi ?)
3. Dans l'éditeur SQL de Supabase, reconstruis la relation en miniature :

```sql
CREATE TABLE club_mini (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL
);
CREATE TABLE role_mini (
  id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES club_mini(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL
);
INSERT INTO club_mini (nom) VALUES ('MABB');            -- id = 1
INSERT INTO role_mini (club_id, role) VALUES (1, 'COACH');
```

4. Teste l'intégrité référentielle : `INSERT INTO role_mini (club_id, role) VALUES (99, 'JOUEUR');`
5. Teste le CASCADE : `DELETE FROM club_mini WHERE id = 1;` puis `SELECT * FROM role_mini;`

Résultat attendu : étape 4 → erreur `violates foreign key constraint` (le club 99 n'existe pas, la base te protège) ; étape 5 → la suppression du club a entraîné celle du rôle, `role_mini` est vide. Tu viens de voir exactement ce que produisent les attributs `JoinColumn` de UserClubRole.php.
