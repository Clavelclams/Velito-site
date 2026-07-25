---
titre: "Index et performance : pourquoi une requête est lente"
parcours: "sql"
ordre: 8
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Ta base marche parfaitement avec 50 lignes de test. Puis Venaball accueille 50 000 utilisateurs et l'écran de connexion met trois secondes. Pourquoi ? Parce que sans aide, la base lit la table **en entier** pour trouver une ligne.

Quand tu exécutes `SELECT * FROM "user" WHERE email = 'jean@mabb.fr'`, le SGBD n'a par défaut qu'une stratégie : le **scan séquentiel** (« full table scan ») — lire les 50 000 lignes une par une et garder celles qui matchent. Comme chercher un mot dans un livre en lisant toutes les pages.

Un **index** est exactement l'index alphabétique à la fin du livre : une structure triée (un arbre B-tree) maintenue à côté de la table, qui associe chaque valeur de la colonne à l'emplacement de sa ligne. Chercher dans un arbre trié, c'est ouvrir le dictionnaire au milieu, puis au quart, puis au huitième… quelques dizaines de comparaisons au lieu de 50 000 lectures. Création :

```sql
-- Accélère toutes les recherches par email
CREATE INDEX idx_user_email ON "user" (email);
```

Bonnes nouvelles : tu as déjà des index sans le savoir. Toute **clé primaire** est indexée automatiquement, et toute contrainte **UNIQUE** aussi (c'est en cherchant vite que la base vérifie l'unicité) — donc `user.email` (unique: true) et `club.slug` sont déjà couverts dans Venaball. En revanche, les **clés étrangères ne sont pas indexées automatiquement en PostgreSQL** (MySQL/InnoDB le fait, lui) — or ce sont elles qu'on utilise dans les JOIN. Indexer les colonnes de jointure (`user_club_role.user_id`, `club_id`) est le premier réflexe d'optimisation.

Ton projet contient un exemple volontaire et documenté, dans ApiToken.php :

```php
#[ORM\Index(name: 'idx_api_token_hash', columns: ['token_hash'])]
```

À CHAQUE requête de l'app mobile PIRB, Symfony cherche le jeton par son hash : `SELECT ... WHERE token_hash = ...`. Sans index, chaque appel d'API scannerait toute la table des jetons. Avec, c'est instantané. Voilà une justification de conception toute prête pour le jury.

Alors pourquoi ne pas indexer TOUTES les colonnes ? Parce qu'un index a un **coût** : il occupe du disque, et surtout chaque `INSERT`/`UPDATE`/`DELETE` doit mettre à jour la table ET tous ses index. Trop d'index = écritures lentes. La règle : on indexe les colonnes qui servent **souvent** dans les `WHERE`, les `JOIN` et les `ORDER BY` — pas les autres. Et un index ne sert à rien sur une table minuscule, ni quand le filtre ramène la moitié de la table (autant tout lire), ni avec un `LIKE '%...'` qui commence par un joker (impossible d'utiliser un index alphabétique si on ne connaît pas le début du mot).

Comment **savoir** ce que fait la base ? La commande `EXPLAIN` (les deux SGBD l'ont) affiche le **plan d'exécution** :

```sql
EXPLAIN ANALYZE SELECT * FROM "user" WHERE email = 'jean@mabb.fr';
-- "Seq Scan on user"   → lecture complète : pas d'index utilisé
-- "Index Scan using idx_user_email" → l'index travaille
```

`EXPLAIN ANALYZE` (PostgreSQL) exécute réellement la requête et donne les temps mesurés. Devant le jury, « j'ai vérifié avec EXPLAIN que ma requête utilise l'index » vaut de l'or : c'est la preuve d'une démarche, pas d'une récitation.

## À retenir

- Sans index, un filtre = **scan séquentiel** : la base lit toute la table. Un index (arbre trié) trouve la ligne en quelques comparaisons.
- Clés primaires et contraintes UNIQUE sont **indexées automatiquement** ; les clés étrangères ne le sont pas en PostgreSQL (MySQL/InnoDB si) → indexer les colonnes de JOIN.
- Un index a un coût : chaque écriture le met à jour. On indexe ce qui sert dans **WHERE / JOIN / ORDER BY**, pas tout.
- `EXPLAIN` (et `EXPLAIN ANALYZE`) montre le plan d'exécution : Seq Scan vs Index Scan — l'outil de diagnostic à citer au jury.
- Exemple à réutiliser en soutenance : l'index `idx_api_token_hash` d'ApiToken, interrogé à chaque appel de l'API mobile.

## Mise en pratique

Objectif : mesurer un index réellement, avec EXPLAIN ANALYZE, dans l'éditeur SQL de Supabase.

1. Génère une table volumineuse (PostgreSQL sait fabriquer 200 000 lignes en une requête) :

```sql
CREATE TABLE gros_test (
  id SERIAL PRIMARY KEY,
  email VARCHAR(180) NOT NULL,
  xp INT DEFAULT 0
);
INSERT INTO gros_test (email, xp)
SELECT 'membre' || i || '@venaball.fr', (i * 7) % 1000
FROM generate_series(1, 200000) AS i;
```

2. Mesure SANS index : `EXPLAIN ANALYZE SELECT * FROM gros_test WHERE email = 'membre123456@venaball.fr';` — note le type de scan et l'« Execution Time ».
3. Crée l'index : `CREATE INDEX idx_gros_email ON gros_test (email);`
4. Relance exactement le même `EXPLAIN ANALYZE`. Compare le type de scan et le temps.
5. Contre-exemple : `EXPLAIN ANALYZE SELECT * FROM gros_test WHERE email LIKE '%456@venaball.fr';` — pourquoi l'index est-il ignoré ?
6. Ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/ApiToken.php`, relis l'attribut `#[ORM\Index(...)]` et le commentaire de classe, et formule en une phrase la justification de cet index comme tu la dirais au jury.

Résultat attendu : (2) « Seq Scan », plusieurs millisecondes ; (4) « Index Scan using idx_gros_email », temps divisé massivement (souvent ×100) ; (5) Seq Scan à nouveau — le joker en début de motif interdit l'usage de l'index alphabétique. Tu as maintenant des chiffres mesurés par toi-même à raconter en entretien.
