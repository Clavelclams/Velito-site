-- ============================================================================
-- VEA — Migration badges statut + update Maya/Ugo (20/05/2026)
-- ============================================================================
-- Objectif :
--   1. Ajouter 4 nouveaux badges de type 'special' :
--      - dirigeant            : pour role IN ('dirigeant','superadmin')
--      - joueur-officiel      : pour joueur_officiel_online = TRUE
--      - vainqueur-online     : merite, attribue manuellement
--      - vainqueur-presentiel : merite, attribue manuellement
--   2. Ajouter colonne joueur_officiel_online sur vea.participants
--   3. Update Maya GOMBERT (email mgomb9@icloud.com, DDN 31/07/2009, sexe F)
--   4. Update Ugo COULPIED (joueur officiel online = TRUE, pseudo Mamba)
--   5. Auto-attribuer le badge dirigeant a tous les role dirigeant/superadmin
--   6. Auto-attribuer le badge joueur-officiel a tous les joueur_officiel_online
--   7. Attribuer manuellement le badge vainqueur-online a Ugo (R6 2025/26)
--   8. Trigger AFTER UPDATE on vea.participants :
--      - Si role passe a dirigeant/superadmin -> badge dirigeant auto
--      - Si joueur_officiel_online passe a TRUE -> badge joueur-officiel auto
--      - Si retour arriere -> badge retire automatiquement
--
-- A executer dans Supabase Dashboard > SQL Editor.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SCHEMA : colonne joueur_officiel_online
-- ============================================================================
ALTER TABLE vea.participants
  ADD COLUMN IF NOT EXISTS joueur_officiel_online boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN vea.participants.joueur_officiel_online IS
  'TRUE si le membre represente officiellement VEA dans les tournois online (R6, SF6, Valorant, etc.). Indépendant des heures benevolat.';


-- ============================================================================
-- 2. SEED 4 nouveaux badges 'special'
-- ============================================================================
INSERT INTO vea.badges (slug, nom, description, emoji, type, rare) VALUES
  ('dirigeant',
   'Dirigeant·e VEA',
   'Membre du bureau ou du Conseil d''Administration. Donne du temps a la gouvernance et la strategie de l''asso.',
   '🎖️',
   'special',
   false),
  ('joueur-officiel',
   'Joueur·euse officiel·le',
   'Represente VEA dans les competitions en ligne et participe aux tournois sous les couleurs de l''asso.',
   '🎮',
   'special',
   false),
  ('vainqueur-online',
   'Vainqueur en ligne',
   'A remporte au moins un tournoi en ligne en representant VEA. Badge rare attribue manuellement par l''admin.',
   '🏆',
   'special',
   true),
  ('vainqueur-presentiel',
   'Vainqueur en presentiel',
   'A remporte au moins un tournoi ou event competitif en presentiel pour VEA. Badge rare attribue manuellement par l''admin.',
   '🥇',
   'special',
   true)
ON CONFLICT (slug) DO UPDATE SET
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  rare = EXCLUDED.rare;


-- ============================================================================
-- 3. Update Maya GOMBERT (email + DDN + sexe + flag mineure deja ok)
-- ============================================================================
UPDATE vea.participants
SET
  email = COALESCE(NULLIF(email, ''), 'mgomb9@icloud.com'),
  date_naissance = DATE '2009-07-31',
  sexe = 'F',
  est_mineur = TRUE
WHERE lower(prenom) = 'maya'
  AND lower(nom) = 'gombert';


-- ============================================================================
-- 4. Update Ugo COULPIED (joueur officiel + pseudo Mamba)
-- ============================================================================
UPDATE vea.participants
SET
  joueur_officiel_online = TRUE,
  pseudo = COALESCE(NULLIF(pseudo, ''), 'Mamba')
WHERE lower(prenom) = 'ugo'
  AND lower(nom) = 'coulpied';


-- ============================================================================
-- 5. Auto-attribuer badge 'dirigeant' a tous les role dirigeant/superadmin
-- ============================================================================
INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
SELECT
  p.id,
  b.id,
  TRUE  -- affiche par defaut, l'utilisateur peut decocher dans son profil
FROM vea.participants p
CROSS JOIN vea.badges b
WHERE b.slug = 'dirigeant'
  AND p.role IN ('dirigeant', 'superadmin')
ON CONFLICT (participant_id, badge_id) DO NOTHING;


-- ============================================================================
-- 6. Auto-attribuer badge 'joueur-officiel' a tous les joueur_officiel_online
-- ============================================================================
INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
SELECT
  p.id,
  b.id,
  TRUE
FROM vea.participants p
CROSS JOIN vea.badges b
WHERE b.slug = 'joueur-officiel'
  AND p.joueur_officiel_online = TRUE
