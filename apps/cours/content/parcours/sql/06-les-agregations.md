---
titre: "Agrégations : COUNT, SUM, GROUP BY, HAVING"
parcours: "sql"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Jusqu'ici, tes requêtes renvoyaient des lignes brutes. Aujourd'hui on fait des **statistiques** : combien de membres par club ? Quel total d'XP ? C'est le rôle des **fonctions d'agrégation**, qui compressent plusieurs lignes en une seule valeur :

- `COUNT(*)` : nombre de lignes
- `SUM(xp)` : somme d'une colonne
- `AVG(xp)` : moyenne — `MIN` et `MAX` : extrêmes

```sql
-- Combien d'utilisateurs actifs sur Venaball ?
SELECT COUNT(*) FROM "user" WHERE is_active = true;
```

Une seule ligne de résultat : le total. Nuance à connaître : `COUNT(*)` compte les lignes, `COUNT(ville)` compte les lignes où `ville` **n'est pas NULL** — les NULL sont ignorés par les fonctions d'agrégation.

Le vrai pouvoir arrive avec **GROUP BY** : au lieu d'une statistique globale, tu fais une statistique **par paquet**. Imagine que tu tries physiquement les lignes de `user_club_role` en piles, une pile par club, puis que tu comptes chaque pile :

```sql
-- Nombre de membres actifs PAR club (le tableau de bord dirigeant de Venaball)
SELECT c.nom, COUNT(*) AS nb_membres
FROM user_club_role ucr
INNER JOIN club c ON c.id = ucr.club_id
WHERE ucr.status = 'active'   -- 1. on filtre les lignes AVANT de grouper
GROUP BY c.nom                -- 2. une pile par club
ORDER BY nb_membres DESC;     -- 3. on trie le résultat final
-- MABB  | 42
-- ASVEL | 17
```

Règle d'or, celle que les jurys vérifient : **toute colonne du SELECT doit être soit dans le GROUP BY, soit dans une fonction d'agrégation**. `SELECT c.nom, ucr.role, COUNT(*) ... GROUP BY c.nom` est invalide : dans la pile « MABB », il y a plusieurs rôles différents — la base ne peut pas en afficher UN seul. PostgreSQL refuse net avec une erreur explicite ; MySQL, selon sa configuration (`ONLY_FULL_GROUP_BY`, activé par défaut depuis 5.7), refuse aussi — mais les vieilles versions choisissaient une valeur au hasard, source de bugs légendaires. Différence à citer pour briller.

Et si tu veux filtrer **sur le résultat de l'agrégation** ? Le `WHERE` ne peut pas : il s'exécute avant le groupement, il ne connaît pas encore les comptes. C'est le rôle de **HAVING** :

```sql
-- Les clubs qui ont plus de 20 membres actifs
SELECT c.nom, COUNT(*) AS nb_membres
FROM user_club_role ucr
INNER JOIN club c ON c.id = ucr.club_id
WHERE ucr.status = 'active'   -- filtre les LIGNES (avant groupement)
GROUP BY c.nom
HAVING COUNT(*) > 20;         -- filtre les GROUPES (après groupement)
```

Mémo pour le jury : **WHERE filtre les lignes, HAVING filtre les groupes**. L'ordre logique d'exécution d'une requête complète est : `FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. C'est pour ça qu'un alias défini dans le SELECT (`AS nb_membres`) n'est pas utilisable dans le WHERE : le WHERE s'exécute avant.

On peut grouper sur plusieurs colonnes : `GROUP BY c.nom, ucr.role` crée une pile par couple club+rôle — parfait pour « combien de COACH, de JOUEUR, de PARENT dans chaque club », exactement le genre d'écran de statistiques qu'un dashboard dirigeant de Venaball affiche. Ces requêtes d'agrégation sont celles que Doctrine génère derrière les `->select('COUNT(u.id)')` de tes repositories.

## À retenir

- `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` compressent plusieurs lignes en une valeur ; les **NULL sont ignorés** (`COUNT(colonne)` ≠ `COUNT(*)`).
- `GROUP BY` fait une statistique **par paquet** (par club, par rôle…) au lieu d'un total global.
- Règle d'or : toute colonne du SELECT est **dans le GROUP BY ou dans une agrégation** — sinon erreur.
- **WHERE filtre les lignes avant groupement, HAVING filtre les groupes après** : la phrase à ressortir telle quelle au jury.
- Ordre logique d'exécution : FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.

## Mise en pratique

Objectif : construire les statistiques « dashboard dirigeant » sur le mini-Venaball de la leçon 5 (tables `u_test`, `c_test`, `ucr_test` dans Supabase).

1. Enrichis les données pour que les stats soient parlantes :

```sql
INSERT INTO u_test (prenom) VALUES ('Karim'), ('Sofia');   -- ids 4 et 5
INSERT INTO ucr_test (user_id, club_id, role) VALUES
  (4, 1, 'JOUEUR'), (5, 1, 'JOUEUR'), (2, 1, 'BENEVOLE');
```

2. Compte le nombre total de rôles attribués : une requête, une valeur.
3. Écris la requête « nombre de rôles par club » (jointure vers `c_test`, `GROUP BY`, tri décroissant).
4. Écris la requête « nombre de personnes par rôle dans le club MABB » (`GROUP BY` sur le rôle, `WHERE` sur le club).
5. Avec `HAVING`, affiche uniquement les rôles attribués **au moins 2 fois** au MABB.
6. Piège à tester : essaie `SELECT c.nom, ucr.role, COUNT(*) FROM ucr_test ucr JOIN c_test c ON c.id = ucr.club_id GROUP BY c.nom;` et lis l'erreur de PostgreSQL.

Résultat attendu : (2) 6 ; (3) MABB 5, ASVEL 1 ; (4) JOUEUR 2, COACH 1, PARENT 1, BENEVOLE 1 ; (5) JOUEUR seul ; (6) erreur `column "ucr.role" must appear in the GROUP BY clause or be used in an aggregate function` — c'est la règle d'or énoncée par la base elle-même.
