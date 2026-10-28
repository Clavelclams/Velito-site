---
titre: "La base de données de Venaball : le classeur du club"
parcours: "venaball-de-zero"
ordre: 5
niveau: "debutant"
duree: 30
date: 2026-10-04
---

## Le cours

Quand la coach ouvre la page « Équipes » sur `club.venaball.fr`, elle voit la liste de ses équipes : U13 F, U15 F, Seniors. Quand elle clique sur une équipe, elle voit les joueuses. Le lendemain, elle revient, et tout est encore là. Pourquoi ? Parce que ces informations ne vivent pas dans la page. Elles vivent dans une **base de données**, c'est-à-dire un endroit où le serveur range les informations pour les retrouver plus tard, même après avoir éteint la machine.

Dans cette leçon, on ouvre ce classeur et on regarde comment il est rangé.

### Le classeur du club

Imagine la secrétaire du club. Elle a une armoire avec plusieurs classeurs : un classeur « Licenciées », un classeur « Équipes », un classeur « Matchs ». Une base de données, c'est exactement ça.

- Une **table**, c'est un classeur. Il ne contient qu'une sorte de chose : la table `joueur` ne contient que des joueuses, la table `equipe` que des équipes.
- Une **ligne**, c'est une fiche dans le classeur. Une ligne de la table `joueur`, c'est une joueuse : Léa, U15.
- Une **colonne**, c'est une case imprimée sur chaque fiche : prénom, nom, date de naissance, numéro de licence. Toutes les fiches d'un même classeur ont les mêmes cases.

Le logiciel qui gère cette armoire s'appelle **MySQL** (ou MariaDB, son proche cousin). On lui parle dans un langage appelé **SQL**, un langage fait pour dire « range ça », « retrouve-moi ça ». Chez Venaball, l'instance MABB tourne sur MariaDB 10.4 et l'instance Venaball sur MySQL 8.4 (source : `mabb-site/instruction/PROMPT_DEV_COLLABORATEUR.md`).

### La clé primaire : le numéro de dossier

Deux joueuses peuvent s'appeler Léa Martin. Comment les distinguer sans se tromper ? La secrétaire donne un numéro unique à chaque dossier. En base, ce numéro s'appelle la **clé primaire** : une colonne dont la valeur est unique pour chaque ligne et ne change jamais. Chez Venaball, elle s'appelle toujours `id`, et MySQL la remplit tout seul en comptant 1, 2, 3, et ainsi de suite.

Tu le vois dans chaque entité du projet, par exemple `src/Entity/Sport/Equipe.php` :

```php
#[ORM\Id]
#[ORM\GeneratedValue]
#[ORM\Column]
private ?int $id = null;
```

Ligne par ligne :
- `#[ORM\Id]` : « cette case est le numéro de dossier ».
- `#[ORM\GeneratedValue]` : « c'est la base qui choisit le numéro, pas moi ».
- `#[ORM\Column]` : « c'est une vraie colonne de la table ».
- `private ?int $id = null;` : un nombre entier, vide (`null`) tant que l'équipe n'a pas encore été enregistrée.

On reviendra sur cette écriture en détail dans la leçon 6.

### La clé étrangère : le renvoi vers un autre classeur

Sur la fiche de Léa, la secrétaire n'écrit pas toute la description de son équipe. Elle écrit juste « équipe n°12 ». Si on veut savoir ce qu'est l'équipe 12, on va voir dans le classeur Équipes.

Ce renvoi s'appelle une **clé étrangère** : une colonne qui contient l'`id` d'une ligne d'une autre table. Par convention, elle porte le nom de la table visée suivi de `_id`. Dans la table `joueur`, la colonne `equipe_id` contient l'`id` d'une équipe, et la colonne `club_id` contient l'`id` d'un club.

L'avantage : si le nom de l'équipe change, on le corrige à un seul endroit, et toutes les fiches qui pointent vers elle sont à jour.

### Les relations : 1-N et N-N

Une **relation**, c'est la façon dont deux tables sont liées.

**La relation 1-N** (« un vers plusieurs ») : un club a plusieurs équipes, mais une équipe appartient à un seul club. On la fabrique avec une clé étrangère du côté « plusieurs » : chaque ligne de `equipe` porte un `club_id`. Dans le code, ça s'écrit `ManyToOne` (« plusieurs équipes vers un club »).

**La relation N-N** (« plusieurs vers plusieurs ») : une personne peut avoir plusieurs rôles dans plusieurs clubs, et un club a plusieurs personnes. Une simple colonne ne suffit plus, il faut un classeur intermédiaire, qu'on appelle **table pivot** (ou table de liaison). Chaque fiche de ce classeur dit « telle personne, tel club, tel rôle ».

