-- ============================================================================
-- VELITO INTERACTIVE — RPCs scoring + reconnexion (V1) — 29/05/2026
-- À exécuter APRÈS interactive-schema-v1.sql (tables tenants/sessions/...).
-- ============================================================================
-- EXIGENCES CDC v2 couvertes :
--   §5.5 + §8  — Scoring autoritaire serveur (le joueur ne touche JAMAIS son score)
--   §5.2 + §8  — Reconnexion via player_token (pas de pseudo doublon)
--
-- POURQUOI SECURITY DEFINER ?
--   Les joueurs sont anonymes (auth.uid() = NULL). Donc auth.uid() ne peut pas
--   servir à les autoriser. À la place :
--     - Le client envoie son `player_token` (uuid posé en localStorage au join)
--     - La RPC SECURITY DEFINER tourne avec les permissions du créateur (admin)
--     - Elle valide elle-même que le token est bon (présent + pas kické)
--   C'est le SEUL pattern propre pour permettre à des anon d'écrire de manière
--   contrôlée sans exposer l'INSERT/UPDATE direct (lequel serait bloqué par RLS).
--
-- PROTECTION ANTI-TRICHE :
--   submit_answer NE LIT JAMAIS un score envoyé par le client. Pour l'instant
--   on retourne 0 par défaut (STUB) — le vrai calcul sera fait quand chaque jeu
--   aura ses tables de contenu (geo_questions, quiz_packs, blind_tracks,
--   petitbac_categories). Voir les commentaires TODO par jeu.
--
-- DÉFENSE JURY CDA :
--   - SECURITY DEFINER + validation manuelle des inputs
--   - Anti-double-submit via lookup dans session_events
--   - Audit complet : chaque appel pose un event dans session_events
--   - GRANT EXECUTE à anon UNIQUEMENT après que la RPC ait été créée
--     (le joueur ne peut pas créer la fonction lui-même)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. RPC scoring autoritaire — interactive.submit_answer()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive.submit_answer(
  p_session_id   uuid,
  p_player_token uuid,
  p_round        int,
  p_answer       jsonb
)
RETURNS TABLE (
  score_delta int,
  total_score int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = interactive, public
AS $$
DECLARE
  v_player_id      uuid;
  v_current_round  int;
  v_current_game   text;
  v_session_status text;
  v_score_delta    int := 0;
  v_new_total      int;
BEGIN
  -- ----- 1. Charger la session + valider qu'elle accepte des réponses -----
  SELECT current_round, current_game, status
    INTO v_current_round, v_current_game, v_session_status
    FROM interactive.sessions
   WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session introuvable' USING ERRCODE = 'P0002';
  END IF;

  IF v_session_status <> 'running' THEN
    RAISE EXCEPTION 'Session pas en cours (status=%)', v_session_status USING ERRCODE = 'P0001';
  END IF;

  IF v_current_round <> p_round THEN
    RAISE EXCEPTION 'Round désynchronisé (serveur=%, client=%)', v_current_round, p_round USING ERRCODE = 'P0001';
  END IF;

  -- ----- 2. Identifier le joueur via player_token (auth maison) -----
  SELECT id INTO v_player_id
    FROM interactive.session_players
   WHERE session_id   = p_session_id
     AND player_token = p_player_token
     AND kicked_at IS NULL;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Joueur introuvable, jeton invalide ou joueur kické' USING ERRCODE = 'P0001';
  END IF;

  -- ----- 3. Anti double-submit : empêcher 2 réponses pour le même round -----
  IF EXISTS (
    SELECT 1 FROM interactive.session_events
     WHERE session_id = p_session_id
       AND type = 'answer_submitted'
       AND (payload->>'player_id')::uuid = v_player_id
       AND (payload->>'round')::int      = p_round
  ) THEN
    RAISE EXCEPTION 'Déjà répondu pour ce round' USING ERRCODE = 'P0001';
  END IF;

  -- ----- 4. CALCUL DU SCORE — STUB par jeu (autoritaire, ne lit pas le client) -----
  --
  -- ATTENTION : tant que les tables de contenu (geo_questions, quiz_packs,
  -- blind_tracks, petitbac_categories) ne sont pas créées, on ne sait pas
  -- ce que vaut une "bonne" réponse. Donc on garde score_delta = 0.
  --
  -- À FAIRE quand chaque jeu sera implémenté :
  --   - geo       : calculer distance(p_answer->>'lat', p_answer->>'lng', target)
  --                 + bonus temps de réponse (ex: max 1000 pts, décroissant)
  --   - quiz      : comparer (p_answer->>'choice')::int à la bonne réponse stockée
  --                 + bonus vitesse
  --   - blindtest : same que quiz + gros bonus vitesse
  --   - petitbac  : compter les mots distincts + valider contre dictionnaire
  --
  -- En attendant, on log juste la réponse (pour replay / audit / tests UI).
  v_score_delta := CASE v_current_game
    WHEN 'geo'       THEN 0
    WHEN 'quiz'      THEN 0
    WHEN 'blindtest' THEN 0
    WHEN 'petitbac'  THEN 0
    ELSE 0
  END;

  -- Garde-fou (au cas où une future logique se trompe) : clamp [0, 1000]
  v_score_delta := GREATEST(0, LEAST(v_score_delta, 1000));

  -- ----- 5. Mettre à jour le score joueur -----
  UPDATE interactive.session_players
     SET score = score + v_score_delta
   WHERE id = v_player_id
   RETURNING score INTO v_new_total;

  -- ----- 6. Audit : event "answer_submitted" -----
  INSERT INTO interactive.session_events (session_id, type, payload)
  VALUES (p_session_id, 'answer_submitted', jsonb_build_object(
    'player_id',   v_player_id,
    'round',       p_round,
    'game',        v_current_game,
    'score_delta', v_score_delta,
    'answer',      p_answer
  ));

  -- ----- 7. Retour client : delta + total -----
  score_delta := v_score_delta;
  total_score := v_new_total;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION interactive.submit_answer(uuid, uuid, int, jsonb) IS
  'Scoring autoritaire (CDC §5.5). Valide la session + le player_token, '
  'calcule le score côté serveur, écrit un audit. STUB pour l''instant : '
  'le calcul réel par jeu sera ajouté avec les tables de contenu.';


-- ----------------------------------------------------------------------------
-- 2. RPC reconnexion joueur — interactive.rejoin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive.rejoin(
  p_session_code text,
  p_player_token uuid
)
RETURNS TABLE (
  session_id     uuid,
  player_id      uuid,
  pseudo         text,
  score          int,
  locale         text,
  current_game   text,
  current_round  int,
  status         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = interactive, public
AS $$
DECLARE
  v_session_id     uuid;
  v_session_status text;
  v_current_game   text;
  v_current_round  int;
BEGIN
  -- ----- 1. Trouver la session par son code court -----
  SELECT id, status, current_game, current_round
    INTO v_session_id, v_session_status, v_current_game, v_current_round
    FROM interactive.sessions
   WHERE code = p_session_code;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Code session invalide' USING ERRCODE = 'P0002';
  END IF;

  IF v_session_status = 'ended' THEN
    RAISE EXCEPTION 'Session terminée' USING ERRCODE = 'P0001';
  END IF;

  -- ----- 2. Réactiver le joueur (is_connected = true) si le token est bon -----
  RETURN QUERY
    WITH updated AS (
      UPDATE interactive.session_players
         SET is_connected = true
       WHERE session_id   = v_session_id
         AND player_token = p_player_token
         AND kicked_at IS NULL
       RETURNING id, pseudo, score, locale
    )
    SELECT
      v_session_id,
      u.id,
      u.pseudo,
      u.score,
      u.locale,
      v_current_game,
      v_current_round,
      v_session_status
    FROM updated u;

  -- ----- 3. Si rien n'a été MAJ, c'est que le token est mauvais OU joueur kické -----
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Joueur introuvable, jeton invalide ou joueur kické' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION interactive.rejoin(text, uuid) IS
  'Reconnexion joueur (CDC §5.2). Vérifie le code session + le player_token, '
  'remet is_connected=true, retourne les infos joueur + état session courant. '
  'Le client (manette mobile) appelle cette RPC au mount avec le player_token '
  'stocké en localStorage pour reprendre où on s''est arrêté.';


-- ----------------------------------------------------------------------------
-- 3. Permissions — anon DOIT pouvoir appeler ces RPC (les joueurs sont anon)
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION interactive.submit_answer(uuid, uuid, int, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION interactive.rejoin(text, uuid)                    TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Vérification (côté psql Supabase)
-- ----------------------------------------------------------------------------
COMMIT;

SELECT routine_name, security_type
  FROM information_schema.routines
 WHERE routine_schema = 'interactive'
   AND routine_name IN ('submit_answer', 'rejoin')
 ORDER BY routine_name;

SELECT 'Interactive RPCs v1 (submit_answer + rejoin) OK' AS status;
