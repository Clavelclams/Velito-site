---
titre: "Un invariant que même ma clé d'admin ne peut pas violer"
projet: "arena"
bloc: 2
themes: ["base-de-donnees", "securite-applicative"]
source: "apps/arena/sql/001_arena_schema_v1.sql (triggers)"
date: 2026-09-04
---

## Le concept

Le règlement d'ARENA dit deux choses fortes : un résultat validé est définitif, et tout est historisé. Ces deux promesses ne pouvaient pas reposer sur ma discipline de développeur, parce qu'un jour j'écrirai la ligne de code qui les casse sans m'en rendre compte. Elles sont donc posées en **triggers Postgres**.

Le verrou de validation :

```sql
CREATE OR REPLACE FUNCTION arena.verrou_match_valide()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut = 'VALIDE' AND (
       NEW.score_j1   IS DISTINCT FROM OLD.score_j1 OR
       NEW.score_j2   IS DISTINCT FROM OLD.score_j2 OR
       NEW.gagnant_id IS DISTINCT FROM OLD.gagnant_id OR
       NEW.statut     IS DISTINCT FROM OLD.statut
     ) THEN
    RAISE EXCEPTION 'Match % : résultat validé, modification interdite (règlement §3).', OLD.id;
  END IF;
  RETURN NEW;
END; $$;
```

Le journal en append-only :

```sql
CREATE OR REPLACE FUNCTION arena.interdire_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table %.% : journal en append-only, % interdit.',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END; $$;

CREATE TRIGGER trg_arena_logs_append_only
  BEFORE UPDATE OR DELETE ON arena.logs
  FOR EACH ROW EXECUTE FUNCTION arena.interdire_modification();
```

Le point décisif : **un trigger s'applique à tous les rôles**, y compris `service_role` — la clé qui contourne la RLS. Une policy RLS peut être contournée par un rôle privilégié ; un trigger, non. C'est pour ça que les invariants qui comptent vraiment sont ici et pas dans une policy.

Deux détails de conception. `IS DISTINCT FROM` plutôt que `<>` : avec `<>`, une comparaison où une valeur est `NULL` rend `NULL`, donc ni vrai ni faux, et le test passe à travers. `IS DISTINCT FROM` traite `NULL` comme une valeur ordinaire. Et le trigger est `BEFORE UPDATE`, donc l'exception part **avant** toute écriture — rien à annuler.

Même logique pour les consentements RGPD : la table est un journal, l'état courant d'un consentement est la **dernière ligne** pour ce couple (joueur, type). On n'écrase jamais un consentement, on en ajoute un nouveau. C'est ce qui rend la preuve opposable : je peux dire *quand* quelqu'un a coché et *quand* il a décoché.

## Comment je l'explique au jury

« Deux règles du règlement sont garanties par la base, pas par mon code : un match validé ne peut plus changer de score, et les journaux ne peuvent être ni modifiés ni supprimés. Ce sont des triggers `BEFORE`, qui lèvent une exception avant toute écriture. J'ai choisi le trigger plutôt qu'une policy RLS parce qu'un trigger s'applique à tous les rôles, y compris la clé de service qui contourne la RLS. Si mon propre code fait une bêtise avec les pleins droits, la base refuse quand même. Pour les consentements RGPD, la table est un journal append-only : l'état courant est la dernière ligne, ce qui me donne l'historique horodaté des accords et des retraits. »

## La question vicieuse du jury

**« Et si vous vous trompez ? Un score validé par erreur devient impossible à corriger. »**

Impossible par le chemin normal, oui — c'est exactement le but. La correction existe, mais elle est **hors du flux applicatif** : il faut se connecter à la base, désactiver le trigger, corriger, le réactiver. C'est volontairement pénible, parce que ça garantit qu'une correction de résultat est un acte conscient et tracé, pas un clic. Le vrai garde-fou est en amont : la validation est une action distincte de la saisie du score. On saisit (`TERMINE`), les deux joueurs vérifient, puis quelqu'un valide (`VALIDE`) — et le statut `LITIGIEUX` existe pour marquer un désaccord avant d'en arriver là. Ce que je n'ai pas encore, et que je note comme manque : une procédure d'annulation officielle qui écrirait dans `arena.logs` *pourquoi* un résultat validé a été rouvert. Aujourd'hui la correction est possible mais elle n'est pas tracée, ce qui est incohérent avec une table de logs append-only.
