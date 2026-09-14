---
titre: "Schémas : ranger plusieurs apps dans une base, et le 404 qui n'en est pas un"
parcours: "supabase-postgres"
ordre: 2
niveau: "intermediaire"
duree: 15
date: 2026-09-09
---

## Le cours

Cinq applications partagent le projet Supabase Velito. Sans organisation, tu aurais `tournois`, `evenements`, `session_players`, `signalements` en vrac dans le même espace, avec des collisions de noms à la première table `users` ou `settings`. La solution Postgres est le **schéma** : un espace de noms à l'intérieur d'une base.

**Un schéma, c'est un dossier pour les tables.** `arena.tournois` et `vea.tournois` peuvent coexister — ce sont deux tables différentes. Par défaut, tout est dans `public`. Ton écosystème a :

- `public` — quelques tables historiques, et les vues exposées ;
- `shared` — ce qui est commun à toutes les apps : `organizations`, `user_permissions`, `signalements`, les tables OAuth du hub ;
- `vea`, `arena`, `interactive` — un schéma par app ;
- `auth`, `storage` — gérés par Supabase, ne pas y toucher.

La migration `001` d'ARENA commence par `CREATE SCHEMA IF NOT EXISTS arena;` et met **tout** dedans. Le commentaire d'en-tête explique que la première version créait des `public.arena_*` et a été réécrite pour suivre le pattern des autres apps : un préfixe de nom de table est un schéma du pauvre.

**Ce qu'un schéma apporte, concrètement :**

- **Lisibilité** : `arena.matchs` dit d'où vient la table. `SELECT * FROM arena.tournois JOIN shared.organizations …` se lit.
- **Droits par schéma** : `GRANT USAGE ON SCHEMA arena TO anon, authenticated;` — sans cette ligne, personne ne peut même *voir* le schéma. `GRANT SELECT ON ALL TABLES IN SCHEMA arena TO anon;` en une fois pour toutes les tables.
- **Isolation** : supprimer une app = `DROP SCHEMA arena CASCADE`. Sauvegarder une app = `pg_dump --schema=arena`.
- **Partage explicite** : ce qui est dans `shared` est fait pour être utilisé par plusieurs apps. Ce qui est dans `arena` ne l'est pas. Quand ARENA a besoin des organisations, il lit `shared.organizations` — il ne crée pas sa propre table.

**Le 404 qui n'est pas un 404.** Après avoir exécuté la migration 001, chaque requête `.schema("arena").from("tournois")` renvoyait… 404. Pas une erreur de droits, pas une erreur SQL : « not found ». La raison est dans le commentaire de la migration :

> ⚠️ APRÈS EXÉCUTION, OBLIGATOIRE : Supabase Dashboard → Settings → API → « Exposed schemas » → ajouter `arena`.

PostgREST n'expose par défaut que `public` (et `graphql_public`). Un schéma qu'il ne connaît pas n'existe pas pour lui : 404. **Ce n'est pas configurable en SQL** — c'est un réglage du dashboard. Chaque nouveau schéma doit y être ajouté à la main, et c'est une étape qu'on oublie une fois, puis plus jamais.

Côté code, la bibliothèque a besoin de savoir dans quel schéma chercher : `supabase.schema("arena").from("tournois")`. Sans `.schema()`, elle cherche dans `public`, et là aussi : 404.

**`search_path` : le schéma implicite.** Quand tu écris `SELECT * FROM tournois` sans préfixe, Postgres cherche dans les schémas listés par `search_path` (par défaut `"$user", public`). C'est pratique dans le SQL Editor, et **dangereux dans une fonction `SECURITY DEFINER`** — on y revient leçon 4. Dans une migration, écris toujours le schéma en toutes lettres : `arena.tournois`, jamais `tournois`. Une migration ne doit pas dépendre de la session qui l'exécute.

**Les vues et `security_invoker`.** Une vue créée dans Postgres 15+ s'exécute par défaut avec les droits de son **créateur** (toi, en service_role) — donc elle contourne la RLS des tables qu'elle lit. Le commentaire de la migration 001 le rappelle après un incident réel sur `vea.compta_balance_par_saison` : toute vue doit recevoir `ALTER VIEW … SET (security_invoker = on);` pour s'exécuter avec les droits de celui qui la lit. Sans ça, une vue « pratique » est une fuite.

## À retenir

- Un schéma = un espace de noms. Une app = un schéma. `shared` = commun.
- `GRANT USAGE ON SCHEMA` avant tout : sinon invisible.
- Un nouveau schéma doit être ajouté aux « Exposed schemas » du dashboard, sinon PostgREST répond 404. Non configurable en SQL.
- `.schema("arena")` dans le code. Nom qualifié (`arena.tournois`) dans les migrations.
- Vues Postgres 15+ : `security_invoker = on`, sinon elles contournent la RLS.

## Mise en pratique

Objectif : reproduire le 404 des schémas exposés, et inspecter la structure de ta base.

1. SQL Editor : `SELECT schema_name FROM information_schema.schemata ORDER BY 1;`. Liste tes schémas. Puis `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('arena','vea','shared','interactive') ORDER BY 1,2;`. C'est la carte de ton écosystème.
2. Crée un schéma de test : `CREATE SCHEMA lecon; CREATE TABLE lecon.essai (id serial PRIMARY KEY, txt text); INSERT INTO lecon.essai (txt) VALUES ('hello'); GRANT USAGE ON SCHEMA lecon TO anon; GRANT SELECT ON lecon.essai TO anon; ALTER TABLE lecon.essai ENABLE ROW LEVEL SECURITY; CREATE POLICY p ON lecon.essai FOR SELECT USING (true);`
3. Depuis un navigateur : `https://<projet>.supabase.co/rest/v1/essai?apikey=<anon>` → 404 (schéma `public` par défaut, pas de table `essai`). Ajoute le header ou le paramètre de schéma : avec la bibliothèque, `.schema("lecon").from("essai")` → toujours 404. **C'est le symptôme.**
4. Dashboard → Settings → API → Exposed schemas → ajoute `lecon`. Réessaie : `[{"id":1,"txt":"hello"}]`. Tu viens de vivre la ligne « obligatoire » de la migration 001.
5. Vérifie tes vues : `SELECT table_schema, table_name FROM information_schema.views WHERE table_schema NOT IN ('pg_catalog','information_schema');`. Pour chacune : `SELECT reloptions FROM pg_class WHERE relname = '<nom>';` — cherche `security_invoker=on`. Celles qui ne l'ont pas contournent la RLS. Corrige avec `ALTER VIEW … SET (security_invoker = on);`.
6. Nettoie : `DROP SCHEMA lecon CASCADE;` et retire `lecon` des schémas exposés.

Résultat attendu : tu sais lire la structure en schémas de ta base, tu as reproduit et compris le 404, et tu as audité tes vues.
