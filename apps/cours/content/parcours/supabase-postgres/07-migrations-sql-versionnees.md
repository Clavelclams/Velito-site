---
titre: "Migrations SQL : l'historique de ta base est du code"
parcours: "supabase-postgres"
ordre: 7
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Comment sais-tu à quoi ressemble la base d'ARENA ? Pas en regardant le dashboard — en lisant `apps/arena/sql/001` à `008`. Huit fichiers numérotés, versionnés dans Git avec le code. Rejouer 001 → 008 sur une base vide reconstruit la production. C'est ça, une **migration** : un changement de structure écrit sous forme de script, daté, ordonné, reproductible.

**Pourquoi pas juste modifier dans le dashboard.** Le Table Editor de Supabase permet d'ajouter une colonne en trois clics. Et six mois plus tard : quand cette colonne est-elle apparue ? Pourquoi ? Qui l'a ajoutée ? Est-elle sur l'environnement de test ? Personne ne sait. Le dashboard est fait pour **regarder**, pas pour **changer**. Un changement de structure est une décision ; une décision se documente ; un fichier SQL commité est cette documentation, exécutable.

**Anatomie d'une migration ARENA :**

```sql
-- ============================================================================
-- ARENA — Migration 007 : terrains de match (module sport)
-- ============================================================================
-- POURQUOI : un tournoi de padel se joue sur plusieurs terrains en parallèle ;
-- le staff doit pouvoir dire « match 3 sur terrain B » …
-- ============================================================================
BEGIN;

CREATE TABLE arena.terrains ( … );
ALTER TABLE arena.matchs ADD COLUMN terrain_id uuid REFERENCES arena.terrains(id);
CREATE INDEX idx_arena_matchs_terrain ON arena.matchs(terrain_id);

COMMIT;
```

Trois choses non négociables :

1. **Un en-tête qui dit pourquoi.** Pas seulement ce que fait le script — n'importe qui peut le lire — mais le besoin qui l'a motivé et les décisions prises. C'est ce que tu ne retrouveras jamais ailleurs.
2. **`BEGIN; … COMMIT;`** — toute la migration dans une transaction. Si la troisième instruction échoue, les deux premières sont annulées. La base n'est jamais à moitié migrée. (Attention : certaines instructions, comme `CREATE INDEX CONCURRENTLY`, refusent d'être dans une transaction — cas rare, à connaître.)
3. **Numérotée et immuable une fois exécutée.** `003` vient après `002`. Une migration qui a tourné en prod ne se modifie plus : on en ajoute une nouvelle. Exception documentée : la `001` d'ARENA a été réécrite parce qu'elle n'avait **jamais** été exécutée — et le fichier le dit, avec la date.

**Migration de structure vs migration de données.** Ajouter une colonne (DDL) est portable : ça marche sur toute base qui a la table. Remplir une colonne (`UPDATE … SET …`, DML) fait des hypothèses sur le **contenu** — et c'est ce qui a mordu Venaball le 9 septembre : `UPDATE club SET sigle = 'MABB' WHERE id = 2` était vrai sur une base et faux sur l'autre. Règle : tout DML dans une migration est **gardé** par une condition qui vérifie qu'il s'applique aux bonnes lignes, et identifie par une clé métier (`slug`), jamais par un `id` auto-incrémenté.