### Les tables cœur de Venaball

Le projet compte 67 entités, donc environ 67 tables (chiffre du doc maître `instruction/00_ECOSYSTEME.md`). Tu n'as pas besoin de toutes les connaître. Voici les neuf qui portent tout le reste, avec leur vrai nom en base (relevé dans l'attribut `#[ORM\Table]` de chaque entité) :

| Table | Ce qu'elle range | Fichier |
|---|---|---|
| `club` | un club (nom, sigle, `slug` unique) | `src/Entity/Core/Club.php` |
| `user` | un compte (email, mot de passe chiffré, prénom, nom) | `src/Entity/Core/User.php` |
| `user_club_role` | qui a quel rôle dans quel club | `src/Entity/Core/UserClubRole.php` |
| `joueur` | une joueuse licenciée, avec ou sans compte | `src/Entity/Sport/Joueur.php` |
| `equipe` | une équipe pour une saison | `src/Entity/Sport/Equipe.php` |
| `joueur_equipe` | l'affectation d'une joueuse à une équipe pour une saison | `src/Entity/Sport/JoueurEquipe.php` |
| `rencontre` | un match | `src/Entity/Sport/Rencontre.php` |
| `seance` | un entraînement | `src/Entity/Sport/Seance.php` |
| `presence` | Léa était là, ou pas, à telle séance ou tel match | `src/Entity/Sport/Presence.php` |

Un **slug**, c'est un petit nom sans espace ni accent qui sert d'identifiant lisible, par exemple `mabb`. La table s'appelle `` `user` `` avec des accents graves dans le code (`#[ORM\Table(name: '`user`')]`), parce que `user` est un mot que MySQL connaît déjà : les accents graves lui disent « c'est un nom de table, pas ton mot à toi ».

Voici le mini schéma. Lis `──<` comme « un vers plusieurs ».

```
user ──< user_club_role >── club
                              │
          ┌───────────────────┼──────────────────┐
          │                   │                  │
          ▼                   ▼                  ▼
        joueur ──< joueur_equipe >── equipe ──< seance
          │                            │
          │                            └──< rencontre
          │
          └──< presence (vers UNE seance OU UNE rencontre)
```

Deux remarques que le jury aime entendre :

1. **`joueur` et `user` sont séparés.** Le commentaire en tête de `Joueur.php` l'explique : beaucoup de jeunes licenciées ne créent jamais de compte, et un parent peut être lié à plusieurs joueuses. La joueuse existe donc sans compte, et le lien vers `user` est facultatif (`nullable: true`).
2. **`presence` vise une séance OU une rencontre, jamais les deux.** Le commentaire de `Presence.php` explique le choix : une seule table avec deux clés étrangères facultatives, et une règle de validation `isExactlyOneTargetSet()` qui refuse une présence rattachée aux deux ou à aucune. Des contraintes d'unicité empêchent aussi d'enregistrer deux fois Léa à la même séance.

### `club_id` : chaque fiche appartient à un club

Venaball sert plusieurs clubs avec une seule base. Le choix est écrit dans `instruction/08_ADR.md`, ADR-0003 : « Une DB unique. Chaque table metier porte un club_id. » Une **ADR** (Architecture Decision Record), c'est une fiche qui garde la trace d'une décision technique et de sa raison.

Image : une seule armoire pour tous les clubs du département, mais chaque fiche porte un tampon avec le numéro de son club. Tu le vois dans `Equipe.php` :

```php
#[ORM\ManyToOne(targetEntity: Club::class)]
#[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
private ?Club $club = null;
```

- `ManyToOne` : plusieurs équipes pour un club.
- `nullable: false` : une équipe sans club est interdite, la colonne `club_id` ne peut pas être vide.
- `onDelete: 'CASCADE'` : si le club est supprimé, ses équipes partent avec lui.

Le revers, l'ADR le dit honnêtement : « Necessite vigilance absolue : chaque requete metier doit etre filtree par club_id. » Un oubli de filtre, et un club pourrait voir les fiches d'un autre. On verra en leçon 11 qui vérifie ce tampon. Toutes les tables ne portent pas `club_id` directement : `presence` et `joueur_equipe`, par exemple, retrouvent leur club en passant par la joueuse, la séance ou l'équipe.

### Pourquoi `joueur_equipe` existe

Au départ, chaque joueuse avait UNE équipe : la colonne `joueur.equipe_id`. Simple. Puis la réalité du basket est arrivée. Le commentaire en tête de `JoueurEquipe.php` raconte le problème : une U15 qui joue aussi en U18 (un **surclassement**) ne pouvait pas être reliée aux matchs U18. Ses stats de ces matchs ne comptaient pas dans son bilan.

