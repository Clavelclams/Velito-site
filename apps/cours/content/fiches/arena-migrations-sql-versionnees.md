---
titre: "Huit fichiers SQL numérotés : l'historique de ma base est du code"
projet: "arena"
bloc: 2
themes: ["base-de-donnees", "deploiement"]
source: "apps/arena/sql/001 à 008"
date: 2026-09-04
---

## Le concept

Le schéma d'ARENA n'existe nulle part sous forme de « dump de la base ». Il existe sous forme de **huit fichiers numérotés**, versionnés avec le code :

```
001_arena_schema_v1.sql        005_arena_ordre_participations.sql
002_arena_formats_jeux.sql     006_arena_resultats_externes.sql
003_arena_poules.sql           007_arena_terrains.sql
004_arena_sport_equipes_elo.sql 008_arena_jeux_fc26.sql
```

Rejouer 001 à 008 dans l'ordre sur une base vide reconstruit exactement la production. Ce n'est pas de la coquetterie : c'est ce qui rend le schéma **reproductible** et **relisible**. Chaque fichier répond à une question — pourquoi cette colonne existe, quand elle est apparue, quel besoin l'a amenée. `git log` sur `sql/` raconte l'évolution du modèle de données.

Chaque migration est enveloppée dans `BEGIN; ... COMMIT;` : si une instruction échoue en cours de route, tout est annulé et la base ne reste pas à moitié migrée.

Le cas intéressant est le **001**, qui porte la mention « RÉVISÉE » en tête. Sa première version créait des tables `public.arena_*` ; j'ai voulu passer à un schéma dédié `arena.` pour rester cohérent avec le reste de l'écosystème (`vea.`, `shared.`, `interactive.`). Comme cette version **n'avait jamais été exécutée en base**, je l'ai remplacée sur place plutôt que d'écrire un 001bis qui aurait renommé des tables inexistantes. Et je l'ai écrit dans le fichier, avec la date, pour que ce ne soit pas une réécriture silencieuse de l'histoire.

C'est la règle : **une migration déjà exécutée quelque part ne se modifie jamais**, on en ajoute une nouvelle. Une migration qui n'a jamais tourné peut être corrigée, à condition de le dire.

Les fichiers portent aussi les pièges d'exploitation. Le 001 rappelle en gros qu'après exécution il faut ajouter `arena` aux « Exposed schemas » du dashboard Supabase, sinon PostgREST renvoie 404 sur toutes les requêtes `.schema('arena')`. Et il rappelle qu'en Postgres 15+, toute vue future doit recevoir `ALTER VIEW ... SET (security_invoker = on)` — une note écrite après un incident réel sur `vea.compta_balance_par_saison`.

## Comment je l'explique au jury

« Mon schéma de base est versionné en huit fichiers SQL numérotés, commités avec le code. Rejouer 001 à 008 sur une base vide reconstruit la production à l'identique. Chaque fichier est transactionnel, et son en-tête explique la décision qui l'a motivé. La règle que je m'impose : une migration déjà exécutée ne se modifie jamais, on en ajoute une suivante. J'ai fait une exception documentée sur le 001, qui n'avait jamais tourné en base — je l'ai réécrit pour passer d'un préfixe de tables à un schéma dédié, et je l'ai noté dans le fichier avec la date plutôt que de réécrire l'histoire en silence. »

## La question vicieuse du jury

**« Vous n'avez pas d'outil de migration. Comment savez-vous quels fichiers sont déjà passés en production ? »**

Je ne le sais pas automatiquement, et c'est la vraie faiblesse de ce dispositif — je l'assume comme une dette, pas comme un choix. Sur Venaball j'utilise Doctrine Migrations, qui tient une table `doctrine_migration_versions` : la base sait elle-même où elle en est, et `doctrine:migrations:migrate` applique ce qui manque. Sur ARENA je les exécute à la main dans l'éditeur SQL de Supabase, et le suivi repose sur moi. Ça tient parce que je suis seul et que les fichiers sont numérotés, ça ne tiendrait pas à deux. La correction serait soit `supabase migration` (le CLI officiel, qui gère un journal équivalent), soit à minima une table `arena.migrations_appliquees` alimentée par la dernière ligne de chaque fichier. C'est dans mes prochaines étapes, et c'est le genre de chose qui doit être réglé avant qu'un deuxième développeur touche la base.
