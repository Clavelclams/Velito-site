---
titre: "L'auth Supabase côté serveur : cookies, @supabase/ssr, et getUser vs getSession"
parcours: "supabase-postgres"
ordre: 10
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Quand tu es connecté sur `cours.velito.fr`, comment un Server Component sait-il qui tu es ? Il n'a pas accès au `localStorage` du navigateur. La réponse est dans `lib/supabase/server.ts`, et elle mérite d'être comprise ligne par ligne, parce que c'est le socle de toute la sécurité de tes apps.

**Le jeton vit dans un cookie.** Après connexion, Supabase Auth émet un JWT (access token, ~1 h) et un refresh token. Dans une app purement navigateur, ils iraient dans `localStorage`. Mais un Server Component ne peut pas le lire. `@supabase/ssr` les stocke donc dans des **cookies** (`sb-<projet>-auth-token`), que le navigateur envoie automatiquement à chaque requête. Le serveur les lit, reconstruit le client Supabase avec ce jeton, et interroge la base **en tant que cet utilisateur** — la RLS s'applique avec son `auth.uid()`.

**Un client par requête, jamais un singleton.** Le fichier le dit : « chaque requête HTTP appartient à UN utilisateur : son JWT, ses cookies. Un client partagé entre requêtes mélangerait les sessions de deux visiteurs. » C'est une erreur classique en Next : créer le client au niveau du module (`const supabase = createClient()` en haut du fichier), qui est alors partagé entre toutes les requêtes du même processus serveur. Le visiteur B hériterait de la session de A. `createClient()` est une **fonction** appelée dans chaque Server Component, action ou route.

**Les callbacks `getAll` / `setAll`.** `createServerClient` a besoin de lire les cookies (pour trouver le jeton) et d'en écrire (quand il rafraîchit un jeton expiré). Next expose `cookies()` pour ça — mais un Server Component **ne peut pas écrire de cookies** (il produit du HTML, pas des headers de réponse). D'où le `try/catch` dans `setAll` : si l'écriture échoue, on ignore, et c'est le **middleware** — qui, lui, peut écrire — qui se charge du rafraîchissement. C'est pour ça que le middleware de cours reconstruit un client et appelle `getUser()` à chaque requête : ce n'est pas seulement un contrôle d'accès, c'est le moment où les cookies sont mis à jour.

**`getUser()` et non `getSession()`.** Les deux renvoient l'utilisateur. La différence est fondamentale :

- `getSession()` lit le JWT dans le cookie et le **décode** sans le vérifier. Un cookie forgé avec un faux JWT passerait. C'est rapide, et c'est pour ça que c'est tentant.
- `getUser()` envoie le JWT au serveur Supabase Auth, qui **vérifie la signature** et renvoie l'utilisateur. Un aller-retour réseau de plus, mais la garantie que le jeton est authentique.

Côté serveur, où la décision d'accès se prend, c'est **toujours `getUser()`**. La documentation Supabase est explicite, et la fiche `compta-getuser-vs-getsession` de ton site raconte le détail. `getSession()` peut servir côté client pour un affichage sans enjeu.

**Le domaine du cookie : SSO ou isolation.** Le hub pose ses cookies avec `Domain=.velito.fr` : tous les sous-domaines les reçoivent, une connexion sert partout. Compta et cours ne le font pas — session locale à leur sous-domaine (ou, pour cours, projet Supabase distinct). C'est un choix par application : partager la session, ou l'isoler. Le fichier documente que le jour où l'app rejoint le SSO, c'est une option à réintroduire **ici**, dans ce seul fichier — c'est tout l'intérêt d'avoir centralisé la création du client.

**Les deux clients, encore.** `server.ts` (anon + cookies : « en tant que l'utilisateur », RLS active) et `service.ts` (service_role, sans cookies : « en tant qu'admin », RLS contournée). Le premier est le défaut. Le second ne sert qu'après avoir vérifié les droits avec le premier : `const { data: { user } } = await createClient().auth.getUser(); if (!estStaff(user)) throw …; getServiceClient().from(…).update(…)`.

**Les variables lues.** `SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL` : la version serveur d'abord, la publique en repli. Le commentaire rappelle le bug des `NEXT_PUBLIC_*` Sensitive qui arrivent vides — leçon 9 du parcours React. Et le `throw` si elles manquent : ici, on refuse de démarrer sans config. (Le middleware, lui, laissait passer — c'était l'exercice de la leçon 8 du parcours React.)

## À retenir

- Le JWT est dans un cookie ; `@supabase/ssr` le lit côté serveur pour agir « en tant que » l'utilisateur.
- Un client **par requête**. Jamais un singleton de module.
- Un Server Component ne peut pas écrire de cookies → le middleware rafraîchit.
- `getUser()` vérifie la signature auprès de Supabase. `getSession()` ne fait que décoder. Serveur = `getUser()`.
- `Domain=.velito.fr` = SSO ; sans = session isolée. Un choix par app, dans un seul fichier.

## Mise en pratique

Objectif : voir les cookies, forger un faux jeton, et constater que seul `getUser()` le rejette.

1. Connecté sur `cours.velito.fr`, F12 → Application → Cookies. Trouve `sb-…-auth-token`. Copie sa valeur dans un décodeur JWT (jwt.io) : lis `sub` (ton id), `email`, `exp`. C'est ce que le serveur reçoit.
2. Crée une route de test `apps/cours/app/api/qui/route.ts` qui fait `createClient()` puis renvoie **deux** choses : `(await supabase.auth.getSession()).data.session?.user?.email` et `(await supabase.auth.getUser()).data.user?.email`. Appelle `/api/qui` : les deux donnent ton email.
3. Forge : dans F12, modifie la valeur du cookie — change une lettre dans la partie *payload* du JWT (le segment du milieu). Rappelle `/api/qui`. `getSession` renvoie peut-être encore un email (décodage sans vérification, selon la version) ; `getUser` renvoie `null` ou une erreur. Remets le cookie (reconnecte-toi si besoin).
4. Singleton volontaire : dans un fichier test, mets `const client = await createClient()` au niveau module (hors fonction) — Next refusera probablement (`cookies()` hors requête). Lis l'erreur : c'est Next qui te protège du singleton.
5. Lis `apps/hub/src/lib/supabase/server.ts`. Trouve `COOKIE_DOMAIN`. Explique en 3 lignes ce qui se passerait si cours utilisait le même projet Supabase que le hub **sans** `Domain=.velito.fr` : la connexion sur le hub serait-elle vue sur cours ?
6. Cherche dans tout le monorepo : `findstr /s "getSession()" apps\*\*.ts apps\*\*.tsx`. Pour chaque occurrence côté serveur (Server Component, action, route, middleware), c'est une faille potentielle : remplace par `getUser()`.
7. Supprime `/api/qui`.

Résultat attendu : tu sais où vit la session, pourquoi un client par requête, et tu as vu de tes yeux que `getUser()` rejette un jeton forgé là où `getSession()` ne le fait pas.
