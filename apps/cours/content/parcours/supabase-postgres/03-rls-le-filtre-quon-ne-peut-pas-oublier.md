---
titre: "RLS : le WHERE qu'on ne peut pas oublier"
parcours: "supabase-postgres"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

Reprends la leçon 1 : entre le navigateur et Postgres, il n'y a que PostgREST, qui traduit les URL en SQL. N'importe qui avec la clé `anon` — donc n'importe qui, elle est publique — peut demander `SELECT * FROM arena.joueurs`. Qu'est-ce qui l'empêche de tout lire ?

Rien, sauf la **Row Level Security**.

**Le principe.** Sans RLS, une table est tout ou rien : soit le rôle a `SELECT`, soit non. Avec RLS activée (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`), le `SELECT` devient conditionnel **ligne par ligne** : Postgres ajoute automatiquement un `WHERE` invisible à chaque requête, défini par des **policies**. Un `SELECT *` sans condition ne rend que les lignes que la policy autorise.

Le premier effet de `ENABLE ROW LEVEL SECURITY` est brutal : **plus aucune ligne ne sort**, pour personne (sauf le propriétaire de la table et `service_role`). C'est le *default deny*. On rouvre ensuite, policy par policy.

**Une policy, c'est un WHERE nommé :**

```sql
CREATE POLICY tournois_lecture ON arena.tournois
  FOR SELECT
  USING (statut <> 'BROUILLON' OR arena.est_staff(organisation_id));
```

Traduction : « pour les `SELECT` sur `arena.tournois`, une ligne est visible si son statut n'est pas brouillon, **ou** si l'utilisateur courant est staff de l'organisation propriétaire ». Un visiteur anonyme voit les tournois publiés ; un staff voit aussi ses brouillons ; personne ne voit les brouillons des autres.

C'est exactement pourquoi la route `/api/export/[token]` d'ARENA ne contient **aucune** vérification : elle utilise le client anon, la policy fait le filtre, un tournoi brouillon revient vide → 404. Le contrôle d'accès est une propriété de la connexion, pas une ligne de code qu'on peut oublier.

**Quatre opérations, quatre policies possibles.** `FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE` (ou `FOR ALL`). Deux clauses :

- `USING (…)` — quelles lignes existantes l'opération peut toucher (SELECT, UPDATE, DELETE).
- `WITH CHECK (…)` — quelles nouvelles valeurs sont acceptées (INSERT, UPDATE).

Exemple VENA : `INSERT` sur `shared.signalements` réservé aux connectés :

```sql
CREATE POLICY signalements_insert ON shared.signalements
  FOR INSERT TO authenticated
  WITH CHECK (auteur_id = auth.uid());
```

`TO authenticated` : les anonymes ne passent même pas. `WITH CHECK (auteur_id = auth.uid())` : on ne peut pas insérer un signalement au nom de quelqu'un d'autre.

**Ce que fait ARENA, et pourquoi c'est un bon modèle.** La migration 001 :

- active la RLS sur **toutes** les tables ;
- donne `SELECT` à `anon` et `authenticated`, `ALL` à `service_role` ;
- crée des policies **de lecture uniquement** ;
- **aucune policy d'écriture pour `authenticated`**.

Donc depuis le navigateur, on peut lire (filtré) et **rien écrire**. Les écritures passent par des Server Actions qui vérifient les droits puis utilisent `service_role`. La surface d'attaque côté client est : lecture filtrée. Point.

**Les fonctions dans les policies : `auth.uid()`, `auth.jwt()`.** `auth.uid()` renvoie l'`id` de l'utilisateur du JWT courant, ou `NULL` pour un anonyme. `auth.jwt()` donne tout le jeton (email, métadonnées). Une policy `USING (user_id = auth.uid())` est le motif « chacun voit ses lignes ». Attention à `NULL` : `NULL = NULL` est faux en SQL, donc un anonyme ne matche jamais une telle policy — c'est ce qu'on veut.

**Tester une policy.** Le SQL Editor tourne en `service_role` et **contourne** la RLS — tu ne verras jamais le filtre depuis là. Pour tester : `SET ROLE anon;` puis ta requête, puis `RESET ROLE;`. Ou plus fidèle : depuis le navigateur avec la clé anon. Une policy non testée depuis le bon rôle n'est pas testée.

**Ce que la RLS ne fait pas.** Elle ne s'applique pas à `service_role`. Donc tout code serveur qui l'utilise doit faire ses propres vérifications — et les invariants vraiment critiques doivent être ailleurs (triggers, leçon 5), parce qu'un trigger, lui, s'applique à tout le monde.

## À retenir

- Sans RLS, la clé anon publique lit tout. Avec, chaque requête a un WHERE invisible.
- `ENABLE ROW LEVEL SECURITY` = default deny. On rouvre par policies.
- `USING` filtre l'existant, `WITH CHECK` valide le nouveau. `TO role` restreint le rôle.
- Modèle ARENA : lecture filtrée pour tous, aucune écriture client, écritures via actions + service_role.
- Tester avec `SET ROLE anon`, pas depuis le SQL Editor nu. `service_role` contourne tout.

## Mise en pratique

Objectif : activer la RLS sur une table, constater le default deny, écrire trois policies et les tester avec le bon rôle.

1. SQL Editor : `CREATE SCHEMA IF NOT EXISTS lecon; CREATE TABLE lecon.notes (id serial PRIMARY KEY, user_id uuid, txt text, publique boolean DEFAULT false); GRANT USAGE ON SCHEMA lecon TO anon, authenticated; GRANT SELECT, INSERT ON lecon.notes TO anon, authenticated; GRANT USAGE ON SEQUENCE lecon.notes_id_seq TO anon, authenticated;` Expose `lecon` (leçon 2). Insère trois lignes : une publique, deux privées avec ton `user_id` (`SELECT id FROM auth.users WHERE email = '…'`).
2. `SET ROLE anon; SELECT * FROM lecon.notes; RESET ROLE;` → les trois lignes. Pas de RLS, tout sort.
3. `ALTER TABLE lecon.notes ENABLE ROW LEVEL SECURITY;` puis même test → **zéro ligne**. Default deny.
4. `CREATE POLICY lecture_publique ON lecon.notes FOR SELECT USING (publique = true);` → test anon : une ligne.
5. `CREATE POLICY lecture_mes_notes ON lecon.notes FOR SELECT TO authenticated USING (user_id = auth.uid());` — tu ne peux pas simuler `auth.uid()` avec `SET ROLE` simplement. Teste depuis un Client Component de cours (connecté) : `.schema("lecon").from("notes").select("*")` → tes trois lignes. Déconnecté → une seule.
6. `CREATE POLICY insert_soi ON lecon.notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());` Depuis le composant, insère avec ton `user_id` → ok. Avec un `user_id` inventé → refus (`new row violates row-level security policy`). C'est `WITH CHECK`.
7. Ouvre `apps/arena/sql/001_arena_schema_v1.sql`, section RLS. Pour chaque policy, écris en une phrase qui voit quoi. Puis vérifie qu'il n'y a **aucune** policy `FOR INSERT/UPDATE/DELETE` pour `authenticated` — et explique pourquoi c'est un choix.
8. `DROP SCHEMA lecon CASCADE;`, retire des schémas exposés, supprime le composant de test.

Résultat attendu : tu as vu une table passer de « tout visible » à « rien » à « le bon sous-ensemble », et tu sais tester une policy avec le bon rôle.
