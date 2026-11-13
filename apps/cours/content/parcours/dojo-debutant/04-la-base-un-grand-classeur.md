---
titre: "La base de données : un grand classeur"
parcours: "dojo-debutant"
ordre: 4
niveau: "debutant"
duree: 10
date: 2026-11-13
---

## Le cours

Dans le bureau du club, il y a une armoire. Dedans, un gros classeur avec toutes les fiches : joueuses, séances, appels.

```jeu
{ "type": "devine", "question": "La coach coche « présente » et éteint l'iPad. Où est rangée l'information ?", "indice": "Si c'était dans l'iPad, le président ne la verrait pas depuis son ordinateur.", "reponse": "Dans la base de données, sur le serveur. C'est un programme à part (MySQL chez toi) dont le seul métier est de ranger et de retrouver des informations. La page et l'iPad ne gardent rien." }
```

### Le classeur, pièce par pièce

- La **base** de données, c'est le classeur entier.
- Une **table**, c'est un intercalaire : un pour les séances, un pour les présences.
- Une **ligne**, c'est une fiche glissée derrière l'intercalaire.
- Une **colonne**, c'est une case de la fiche. Toutes les fiches d'un même intercalaire ont les mêmes cases.

```jeu
{ "type": "paires", "consigne": "Relie le mot du classeur au mot de la base.", "paires": [["Le classeur entier", "La base"], ["Un intercalaire", "Une table"], ["Une fiche", "Une ligne"], ["Une case de la fiche", "Une colonne"]] }
```

### L'intercalaire « presence »

Une présence, c'est une fiche qui dit : telle joueuse, telle séance, présente ou non. Les colonnes ci-dessous sont les vraies (tu les retrouves dans `src/Entity/Sport/Presence.php`). Les deux lignes, elles, sont inventées pour l'exemple :

```text
id | joueur_id | seance_id | present | motif_absence | source | statut
 1 |        12 |        42 |       1 | (vide)        | manuel | validee
 2 |        15 |        42 |       0 | Malade        | parent | validee
```

`present` vaut 1 pour oui, 0 pour non. `source` dit qui a rempli la fiche : la coach (`manuel`) ou un parent qui a prévenu (`parent`). `joueur_id` ne contient pas un nom, juste le numéro de la fiche de la joueuse dans un autre intercalaire.

```jeu
{ "type": "choix", "question": "Dans la ligne 2, que raconte la fiche ?", "choix": ["La joueuse 15 était présente à la séance 42", "La joueuse 42 était absente à la séance 15", "La joueuse 15 était absente à la séance 42, un parent a prévenu"], "bonne": 2, "explication": "present = 0 veut dire absente, source = parent dit qui a rempli, motif_absence donne la raison." }
```

Une règle est collée sur l'intercalaire :

```php
#[ORM\Table(name: 'presence')]
#[ORM\UniqueConstraint(name: 'unique_seance', columns: ['joueur_id', 'seance_id'])]
```

« Unique » : jamais deux fiches pour la même joueuse à la même séance.

```jeu
{ "type": "vraifaux", "affirmation": "Si la coach refait l'appel, la base ajoute une deuxième fiche pour chaque joueuse.", "vrai": false, "explication": "La règle unique_seance l'interdit. Le code met à jour la fiche qui existe déjà." }
```

### Poser une question au classeur

Pour interroger une base, on parle **SQL** : une langue faite de phrases courtes en anglais. En voici une, écrite pour l'exemple (dans ton projet, c'est l'outil Doctrine qui les écrit à ta place) :

```sql
SELECT joueur_id, present, motif_absence
FROM presence
WHERE seance_id = 42;
```

Traduction : « donne-moi ces trois cases, dans l'intercalaire presence, pour les fiches de la séance 42 ».

```jeu
{ "type": "trous", "consigne": "Complète la requête pour ne garder que les fiches de la séance 42.", "code": "SELECT joueur_id, present\nFROM presence\n___ seance_id = 42;", "choix": ["FROM", "WHERE", "SELECT", "ONLY"], "bonne": 1, "explication": "SELECT choisit les cases, FROM choisit l'intercalaire, WHERE filtre les fiches." }
```

```jeu
{ "type": "cartes", "titre": "Trois mots de SQL", "cartes": [{ "recto": "SELECT", "verso": "Quelles cases je veux lire." }, { "recto": "FROM", "verso": "Dans quel intercalaire (quelle table)." }, { "recto": "WHERE", "verso": "Quelles fiches je garde (le filtre)." }] }
```

## À retenir

- La **base** est un programme à part, sur le serveur, qui range les informations.
- **Table** = intercalaire, **ligne** = fiche, **colonne** = case.
- Une présence = une ligne : telle joueuse, telle séance, présente ou non.
- Une colonne en `_id` pointe vers une fiche d'un autre intercalaire.
- **SQL** est la langue pour interroger : `SELECT` les cases, `FROM` la table, `WHERE` le filtre.

## Mise en pratique

Sur une feuille, dessine l'intercalaire `presence` avec ses colonnes et trois fiches inventées pour la séance 42 : deux présentes, une absente. Puis écris en dessous la requête SQL qui ne ressort que les absentes de cette séance.

C'est réussi quand ta requête contient `WHERE seance_id = 42 AND present = 0` et qu'en la lisant sur ton dessin, tu retombes sur une seule fiche.
