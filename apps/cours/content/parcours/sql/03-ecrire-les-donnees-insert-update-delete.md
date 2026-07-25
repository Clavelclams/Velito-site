---
titre: "Écrire les données : INSERT, UPDATE, DELETE"
parcours: "sql"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais lire, apprenons à écrire. Trois commandes modifient les données : `INSERT` ajoute des lignes, `UPDATE` modifie des lignes existantes, `DELETE` en supprime. Ensemble avec `SELECT`, on les surnomme **CRUD** (Create, Read, Update, Delete) — un mot que le jury CDA adore.

**INSERT** ajoute une ou plusieurs lignes. Tu nommes les colonnes que tu remplis, les autres prennent leur valeur par défaut ou `NULL` :

```sql
-- Ajoute un membre ; id, xp et is_active prennent leurs valeurs par défaut
INSERT INTO membre_test (prenom, email, ville)
VALUES ('Awa', 'awa@mabb.fr', 'Amiens');
```

C'est exactement ce que fait Doctrine quand tu appelles `$entityManager->persist($user)` puis `flush()` dans Venaball : il génère un `INSERT INTO user (...) VALUES (...)`.

**UPDATE** modifie des lignes. Sa structure : `UPDATE table SET colonne = valeur WHERE condition`. Le `SET` dit quoi changer, le `WHERE` dit **sur quelles lignes** :

```sql
-- Karim redevient actif
UPDATE membre_test
SET is_active = true
WHERE id = 3;   -- cibler par id : précis, une seule ligne touchée
```

Et maintenant, LE danger numéro un du SQL. Que se passe-t-il si tu oublies le `WHERE` ?

```sql
UPDATE membre_test SET is_active = true;  -- ⚠️ PAS DE WHERE
```

**Toutes** les lignes de la table sont modifiées. Pas de message d'erreur, pas d'avertissement : la base t'obéit au pied de la lettre. Sur une table de 10 000 utilisateurs en production, c'est la catastrophe. Même logique pour `DELETE` :

```sql
DELETE FROM membre_test WHERE id = 5;  -- supprime Lucas uniquement
DELETE FROM membre_test;               -- ⚠️ vide TOUTE la table, sans confirmation
```

Le réflexe professionnel à raconter au jury : **avant tout UPDATE ou DELETE, je teste mon WHERE avec un SELECT**. Tu écris `SELECT * FROM membre_test WHERE id = 5;`, tu vérifies que les lignes affichées sont bien celles que tu veux toucher, puis tu remplaces le `SELECT *` par ton `UPDATE`/`DELETE`. Deux secondes de prudence, zéro drame.

Autres points utiles :

- `UPDATE` peut modifier plusieurs colonnes d'un coup : `SET ville = 'Amiens', xp = xp + 50` (oui, on peut calculer à partir de la valeur actuelle — pratique pour ajouter de l'XP dans une logique de gamification comme celle de Venaball).
- `RETURNING` (PostgreSQL) renvoie les lignes touchées : `DELETE FROM membre_test WHERE id = 5 RETURNING prenom;` te dit qui tu viens de supprimer. **MySQL ne connaît pas RETURNING** — pour Venaball, Doctrine récupère l'id inséré autrement (`LAST_INSERT_ID()`).
- Le nombre de « rows affected » renvoyé après chaque écriture est ton témoin : `UPDATE ... → 1 row` te confirme que tu n'as touché qu'une ligne. `→ 5 rows` alors que tu en attendais une : problème.

Dans Venaball, tu ne tapes jamais ces requêtes : Doctrine les génère (persist/flush pour INSERT, modification d'objet + flush pour UPDATE, `remove()` pour DELETE). Mais les migrations Doctrine du projet, elles, contiennent parfois du SQL brut — comme l'`UPDATE` qui a basculé les anciens `user_club_role` en statut `active` quand la colonne `status` a été ajoutée (relis le commentaire de la propriété `$status` dans UserClubRole.php : ce scénario y est documenté).

## À retenir

- **CRUD** = Create (`INSERT`), Read (`SELECT`), Update (`UPDATE`), Delete (`DELETE`) : les quatre opérations de base sur les données.
- Un `UPDATE` ou un `DELETE` **sans WHERE** touche TOUTES les lignes de la table, sans confirmation ni erreur.
- Réflexe pro : tester le `WHERE` avec un `SELECT` avant de lancer l'écriture, puis vérifier le nombre de « rows affected ».
- `SET xp = xp + 50` : on peut calculer la nouvelle valeur à partir de l'ancienne.
- Dans Symfony, `persist()` + `flush()` génèrent l'INSERT ; `RETURNING` existe en PostgreSQL mais pas en MySQL.

## Mise en pratique

Objectif : vivre (sans risque) l'accident du UPDATE sans WHERE, dans l'éditeur SQL de Supabase, sur la table `membre_test` de la leçon 2.

1. Vérifie ton point de départ : `SELECT id, prenom, xp, is_active FROM membre_test ORDER BY id;` (5 ou 6 lignes selon si tu as gardé Awa).
2. Ajoute 50 XP à Jean **proprement** : d'abord `SELECT * FROM membre_test WHERE prenom = 'Jean';` pour valider le filtre, puis `UPDATE membre_test SET xp = xp + 50 WHERE prenom = 'Jean';`. Note le « rows affected ».
3. Maintenant l'accident volontaire : exécute `UPDATE membre_test SET xp = 0;` (sans WHERE). Observe le nombre de lignes touchées.
4. Constate les dégâts : `SELECT prenom, xp FROM membre_test;` — tout le monde est à zéro, y compris Naomi et ses 340 XP. Il n'y a pas de Ctrl+Z.
5. Supprime un membre inactif en suivant le réflexe pro : `SELECT` de vérification avec `WHERE is_active = false`, puis le `DELETE` avec le même WHERE.

Résultat attendu : étape 2 → 1 row affected, Jean passe à 170 ; étape 3 → TOUTES les lignes affected ; étape 4 → tous les xp à 0 (c'est le but : ressentir l'irréversibilité) ; étape 5 → Karim supprimé, les autres intacts. Tu viens d'apprendre dans un bac à sable ce qui coûte des nuits blanches en production.
