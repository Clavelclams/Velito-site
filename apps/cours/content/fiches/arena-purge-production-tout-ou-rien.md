---
titre: "Supprimer en production sans trembler : lister, tester, une transaction"
projet: "arena"
bloc: 3
themes: ["base-de-donnees", "deploiement", "rgpd"]
source: "apps/arena/sql/maintenance/2026-11-17_purge_tournois_test.sql, apps/arena/sql/test_purge_tests.mjs"
date: 2026-11-18
---

## Le concept

Le 17/11/2026, avant l'ouverture publique d'ARENA, il fallait supprimer les 5 tournois de test d'août. Ils étaient publics : classement, API, sitemap, Google. Une suppression en production est irréversible : j'ai suivi une méthode en quatre temps.

**1. Lister sans rien toucher.** Une requête en lecture seule a listé les tournois, leurs participants, leurs matchs, et surtout **qui serait supprimé** : 25 joueurs fictifs, 2 pseudos gardés (les miens). J'ai aussi listé les triggers et toutes les clés étrangères qui pointent vers `tournois`, `joueurs` et `matchs`, pour savoir ce que la suppression allait déclencher en cascade.

**2. Désigner par un identifiant stable.** Les tournois sont désignés par leur `qr_token`, pas par leur titre : un titre peut être réutilisé (« test »), un token jamais. Et le script s'arrête tout seul si on n'en trouve pas exactement 5 :

```sql
DO $$ BEGIN
  IF (SELECT count(*) FROM _t) <> 5 THEN
    RAISE EXCEPTION 'Attendu 5 tournois de test, trouvé % : rien n''a été supprimé.', (SELECT count(*) FROM _t);
  END IF;
END $$;
```

Rejoué une deuxième fois, il ne trouve plus rien et refuse : il ne peut pas faire de dégât par erreur.

**3. Comprendre ce qui bloque.** `arena.logs` et `arena.consentements` sont « append-only » : un trigger refuse tout `UPDATE` et tout `DELETE` (migration 001). Or supprimer un tournoi déclenche la clé étrangère `logs.tournoi_id ON DELETE SET NULL`, c'est-à-dire un `UPDATE` sur `logs`, donc le trigger refuse. Solution : couper les deux triggers **à l'intérieur de la transaction**, puis les réactiver avant le `COMMIT`. En PostgreSQL, le DDL est transactionnel : si une étape échoue, l'annulation remet aussi les triggers. Il n'existe aucun moment où le journal reste sans protection après le script.

**4. Tester sur une copie, puis vérifier en production.** `sql/test_purge_tests.mjs` rejoue toutes les migrations sur PGlite, crée les mêmes tokens, un vrai tournoi à garder, un joueur présent dans les deux, un joueur avec un compte, et vérifie 10 points : les tests partent, le vrai reste, les triggers sont réactivés, rejoué le script refuse. En production, la requête de vérification finale attendait `0, 0, 0, true, true, 2` et a rendu exactement ça. La purge elle-même est inscrite dans le journal (`PURGE_TOURNOIS_TEST`).

## Comment je l'explique au jury

« Avant de supprimer en production, je liste ce qui va partir sans rien toucher, je désigne les lignes par un identifiant stable, et le script vérifie qu'il trouve exactement ce qu'il attend, sinon il s'arrête. Tout est dans une transaction : si une étape échoue, rien n'est supprimé. J'ai dû couper deux triggers de protection, mais à l'intérieur de la transaction, donc leur réactivation est garantie. Et je l'ai testé sur une copie avec le schéma complet avant de le lancer. »

## La question vicieuse du jury

**« Vous désactivez un trigger de protection en production. C'est exactement ce qu'un attaquant ferait. »**

Oui, et c'est pour ça que je ne l'ai pas fait n'importe comment. Un attaquant qui peut exécuter `ALTER TABLE` est déjà propriétaire de la base : le trigger ne l'aurait pas arrêté. Le trigger protège contre les **erreurs** du code de l'application, qui n'a pas ce droit. Ma désactivation est limitée à une transaction, visible dans un script versionné, testée, et la purge est journalisée. La vraie faiblesse est ailleurs : je lance ces scripts à la main dans l'éditeur SQL de Supabase. À deux développeurs, il faudrait un outil de migrations qui garde la trace de ce qui a été exécuté.
