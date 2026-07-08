-- ============================================================================
-- VELITO INTERACTIVE — RPC add_player_score (scoring ATOMIQUE)
-- ----------------------------------------------------------------------------
-- Corrige une race condition présente dans TOUS les jeux : le score était mis à
-- jour en 3 temps (SELECT score → score + points en JS → UPDATE). Si deux
-- soumissions concurrentes visaient le même joueur (ex : plusieurs devineurs
-- qui trouvent en même temps en Dessin, bonus « premier » en Estim'), les deux
-- lisaient la même valeur → un incrément écrasait l'autre → points perdus.
--
-- Cette fonction fait l'incrément EN BASE, atomiquement (un seul UPDATE
-- score = score + p). greatest(0, …) conserve le comportement « le score ne
-- descend jamais sous 0 » (certains jeux appliquent des malus).
--
-- security definer : la fonction s'exécute avec les droits du propriétaire, donc
-- l'incrément passe même si la RLS restreint l'UPDATE direct de session_players.
-- search_path figé (parade au détournement de search_path).
-- ============================================================================

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

-- Appelable depuis le client anon (jeu en présence) et les comptes connectés.
grant execute on function interactive.add_player_score(uuid, int) to anon, authenticated;