ON CONFLICT (participant_id, badge_id) DO NOTHING;


-- ============================================================================
-- 7. Attribuer manuellement badge 'vainqueur-online' a Ugo Mamba (R6 2025/26)
-- ============================================================================
INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
SELECT
  p.id,
  b.id,
  TRUE
FROM vea.participants p
CROSS JOIN vea.badges b
WHERE b.slug = 'vainqueur-online'
  AND lower(p.prenom) = 'ugo'
  AND lower(p.nom) = 'coulpied'
ON CONFLICT (participant_id, badge_id) DO NOTHING;


-- ============================================================================
-- 8. Trigger d'auto-attribution badges sur UPDATE participants
-- ============================================================================
-- Quand on change le role ou joueur_officiel_online, on ajoute ou retire
-- automatiquement le badge correspondant.

CREATE OR REPLACE FUNCTION vea.sync_badges_statut()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, public
AS $$
DECLARE
  v_badge_dirigeant_id UUID;
  v_badge_joueur_officiel_id UUID;
BEGIN
  -- Lookup les ids de badge (cache au sein de la fonction)
  SELECT id INTO v_badge_dirigeant_id FROM vea.badges WHERE slug = 'dirigeant';
  SELECT id INTO v_badge_joueur_officiel_id FROM vea.badges WHERE slug = 'joueur-officiel';

  -- ROLE : dirigeant / superadmin
  IF NEW.role IN ('dirigeant', 'superadmin')
     AND (OLD.role IS NULL OR OLD.role NOT IN ('dirigeant', 'superadmin'))
  THEN
    -- Devient dirigeant -> attribuer badge
    INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
    VALUES (NEW.id, v_badge_dirigeant_id, TRUE)
    ON CONFLICT (participant_id, badge_id) DO NOTHING;
  ELSIF NEW.role NOT IN ('dirigeant', 'superadmin')
        AND OLD.role IN ('dirigeant', 'superadmin')
  THEN
    -- N'est plus dirigeant -> retirer badge
    DELETE FROM vea.badges_joueurs
    WHERE participant_id = NEW.id
      AND badge_id = v_badge_dirigeant_id;
  END IF;

  -- JOUEUR OFFICIEL ONLINE
  IF NEW.joueur_officiel_online = TRUE
     AND (OLD.joueur_officiel_online IS NULL OR OLD.joueur_officiel_online = FALSE)
  THEN
    INSERT INTO vea.badges_joueurs (participant_id, badge_id, affiche_sur_profil)
    VALUES (NEW.id, v_badge_joueur_officiel_id, TRUE)
    ON CONFLICT (participant_id, badge_id) DO NOTHING;
  ELSIF NEW.joueur_officiel_online = FALSE
        AND OLD.joueur_officiel_online = TRUE
  THEN
    DELETE FROM vea.badges_joueurs
    WHERE participant_id = NEW.id
      AND badge_id = v_badge_joueur_officiel_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_sync_badges_statut ON vea.participants;
CREATE TRIGGER trg_vea_sync_badges_statut
AFTER UPDATE OF role, joueur_officiel_online ON vea.participants
FOR EACH ROW
EXECUTE FUNCTION vea.sync_badges_statut();


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
-- Combien de badges au total et combien attribues ?
SELECT
  b.slug,
  b.nom,
  b.emoji,
  b.type,
  b.rare,
  COUNT(bj.id) AS nb_attribues
FROM vea.badges b
LEFT JOIN vea.badges_joueurs bj ON bj.badge_id = b.id
WHERE b.slug IN ('dirigeant', 'joueur-officiel', 'vainqueur-online', 'vainqueur-presentiel')
GROUP BY b.slug, b.nom, b.emoji, b.type, b.rare
ORDER BY b.slug;

-- Qui a quoi ?
SELECT
  p.prenom || ' ' || p.nom AS qui,
  p.role,
  p.joueur_officiel_online AS online_officiel,
  b.slug AS badge,
  b.emoji
FROM vea.badges_joueurs bj
JOIN vea.participants p ON p.id = bj.participant_id
JOIN vea.badges b ON b.id = bj.badge_id
WHERE b.slug IN ('dirigeant', 'joueur-officiel', 'vainqueur-online', 'vainqueur-presentiel')
ORDER BY b.slug, p.nom;

-- Maya et Ugo, etat final
SELECT prenom, nom, email, date_naissance, sexe, est_mineur, pseudo, joueur_officiel_online
FROM vea.participants
WHERE (lower(prenom) = 'maya' AND lower(nom) = 'gombert')
   OR (lower(prenom) = 'ugo'  AND lower(nom) = 'coulpied');
