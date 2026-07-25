---
titre: "Lire les données : SELECT, WHERE, ORDER BY, LIMIT"
parcours: "sql"
ordre: 2
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Hier tu as créé une table. Aujourd'hui tu apprends à l'interroger. `SELECT` est LA commande que tu utiliseras 90 % du temps : c'est la question que tu poses à la base, et la base te répond avec un tableau de résultats.

L'anatomie d'une requête de lecture, dans l'ordre où on l'écrit :

```sql
SELECT nom, ville      -- 1. QUELLES colonnes je veux voir
FROM club_test         -- 2. dans QUELLE table
WHERE is_active = true -- 3. avec QUEL filtre sur les lignes
ORDER BY nom ASC       -- 4. triées COMMENT
LIMIT 10;              -- 5. et combien de lignes MAXIMUM
```

Décortiquons. `SELECT nom, ville` : tu listes les colonnes voulues, séparées par des virgules. L'étoile `SELECT *` signifie « toutes les colonnes » — pratique pour explorer, déconseillé en production (tu rapatries des données inutiles, comme le hash du mot de passe alors que tu voulais juste l'email).

`WHERE` filtre les **lignes**. C'est une condition vraie ou fausse, testée ligne par ligne. Tu peux combiner avec `AND` et `OR`, comparer avec `=`, `<>` (différent), `<`, `>`, `>=`, chercher un motif avec `LIKE` :

```sql
-- Les utilisateurs actifs dont l'email finit par @gmail.com
SELECT email, prenom, nom
FROM "user"
WHERE is_active = true
  AND email LIKE '%@gmail.com';  -- % = n'importe quelle suite de caractères
```

Attention piège classique : pour tester une colonne vide, on n'écrit pas `= NULL` mais `IS NULL` (et `IS NOT NULL`). `NULL` signifie « absence de valeur », et rien n'est jamais « égal » à une absence — même pas une autre absence.

```sql
-- Les clubs de Venaball qui n'ont pas renseigné leur numéro FFBB
SELECT nom, slug FROM club WHERE numero_ffbb IS NULL;
```

`ORDER BY` trie le résultat : `ASC` (croissant, par défaut) ou `DESC` (décroissant). On peut trier sur plusieurs colonnes : `ORDER BY ville ASC, nom ASC` trie par ville, puis par nom à l'intérieur de chaque ville. Point important pour le jury : **sans ORDER BY, l'ordre des lignes n'est pas garanti**. La base renvoie les lignes dans l'ordre qui l'arrange.

`LIMIT` coupe le résultat aux N premières lignes. Combiné à `ORDER BY`, il donne des « top N » : les 5 derniers inscrits, par exemple :

```sql
-- Les 5 derniers utilisateurs inscrits sur Venaball
SELECT email, created_at
FROM "user"
ORDER BY created_at DESC  -- du plus récent au plus ancien
LIMIT 5;
```

Différence MySQL/PostgreSQL à connaître pour Venaball : `LIMIT` fonctionne pareil dans les deux, mais les guillemets autour de `"user"` (mot réservé) deviennent des backticks `` `user` `` en MySQL. Et quand Doctrine génère tes requêtes, il traduit tes noms d'attributs camelCase (`createdAt`, `isActive`) en colonnes snake_case (`created_at`, `is_active`) : garde cette correspondance en tête quand tu lis une entité et que tu écris du SQL.

Enfin, tu peux renommer une colonne dans le résultat avec `AS` (un **alias**) : `SELECT prenom AS "Prénom" ...`. Ça ne change rien en base, juste l'affichage — et ça deviendra indispensable dans les jointures et agrégations des prochaines leçons.

## À retenir

- Ordre d'écriture d'une lecture : `SELECT` (colonnes) → `FROM` (table) → `WHERE` (filtre lignes) → `ORDER BY` (tri) → `LIMIT` (nombre max).
- `WHERE` filtre ligne par ligne ; on combine avec `AND`/`OR`, on cherche un motif avec `LIKE '%...%'`.
- `NULL` se teste avec `IS NULL` / `IS NOT NULL`, jamais avec `=`.
- Sans `ORDER BY`, l'ordre du résultat **n'est pas garanti** — à savoir redire tel quel au jury.
- `SELECT *` est pour explorer ; en production on nomme les colonnes utiles (performance et sécurité).

## Mise en pratique

Objectif : interroger une table de membres dans l'éditeur SQL de Supabase.

1. Dans le SQL Editor de Supabase, crée un jeu de données inspiré de Venaball :

```sql
CREATE TABLE membre_test (
  id SERIAL PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(180) NOT NULL,
  ville VARCHAR(100),
  xp INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
INSERT INTO membre_test (prenom, email, ville, xp, is_active) VALUES
  ('Jean',   'jean@mabb.fr',    'Amiens', 120, true),
  ('Naomi',  'naomi@gmail.com', 'Amiens', 340, true),
  ('Karim',  'karim@gmail.com', NULL,      80, false),
  ('Sofia',  'sofia@mabb.fr',   'Lille',  200, true),
  ('Lucas',  'lucas@gmail.com', 'Amiens',   0, true);
```

2. Écris une requête qui affiche `prenom` et `xp` des membres **actifs**, triés du plus d'XP au moins d'XP.
3. Écris une requête qui affiche les membres dont l'email est en `@gmail.com` **et** qui habitent Amiens.
4. Écris une requête qui affiche les membres sans ville renseignée.
5. Écris la requête « top 2 XP » : les 2 meilleurs membres actifs.

Résultat attendu : (2) Naomi 340, Sofia 200, Jean 120, Lucas 0 — Karim exclu car inactif ; (3) Naomi et Lucas ; (4) Karim seul (via `IS NULL`) ; (5) Naomi puis Sofia. Si ta requête 4 avec `ville = NULL` renvoie 0 ligne, c'est normal : c'est le piège du NULL, relis le cours.
