---
titre: "Relier deux tables : le numéro de l'équipe sur la fiche"
parcours: "dojo-debutant"
ordre: 7
niveau: "intermediaire"
duree: 12
date: 2026-11-13
---

## Le cours

La CEC, c'est l'entraînement commun du lundi : sept équipes, des U13 aux U18, sur le même terrain. Pour faire l'appel, il faut la liste des joueuses. Or elles sont déjà rangées dans leurs équipes. Pour rester simple, on prend ici trois des sept équipes : U13 A, U13 B et U13 C.

```jeu
{ "type": "devine", "question": "Pour l'appel de la CEC, tu recopies toutes les joueuses dans une nouvelle liste, ou tu fais autrement ?", "indice": "Une joueuse change d'équipe en janvier. Tu as deux listes. Laquelle est juste ?", "reponse": "On ne recopie rien. On note seulement : la CEC, c'est U13 A + U13 B + U13 C. L'effectif se calcule à chaque appel à partir de ces trois équipes. Une seule liste à tenir à jour." }
```

### Une table, c'est un classeur

Une **table** est un classeur de fiches toutes pareilles : la table `seance`, la table `equipe`. Chaque fiche porte un numéro unique, son `id`. Ce numéro s'appelle la **clé primaire**.

### La clé étrangère : un numéro qui pointe ailleurs

Sur la fiche d'une séance, on ne réécrit pas le nom de l'équipe. On écrit juste **son numéro**. Un numéro qui renvoie vers une autre table s'appelle une **clé étrangère**.

Dans `src/Entity/Sport/Seance.php` :

```php
#[ORM\ManyToOne(targetEntity: Equipe::class, inversedBy: 'seances')]
#[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
#[Assert\NotNull(message: 'L\'équipe est obligatoire.')]
private ?Equipe $equipe = null;
```

`ManyToOne` : plusieurs séances, une seule équipe. `nullable: false` : pas de séance sans équipe.

```jeu
{ "type": "choix", "question": "L'équipe U18 B est renommée. Combien de fiches de séance faut-il corriger ?", "choix": ["Toutes les séances de l'équipe", "Aucune", "Seulement les séances à venir"], "bonne": 1, "explication": "Les séances ne contiennent que le numéro de l'équipe. Le nom est écrit une seule fois, dans la table equipe." }
```

### Plusieurs à plusieurs : la table de liaison

Un groupe contient plusieurs équipes. Une seule case « numéro de l'équipe » ne suffit plus. On ajoute alors une petite table au milieu, la **table de liaison** : une ligne par couple.

Pense à la feuille punaisée au gymnase : « CEC : U13 A », « CEC : U13 B », « CEC : U13 C ».

Cette table s'appelle `equipe_composition`. Elle est créée par `migrations/Version20261112120000.php` et n'a que deux colonnes : `groupe_id` et `equipe_id`. Côté PHP, dans `src/Entity/Sport/Equipe.php` :

```php
#[ORM\ManyToMany(targetEntity: Equipe::class)]
#[ORM\JoinTable(name: 'equipe_composition')]
#[ORM\JoinColumn(name: 'groupe_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
#[ORM\InverseJoinColumn(name: 'equipe_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
private Collection $equipesComposantes;
```

```jeu
{ "type": "trous", "consigne": "Imaginons : la CEC porte le numéro 20 et U13 A le numéro 4. Complète la ligne de la table equipe_composition.", "code": "groupe_id = 20, equipe_id = ___", "choix": ["20", "U13 A", "4", "CEC"], "bonne": 2, "explication": "La table de liaison ne contient que des numéros : celui du groupe, celui de l'équipe. Jamais de nom, jamais de joueuse." }
```

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à son rôle.", "paires": [["Clé primaire", "Le numéro unique d'une fiche"], ["Clé étrangère", "Un numéro qui pointe vers une autre table"], ["Table de liaison", "Une liste de couples entre deux fiches"], ["ManyToOne", "Plusieurs séances pour une seule équipe"]] }
```

```jeu
{ "type": "vraifaux", "affirmation": "Si on supprime le groupe CEC, les équipes U13 A, B et C sont supprimées aussi.", "vrai": false, "explication": "Le CASCADE porte sur la table de liaison : supprimer le groupe retire seulement ses lignes de composition. Les équipes et leurs joueuses ne bougent pas." }
```

## À retenir

- Une **clé primaire** est le numéro unique d'une fiche (`id`).
- Une **clé étrangère** est un numéro qui pointe vers une fiche d'une autre table.
- Une information s'écrit **une seule fois** ; ailleurs, on écrit son numéro.
- Plusieurs à plusieurs : on passe par une **table de liaison** (ici `equipe_composition`).
- L'effectif de la CEC n'est stocké nulle part : il se calcule à partir des équipes reliées.

## Mise en pratique

Ouvre `migrations/Version20261112120000.php` dans `mabb-site`. Repère les deux lignes qui contiennent `FOREIGN KEY`.

Puis, sur une feuille, dessine la table `equipe` avec quatre fiches (CEC, U13 A, U13 B, U13 C, numéros de ton choix) et écris les trois lignes de `equipe_composition`.

C'est réussi quand tu peux répondre sans hésiter à « où est écrite la liste des joueuses de la CEC ? » : nulle part, on la calcule à partir des équipes reliées.