**Backfill : répondre pour le passé.** Ajouter une colonne `NOT NULL` à une table pleine échoue (les lignes existantes n'ont pas de valeur). Trois stratégies : `DEFAULT` (toutes les anciennes lignes prennent la même valeur), backfill explicite (`UPDATE` gardé, puis `ALTER … SET NOT NULL`), ou nullable et le code gère `NULL` pour toujours. La migration `Version20260726120000` de Venaball (colonne `source` des stats) a choisi le backfill : remplir l'existant avec sa vraie origine, pour ne pas créer une troisième valeur « inconnu ».

**Le point faible actuel d'ARENA, et comment le corriger.** Les migrations sont exécutées **à la main** dans le SQL Editor. Rien ne dit à la base lesquelles sont passées. Ça tient parce que tu es seul et qu'elles sont numérotées ; ça ne tiendrait pas à deux. Deux corrections possibles :

- **Le CLI Supabase** : `supabase migration new nom` crée un fichier horodaté, `supabase db push` applique ce qui manque, et une table `supabase_migrations.schema_migrations` tient le journal. C'est l'outil officiel, et c'est l'équivalent de Doctrine Migrations que tu utilises déjà sur Venaball.
- **Une table maison** : `arena.migrations_appliquees(nom, at)`, et chaque fichier se termine par `INSERT INTO arena.migrations_appliquees VALUES ('007', now());`. Plus rustique, mais zéro outil.

Tu connais déjà le bon modèle : `doctrine_migration_versions` sur Venaball. La base sait où elle en est, `doctrine:migrations:migrate` applique le reste. ARENA devrait avoir la même chose.

**Le `down`.** Une migration Doctrine a un `up()` et un `down()`. Tes fichiers SQL n'ont que le `up`. Écrire le `down` (`DROP TABLE arena.terrains; ALTER TABLE arena.matchs DROP COLUMN terrain_id;`) est utile pour revenir en arrière en dev — et honnête : certaines migrations n'ont pas de retour possible (une colonne supprimée avec ses données). Écris le `down` quand il existe, et un commentaire « irréversible » quand il n'existe pas.

## À retenir

- Une migration = un script SQL numéroté, commité, transactionnel, avec un en-tête qui dit **pourquoi**.
- Exécutée en prod → immuable. On ajoute, on ne modifie pas.
- DDL portable ; DML gardé par une condition métier, jamais par un `id`.
- `NOT NULL` sur une table pleine → `DEFAULT`, backfill, ou nullable assumé.
- Un journal des migrations appliquées (CLI Supabase ou table maison). Sans lui, ça ne tient qu'à une personne.

## Mise en pratique

Objectif : écrire une migration complète pour ARENA — avec en-tête, transaction, garde, et journal.

1. Crée `apps/arena/sql/009_arena_migrations_journal.sql` : en-tête (pourquoi : tracer les migrations appliquées), `BEGIN;`, `CREATE TABLE arena.migrations_appliquees (nom text PRIMARY KEY, appliquee_le timestamptz NOT NULL DEFAULT now());`, puis 8 `INSERT` pour `001` à `008` (elles sont déjà passées), puis l'insert de `009` elle-même, `COMMIT;`.
2. Exécute-la dans le SQL Editor. `SELECT * FROM arena.migrations_appliquees ORDER BY nom;` → 9 lignes.
3. Écris `010_arena_exemple.sql` qui ajoute une colonne **nullable** `note_staff text` à `arena.tournois`, avec en-tête, transaction, et son `INSERT` dans le journal. Ajoute en commentaire le `down` correspondant. Exécute.
4. Écris une migration de données **gardée** : `UPDATE arena.tournois SET note_staff = 'Tournoi historique' WHERE titre = 'Un titre qui existe chez toi' AND note_staff IS NULL;`. Pourquoi `AND note_staff IS NULL` ? (Idempotence : la rejouer ne réécrit pas une note posée entre-temps.)
5. Teste la transaction : écris une migration avec deux instructions dont la seconde est volontairement fausse (`ALTER TABLE arena.tournois ADD COLUMN x int; ALTER TABLE arena.nexistepas ADD COLUMN y int;`) dans un `BEGIN/COMMIT`. Exécute : erreur, et `x` **n'existe pas** (vérifie). Sans `BEGIN/COMMIT`, `x` existerait. C'est l'atomicité.
6. Annule proprement : écris et exécute `011_arena_retire_exemple.sql` qui supprime `note_staff` et enregistre `011` dans le journal. Garde `009` (le journal) — c'est une vraie amélioration.
7. Commit les fichiers `009` et `011` (supprime `010`), via une branche et une PR.

Résultat attendu : ARENA a un journal de migrations, tu as écrit trois migrations propres, et tu as vu une transaction annuler une migration cassée.
