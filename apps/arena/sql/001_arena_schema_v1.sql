-- ============================================================
-- ARENA V1 — Schéma Supabase (PostgreSQL) — DRAFT du 24/07/2026
-- ============================================================
-- Préfixe arena_ : isolation propre dans la base Supabase partagée
-- du monorepo (même logique que les tables VEA / Interactive).
-- À transformer en migration Supabase après relecture.
--
-- Principes :
--  * Multi-tenant par organisation_id dès la V1 (mais UI mono-orga : VEA).
--  * RLS activée sur toutes les tables : lecture publique limitée,
--    écritures réservées aux membres de l'organisation.
--  * Minimisation RGPD : un joueur = un pseudo. Le compte (auth.users)
--    est OPTIONNEL → le staff peut créer des joueurs "jour J" sans compte
--    (couvre les mineurs sans flux email tuteur en V1).
--  * Suppression = anonymisation (préserve l'intégrité des brackets).

-- ---------- Organisations ----------
create table if not exists arena_organisations (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  slug        text not null unique,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table if not exists arena_membres_orga (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references arena_organisations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('ADMIN', 'STAFF')),
  created_at      timestamptz not null default now(),
  unique (organisation_id, user_id)
);

-- ---------- Joueurs ----------
create table if not exists arena_joueurs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null, -- null = joueur créé par le staff sans compte
  pseudo        text not null unique,
  age_confirme  boolean not null default false,  -- déclaration 15+ à l'inscription en ligne
  anonymise     boolean not null default false,  -- RGPD : anonymisation au lieu de delete
  created_at    timestamptz not null default now()
);

