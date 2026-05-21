-- ============================================================
-- Module SIGNALEMENT (bug-report transverse hub Velito)
-- ============================================================
-- Table partagée (schéma `shared`) car le signalement est commun à toutes les
-- apps : VENA, VEA, hub, arena, etc. Chaque ligne porte le tag `app` pour
-- savoir d'où vient le signalement (filtrable côté admin).
--
-- ACCÈS :
--   - Le bouton "Signaler" est visible par tous, mais l'ENVOI exige un compte
--     connecté (anti-spam) → policy INSERT réservée à `authenticated`.
--   - L'auteur peut relire SES signalements ; les admins Velito voient tout.
--   - Seuls les admins changent le statut.
--
-- PIÈCE JOINTE : 1 fichier (image jpg/png/webp ou PDF), 5 Mo max. La validation
--   stricte (type MIME réel + extension + taille) se fait CÔTÉ SERVER ACTION
--   avant upload. Stockage dans un bucket Supabase privé `signalements`,
--   rangé sous un préfixe = user_id (isolation par utilisateur).
--
-- SÉCURITÉ : aucune injection SQL possible (requêtes paramétrées Supabase).
--   Le fichier n'est jamais exécuté, juste stocké et relu par l'admin.
--
-- IDEMPOTENT.
-- ============================================================

-- 1) Helper : l'utilisateur courant est-il un admin Velito ?
--    (a une permission owner/editor sur au moins une org dans shared.user_permissions)
create or replace function shared.is_velito_admin()
returns boolean
language sql
stable
security definer
set search_path = public, shared
as $$
  select exists (
    select 1
    from shared.user_permissions up
    where up.user_id = auth.uid()
      and up.scope in ('owner', 'editor')
  );
$$;

-- 2) Table des signalements
create table if not exists shared.signalements (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           text,
  app             text not null default 'inconnu',   -- 'vena' | 'vea' | 'hub' | ...
  categorie       text not null,                      -- bug_technique | souci_projet | souci_vea | autre
  projet          text,                               -- précision libre (ex: "site VENA", "scan QR", "tournoi")
  description     text not null,
  attachment_path text,                               -- chemin dans le bucket 'signalements' (nullable)
  statut          text not null default 'nouveau'     -- nouveau | en_cours | traite | archive
);

create index if not exists idx_signalements_statut    on shared.signalements(statut);
create index if not exists idx_signalements_app        on shared.signalements(app);
create index if not exists idx_signalements_created_at on shared.signalements(created_at desc);

comment on table shared.signalements is
  'Signalements / bug-reports transverses (toutes apps Velito). INSERT réservé aux comptes connectés.';

-- 3) RLS
alter table shared.signalements enable row level security;

grant insert, select, update on shared.signalements to authenticated;

-- INSERT : un utilisateur connecté crée SON propre signalement (anti-spam +
-- garde-fou longueur description).
drop policy if exists "signalement insert own" on shared.signalements;
create policy "signalement insert own" on shared.signalements
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(description) between 5 and 5000
  );

-- SELECT : l'auteur relit les siens ; les admins voient tout.
drop policy if exists "signalement select own or admin" on shared.signalements;
create policy "signalement select own or admin" on shared.signalements
  for select to authenticated
  using (user_id = auth.uid() or shared.is_velito_admin());

-- UPDATE : admins seulement (changement de statut).
drop policy if exists "signalement update admin" on shared.signalements;
create policy "signalement update admin" on shared.signalements
  for update to authenticated
  using (shared.is_velito_admin())
  with check (shared.is_velito_admin());

-- 4) Bucket de stockage privé pour les pièces jointes
insert into storage.buckets (id, name, public)
values ('signalements', 'signalements', false)
on conflict (id) do nothing;

-- Upload : un connecté ne peut écrire que sous SON préfixe user_id/...
drop policy if exists "signalement upload own" on storage.objects;
create policy "signalement upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'signalements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture : l'auteur lit ses fichiers, les admins lisent tout.
drop policy if exists "signalement read own or admin" on storage.objects;
create policy "signalement read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signalements'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or shared.is_velito_admin()
    )
  );