La solution est une table pivot **enrichie** : `joueur_equipe` ne dit pas seulement « Léa est dans l'équipe 12 », elle dit aussi :
- `type` : `principale`, `surclassement`, `doublage` ou `reserve` (les constantes `TYPE_*` du fichier) ;
- `saison` : par exemple `2026-2027`, car on change d'équipe d'une année sur l'autre ;
- `actif` : pour suspendre un surclassement sans l'effacer (blessure, par exemple).

Une contrainte d'unicité (`uniq_joueur_equipe_saison` sur `joueur_id`, `equipe_id`, `saison`) empêche d'affecter deux fois la même joueuse à la même équipe la même saison.

Et l'ancienne colonne `joueur.equipe_id` ? Elle est toujours là pour ne pas casser l'ancien code. Mais la règle du projet, écrite dans `mabb-site/CLAUDE.md`, est claire : pour connaître l'effectif d'une équipe, on lit les affectations `JoueurEquipe` de type principale, pas ce champ historique. Le commentaire de `JoueurEquipe.php` parle d'une synchronisation entre les deux « via service ou listener » : je ne l'ai pas vérifiée, donc considère-la comme non vérifiée.

### Un mot honnête sur `dictionnaire_db.md`

Le fichier `mabb-site/shemas/dictionnaire_db.md` porte un nom rassurant, mais attention. Il a été écrit **avant** le code, pendant la conception : il dit lui-même « Le projet ne contient aucun code source » et prévoit un « Backend (Node.js + MySQL) ». Ses noms de tables (`utilisateurs`, `equipes_joueurs`, `matchs`) ne sont pas ceux de la vraie base (`user`, `joueur_equipe`, `rencontre`). De même, l'ADR-0006 décrit des tables `Role` et `ClubUserRole` qui n'existent pas dans le code : la réalité, c'est `user_club_role` avec le rôle écrit en texte.

Devant le jury, ta source de vérité sur la base, ce sont les entités de `src/Entity/` et les migrations de `migrations/`. Le dictionnaire est un document de conception, utile pour montrer ta démarche, pas pour décrire l'état réel. Mettre à jour ce dictionnaire est une tâche à prévoir.

### Ce que tu dis au jury

« La base de Venaball est une base MySQL unique pour tous les clubs. Chaque table métier porte un `club_id`, c'est la décision ADR-0003, et toute lecture doit être filtrée par club. J'ai séparé la joueuse du compte utilisateur, parce qu'une licenciée n'a pas toujours de compte et qu'un parent peut suivre plusieurs enfants. Pour les surclassements, j'ai remplacé la relation simple joueuse vers équipe par une table pivot enrichie, `joueur_equipe`, qui porte le type d'affectation et la saison. Mon dictionnaire de données date de la conception, la référence actuelle ce sont les entités et les migrations. »

## À retenir

- Table = classeur, ligne = fiche, colonne = case de la fiche. La clé primaire `id` est le numéro de dossier unique.
- Une clé étrangère (`club_id`, `equipe_id`) est un renvoi vers une ligne d'une autre table. Elle fabrique les relations 1-N.
- Une relation N-N passe par une table pivot : `user_club_role` (personne, club, rôle) et `joueur_equipe` (joueuse, équipe, type, saison).
- Une seule base pour tous les clubs, chaque fiche métier tamponnée par son `club_id` (ADR-0003) : c'est puissant mais ça impose de filtrer partout.
- L'effectif d'une équipe se lit dans `joueur_equipe` (type principale), pas dans l'ancien champ `joueur.equipe`.
- `shemas/dictionnaire_db.md` est un document de conception, pas la base réelle.

## Mise en pratique

Dessine sur une feuille le schéma des neuf tables cœur à partir du code, sans regarder cette leçon.

1. Ouvre `src/Entity/Sport/Joueur.php`, `Equipe.php`, `JoueurEquipe.php`, `Seance.php`, `Presence.php`, puis `src/Entity/Core/UserClubRole.php`.
2. Pour chaque fichier, note le nom de la table (`#[ORM\Table(name: ...)]`) et chaque `ManyToOne` : vers quelle entité il pointe, et s'il est `nullable`.
3. Trace une flèche par `ManyToOne`, du côté « plusieurs » vers le côté « un ».
4. Dans la barre de recherche de ton éditeur, cherche `targetEntity: Club::class` dans `src/Entity` et compte les fichiers trouvés.

C'est réussi quand ton dessin contient les neuf tables, que chaque flèche correspond à un vrai `ManyToOne` lu dans le code, et que tu sais expliquer à voix haute, en une phrase chacune, pourquoi `joueur_equipe` et `user_club_role` existent.
