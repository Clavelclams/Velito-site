---
titre: "Triggers : la règle que même service_role ne peut pas violer"
parcours: "supabase-postgres"
ordre: 5
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

La RLS filtre ce qu'on **voit**. Elle est contournée par `service_role`, que ton code serveur utilise pour écrire. Donc si ton code serveur fait une bêtise — un bug, une action mal écrite, un script de migration — la RLS ne protège de rien. Il faut un mécanisme qui s'applique **à tous les rôles**. C'est le trigger.

**Un trigger est une fonction déclenchée par un événement sur une table :** avant ou après un `INSERT`, `UPDATE`, `DELETE`, pour chaque ligne ou pour l'instruction entière. Il peut lire l'ancienne ligne (`OLD`), la nouvelle (`NEW`), les modifier, ou **refuser** en levant une exception.

Le verrou d'ARENA :

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

CREATE TRIGGER trg_arena_verrou_match_valide
  BEFORE UPDATE ON arena.matchs
  FOR EACH ROW EXECUTE FUNCTION arena.verrou_match_valide();
```

Lecture : avant chaque mise à jour d'un match, si l'ancienne ligne était `VALIDE` et que le score, le gagnant ou le statut changent → exception, rien n'est écrit. Sinon → `RETURN NEW`, la mise à jour continue.

**Pourquoi `BEFORE` et non `AFTER`.** Un trigger `BEFORE` s'exécute avant l'écriture : lever une exception annule l'opération sans qu'elle ait eu lieu. Un `AFTER` s'exécute après ; il peut annuler aussi (la transaction est rollbackée), mais il est fait pour les effets secondaires — journaliser, notifier, mettre à jour une autre table. Règle : **valider en `BEFORE`, réagir en `AFTER`**.

**`IS DISTINCT FROM` plutôt que `<>`.** En SQL, `NULL <> 5` ne vaut ni vrai ni faux : ça vaut `NULL`, et un `IF NULL` ne passe pas. Avec `<>`, un score qui passe de `NULL` à `10` sur un match validé **passerait le verrou**. `IS DISTINCT FROM` traite `NULL` comme une valeur ordinaire : `NULL IS DISTINCT FROM 5` est vrai. Sur un trigger de sécurité, c'est la différence entre protéger et croire protéger.

**Append-only : interdire UPDATE et DELETE.**

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

Une seule fonction, réutilisée sur `logs` et `consentements`. Les variables `TG_*` donnent le contexte (table, opération) pour un message utile. Un journal qu'on ne peut ni modifier ni effacer est un journal **opposable** : c'est ce qui rend l'historique des consentements RGPD défendable.

**Le point essentiel : un trigger s'applique à tout le monde.** `anon`, `authenticated`, `service_role`, toi dans le SQL Editor. Il n'y a pas de rôle qui le contourne (sauf à le désactiver explicitement : `ALTER TABLE … DISABLE TRIGGER …`, ce qui est un acte conscient et tracé). C'est pour ça que les **invariants métier critiques** vont dans des triggers, pas dans du code applicatif ni dans des policies : « un résultat validé est définitif » ne dépend plus de la discipline de personne.

**Ce qu'un trigger ne doit pas faire.** De la logique métier lourde, des appels externes, des boucles sur d'autres tables à chaque ligne. Un trigger s'exécute **dans** la transaction : s'il est lent, tout est lent ; s'il plante, tout plante. Garde-le pour : valider un invariant, remplir un champ dérivé (`updated_at = now()`), journaliser. Le reste est du code applicatif.

**Autres triggers de ton écosystème.** `shared.merge_preinscrit_by_phone()` (VEA) — un `AFTER INSERT` sur `auth.users` qui fusionne une préinscription avec le nouveau compte. C'est un trigger de réaction, pas de validation — et sa fiche projet raconte comment sa v1 fusionnait les fratries. Un trigger fait exactement ce qu'on lui dit, à chaque fois, sans se poser de questions : c'est sa force et son danger.

## À retenir

- Un trigger = fonction exécutée sur INSERT/UPDATE/DELETE, avec `OLD` et `NEW`, capable de refuser.
- Il s'applique à **tous** les rôles, `service_role` compris. C'est là que vont les invariants critiques.
- `BEFORE` pour valider/refuser, `AFTER` pour réagir.
- `IS DISTINCT FROM`, jamais `<>`, quand `NULL` est possible.
- Append-only = trigger qui lève sur UPDATE et DELETE. Un journal opposable.
- Court, rapide, sans effets externes : il tourne dans la transaction.

## Mise en pratique

Objectif : poser un verrou et un append-only, les tester avec service_role, et voir qu'ils tiennent.

1. SQL Editor : `CREATE SCHEMA lecon; CREATE TABLE lecon.resultats (id serial PRIMARY KEY, score int, valide boolean DEFAULT false); INSERT INTO lecon.resultats (score) VALUES (10), (20);`
2. Trigger de verrou : recopie `verrou_match_valide` adapté (`IF OLD.valide AND NEW.score IS DISTINCT FROM OLD.score THEN RAISE …`). Crée le trigger `BEFORE UPDATE`.
3. `UPDATE lecon.resultats SET score = 11 WHERE id = 1;` → ok (pas validé). `UPDATE lecon.resultats SET valide = true WHERE id = 1;` → ok. `UPDATE lecon.resultats SET score = 12 WHERE id = 1;` → **exception**. Tu es en `service_role` dans l'éditeur : le trigger t'a bloqué quand même.
4. Le piège NULL : `INSERT INTO lecon.resultats (score, valide) VALUES (NULL, true);` puis `UPDATE … SET score = 5 WHERE score IS NULL;` → bloqué grâce à `IS DISTINCT FROM`. Remplace-le par `<>` dans la fonction, réessaie : **ça passe**. Remets `IS DISTINCT FROM`. Tu viens de voir la faille.
5. Append-only : `CREATE TABLE lecon.journal (id serial, msg text, at timestamptz DEFAULT now());` + fonction `interdire_modification` + trigger `BEFORE UPDATE OR DELETE`. `INSERT` ok, `UPDATE` bloqué, `DELETE` bloqué. Lis le message : il nomme la table et l'opération.
6. Trigger `AFTER` de réaction : une fonction qui insère dans `lecon.journal` un message à chaque `UPDATE` de `resultats`. Fais un update autorisé : le journal a une ligne. Un update refusé par le verrou : le journal n'a **pas** de ligne — la transaction a été annulée en entier. C'est l'atomicité.
7. Ouvre `apps/arena/sql/001_arena_schema_v1.sql`, lis les trois triggers. Pour chacun : `BEFORE` ou `AFTER` ? Valide ou réagit ? Quelle règle du règlement il garantit ?
8. `DROP SCHEMA lecon CASCADE;`

Résultat attendu : tu as bloqué `service_role` avec un trigger, vu la faille `<>`/NULL, et compris qu'un trigger tourne dans la transaction.
