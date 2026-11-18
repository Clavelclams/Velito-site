---
titre: "L'anonymat qu'on ne peut pas trahir : il n'y a pas de colonne pour ça"
projet: "arena"
bloc: 2
themes: ["rgpd", "base-de-donnees", "modelisation"]
source: "apps/arena/sql/015_arena_defis.sql, apps/arena/lib/arena/defi.ts"
date: 2026-11-18
---

## Le concept

Le 17/11/2026, VEA animait un atelier Overcooked 2 au « Stade vers l'Emploi » (France Travail, APSL 80) : des demandeurs d'emploi en situation de handicap et des employeurs jouaient ensemble, de façon **totalement anonyme**, devant une caméra. Il fallait un écran géant avec le chrono et les scores, et une saisie sur téléphone.

J'ai créé un format « défi au score » (migration 015). La règle d'anonymat n'est pas une consigne dans le code, c'est une propriété du **schéma** :

```sql
CREATE TABLE arena.defi_equipes (
  id          uuid PRIMARY KEY,
  rotation_id uuid NOT NULL REFERENCES arena.defi_rotations(id) ON DELETE CASCADE,
  couleur     text NOT NULL CHECK (couleur IN ('ROUGE', 'BLEU')),
  score       int  NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 999),
  UNIQUE (rotation_id, couleur)
);
```

Il n'y a **aucune colonne** pour une personne : ni joueur, ni pseudo, ni âge. Une équipe s'appelle « G3 Rouge » (numéro de rotation + couleur), et ce nom est calculé, pas stocké. Un bug, une erreur de saisie, un développeur pressé : rien ne peut écrire un nom, parce qu'il n'y a nulle part où l'écrire. C'est la minimisation du RGPD (article 5) appliquée au plus bas niveau.

Trois autres choix de la même famille :

**Isolation par la structure.** Le défi a ses propres tables, sans lien avec `arena.tournois`, `joueurs` ou `matchs`. Le classement général, l'ELO, les badges, le sitemap et l'API publique lisent tous `arena.tournois`. Je n'ai donc écrit aucun `if (estUnDefi)` pour l'exclure : il est absent par construction.

**Fermé par défaut.** RLS activée, aucune policy, aucun droit pour `anon` ni `authenticated`. L'écran lit par une route serveur qui cherche le défi par son token (UUID non devinable) ; le staff écrit par des Server Actions après `requireStaff()`.

**Le + et le − atomiques.** `arena.defi_ajuster_score(p_equipe, p_delta)` fait `UPDATE ... SET score = least(999, greatest(0, score + p_delta))` en une instruction : deux appuis rapides ne s'écrasent jamais et le score ne descend pas sous zéro.

**Un rafraîchissement plutôt que le temps réel.** L'écran relit l'état toutes les 3 secondes au lieu d'utiliser Supabase Realtime. Raisons : les tables n'ont aucun droit pour le client anonyme (Realtime demanderait d'en ouvrir), et sur le Wi-Fi d'un gymnase, un `fetch` répété se remet seul d'une coupure alors qu'une websocket peut rester bloquée sans le dire. 3 secondes de retard sont invisibles sur une manche de 4 minutes.

La logique (classement du jour, ex æquo, record, CSV, quel panneau afficher à quel instant) est dans un module pur : `lib/arena/defi.ts`, 12 tests.

## Comment je l'explique au jury

« Pour un atelier avec des personnes en situation de handicap, filmé, l'anonymat n'était pas négociable. Plutôt que de compter sur le code pour ne pas écrire de nom, j'ai fait un schéma où il n'y a aucune colonne pour une personne : une équipe, c'est une couleur, un numéro de rotation et un score. Les tables sont isolées des tournois, donc rien n'apparaît dans le classement ou l'API sans que j'aie écrit d'exclusion. Et elles sont fermées : RLS sans policy, seul le serveur y accède. »

## La question vicieuse du jury

**« Une couleur et un horaire, ce n'est pas un peu identifiant ? On sait qui jouait à 9h30. »**

Sur place, oui : les gens présents à 9h30 savent qui était dans l'équipe Rouge. Mais c'est une information qu'ils ont déjà en étant dans la salle, et la base ne la relie à rien : aucun nom, aucun lien vers une liste de présence. Ma base ne permet pas de retrouver une personne ; elle ne peut pas empêcher quelqu'un de se souvenir de ce qu'il a vu. C'est la différence entre une donnée personnelle (qui permet d'identifier) et une donnée anonyme (qui ne le permet plus, même en la croisant avec ce que j'ai). Ce que je n'ai pas : une purge automatique des défis après l'événement. Ils ne contiennent rien de personnel, mais une durée de conservation écrite serait plus propre.
