---
titre: "Les jointures : relier User, UserClubRole et Club"
parcours: "sql"
ordre: 5
niveau: "intermediaire"
duree: 30
date: 2026-07-25
---

## Le cours

Tu sais que `user_club_role` contient des renvois (`user_id`, `club_id`). Mais un `SELECT * FROM user_club_role` t'affiche des numéros : `user_id = 4, club_id = 1, role = 'COACH'`. Illisible pour un humain. La **jointure** (JOIN) recolle les morceaux : elle combine les lignes de plusieurs tables en suivant les clés étrangères.

Question métier Venaball : « qui a quel rôle dans quel club ? ». Trois tables sont impliquées — `user`, `user_club_role`, `club` :

```sql
SELECT u.prenom, u.nom, ucr.role, c.nom AS club
FROM user_club_role ucr                      -- table de départ (le pivot)
INNER JOIN "user" u ON u.id = ucr.user_id    -- recolle l'utilisateur
INNER JOIN club c   ON c.id = ucr.club_id    -- recolle le club
WHERE ucr.status = 'active';                 -- seulement les rôles validés
```

Lis-la comme une phrase : « pour chaque ligne de `user_club_role`, va chercher la ligne de `user` dont l'id égale `user_id`, et la ligne de `club` dont l'id égale `club_id` ». Le `ON` est la **condition de correspondance** — presque toujours `clé_primaire = clé_étrangère`. Les lettres `u`, `ucr`, `c` sont des **alias de table** : indispensables dès que deux tables ont des colonnes du même nom (ici `user.nom` et `club.nom` — d'où le `c.nom AS club` pour les distinguer dans le résultat).

**INNER JOIN** ne garde que les lignes qui trouvent une correspondance **des deux côtés**. Un utilisateur sans aucun rôle n'apparaît pas dans le résultat ci-dessus : aucune ligne de `user_club_role` ne pointe vers lui.

C'est là qu'entre **LEFT JOIN** : il garde TOUTES les lignes de la table de gauche (celle du `FROM`), et met `NULL` dans les colonnes de droite quand il n'y a pas de correspondance. Question métier : « liste TOUS les utilisateurs, avec leur rôle s'ils en ont un » :

```sql
SELECT u.prenom, ucr.role
FROM "user" u
LEFT JOIN user_club_role ucr ON ucr.user_id = u.id;
-- Jean   | COACH
-- Jean   | PARENT    ← Jean a 2 rôles : il apparaît 2 fois
-- Emma   | NULL      ← Emma n'a aucun rôle : gardée quand même, role à NULL
```

Deux observations capitales. Un : Jean apparaît **deux fois** — une jointure multiplie les lignes quand il y a plusieurs correspondances (1 ligne user × 2 lignes de rôles = 2 lignes de résultat). Deux : le motif « LEFT JOIN + IS NULL » est l'outil classique pour trouver les orphelins :

```sql
-- Les utilisateurs qui n'ont AUCUN rôle dans aucun club
SELECT u.prenom, u.email
FROM "user" u
LEFT JOIN user_club_role ucr ON ucr.user_id = u.id
WHERE ucr.id IS NULL;  -- pas de correspondance trouvée → colonnes du pivot à NULL
```

Il existe aussi `RIGHT JOIN` (symétrique du LEFT, rarement utilisé — on réécrit en LEFT en inversant les tables) et `FULL OUTER JOIN` (garde les orphelins des deux côtés ; existe en PostgreSQL, **pas en MySQL** — bon point de différence à citer).

Dans Venaball, Doctrine génère ces jointures quand tu écris du DQL (`SELECT u FROM User u JOIN u.userClubRoles ucr`) ou quand tu navigues dans les objets (`$user->getUserClubRoles()`). Mais devant le jury, tu dois savoir écrire la jointure SQL à la main et expliquer la différence INNER/LEFT sans hésiter : c'est une question quasi garantie.

## À retenir

- Une jointure combine des tables en suivant `clé primaire = clé étrangère` dans le `ON`.
- **INNER JOIN** : uniquement les lignes avec correspondance des deux côtés. **LEFT JOIN** : toutes les lignes de gauche, `NULL` à droite si pas de correspondance.
- Le motif **LEFT JOIN … WHERE … IS NULL** trouve les lignes « orphelines » (ex. : utilisateurs sans rôle).
- Une ligne avec plusieurs correspondances est **dupliquée** dans le résultat (Jean × 2 rôles = 2 lignes).
- Les alias de table (`u`, `ucr`, `c`) sont obligatoires pour lever l'ambiguïté quand deux tables partagent des noms de colonnes.

## Mise en pratique

Objectif : reconstruire le trio User–UserClubRole–Club dans Supabase et sentir la différence INNER/LEFT.

1. Dans le SQL Editor de Supabase, crée le mini-Venaball :

```sql
CREATE TABLE u_test (id SERIAL PRIMARY KEY, prenom VARCHAR(100));
CREATE TABLE c_test (id SERIAL PRIMARY KEY, nom VARCHAR(150));
CREATE TABLE ucr_test (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES u_test(id) ON DELETE CASCADE,
  club_id INT NOT NULL REFERENCES c_test(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL
);
INSERT INTO u_test (prenom) VALUES ('Jean'), ('Naomi'), ('Emma');
INSERT INTO c_test (nom) VALUES ('MABB'), ('ASVEL');
INSERT INTO ucr_test (user_id, club_id, role) VALUES
  (1, 1, 'COACH'), (1, 1, 'PARENT'),   -- Jean : 2 rôles au MABB
  (2, 2, 'JOUEUR');                    -- Naomi : joueuse ASVEL. Emma : rien.
```

2. Écris l'INNER JOIN à 3 tables qui affiche `prenom, role, nom du club`. Compte les lignes.
3. Remplace par un LEFT JOIN depuis `u_test` (jointure vers `ucr_test` puis LEFT JOIN aussi vers `c_test`). Compte les lignes.
4. Écris la requête « utilisateurs sans aucun rôle » avec le motif LEFT JOIN + `IS NULL`.
5. Bonus lecture : ouvre `/mnt/user-data/uploads/mabb-site/src/Entity/Core/User.php` et retrouve l'attribut `OneToMany` qui permet à Doctrine de faire la jointure `u.userClubRoles` sans que tu écrives le `ON`.

Résultat attendu : (2) 3 lignes — Jean×2 et Naomi, Emma absente ; (3) 4 lignes — les 3 mêmes plus « Emma | NULL | NULL » ; (4) Emma seule. Si tu obtiens ça, tu sais expliquer INNER vs LEFT au jury avec TON exemple de projet.
