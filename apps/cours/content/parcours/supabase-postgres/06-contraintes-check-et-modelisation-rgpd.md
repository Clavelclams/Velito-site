---
titre: "Contraintes CHECK : écrire une règle métier dans la table elle-même"
parcours: "supabase-postgres"
ordre: 6
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Entre « une colonne typée » et « un trigger », il y a un outil plus simple et sous-utilisé : la **contrainte `CHECK`**. C'est une condition booléenne sur une ligne, vérifiée à chaque `INSERT` et `UPDATE`. Si elle est fausse, la base refuse. Pas de fonction, pas de trigger, une ligne dans le `CREATE TABLE`.

Regarde `arena.joueurs` :

```sql
CREATE TABLE arena.joueurs (
  pseudo           text NOT NULL UNIQUE CHECK (char_length(pseudo) BETWEEN 2 AND 32),
  annee_naissance  int CHECK (annee_naissance BETWEEN 1900 AND 2100),
  est_mineur       boolean NOT NULL DEFAULT false,
  profil_public    boolean NOT NULL DEFAULT true,
  CONSTRAINT mineur_profil_restreint CHECK (NOT est_mineur OR profil_public = false),
  /* … */
);
```

Quatre contraintes, quatre niveaux de règle :

- `NOT NULL` — la valeur doit exister. Le plus basique et le plus oublié.
- `UNIQUE` — pas deux fois la même. Sur `pseudo` : c'est l'identité publique, elle ne peut pas être ambiguë. C'est aussi ce qui a rendu possible l'idempotence de `action_match.client_uid` sur Venaball (un index unique refuse le doublon si le code le rate).
- `CHECK` sur une colonne — une plage, une longueur, une liste : `char_length(pseudo) BETWEEN 2 AND 32`, `statut IN ('BROUILLON','OUVERT',…)`.
- `CHECK` **nommé** sur plusieurs colonnes — une règle qui lie des colonnes entre elles : `mineur_profil_restreint`.

**Traduire une règle métier en logique.** « Si mineur, alors profil non public » est une implication : `A ⇒ B`. En logique propositionnelle, `A ⇒ B` équivaut à `NOT A OR B`. D'où `CHECK (NOT est_mineur OR profil_public = false)`. Ce n'est pas une astuce, c'est de la logique de première année, et savoir la faire te permet d'écrire n'importe quelle règle conditionnelle en une contrainte.

Autre exemple, `arena.matchs` : `CONSTRAINT valide_implique_gagnant CHECK (statut <> 'VALIDE' OR gagnant_id IS NOT NULL)`. « Validé ⇒ a un gagnant ». Même forme.

**Pourquoi une contrainte plutôt qu'un `if` dans le code.** Un `if` dans le formulaire d'inscription protège le formulaire d'inscription. Un import CSV, un script de reprise, une Server Action écrite dans six mois, une requête à la main dans le SQL Editor — aucun ne passe par ce `if`. La contrainte, elle, est vérifiée **quel que soit le chemin**. Elle transforme une règle qu'on doit *se rappeler* en une règle qu'on *ne peut pas* violer.

Et contrairement à un trigger, une contrainte est **déclarative** : elle se lit dans le schéma, elle apparaît dans `\d arena.joueurs`, elle est comprise par l'optimiseur. Un trigger est du code ; une contrainte est une propriété.

