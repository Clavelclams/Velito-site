-- =============================================================================
-- vea-gamification-v2.sql — Refonte grille de récompenses (décision Clavel 21/05/2026)
-- =============================================================================
--
-- Contexte : nouvelle grille de gamification, XP cumulable à vie (pas de reset),
-- récompenses one-shot, badges collector par saison (suffixe -eveil = 2026/27).
--
-- Grille (cf. apps/vea/lib/gamification.ts REWARDS_BY_LEVEL) :
--   Niv 1  : badge Rookie
--   Niv 5  : dotation lot-partenaire        (+1 pt VENA)
--   Niv 6  : badge L'Engagé
--   Niv 7  : dotation tshirt-vea            (+2 pts VENA)
--   Niv 8  : badge Le Pilier
--   Niv 10 : dotation ensemble-vea (tenue)  (+3 pts VENA)
--   Niv 12 : dotation sortie-benevoles      (+3 pts VENA)
--   Niv 15 : badge L'Extrême
--   Niv 20 : dotation console + badge L'Élite (+5 pts VENA)
--
-- =============================================================================
-- PARTIE 1 — ADDITIF (DÉJÀ EXÉCUTÉ EN PROD le 21/05/2026 via Supabase SQL editor)
-- 100% additif : crée le catalogue, n'attribue rien à personne.
-- Types dotation autorisés (CHECK dotations_type_check) :
--   'badge_niveau', 'partenaire', 'merch', 'special'
-- =============================================================================

insert into vea.badges (slug, nom, description, emoji, type, saison, niveau_required, rare) values
  ('engage-eveil',  'L''Engage de l''Eveil',  'Niveau 6 de la saison 2026/27. Tu t''investis pour de vrai.', '⚡', 'saisonnier', '2026/27', 6, false),
  ('pilier-eveil',  'Le Pilier de l''Eveil',  'Niveau 8 de la saison 2026/27. On peut compter sur toi.',     '🛡️', 'saisonnier', '2026/27', 8, false),
  ('extreme-eveil', 'L''Extreme de l''Eveil',  'Niveau 15 de la saison 2026/27. Engagement hors normes.',    '🔥', 'saisonnier', '2026/27', 15, true),
  ('elite-eveil',   'L''Elite de l''Eveil',    'Niveau 20 de la saison 2026/27. Le sommet.',                 '👑', 'saisonnier', '2026/27', 20, true)
on conflict (slug) do update set
  nom=excluded.nom, description=excluded.description, emoji=excluded.emoji,
  type=excluded.type, saison=excluded.saison, niveau_required=excluded.niveau_required, rare=excluded.rare;

insert into vea.dotations (slug, nom, description, emoji, type, valeur_estimee_eur)
select v.slug, v.nom, v.description, v.emoji, v.type, v.valeur from (values
  ('ensemble-vea','Ensemble VEA (Niv 10)','Tenue officielle VEA (ensemble haut + bas).','🎽','merch',50::numeric),
  ('sortie-benevoles','Sortie annuelle benevoles (Niv 12)','Place payee par VEA a la sortie annuelle des benevoles (karting, etc.).','🎢','special',40::numeric),
  ('console','Console (Niv 20)','Console de jeu — recompense ultime de fidelite long terme.','🎮','special',300::numeric)
) as v(slug,nom,description,emoji,type,valeur)
where not exists (select 1 from vea.dotations d where d.slug = v.slug);

-- =============================================================================
-- PARTIE 2 — ATTRIBUTION (À FAIRE, NON EXÉCUTÉ)
-- =============================================================================
-- Cette partie réécrit la fonction d'attribution (trigger_logs_xp_apply /
-- recalc_participant_xp) pour :
--   - attribuer badge + dotation quand le niveau est franchi, sur la nouvelle grille
--   - garantir le one-shot (jamais 2x la même récompense)
--   - règle Old VEA : récupère ses trophées historiques une fois, puis compteur live à 0
--
-- BLOQUÉ : besoin de lire le code source actuel de ces fonctions avant de les
-- réécrire (ne pas le faire à l'aveugle en prod). Récupérer via Supabase :
--   Database -> Functions -> trigger_logs_xp_apply / recalc_participant_xp
-- puis écrire la nouvelle version ici et l'exécuter après relecture.
-- =============================================================================
