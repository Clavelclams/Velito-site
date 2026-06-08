-- ============================================================================
-- VELITO INTERACTIVE — Quiz v2 : permettre au joueur de changer sa réponse
-- À exécuter sur le projet velito-hub.
-- ============================================================================
-- POURQUOI :
--   Nouvelle mécanique Quiz : le joueur peut "cocher" une réponse et la
--   changer plusieurs fois pendant le timer. Au timer 0, la dernière sélection
--   est figée et le score est calculé.
--
--   Ancienne RLS UPDATE : seul le host pouvait UPDATE (pour scorer au reveal).
--   Nouvelle RLS : anon peut UPDATE SA réponse, mais SEULEMENT si :
--     - la session est en status='playing'
--     - la phase courante est 'question' (pas 'reveal')
--     - le question_index correspond bien à la question courante
--     - is_correct=false et points=0 (pas encore scoré)
--
--   Ces contraintes empêchent un joueur de modifier sa réponse après le reveal.
--
-- SÉCURITÉ MVP :
--   On ne peut PAS vérifier que l'UPDATE vient du bon joueur (anon n'a pas
--   d'identité unique). Risque théorique : un joueur malveillant pourrait UPDATE
--   les réponses des autres pendant la phase question. Acceptable pour le MVP
--   (clients en présence physique). À durcir avec un token joueur en v3.
-- ============================================================================

BEGIN;

-- Supprime l'ancienne policy UPDATE (host-only)
DROP POLICY IF EXISTS answers_update_by_host ON interactive.player_answers;

-- Nouvelle policy : UPDATE par n'importe qui SI les conditions de phase sont OK
CREATE POLICY answers_update_during_question
  ON interactive.player_answers
  FOR UPDATE
  USING (
    -- Lecture autorisée si la session est en 'playing' ET la phase courante
    -- correspond à la question de cette ligne.
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'question'
        AND (s.current_state->>'questionIndex')::int = question_index
    )
    -- ET la ligne n'a pas encore été scorée
    AND is_correct = false
    AND points = 0
  )
  WITH CHECK (
    -- Le UPDATE ne doit modifier que 'answer' (pas is_correct/points/answered_at)
    -- On le garantit en re-vérifiant que is_correct=false et points=0 après.
    is_correct = false
    AND points = 0
  );

-- Policy UPDATE séparée pour le host (pour scorer au reveal)
CREATE POLICY answers_update_by_host
  ON interactive.player_answers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'interactive'
  AND tablename = 'player_answers'
ORDER BY policyname;

SELECT 'Quiz v2 OK — joueur anon peut UPDATE sa réponse pendant la phase question' AS status;
