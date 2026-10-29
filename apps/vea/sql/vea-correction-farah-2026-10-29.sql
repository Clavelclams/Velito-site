-- ============================================================================
-- VEA — Correction des deux Farah (29/10/2026)
-- ============================================================================
-- Diagnostic : sql/vea-diagnostic-farah-LECTURE-SEULE.sql. Aucune présence
-- n'était mal rattachée : l'historique de Farah BEN SALAH (fiche Notion
-- « Membres VEA — Bénévolat par saison ») n'avait jamais été importé, alors que
-- Farah d'Elbeuf avait le sien (35 h). Résultat : Farah Elbeuf niveau 6 et
-- Farah Ben Salah niveau 1 sur /admin/recompenses.
--
-- Ce que ça fait :
--   1. Crée vea.corrections_historique : trace de chaque correction manuelle
--      d'un compteur (avant, après, motif, date, auteur). RLS activé sans
--      politique : lisible seulement depuis le SQL Editor (service role).
--   2. Farah Ben Salah (f2b6a20e) : historique Notion
--        Tour du Marais 2022/23 : 17 jeudis × 2 h = 34 h
--        Vacances QPV 2023/24 et 2024/25 : 32 jours × 3 h = 96 h
--        TIQE 2024 : 2 × 4 h = 8 h ; Jeudis du Corner 2024 : 5 × 2 h = 10 h
--      => events_old 56, benevole_hours 148, rôle bénévole (comme dans Notion).
--      Ne s'applique que si les compteurs sont encore à 0 (relance sans effet).
--   3. Farah Elbeuf (ff23c339) : NON modifiée. Ses 35 h viennent de sa propre
--      fiche Notion. Son nombre d'événements (35, identique à ses heures) est
--      à confirmer par Clavel.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS vea.corrections_historique (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES vea.participants(id) ON DELETE SET NULL,
  champ          text NOT NULL,
  avant          text,
  apres          text,
  motif          text,
  fait_le        timestamptz NOT NULL DEFAULT now(),
  fait_par       text NOT NULL DEFAULT current_user
);
ALTER TABLE vea.corrections_historique ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_n   int;
  v_pid uuid;
  v_p   vea.participants%ROWTYPE;
  c_motif constant text := 'Import historique Notion Farah BEN SALAH (jamais importé le 18/05), correction du 29/10/2026';
BEGIN
  SELECT count(*), min(id::text)::uuid INTO v_n, v_pid
  FROM vea.participants WHERE id::text LIKE 'f2b6a20e%';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Farah Ben Salah : % fiche(s) pour f2b6a20e, arrêt.', v_n;
  END IF;

  SELECT * INTO v_p FROM vea.participants WHERE id = v_pid;
  IF lower(v_p.nom) <> 'ben salah' THEN
    RAISE EXCEPTION 'f2b6a20e n''est pas Farah Ben Salah (%), arrêt.', v_p.nom;
  END IF;

  IF coalesce(v_p.events_old, 0) = 0 AND coalesce(v_p.benevole_hours, 0) = 0 THEN
    INSERT INTO vea.corrections_historique (participant_id, champ, avant, apres, motif) VALUES
      (v_pid, 'events_old',     coalesce(v_p.events_old, 0)::text,     '56',       c_motif),
      (v_pid, 'benevole_hours', coalesce(v_p.benevole_hours, 0)::text, '148',      c_motif),
      (v_pid, 'role',           coalesce(v_p.role, '-'),               'benevole', c_motif);

    UPDATE vea.participants
       SET events_old = 56, benevole_hours = 148, role = 'benevole'
     WHERE id = v_pid;
    RAISE NOTICE 'Farah Ben Salah corrigée.';
  ELSE
    RAISE NOTICE 'Déjà corrigée (compteurs non nuls), rien fait.';
  END IF;
END $$;

COMMIT;

-- Vérification : Ben Salah 56 / 148 (niveau 11), Elbeuf inchangée 35 / 35 (niveau 6).
SELECT left(p.id::text, 8) AS id, p.prenom, p.nom, p.role, p.events_old, p.benevole_hours,
       (SELECT count(*) FROM vea.corrections_historique c WHERE c.participant_id = p.id) AS traces
FROM vea.participants p
WHERE p.prenom ILIKE 'farah'
ORDER BY p.events_old DESC;

-- DOWN (annulation) :
-- UPDATE vea.participants SET events_old = 0, benevole_hours = 0, role = 'joueur'
--  WHERE id::text LIKE 'f2b6a20e%';
-- DELETE FROM vea.corrections_historique WHERE participant_id::text LIKE 'f2b6a20e%';
-- (DROP TABLE vea.corrections_historique; seulement si plus aucune trace utile)
