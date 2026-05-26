-- ============================================================
-- VEA — Jeux de competition + opt-in "etre appele" (prospection talents)
-- ============================================================
-- Idee (Alban) : reperer qui joue a quoi pour inviter aux compets ciblees
-- (ex INTERCUP : on emmene ceux qui veulent faire Mario Kart / FC).
--
-- jeu_prefere (existant, 1 jeu texte libre) reste pour la CARD /joueurs.
-- On ajoute :
--   - jeux_competition : liste structuree (max 5, gere cote app) des jeux ou
--     la personne est competitive -> permet le filtre fiable "qui joue a X".
--   - dispo_competition : opt-in. true = la personne accepte d'etre contactee
--     pour les competitions. Sans opt-in, on ne la sollicite pas.
--
-- text[] : filtre admin via .contains('jeux_competition', ['Valorant']).
-- RLS heritee (l'user edite deja sa propre fiche via /profil). IDEMPOTENT.
-- ============================================================

alter table vea.participants
  add column if not exists jeux_competition  text[] not null default '{}',
  add column if not exists dispo_competition boolean not null default false;

-- Index GIN pour des recherches rapides "qui joue a X" quand le nb de fiches grandit.
create index if not exists idx_participants_jeux_competition
  on vea.participants using gin (jeux_competition);
