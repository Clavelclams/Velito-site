---
titre: "Valider un score en une seule transaction : tout passe, ou rien"
projet: "arena"
bloc: 2
themes: ["base-de-donnees", "securite-applicative", "architecture"]
source: "apps/arena/sql/012_arena_validation_atomique.sql"
date: 2026-11-18
---

## Le concept

Valider un match, ce n'est pas une écriture, c'en est plusieurs :

1. passer le match en `VALIDE` ;
2. placer le gagnant dans le match du tour suivant ;
3. en double élimination, placer le perdant dans le tableau de rattrapage ;
4. écrire la ligne de journal.

Avant le 12/11/2026, `validerScore` (dans `lib/arena/actions.ts`) faisait ces écritures **une par une** depuis Node, avec supabase-js. Or supabase-js n'a pas de transaction. Deux bugs en découlaient.

**Le tableau bloqué.** Si l'étape 2 échouait après l'étape 1, le match était déjà `VALIDE`, donc verrouillé par le trigger du règlement §3 (un match validé ne change plus). Le gagnant n'avait pas avancé, et rien dans l'interface ne permettait de réparer.

**La double validation.** Deux membres du staff qui cliquaient « Valider » en même temps passaient tous les deux. Le second réécrivait les mêmes valeurs, le verrou ne voyait pas de changement, et l'ELO était compté deux fois.

La correction, c'est la migration 012 : une fonction Postgres `arena.appliquer_validation`. Le partage des rôles est le point à retenir :

- **TypeScript calcule QUOI écrire.** La logique du bracket reste dans `lib/bracket.ts` et `lib/bracket-double.ts`, des modules purs déjà testés. Ils produisent une liste de placements (`match_id`, `slot`, `camp_id`).
- **Postgres APPLIQUE, en une transaction.** La fonction reçoit cette liste en `jsonb` et fait toutes les écritures. Une fonction PL/pgSQL s'exécute dans une seule transaction : si un placement ne trouve pas son match, une exception annule TOUT, y compris le passage en `VALIDE` et le journal.

La double validation est réglée par une seule ligne :

```sql
UPDATE arena.matchs SET statut = 'VALIDE', ...
 WHERE id = p_match AND statut = 'TERMINE';
```

La condition `statut = 'TERMINE'` est dans l'écriture elle-même. Postgres verrouille la ligne pendant l'`UPDATE` : la première requête passe le match en `VALIDE`, la seconde ne trouve plus de ligne qui correspond et reçoit une erreur claire. Il n'y a pas de « lire, vérifier, puis écrire » entre lesquels quelqu'un pourrait se glisser.

Le test a aussi trouvé un vrai trou : un placement pouvait écrire dans un match **déjà validé** du tour suivant. J'ai ajouté une garde (`statut <> 'VALIDE'` sur le match cible).

La fonction n'est exécutable que par `service_role`. Le serveur l'appelle APRÈS `requireStaff()` et `chargerTournoiDeLOrga()` : la base n'a pas à refaire le contrôle des droits, mais personne ne peut l'appeler depuis un navigateur.

Preuve : `sql/test_validation_atomique.mjs`, 29 contrôles sur un vrai Postgres en local (PGlite).

## Comment je l'explique au jury

« Valider un score, c'est quatre écritures. supabase-js n'a pas de transaction, donc j'ai déplacé les écritures dans une fonction Postgres, qui s'exécute en une seule transaction : si une étape échoue, tout est annulé. J'ai gardé la logique du bracket en TypeScript, testée en modules purs : TypeScript décide quoi écrire, Postgres l'applique d'un bloc. La double validation est réglée par la condition dans l'UPDATE lui-même, `WHERE statut = 'TERMINE'` : Postgres verrouille la ligne, une seule requête gagne. Je l'ai prouvé avec 29 tests sur un vrai Postgres, qui ont d'ailleurs trouvé un trou que j'ai corrigé. »

## La question vicieuse du jury

**« Pourquoi ne pas avoir tout mis dans la fonction SQL, bracket compris ? »**

Parce que la logique du bracket est la partie la plus complexe et la mieux testée du projet : `lib/bracket.test.ts`, `bracket-double.test.ts` et `poules.test.ts`, en TypeScript, avec Vitest, en quelques millisecondes. La réécrire en PL/pgSQL, c'était perdre ces tests et dupliquer la règle. J'ai séparé selon la responsabilité : le calcul est pur et testable, l'application doit être atomique. La limite assumée : si le calcul TypeScript est faux, la base appliquera fidèlement un placement faux. La base garantit la cohérence, pas la justesse du calcul ; c'est le rôle des tests unitaires.
