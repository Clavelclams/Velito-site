---
titre: "Cacher une colonne, pas une table : le jeton et les rôles du Loup-Garou"
projet: "interactive"
bloc: 2
themes: ["base-de-donnees", "securite-applicative", "temps-reel"]
source: "apps/interactive/sql/interactive-player-token-v2-prive.sql, apps/interactive/sql/interactive-lg-v2-secrets.sql"
date: 2026-11-18
---

## Le concept

Dans Velito Interactive, les joueurs rejoignent une partie sans compte, avec un code. Chacun reçoit un `player_token` qui prouve « c'est bien moi ». Au Loup-Garou, chaque joueur a un rôle secret, et les votes de la nuit sont secrets.

**La faille (audit du 12/11/2026).** La table `interactive.session_players` était lisible en entier par le rôle `anon` (`GRANT SELECT` sur toute la table). Avec la clé publique de Supabase, présente dans le code de toute page web, n'importe qui pouvait lire **tous les jetons** de tous les joueurs, donc agir à leur place. Même chose pour les rôles : un joueur pouvait lire dans la base qui était loup-garou.

**Pourquoi la RLS ne suffisait pas.** La RLS filtre des **lignes** : « tu vois les joueurs de ta partie ». Mais ici, les autres joueurs de la partie ont besoin de voir la ligne (pseudo, avatar, score), pas le jeton. Le secret est une **colonne** de la ligne. PostgreSQL a l'outil exact : les droits par colonne.

```sql
REVOKE SELECT ON interactive.session_players FROM anon, authenticated;
GRANT SELECT (id, session_id, user_id, pseudo, avatar_config, joined_at, score, eliminated_round)
  ON interactive.session_players TO anon, authenticated;
```

`player_token` n'est pas dans la liste : personne ne peut plus le lire par l'API. Même logique pour `lg_player_roles` (on voit qui est vivant, pas le rôle) et `lg_votes` (on voit qui a voté, pas pour qui).

**Comment le joueur obtient alors son jeton ?** Par une fonction `interactive.rejoindre_session(...)` en `SECURITY DEFINER` : elle crée le joueur et renvoie `id` et `player_token` **une seule fois**, au joueur qui vient de rejoindre. Il le garde dans son navigateur. Ensuite, toute action secrète passe par une fonction qui vérifie le jeton : `lg_mes_loups(player_id, player_token)` pour savoir qui sont ses complices, `lg_voter(...)` pour voter. Sans le bon jeton, rien.

**Point vérifié en production** : Supabase Realtime respecte aussi les droits par colonne. Les changements diffusés en direct ne contiennent pas les colonnes non accordées.

L'animateur, lui, doit tout voir : deux fonctions `lg_hote_roles` et `lg_hote_votes` vérifient que l'utilisateur connecté est bien l'hôte de la partie (`host_user_id = auth.uid()`) avant de renvoyer les rôles et les votes.

Preuve : `sql/test_player_token_prive.mjs`, 37 contrôles sur PGlite.

## Comment je l'explique au jury

« La RLS filtre des lignes, mais mon secret était une colonne : les autres joueurs doivent voir la ligne d'un joueur, pas son jeton. J'ai donc utilisé les droits par colonne de Postgres : je retire le SELECT sur la table et je le redonne seulement sur les colonnes publiques. Le jeton n'est lisible par personne via l'API ; le joueur le reçoit une fois, par une fonction, quand il rejoint. Les actions secrètes, comme voter, passent par des fonctions qui vérifient ce jeton. »

## La question vicieuse du jury

**« Le jeton est dans le localStorage du navigateur. Une faille XSS le vole. »**

Oui. Un jeton dans le `localStorage` est lisible par tout script de la page, donc une faille XSS permettrait de le voler. Je l'accepte ici pour une raison de contexte : c'est une partie de jeu de 20 minutes, sans compte, sans donnée personnelle, et le jeton ne vaut que pour cette partie. Le risque réel est qu'un joueur vote à la place d'un autre pendant une soirée. Pour une donnée sensible, je mettrais le jeton dans un cookie `HttpOnly`, illisible par JavaScript. Et le React de Next.js échappe le texte affiché par défaut, ce qui ferme la voie XSS la plus courante : un pseudo malveillant s'affiche comme du texte, il ne s'exécute pas.
