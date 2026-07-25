---
titre: "Transactions et intégrité : ACID et les contraintes"
parcours: "sql"
ordre: 9
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Scénario Venaball : un dirigeant valide la demande d'adhésion de Naomi. Le code doit faire DEUX écritures : passer son `user_club_role` en `status = 'active'`, et enregistrer qui a validé (`valide_par_user_id`, `valide_at`). Imagine que le serveur plante **entre les deux** : Naomi serait active mais sans trace d'audit — un état incohérent qu'aucune des deux règles métier ne prévoit. La **transaction** est la parade.

Une transaction regroupe plusieurs opérations en un bloc **tout ou rien** :

```sql
BEGIN;                                   -- j'ouvre la transaction
UPDATE user_club_role
  SET status = 'active', valide_at = now(), valide_par_user_id = 7
  WHERE id = 42;
INSERT INTO log_audit (action, cible) VALUES ('validation', 42);
COMMIT;                                  -- tout est validé d'un coup
-- En cas de problème avant le COMMIT : ROLLBACK; → tout est annulé
```

Entre `BEGIN` et `COMMIT`, les modifications sont provisoires. `COMMIT` les rend définitives toutes ensemble ; `ROLLBACK` les annule toutes ensemble. Si le serveur plante avant le COMMIT, la base redémarre comme si rien ne s'était passé. L'exemple canonique est le virement bancaire : débiter un compte ET créditer l'autre — jamais l'un sans l'autre.

Les quatre garanties d'une transaction forment l'acronyme **ACID**, à savoir dérouler au jury :

- **A — Atomicité** : tout ou rien. Les opérations du bloc réussissent ensemble ou sont annulées ensemble.
- **C — Cohérence** : la base passe d'un état valide à un état valide ; les contraintes (NOT NULL, UNIQUE, clés étrangères) sont respectées à la sortie.
- **I — Isolation** : deux transactions simultanées ne se marchent pas dessus — chacune travaille comme si elle était seule (avec des niveaux d'isolation réglables).
- **D — Durabilité** : une fois le COMMIT confirmé, la donnée survit à une panne de courant (écrite sur disque, journalisée).

L'isolation mérite un exemple : deux dirigeants valident la même demande au même instant. Sans isolation, les écritures pourraient s'entremêler ; avec, l'une des deux transactions attend l'autre (verrous) et le résultat final est cohérent. PostgreSQL et MySQL/InnoDB sont tous deux ACID — mais attention, l'ancien moteur MySQL MyISAM ne l'était pas : c'est InnoDB (le défaut moderne) qui apporte les transactions à Venaball.

Deuxième pilier de l'intégrité : les **contraintes**, que tu connais déjà par morceaux. C'est la défense passive, active 24h/24, même contre les bugs de ton propre code :

- `NOT NULL` : la donnée est obligatoire (`nullable: false` dans Doctrine) ;
- `UNIQUE` : pas de doublon (email de User, slug de Club, le trio user+club+role) ;
- `FOREIGN KEY` : pas de référence fantôme (leçon 4) ;
- `DEFAULT` : valeur automatique (`status` à `'pending'` dans UserClubRole) ;
- `CHECK` (PostgreSQL, et MySQL ≥ 8.0.16) : une condition libre, ex. `CHECK (xp >= 0)`.

L'argument de conception à retenir : la validation applicative (les `Assert\NotBlank` de Symfony, le `setRole()` qui vérifie `ROLES_DISPONIBLES`) donne de **bons messages d'erreur à l'utilisateur**, mais la contrainte en base est la **garantie ultime** : elle protège même si les données arrivent par une migration, un script, ou un autre code que le tien. Les deux niveaux sont complémentaires, pas redondants — c'est exactement la double sécurité qu'on voit dans UserClubRole (exception PHP dans `setRole()` + contrainte UNIQUE en base).

Côté Doctrine : chaque `flush()` s'exécute déjà dans une transaction implicite ; pour regrouper plusieurs opérations métier, tu peux utiliser `$em->wrapInTransaction(fn() => ...)`.

## À retenir

- Une **transaction** (`BEGIN` … `COMMIT` / `ROLLBACK`) rend un groupe d'écritures **atomique** : tout est validé ou tout est annulé.
- **ACID** : Atomicité (tout ou rien), Cohérence (contraintes respectées), Isolation (les transactions simultanées ne s'entremêlent pas), Durabilité (un COMMIT survit à une panne).
- Exemple à citer : valider une adhésion Venaball = plusieurs écritures liées → une seule transaction ; le virement bancaire pour l'image.
- Les **contraintes** (NOT NULL, UNIQUE, FK, DEFAULT, CHECK) sont la garantie ultime d'intégrité, active même contre les bugs applicatifs.
- Validation applicative = messages clairs pour l'utilisateur ; contrainte en base = filet de sécurité final. Les deux, toujours.

## Mise en pratique

Objectif : manipuler ROLLBACK et voir une transaction annulée par une contrainte, dans l'éditeur SQL de Supabase.

1. Sur la table `membre_test` (leçon 2-3), vérifie l'état : `SELECT id, prenom, xp FROM membre_test ORDER BY id;`
2. Teste le ROLLBACK — exécute ce bloc EN UNE SEULE FOIS (le SQL Editor de Supabase exécute tout le script d'un coup, ce qui garde la transaction entière) :

```sql
BEGIN;
UPDATE membre_test SET xp = 9999;   -- la bêtise de la leçon 3, version réversible
ROLLBACK;                            -- ...annulée !
SELECT prenom, xp FROM membre_test;  -- vérification
```

3. Constate : les XP sont intacts. Compare avec la leçon 3 où le même UPDATE sans transaction était irréversible.
4. Teste l'atomicité face à une contrainte — toujours en un seul script :

```sql
BEGIN;
UPDATE membre_test SET xp = xp + 100 WHERE prenom = 'Jean';  -- écriture 1 : OK
INSERT INTO membre_test (prenom, email) VALUES ('Bug', NULL); -- écriture 2 : viole NOT NULL
COMMIT;
```

5. Lis l'erreur, puis vérifie les XP de Jean : `SELECT prenom, xp FROM membre_test WHERE prenom = 'Jean';`
6. Transposition Venaball : relis la méthode `valider()` de `/mnt/user-data/uploads/mabb-site/src/Entity/Core/UserClubRole.php` (status + rôle + auditeur + date modifiés ensemble) et explique en une phrase pourquoi ce `flush()` DOIT être transactionnel.

Résultat attendu : (3) aucun xp à 9999 — le ROLLBACK a tout annulé ; (5) l'INSERT a échoué et la transaction a été annulée en bloc : les +100 XP de Jean n'ont PAS été appliqués, bien que cet UPDATE-là fût valide. C'est l'atomicité en action : une erreur dans le bloc = tout le bloc annulé.
