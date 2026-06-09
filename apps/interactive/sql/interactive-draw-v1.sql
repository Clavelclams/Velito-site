-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Velito Interactive — Jeu Dessin (Pictionary) — Schema V1            ║
-- ║ Date : 2026-06-09 (sprint event Moxy Amiens)                        ║
-- ║                                                                      ║
-- ║ Mode : un joueur tiré au sort dessine un mot, les autres devinent   ║
-- ║ en tapant dans une barre. Tolérance Levenshtein (réutilise Petit    ║
-- ║ Bac). Le dessin live circule via Realtime BROADCAST (pas dans la    ║
-- ║ DB pour rester rapide). On stocke juste le snapshot final.          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ Table 1 : draw_rounds                                                │
-- │   Une ligne par round (1 dessinateur tiré au sort)                   │
-- │   Le state de la partie reste dans interactive.sessions.current_state│
-- └──────────────────────────────────────────────────────────────────────┘
create table if not exists interactive.draw_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interactive.sessions(id) on delete cascade,
  round_index int not null,
  drawer_player_id uuid not null references interactive.session_players(id) on delete cascade,
  word text not null,
  -- Snapshot final du dessin (base64 PNG). Optionnel — on peut s'en passer
  -- pour le live, mais utile pour replay post-event.
  final_snapshot text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Stats post-reveal
  guessers_count int not null default 0,   -- nb de joueurs qui ont trouvé
  total_guessers int not null default 0,   -- nb total de joueurs qui pouvaient deviner
  unique(session_id, round_index)
);

create index if not exists draw_rounds_session_idx on interactive.draw_rounds(session_id);

-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ Table 2 : draw_guesses                                               │
-- │   Une ligne par tentative d'un joueur sur un round                   │
-- │   Multiple tentatives possibles par joueur (jusqu'à trouver)         │
-- └──────────────────────────────────────────────────────────────────────┘
create table if not exists interactive.draw_guesses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references interactive.draw_rounds(id) on delete cascade,
  session_id uuid not null references interactive.sessions(id) on delete cascade,
  player_id uuid not null references interactive.session_players(id) on delete cascade,
  guess text not null,
  -- Calculé lors du submit (côté serveur) via Levenshtein
  is_correct boolean not null default false,
  points int not null default 0,
  answered_at timestamptz not null default now()
);

create index if not exists draw_guesses_round_idx on interactive.draw_guesses(round_id);
create index if not exists draw_guesses_session_idx on interactive.draw_guesses(session_id);
-- 1 joueur ne peut trouver qu'1 seule fois par round
create unique index if not exists draw_guesses_one_correct_per_player
  on interactive.draw_guesses(round_id, player_id)
  where is_correct = true;

-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ Realtime — on active draw_guesses pour que les guesses apparaissent  │
-- │ en live sur la TV (effet "machine à écrire" en bas d'écran).         │
-- │ draw_rounds aussi pour suivre le start/end des rounds.               │
-- └──────────────────────────────────────────────────────────────────────┘
alter publication supabase_realtime add table interactive.draw_rounds;
alter publication supabase_realtime add table interactive.draw_guesses;

-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ RLS                                                                  │
-- │   - SELECT public sur les 2 tables (n'importe quel joueur peut voir) │
-- │   - INSERT draw_guesses : anon OK (un joueur soumet sa guess)        │
-- │   - INSERT/UPDATE draw_rounds : host uniquement (via SECURITY DEFINER│
-- │     dans les server actions)                                         │
-- └──────────────────────────────────────────────────────────────────────┘
alter table interactive.draw_rounds enable row level security;
alter table interactive.draw_guesses enable row level security;

-- SELECT public
drop policy if exists draw_rounds_select_all on interactive.draw_rounds;
create policy draw_rounds_select_all on interactive.draw_rounds
  for select using (true);

drop policy if exists draw_guesses_select_all on interactive.draw_guesses;
create policy draw_guesses_select_all on interactive.draw_guesses
  for select using (true);

-- INSERT draw_guesses : anon peut soumettre une guess
-- (la vérif "ce player_id est bien le sien" est faite côté serveur via le token)
drop policy if exists draw_guesses_insert_any on interactive.draw_guesses;
create policy draw_guesses_insert_any on interactive.draw_guesses
  for insert with check (true);

-- INSERT draw_rounds : on autorise anon pour l'instant (l'action server passe
-- par le client anon). Les UPDATE en revanche sont restreints au host (via
-- jointure sessions.host_user_id = auth.uid()).
drop policy if exists draw_rounds_insert_any on interactive.draw_rounds;
create policy draw_rounds_insert_any on interactive.draw_rounds
  for insert with check (true);

drop policy if exists draw_rounds_update_host on interactive.draw_rounds;
create policy draw_rounds_update_host on interactive.draw_rounds
  for update using (
    exists (
      select 1 from interactive.sessions s
      where s.id = draw_rounds.session_id
        and s.host_user_id = auth.uid()
    )
  );

-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ Note : le canvas live (strokes en temps réel) ne passe PAS par cette │
-- │ table. Il utilise Realtime BROADCAST (canal "draw-canvas-${session}")│
-- │ avec des events { type: "snapshot", png: <base64>, t: <ms> }.        │
-- │ Throttle 300ms côté client pour rester sous le quota Realtime.      │
-- └──────────────────────────────────────────────────────────────────────┘
