---
titre: "Supabase, c'est quoi vraiment ? Postgres + une API + de l'auth"
parcours: "supabase-postgres"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Tu utilises Supabase sur sept applications. Il est temps de savoir ce qu'il y a dedans, parce que la plupart des erreurs viennent d'une idée fausse : « Supabase est une base de données ». Non. **Supabase est une base PostgreSQL ordinaire, entourée de services qui la rendent accessible depuis un navigateur.**

**Les briques, une par une.**

1. **PostgreSQL** — la vraie base. Tout ce que tu as appris dans le parcours SQL s'applique tel quel : tables, jointures, contraintes, transactions, index. Tu peux te connecter avec n'importe quel client Postgres. Supabase n'a rien inventé ici, et c'est sa force.

2. **PostgREST** — un serveur qui transforme automatiquement chaque table en **API REST**. `GET /rest/v1/tournois?statut=eq.OUVERT` devient `SELECT * FROM tournois WHERE statut = 'OUVERT'`. Quand tu écris `supabase.from("tournois").select("*").eq("statut", "OUVERT")`, la bibliothèque JavaScript construit cette URL. **Il n'y a pas de code serveur entre ton navigateur et la base** — c'est là que la RLS (leçon 3) devient vitale.

3. **GoTrue (Auth)** — le service d'authentification : inscription, connexion, mot de passe oublié, OAuth Google. Il gère la table `auth.users` et émet des **JWT** (des jetons signés) qui prouvent qui tu es. Chaque requête vers PostgREST porte ce jeton ; Postgres sait donc qui demande, via `auth.uid()`.

4. **Realtime** — un serveur WebSocket qui écoute les changements dans Postgres et les pousse aux navigateurs abonnés. C'est ce qui synchronise l'écran host et les téléphones sur Interactive (leçon 8).

5. **Storage** — un stockage de fichiers (images, PDF) avec ses propres policies. Le bucket `signalements` de VENA en est un.

6. **Edge Functions** — des fonctions serveur en TypeScript, si tu as besoin de code qui n'est ni dans la base ni dans Next. Tu n'en utilises pas encore ; Server Actions et `route.ts` couvrent tes besoins.

**Les deux clés, et pourquoi la confusion est dangereuse.** Chaque projet a :

- **`anon`** (ou la nouvelle forme `sb_publishable_…`) — la clé **publique**. Elle est dans ton JavaScript, visible par tous, et c'est **voulu** : elle identifie ton projet, rien de plus. Avec elle, une requête est exécutée avec le rôle Postgres `anon` (visiteur) ou `authenticated` (si un JWT utilisateur l'accompagne). **La RLS s'applique.**
- **`service_role`** — la clé **secrète**. Elle exécute avec le rôle `service_role`, qui **contourne la RLS**. Elle ne doit jamais quitter le serveur : jamais dans un Client Component, jamais en `NEXT_PUBLIC_`. Avec elle, `supabase.from("joueurs").select("*")` renvoie **tout**, quelles que soient les policies.

Ton code distingue les deux : `lib/supabase/server.ts` (client avec la clé anon + les cookies de l'utilisateur, RLS active) et `lib/supabase/service.ts` (service_role, serveur uniquement, pour les écritures après vérification des droits). La discipline est : **anon par défaut, service_role seulement avec une raison écrite.**

**Un projet Supabase = une base.** Compta, cours, et l'écosystème Velito partagent-ils un projet ? Le hub, VEA, ARENA, Interactive et VENA partagent **un** projet (une seule table `auth.users`, d'où le SSO) avec des **schémas** séparés (`vea.`, `arena.`, `shared.` — leçon 2). Compta et cours ont chacun **leur** projet. Le choix « un projet ou plusieurs » se fait sur une question : les utilisateurs doivent-ils être les mêmes ? Si oui, même projet.

**Le dashboard Supabase.** *Table Editor* pour voir les données, *SQL Editor* pour exécuter tes migrations, *Authentication* pour les utilisateurs, *Settings → API* pour les clés et les schémas exposés, *Logs* pour comprendre une erreur. Tu y passes du temps ; sache où est chaque chose.

## À retenir

- Supabase = Postgres + PostgREST (API auto) + Auth (JWT) + Realtime + Storage.
- Pas de code serveur entre le navigateur et la base → la RLS est la seule barrière.
- `anon` : publique, RLS active. `service_role` : secrète, contourne la RLS, serveur uniquement.
- `auth.uid()` dans une requête = l'utilisateur du JWT.
- Un projet = une base = un ensemble d'utilisateurs. Schémas pour séparer les apps.

## Mise en pratique

Objectif : voir PostgREST à l'œuvre, et constater la différence entre les deux clés.

1. Ouvre le dashboard Supabase du projet Velito → *Settings → API*. Note l'URL du projet et la clé `anon`. Ne copie **pas** `service_role` dans le chat ou dans un fichier commité.
2. Dans la console F12 de `arena.velito.fr` (onglet Network), charge la page d'un tournoi public. Trouve les requêtes vers `…supabase.co/rest/v1/…`. Clique sur une : lis l'URL — c'est PostgREST. Regarde les headers : `apikey` (la clé anon) et éventuellement `Authorization: Bearer …` (ton JWT).
3. Copie une de ces URL et ouvre-la dans un nouvel onglet **sans** les headers : erreur (`No API key found`). Ajoute `?apikey=<anon>` à l'URL : ça répond. Tu viens d'appeler ta base depuis un navigateur nu. Si la réponse montre des données que tu ne voudrais pas publiques, c'est un problème de RLS — leçon 3.
4. Dans le SQL Editor : `SELECT auth.uid();` → `null` (l'éditeur est en service_role, pas d'utilisateur). Puis `SELECT current_user;` → observe le rôle.
5. Ouvre `apps/arena/lib/supabase/server.ts` et `service.ts`. Pour chacun, note : quelle clé, quel rôle Postgres, RLS active ou non. Puis `findstr /s "getServiceClient" apps\arena\*.ts` : chaque usage de service_role. Pour chacun, y a-t-il une vérification de droits juste avant ?
6. Écris en 5 lignes, pour le jury : « Pourquoi la clé anon peut être publique ».

Résultat attendu : tu vois Supabase comme Postgres + une API auto, tu sais ce que fait chaque clé, et tu as trouvé chaque usage de service_role dans ARENA.
