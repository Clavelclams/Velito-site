-- ============================================================================
-- 009 — Droits PAR COLONNE sur arena.joueurs (fermeture RGPD, audit du 06/09/2026)
--
-- LE PROBLÈME : la migration 001 fait « GRANT SELECT ON ALL TABLES … TO anon »
-- et la policy joueurs_lecture filtre les LIGNES (anonymise = false) — pas les
-- COLONNES. Le schéma arena étant exposé à l'API Data, n'importe qui avec la
-- clé anon (publique : elle est dans le bundle) pouvait lire annee_naissance,
-- est_mineur, consentement_parental_at et user_id de tous les joueurs.
--
-- Aujourd'hui ces colonnes sont vides (aucun écran ne les alimente encore).
-- La migration 010 va les alimenter : CETTE migration doit passer AVANT,
-- sinon on publierait l'âge des enfants.
--
-- LA SOLUTION : Postgres gère les privilèges par colonne. On retire le SELECT
-- global et on ne rend que les colonnes publiques. Pas besoin de vue.
--
-- CONSÉQUENCE CÔTÉ APPLICATION (faite dans le même commit) : un
-- `select("*")` ou un embed `joueurs(*)` avec le client anonyme échoue
-- désormais (« permission denied »). Toutes les lectures publiques listent
-- explicitement leurs colonnes. Les écrans staff passent par service_role
-- et ne sont pas concernés.
--
-- Pourquoi profil_public reste lisible : le classement et les profils
-- filtrent dessus côté application, avec le client anonyme. C'est un
-- indicateur d'affichage (« n'apparaît pas dans les classements »), pas une
-- donnée personnelle — même s'il est corrélé au statut de mineur par la
-- contrainte mineur_profil_restreint. L'âge lui-même n'est plus lisible.
--
-- Idempotente : REVOKE/GRANT rejouables sans effet de bord.
-- ============================================================================
BEGIN;

REVOKE SELECT ON arena.joueurs FROM anon, authenticated;

GRANT SELECT (id, pseudo, profil_public, anonymise, created_at)
  ON arena.joueurs TO anon, authenticated;

-- Palmarès externe : la policy de la 006 vérifiait seulement que le joueur
-- EXISTE. Un joueur anonymisé (droit à l'effacement) ou en profil restreint
-- ne doit plus avoir de palmarès public. La RLS de joueurs le masquait déjà
-- par ricochet (sous-requête soumise à joueurs_lecture) ; on l'écrit
-- explicitement pour que la règle ne dépende pas d'un effet de bord.
DROP POLICY IF EXISTS resultats_externes_lecture ON arena.resultats_externes;
CREATE POLICY resultats_externes_lecture ON arena.resultats_externes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.joueurs j
     WHERE j.id = joueur_id
       AND j.anonymise = false
       AND j.profil_public = true
  ));

COMMIT;

-- Vérification (à lancer après) : la 1re requête doit renvoyer 5 lignes,
-- la 2de doit ÉCHOUER avec « permission denied for table joueurs ».
--   SELECT column_name FROM information_schema.column_privileges
--    WHERE table_schema = 'arena' AND table_name = 'joueurs' AND grantee = 'anon';
--   SET ROLE anon; SELECT annee_naissance FROM arena.joueurs LIMIT 1; RESET ROLE;
