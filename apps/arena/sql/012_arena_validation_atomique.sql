-- ============================================================================
-- 012 : validation d'un score en UNE transaction (12/11/2026)
--
-- LE PROBLÈME (étape « Validation de score dans une transaction » du suivi
-- de projet) : validerScore faisait plusieurs écritures séparées depuis
-- Node : (1) passer le match en VALIDE, (2) placer le gagnant au tour
-- suivant, (3) placer le perdant en rattrapage (double élimination),
-- (4) journal. supabase-js n'a pas de transaction.
--   - Si (2) échouait après (1) : le match était figé par le verrou du
--     règlement §3 (trigger verrou_match_valide), le gagnant n'avançait
--     pas, et rien dans l'interface ne permettait de réparer. Tableau bloqué.
--   - Deux membres du staff qui validaient le même match en même temps
--     passaient TOUS LES DEUX (le second réécrivait les mêmes valeurs, le
--     verrou ne voyait aucun changement) : ELO compté deux fois.
--
-- LA SOLUTION : la logique du bracket reste en TypeScript (lib/bracket*.ts,
-- testée) ; elle calcule QUOI écrire. Cette fonction se contente d'APPLIQUER
-- ces écritures, toutes dans la même transaction : tout passe, ou rien.
--  - Le passage en VALIDE n'a lieu que si le match est encore TERMINE
--    (UPDATE ... WHERE statut = 'TERMINE'). Le second staff reçoit une
--    erreur claire au lieu de revalider.
--  - Un placement qui ne trouve pas son match cible annule TOUT.
--
-- Droits : appelée uniquement par le serveur (service_role), APRÈS les
-- contrôles requireStaff / chargerTournoiDeLOrga. Ni anon ni authenticated
-- ne peuvent l'exécuter.
--
-- Idempotente (CREATE OR REPLACE).
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION arena.appliquer_validation(
  p_tournoi     uuid,
  p_match       uuid,
  p_gagnant     uuid,
  p_par_equipes boolean,
  -- Liste de { "match_id": uuid, "slot": "c1" | "c2", "camp_id": uuid }
  p_placements  jsonb,
  p_acteur      uuid,
  p_detail      jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = arena, pg_temp
AS $$
DECLARE
  pl        jsonb;
  n         int;
  col_camp  text;
BEGIN
  -- 1. Le match passe en VALIDE seulement s'il est encore TERMINE.
  IF p_par_equipes THEN
    UPDATE arena.matchs
       SET statut = 'VALIDE', equipe_gagnante_id = p_gagnant,
           valide_par = p_acteur, updated_at = now()
     WHERE id = p_match AND tournoi_id = p_tournoi AND statut = 'TERMINE';
  ELSE
    UPDATE arena.matchs
       SET statut = 'VALIDE', gagnant_id = p_gagnant,
           valide_par = p_acteur, updated_at = now()
     WHERE id = p_match AND tournoi_id = p_tournoi AND statut = 'TERMINE';
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    -- Code « P0001 » + message lisible : traduit tel quel côté application.
    RAISE EXCEPTION 'Ce match a déjà été validé, ou son score n''est plus saisi. Recharge la page.';
  END IF;

  -- 2. Placements dans les matchs suivants (gagnant, et perdant en rattrapage).
  FOR pl IN SELECT * FROM jsonb_array_elements(coalesce(p_placements, '[]'::jsonb)) LOOP
    IF (pl->>'slot') NOT IN ('c1', 'c2') THEN
      RAISE EXCEPTION 'Placement invalide (slot %).', pl->>'slot';
    END IF;
    col_camp := CASE
      WHEN p_par_equipes AND pl->>'slot' = 'c1' THEN 'equipe1_id'
      WHEN p_par_equipes THEN 'equipe2_id'
      WHEN pl->>'slot' = 'c1' THEN 'joueur1_id'
      ELSE 'joueur2_id'
    END;
    -- Nom de colonne choisi dans une liste fermée ci-dessus (jamais une
    -- valeur reçue telle quelle) : format('%I') l'échappe en plus.
    -- statut <> 'VALIDE' : on ne réécrit jamais un camp d'un match déjà
    -- validé (le trigger du règlement §3 protège le score et le vainqueur,
    -- pas les noms des camps ; trou trouvé par le test du 12/11/2026).
    EXECUTE format(
      'UPDATE arena.matchs SET %I = $1, updated_at = now()
        WHERE id = $2 AND tournoi_id = $3 AND statut <> ''VALIDE''',
      col_camp
    ) USING (pl->>'camp_id')::uuid, (pl->>'match_id')::uuid, p_tournoi;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
      RAISE EXCEPTION 'Match suivant introuvable ou déjà validé : validation annulée, rien n''a été modifié.';
    END IF;
  END LOOP;

  -- 3. Journal, dans la même transaction : pas de validation sans trace.
  INSERT INTO arena.logs (acteur_id, action, tournoi_id, match_id, detail)
  VALUES (p_acteur, 'MATCH_VALIDE', p_tournoi, p_match, p_detail);
END;
$$;

REVOKE ALL ON FUNCTION arena.appliquer_validation(uuid, uuid, uuid, boolean, jsonb, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION arena.appliquer_validation(uuid, uuid, uuid, boolean, jsonb, uuid, jsonb)
  TO service_role;

COMMIT;

-- Retour arrière :
--   DROP FUNCTION IF EXISTS arena.appliquer_validation(uuid, uuid, uuid, boolean, jsonb, uuid, jsonb);
