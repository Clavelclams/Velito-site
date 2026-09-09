---
titre: "Protéger un mineur avec une contrainte CHECK, pas avec un if"
projet: "arena"
bloc: 2
themes: ["base-de-donnees", "rgpd"]
source: "apps/arena/sql/001_arena_schema_v1.sql (arena.joueurs)"
date: 2026-09-04
---

## Le concept

ARENA sert une association qui fait jouer des jeunes. Deux règles ne sont pas négociables : on collecte le minimum, et un mineur n'apparaît dans aucun classement public. Toutes les deux sont écrites dans le **schéma**, pas dans le code applicatif.

```sql
CREATE TABLE arena.joueurs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pseudo                   text NOT NULL UNIQUE
                             CHECK (char_length(pseudo) BETWEEN 2 AND 32),
  -- RGPD / minimisation : ANNÉE seule, jamais la date complète.
  annee_naissance          int CHECK (annee_naissance BETWEEN 1900 AND 2100),
  est_mineur               boolean NOT NULL DEFAULT false,
  consentement_parental_at timestamptz,
  profil_public            boolean NOT NULL DEFAULT true,
  CONSTRAINT mineur_profil_restreint
    CHECK (NOT est_mineur OR profil_public = false),
  anonymise                boolean NOT NULL DEFAULT false
);
```

**La minimisation d'abord.** Le champ est `annee_naissance`, pas `date_naissance`. Le RGPD demande de ne collecter que ce qui est nécessaire à la finalité ; ma finalité est de savoir si quelqu'un est mineur et de faire des catégories d'âge — l'année suffit. Le jour et le mois seraient de la donnée en trop, donc de la donnée à protéger, à conserver et à supprimer pour rien. **La donnée la mieux protégée est celle qu'on n'a pas.**

**L'invariant ensuite.** `CHECK (NOT est_mineur OR profil_public = false)` est la traduction SQL de « si mineur, alors profil non public ». En logique, `A ⇒ B` s'écrit `NOT A OR B`. La contrainte est vérifiée à chaque INSERT et chaque UPDATE, par la base, pour tous les rôles.

La différence avec un `if` applicatif est celle qui compte : un `if` protège **le chemin où il est écrit**. La contrainte protège **la table**. Un import CSV, un script de reprise, une requête à la main dans l'éditeur Supabase, une future route que j'écrirai dans six mois en ayant oublié la règle — tous se heurtent au même mur.

Enfin, un pseudo entre 2 et 32 caractères et un `UNIQUE` : le pseudo est l'identité publique par défaut. Le nom réel n'est pas dans cette table. La **pseudonymisation est l'état par défaut**, pas une option à cocher.

## Comment je l'explique au jury

« Les règles RGPD d'ARENA sont dans le schéma. Je stocke l'année de naissance et pas la date complète, parce que ma finalité — savoir si quelqu'un est mineur et faire des catégories — n'exige pas le jour. Et la règle "un mineur n'est jamais public" est une contrainte `CHECK` : `NOT est_mineur OR profil_public = false`, soit l'implication logique traduite en SQL. Un `if` dans mon code aurait protégé le formulaire d'inscription ; la contrainte protège la table, y compris contre un import, un script ou une requête manuelle. La pseudonymisation est l'état par défaut : ce que la table connaît d'un joueur, c'est un pseudo. »

## La question vicieuse du jury

**« `est_mineur` est un booléen que quelqu'un doit remplir. Qui garantit qu'il est juste ? »**

Personne, et c'est la limite honnête du dispositif. La base garantit la **cohérence** — si le drapeau dit mineur, le profil ne peut pas être public — mais pas la **véracité** du drapeau. Rien n'empêche un jeune de se déclarer majeur, exactement comme sur toutes les plateformes grand public. Ce que j'ai en atténuation : `annee_naissance` permet de recalculer l'âge et de repérer une incohérence, `consentement_parental_at` matérialise le consentement parental pour les moins de 15 ans (le seuil français de l'article 8 du RGPD), et le journal `arena.consentements` est en append-only donc horodaté et opposable. La vraie garantie reste humaine : sur les tournois de l'association, les inscriptions passent par le staff qui connaît les jeunes. Prétendre qu'un booléen sécurise l'âge serait faux, et le dire ainsi est plus solide que de faire semblant.
