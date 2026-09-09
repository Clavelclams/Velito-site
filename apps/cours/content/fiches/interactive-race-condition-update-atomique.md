---
titre: "Deux joueurs trouvent en même temps : le point qui disparaît"
projet: "interactive"
bloc: 2
themes: ["base-de-donnees", "concurrence"]
source: "apps/interactive/sql/interactive-add-player-score-rpc-v1.sql"
date: 2026-09-04
---

## Le concept

Tous les jeux de Velito Interactive mettaient à jour le score de la même façon :

1. `SELECT score` pour lire la valeur actuelle,
2. `score + points` en JavaScript,
3. `UPDATE` avec le résultat.

C'est le motif **read-modify-write**, et il contient une bombe à retardement. Deux soumissions simultanées sur le même joueur — plusieurs devineurs qui trouvent en même temps sur le jeu de dessin, le bonus « premier » sur Estim' — **lisent la même valeur de départ**, calculent chacune de leur côté, et écrivent chacune leur résultat. La seconde écrase la première. Un point disparaît.

C'est la **lost update**, la mise à jour perdue. Elle est vicieuse parce qu'elle ne produit ni erreur, ni log, ni plantage : juste un score faux, de temps en temps, quand deux actions tombent dans la même fenêtre de quelques millisecondes. Impossible à reproduire en cliquant tout seul.

La correction consiste à ne plus jamais faire le calcul hors de la base :

```sql
create or replace function interactive.add_player_score(
  p_player_id uuid,
  p_points    int
)
returns int
language sql
security definer
set search_path = interactive, public
as $$
  update interactive.session_players
     set score = greatest(0, score + p_points)
   where id = p_player_id
  returning score;
$$;
```

`score = score + p_points` **dans l'UPDATE** : c'est Postgres qui lit et écrit, dans la même instruction. Il pose un verrou sur la ligne le temps de l'opération, donc deux appels concurrents s'exécutent l'un après l'autre — et les deux points sont comptés. Le `returning score` renvoie la valeur consolidée, ce qui évite un SELECT de plus pour afficher le nouveau total.

Deux détails. `greatest(0, ...)` conserve la règle métier « le score ne descend jamais sous zéro », car certains jeux appliquent des malus. Et `security definer` avec `search_path` figé permet à l'incrément de passer même si la RLS interdit l'UPDATE direct sur `session_players` — la fonction est la **seule porte** d'écriture du score.

## Comment je l'explique au jury

« Tous mes jeux mettaient à jour le score en trois temps : lire, calculer en JavaScript, écrire. C'est une race condition classique — la lost update. Quand deux joueurs marquent dans la même fraction de seconde, les deux lisent la même valeur de départ et le second écrase le premier : un point disparaît sans aucune erreur nulle part. J'ai remplacé les trois étapes par un seul UPDATE qui fait `score = score + points` en base : Postgres verrouille la ligne le temps de l'instruction, donc les deux incréments sont comptés. La fonction est en `security definer`, ce qui en fait la seule porte d'écriture du score même quand la RLS interdit l'UPDATE direct. »

## La question vicieuse du jury

**« Une transaction avec un niveau d'isolation plus élevé n'aurait-elle pas fait la même chose ? »**

Elle aurait résolu le problème autrement, et moins bien pour ce cas. En `SERIALIZABLE`, Postgres détecte le conflit et **abandonne** l'une des deux transactions avec une erreur de sérialisation — ce qui veut dire que je dois écrire une logique de nouvelle tentative dans l'application, et que sous forte concurrence je passe mon temps à réessayer. L'UPDATE atomique, lui, ne crée aucun conflit à arbitrer : il n'y a jamais deux lectures qui divergent, donc rien à annuler. C'est la différence entre le verrouillage **optimiste** — on suppose qu'il n'y aura pas de conflit, on vérifie à la fin, on recommence si besoin — et le fait de **ne pas créer le conflit du tout**. Quand une opération se ramène à un incrément, la base sait le faire atomiquement et c'est toujours la meilleure réponse. L'isolation renforcée devient nécessaire dès que la décision d'écriture dépend de la lecture de *plusieurs* lignes — par exemple « attribuer le bonus seulement si personne ne l'a encore » — et là, `SELECT … FOR UPDATE` ou `SERIALIZABLE` redeviennent les bons outils.
