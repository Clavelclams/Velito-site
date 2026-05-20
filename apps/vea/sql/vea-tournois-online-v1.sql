-- ============================================================================
-- VEA — Migration tables tournois online (20/05/2026)
-- ============================================================================
-- Objectif :
--   Ajouter le système de suivi des tournois competitifs (online + presentiel).
--   Distinct du systeme d'events (terrain / bénévolat) : un tournoi competitif
--   n'est PAS du bénévolat, donc PAS d'XP "civique" mais palmares + visibilité.
--
-- Schéma :
--   - vea.tournois          : un tournoi (en ligne ou presentiel)
--   - vea.tournoi_participants : qui a joué dans quel tournoi avec quel rôle
--   - vea.equipes           : équipes officielles VEA permanentes (V2)
--   - vea.equipe_membres    : composition de chaque équipe permanente (V2)
--
-- A executer apres vea-badges-statut-v3.sql.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLE vea.tournois
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.tournois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  jeu text NOT NULL, -- 'SF6', 'R6', 'Valorant', 'COD', 'FIFA', 'Fortnite', etc.
  date_debut date NOT NULL,
  date_fin date, -- NULL si journée unique
  mode text NOT NULL CHECK (mode IN ('online', 'presentiel', 'hybride')),
  format text NOT NULL CHECK (format IN ('1v1', '2v2', '3v3', '5v5', 'br', 'autre')),
  representation_vea boolean NOT NULL DEFAULT true,
  niveau text NOT NULL CHECK (niveau IN ('local', 'regional', 'national', 'international')) DEFAULT 'regional',
  resultat text, -- 'champion', 'finaliste', 'top4', 'top8', 'top16', 'poule', 'forfait'
  cash_prize numeric(10, 2) DEFAULT 0,
  description text,
  url_stream text,
  url_bracket text, -- lien Challonge / start.gg
  saison text DEFAULT '2026/27',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vea_tournois_date ON vea.tournois(date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_vea_tournois_jeu ON vea.tournois(jeu);
CREATE INDEX IF NOT EXISTS idx_vea_tournois_saison ON vea.tournois(saison);

COMMENT ON TABLE vea.tournois IS
  'Tournois competitifs (online + presentiel). Distinct du systeme events terrain : pas d''XP civique, mais palmares visible pour visibilite asso.';


-- ============================================================================
-- 2. TABLE vea.tournoi_participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.tournoi_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournoi_id uuid NOT NULL REFERENCES vea.tournois(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES vea.participants(id) ON DELETE CASCADE,
  role_dans_equipe text NOT NULL CHECK (role_dans_equipe IN ('capitaine', 'joueur', 'coach', 'remplacant')) DEFAULT 'joueur',
  pseudo_utilise text, -- pseudo utilise sur ce tournoi precis (peut differer du pseudo principal)
  score_perso text, -- "12 kills", "K/D 2.5", libre
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournoi_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_vea_tournoi_participants_tournoi ON vea.tournoi_participants(tournoi_id);
CREATE INDEX IF NOT EXISTS idx_vea_tournoi_participants_participant ON vea.tournoi_participants(participant_id);


-- ============================================================================
-- 3. TABLE vea.equipes (V2 -- permanent rosters)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL, -- "VEA Tactical R6", "VEA Fighters SF6"
  jeu text NOT NULL,
  capitaine_id uuid REFERENCES vea.participants(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vea_equipes_jeu ON vea.equipes(jeu);


CREATE TABLE IF NOT EXISTS vea.equipe_membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES vea.equipes(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES vea.participants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('capitaine', 'joueur', 'coach', 'remplacant')) DEFAULT 'joueur',
  date_entree date NOT NULL DEFAULT CURRENT_DATE,
  date_sortie date, -- NULL si actif
  UNIQUE(equipe_id, participant_id, date_entree)
);

CREATE INDEX IF NOT EXISTS idx_vea_equipe_membres_equipe ON vea.equipe_membres(equipe_id);
CREATE INDEX IF NOT EXISTS idx_vea_equipe_membres_participant ON vea.equipe_membres(participant_id);


-- ============================================================================
-- 4. RLS + GRANT
-- ============================================================================
-- Lecture publique pour les tournois et participations (visibilite asso).
-- Modifications reservees aux admins (editor+).

ALTER TABLE vea.tournois ENABLE ROW LEVEL SECURITY;
ALTER TABLE vea.tournoi_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vea.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vea.equipe_membres ENABLE ROW LEVEL SECURITY;

-- Helper is_vea_editor() est cense exister deja (vea-rls-fix-and-duree-event.sql)

-- SELECT public sur tournois et participants
DROP POLICY IF EXISTS "vea_tournois_select_public" ON vea.tournois;
CREATE POLICY "vea_tournois_select_public" ON vea.tournois
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vea_tournoi_participants_select_public" ON vea.tournoi_participants;
CREATE POLICY "vea_tournoi_participants_select_public" ON vea.tournoi_participants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vea_equipes_select_public" ON vea.equipes;
CREATE POLICY "vea_equipes_select_public" ON vea.equipes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vea_equipe_membres_select_public" ON vea.equipe_membres;
CREATE POLICY "vea_equipe_membres_select_public" ON vea.equipe_membres
  FOR SELECT TO anon, authenticated USING (true);

-- ALL pour admins editor+ (insert/update/delete)
DROP POLICY IF EXISTS "vea_tournois_admin_all" ON vea.tournois;
CREATE POLICY "vea_tournois_admin_all" ON vea.tournois
  FOR ALL TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_tournoi_participants_admin_all" ON vea.tournoi_participants;
CREATE POLICY "vea_tournoi_participants_admin_all" ON vea.tournoi_participants
  FOR ALL TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_equipes_admin_all" ON vea.equipes;
CREATE POLICY "vea_equipes_admin_all" ON vea.equipes
  FOR ALL TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_equipe_membres_admin_all" ON vea.equipe_membres;
CREATE POLICY "vea_equipe_membres_admin_all" ON vea.equipe_membres
  FOR ALL TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

-- GRANT au niveau table
GRANT SELECT ON vea.tournois, vea.tournoi_participants, vea.equipes, vea.equipe_membres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON vea.tournois, vea.tournoi_participants, vea.equipes, vea.equipe_membres TO authenticated;


-- ============================================================================
-- 5. Trigger d'attribution automatique du badge "vainqueur-online" / "vainqueur-presentiel"
-- ============================================================================
-- Quand on insert un tournoi_participant lié à un tournoi avec resultat='champion'
-- et representation_vea=true, on attribue automatiquement le badge correspondant.

CREATE OR REPLACE FUNCTION vea.attribuer_badge_vainqueur()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, public
AS $$
DECLARE
  v_tournoi RECORD;
  v_badge_slug TEXT;
  v_badge_id UUID;
BEGIN
  SELECT mode, resultat, representation_vea
  INTO v_tournoi
  FROM vea.tournois
  WHERE id = NEW.tournoi_id;

  -- Pas un vainqueur, on sort
  IF v_tournoi.resultat IS DISTINCT FROM 'champion' OR v_tournoi.representation_vea = FALSE THEN
    RETURN NEW;
  END IF;

  -- Determiner le slug du badge selon le mode
  IF v_tournoi.mode = 'online' THEN
    v_badge_slug := 'vainqueur-online';
  ELSIF v_tournoi.mode IN ('presentiel', 'hybride') THEN
    v_badge_slug := 'vainqueur-presentiel';
  ELSE
    RETURN NEW;
  END IF;

  -- Lookup le badge id
  SELECT id INTO v_badge_id FROM vea.badges WHERE slug = v_badge_slug;

  IF v_badge_id IS NULL THEN
    RAISE NOTICE 'Badge % introuvable, skip', v_badge_slug;
    RETURN NEW;
  END IF;

  -- Attribuer (ignore si deja attribue)
  INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
  VALUES (NEW.participant_id, v_badge_id, TRUE)
  ON CONFLICT (participant_id, badge_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_attribuer_badge_vainqueur ON vea.tournoi_participants;
CREATE TRIGGER trg_vea_attribuer_badge_vainqueur
AFTER INSERT ON vea.tournoi_participants
FOR EACH ROW
EXECUTE FUNCTION vea.attribuer_badge_vainqueur();


-- ============================================================================
-- 6. Seed du tournoi R6 d'Ugo "Mamba" 2025/26
-- ============================================================================
-- Pour avoir un premier tournoi vainqueur en base et valider le trigger.
-- Date approximative : on met une date raisonnable pour la saison 2025/26.

DO $$
DECLARE
  v_tournoi_id UUID;
  v_ugo_id UUID;
BEGIN
  -- Recup Ugo
  SELECT id INTO v_ugo_id FROM vea.participants
  WHERE lower(prenom) = 'ugo' AND lower(nom) = 'coulpied'
  LIMIT 1;

  IF v_ugo_id IS NULL THEN
    RAISE NOTICE 'Ugo non trouve, skip seed';
    RETURN;
  END IF;

  -- Insert le tournoi (si pas deja existe par nom + date)
  INSERT INTO vea.tournois (nom, jeu, date_debut, mode, format, representation_vea, niveau, resultat, description, saison)
  VALUES (
    'Tournoi R6 2025/26 (Ugo Mamba vainqueur)',
    'R6',
    DATE '2026-03-15',  -- date approximative, a corriger via /admin/tournois plus tard
    'online',
    '5v5',
    TRUE,
    'regional',
    'champion',
    'Ugo COULPIED (Mamba) remporte ce tournoi R6 en representant VEA. Date a preciser.',
    '2025/26'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tournoi_id;

  -- Si pas insere (deja existant), recup l'id existant
  IF v_tournoi_id IS NULL THEN
    SELECT id INTO v_tournoi_id FROM vea.tournois
    WHERE nom = 'Tournoi R6 2025/26 (Ugo Mamba vainqueur)' LIMIT 1;
  END IF;

  -- Lier Ugo au tournoi en tant que capitaine
  IF v_tournoi_id IS NOT NULL THEN
    INSERT INTO vea.tournoi_participants (tournoi_id, participant_id, role_dans_equipe, pseudo_utilise)
    VALUES (v_tournoi_id, v_ugo_id, 'capitaine', 'Mamba')
    ON CONFLICT (tournoi_id, participant_id) DO NOTHING;
    -- Le trigger va auto-attribuer le badge 'vainqueur-online' a Ugo
  END IF;
END $$;


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
SELECT
  t.nom,
  t.jeu,
  t.date_debut,
  t.mode,
  t.format,
  t.resultat,
  t.saison
FROM vea.tournois t
ORDER BY t.date_debut DESC;

SELECT
  p.prenom || ' ' || p.nom AS qui,
  tp.role_dans_equipe,
  tp.pseudo_utilise,
  t.nom AS tournoi,
  t.resultat
FROM vea.tournoi_participants tp
JOIN vea.participants p ON p.id = tp.participant_id
JOIN vea.tournois t ON t.id = tp.tournoi_id
ORDER BY t.date_debut DESC;
