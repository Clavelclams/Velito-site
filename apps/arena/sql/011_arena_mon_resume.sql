-- ============================================================================
-- 011 : arena.mon_resume() : le résumé Arena du compte CONNECTÉ (12/11/2026)
--
-- POURQUOI : le profil VEA (vea.velito.fr/profil) affichait une carte
-- « Niveau Arena » qui recopiait le niveau VEA. On la remplace par les vrais
-- chiffres Arena du membre.
--
-- POURQUOI UNE FONCTION et pas une requête depuis VEA :
--  - depuis la 009, `authenticated` ne peut pas lire joueurs.user_id (droits
--    par colonne) : impossible de filtrer « mon joueur » côté client ;
--  - la règle de VEA interdit la clé service_role dans une page rendue pour
--    l'utilisateur (lib/supabase/admin.ts).
--  Une fonction SECURITY DEFINER règle les deux : elle s'exécute avec les
--  droits de son propriétaire, mais NE PREND AUCUN PARAMÈTRE. Elle lit
--  auth.uid() (le compte de la session) : impossible de demander le résumé
--  d'un autre. Elle ne rend que des compteurs et le pseudo, rien d'autre
--  (pas d'année de naissance, pas d'ELO).
--
-- Rend 0 ligne si le compte n'a pas de joueur Arena relié (ou s'il est
-- anonymisé). Idempotente (CREATE OR REPLACE).
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION arena.mon_resume()
RETURNS TABLE (
  pseudo         text,
  profil_public  boolean,
  tournois       int,
  matchs         int,
  victoires      int,
  titres         int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
-- search_path figé : une fonction SECURITY DEFINER ne doit jamais résoudre
-- un nom de table dans un schéma que l'appelant contrôlerait.
SET search_path = arena, pg_temp
AS $$
  WITH moi AS (
    SELECT j.id, j.pseudo, j.profil_public
      FROM arena.joueurs j
     WHERE j.user_id = auth.uid()
       AND j.anonymise = false
  ),
  mes_equipes AS (
    SELECT em.equipe_id FROM arena.equipes_membres em JOIN moi ON em.joueur_id = moi.id
  ),
  mes_matchs AS (
    SELECT m.*
      FROM arena.matchs m, moi
     WHERE m.statut = 'VALIDE'
       AND m.is_bye = false
       AND (m.joueur1_id = moi.id OR m.joueur2_id = moi.id
            OR m.equipe1_id IN (SELECT equipe_id FROM mes_equipes)
            OR m.equipe2_id IN (SELECT equipe_id FROM mes_equipes))
  )
  SELECT
    moi.pseudo,
    moi.profil_public,
    (SELECT count(DISTINCT p.tournoi_id)::int
       FROM arena.participations p
       JOIN arena.tournois t ON t.id = p.tournoi_id
      WHERE p.joueur_id = moi.id
        AND p.check_in = true
        AND t.statut IN ('EN_COURS', 'TERMINE')),
    (SELECT count(*)::int FROM mes_matchs),
    (SELECT count(*)::int FROM mes_matchs mm, moi m2
      WHERE mm.gagnant_id = m2.id
         OR mm.equipe_gagnante_id IN (SELECT equipe_id FROM mes_equipes)),
    (SELECT count(*)::int
       FROM arena.badges_joueurs bj
       JOIN arena.badges b ON b.id = bj.badge_id
      WHERE bj.joueur_id = moi.id AND b.code = 'CHAMPION')
  FROM moi;
$$;

-- Personne par défaut, puis seulement les comptes connectés.
REVOKE ALL ON FUNCTION arena.mon_resume() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION arena.mon_resume() TO authenticated;

COMMIT;

-- Vérification : connecté dans l'éditeur SQL, auth.uid() est null, donc
-- 0 ligne attendue (normal). Test réel : la carte Arena du profil VEA.
--   SELECT * FROM arena.mon_resume();
-- Retour arrière :
--   DROP FUNCTION IF EXISTS arena.mon_resume();