-- ---------- Tournois ----------
create table if not exists arena_tournois (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references arena_organisations(id) on delete cascade,
  titre           text not null,
  jeu             text not null,                 -- ex : 'SF6', 'Rocket League'
  format          text not null default 'ELIMINATION_SIMPLE'
                  check (format = 'ELIMINATION_SIMPLE'),  -- V1 : un seul format, contrainte assumée
  statut          text not null default 'BROUILLON'
                  check (statut in ('BROUILLON','OUVERT','EN_COURS','TERMINE','ANNULE')),
  date_debut      timestamptz not null,
  lieu            text,
  description     text,
  max_joueurs     int check (max_joueurs is null or max_joueurs between 2 and 128),
  qr_token        uuid not null unique default gen_random_uuid(), -- URL publique /t/[qr_token]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_arena_tournois_orga on arena_tournois(organisation_id);

-- ---------- Participations (inscription + check-in) ----------
create table if not exists arena_participations (
  id           uuid primary key default gen_random_uuid(),
  tournoi_id   uuid not null references arena_tournois(id) on delete cascade,
  joueur_id    uuid not null references arena_joueurs(id) on delete cascade,
  check_in     boolean not null default false,
  check_in_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (tournoi_id, joueur_id)
);

-- ---------- Matchs ----------
-- PAS de table BracketNode : le parent d'un match (round, position)
-- est calculable = (round + 1, floor(position / 2)). Cf. lib/bracket.ts.
create table if not exists arena_matchs (
  id          uuid primary key default gen_random_uuid(),
  tournoi_id  uuid not null references arena_tournois(id) on delete cascade,
  round       int not null check (round >= 1),
  position    int not null check (position >= 0),
  joueur1_id  uuid references arena_joueurs(id),
  joueur2_id  uuid references arena_joueurs(id),
  score_j1    int check (score_j1 is null or score_j1 >= 0),
  score_j2    int check (score_j2 is null or score_j2 >= 0),
  is_bye      boolean not null default false,
  gagnant_id  uuid references arena_joueurs(id),
  statut      text not null default 'A_JOUER'
              check (statut in ('A_JOUER','EN_COURS','TERMINE','LITIGIEUX','VALIDE')),
  saisi_par   uuid references auth.users(id),   -- qui a saisi le score
  valide_par  uuid references auth.users(id),   -- qui l'a validé (double étape)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tournoi_id, round, position)
);

create index if not exists idx_arena_matchs_tournoi on arena_matchs(tournoi_id);

-- ---------- Audit log ----------
-- Traçabilité des actions sensibles (argument subventions + jury CDA).
create table if not exists arena_logs (
  id          uuid primary key default gen_random_uuid(),
  tournoi_id  uuid references arena_tournois(id) on delete set null,
  match_id    uuid references arena_matchs(id) on delete set null,
  acteur_id   uuid references auth.users(id),
  action      text not null check (action in (
    'SCORE_SAISI','SCORE_MODIFIE','MATCH_VALIDE','LITIGE_OUVERT','LITIGE_RESOLU',
    'JOUEUR_CHECKIN','TOURNOI_DEMARRE','TOURNOI_TERMINE'
  )),
  detail      jsonb,                              -- ex : { "ancien": [2,1], "nouveau": [2,3] }
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table arena_organisations  enable row level security;
alter table arena_membres_orga   enable row level security;
alter table arena_joueurs        enable row level security;
alter table arena_tournois       enable row level security;
alter table arena_participations enable row level security;
alter table arena_matchs         enable row level security;
alter table arena_logs           enable row level security;

-- Helper : l'utilisateur courant est-il membre (staff ou admin) de l'orga ?
create or replace function arena_est_membre(orga uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from arena_membres_orga m
    where m.organisation_id = orga and m.user_id = auth.uid()
  );
$$;

-- Lecture publique : tournois non-brouillon + leurs matchs/participations
-- (la page QR spectateur fonctionne sans compte).
create policy "arena_tournois_lecture_publique" on arena_tournois
  for select using (statut <> 'BROUILLON' or arena_est_membre(organisation_id));

create policy "arena_matchs_lecture_publique" on arena_matchs
  for select using (
    exists (select 1 from arena_tournois t
            where t.id = tournoi_id
              and (t.statut <> 'BROUILLON' or arena_est_membre(t.organisation_id)))
  );

create policy "arena_participations_lecture_publique" on arena_participations
  for select using (
    exists (select 1 from arena_tournois t
            where t.id = tournoi_id
              and (t.statut <> 'BROUILLON' or arena_est_membre(t.organisation_id)))
  );

create policy "arena_joueurs_lecture_publique" on arena_joueurs
  for select using (true);  -- un joueur = un pseudo public, pas de donnée sensible

create policy "arena_orgas_lecture_publique" on arena_organisations
  for select using (true);

-- Écritures : réservées aux membres de l'organisation.
create policy "arena_tournois_ecriture_membres" on arena_tournois
  for all using (arena_est_membre(organisation_id))
  with check (arena_est_membre(organisation_id));

create policy "arena_matchs_ecriture_membres" on arena_matchs
  for all using (
    exists (select 1 from arena_tournois t
            where t.id = tournoi_id and arena_est_membre(t.organisation_id))
  );

create policy "arena_participations_ecriture_membres" on arena_participations
  for all using (
    exists (select 1 from arena_tournois t
            where t.id = tournoi_id and arena_est_membre(t.organisation_id))
  );

-- Un joueur connecté peut créer/modifier SON profil ;
-- le staff gère les joueurs sans compte via routes serveur (service role).
create policy "arena_joueurs_proprietaire" on arena_joueurs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Logs : lecture membres, insertion via serveur uniquement (service role).
create policy "arena_logs_lecture_membres" on arena_logs
  for select using (
    tournoi_id is null or exists (
      select 1 from arena_tournois t
      where t.id = tournoi_id and arena_est_membre(t.organisation_id))
  );

-- NOTE inscriptions en ligne (à trancher en S3) :
-- l'INSERT dans arena_participations par un joueur authentifié nécessitera
-- soit une policy dédiée (joueur_id = son propre profil ET tournoi OUVERT),
-- soit une route serveur avec service role. La route serveur est plus simple
-- à auditer → recommandation V1.