**La minimisation RGPD dans le schéma.** `annee_naissance` et non `date_naissance`. La finalité (« est-ce un mineur ? », « quelle catégorie d'âge ? ») n'exige que l'année. Le jour et le mois seraient de la donnée en trop : à protéger, à conserver, à supprimer pour rien. **La donnée la mieux protégée est celle qu'on n'a pas.** Ce choix se fait au `CREATE TABLE`, pas après.

Dans le même esprit : la table connaît un `pseudo`, pas un nom réel. Un `user_id` nullable vers `auth.users` (le compte peut être supprimé sans supprimer l'historique sportif — `ON DELETE SET NULL`). Un booléen `anonymise` pour le droit à l'effacement : on ne supprime pas la ligne (elle porte des résultats de tournois qui appartiennent aussi aux adversaires), on la vide de ce qui identifie.

**Les contraintes qu'on ne peut pas écrire en CHECK.** Un `CHECK` ne voit que **sa ligne**. « Un joueur ne peut pas être inscrit deux fois au même tournoi » → `UNIQUE (tournoi_id, joueur_id)`. « Le total des inscrits ne dépasse pas `max_joueurs` » → ça touche plusieurs lignes : trigger. « Le `gagnant_id` est l'un des deux joueurs du match » → `CHECK (gagnant_id IN (joueur1_id, joueur2_id))` marche, c'est la même ligne. Règle : même ligne → `CHECK` ; plusieurs lignes → `UNIQUE` si c'est une unicité, trigger sinon.

**Ajouter une contrainte à une table existante.** `ALTER TABLE … ADD CONSTRAINT nom CHECK (…)` **échoue** si des lignes existantes la violent. C'est voulu : Postgres refuse de déclarer vrai ce qui est faux. Il faut d'abord corriger les données (ou `NOT VALID` pour l'appliquer aux nouvelles lignes seulement, puis `VALIDATE CONSTRAINT` après nettoyage).

## À retenir

- `CHECK` = une condition sur la ligne, vérifiée à chaque écriture, par tous les chemins.
- `A ⇒ B` s'écrit `NOT A OR B`. Toute règle conditionnelle tient en une contrainte.
- Contrainte = déclarative et lisible ; trigger = code. Préfère la contrainte quand elle suffit.
- Minimisation RGPD : année seule, pseudo par défaut, anonymisation plutôt que suppression. Ça se décide au `CREATE TABLE`.
- Même ligne → `CHECK`. Unicité → `UNIQUE`. Plusieurs lignes → trigger.

## Mise en pratique

Objectif : écrire cinq contraintes, les violer une par une, et convertir une règle métier en implication.

1. SQL Editor : `CREATE SCHEMA lecon; CREATE TABLE lecon.membres (id serial PRIMARY KEY, pseudo text NOT NULL, annee int, mineur boolean NOT NULL DEFAULT false, public boolean NOT NULL DEFAULT true, role text NOT NULL DEFAULT 'joueur');`
2. Ajoute une par une, en testant un `INSERT` qui viole chacune : `CHECK (char_length(pseudo) BETWEEN 2 AND 20)` ; `CHECK (annee BETWEEN 1900 AND 2100)` ; `CHECK (role IN ('joueur','staff','admin'))` ; `UNIQUE (pseudo)` ; `CONSTRAINT mineur_prive CHECK (NOT mineur OR public = false)`. Lis chaque message d'erreur : il nomme la contrainte.
3. Traduis en `CHECK` : « un admin est forcément majeur ». (`NOT (role = 'admin') OR mineur = false`.) Teste.
4. Traduis : « un membre public a forcément un pseudo d'au moins 4 caractères ». Teste.
5. Ajoute une contrainte sur une table qui la viole déjà : insère un membre `role = 'coach'`, puis tente d'ajouter `CHECK (role IN ('joueur','staff','admin'))` s'il n'existe pas déjà — ou retire-le et remets-le. Erreur : la ligne existante viole. Corrige la donnée, réessaie.
6. Ouvre `apps/arena/sql/001_arena_schema_v1.sql`. Liste **toutes** les contraintes `CHECK` (il y en a une dizaine). Pour chacune, écris la règle métier en français. Repère celles qui sont des implications.
7. Question : dans `arena.joueurs`, pourquoi `user_id` a `ON DELETE SET NULL` et pas `ON DELETE CASCADE` ? Réponds en 3 lignes en pensant aux adversaires.
8. `DROP SCHEMA lecon CASCADE;`

Résultat attendu : tu écris une règle métier en `CHECK` sans hésiter, tu sais laquelle relève d'un `UNIQUE` ou d'un trigger, et tu lis un schéma comme une liste de règles.
