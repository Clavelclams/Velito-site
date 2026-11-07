-- ============================================================================
-- VELITO COMPTA — Migration 09 : membres et rôles (07/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier. Prérequis : 01 à 08.
--
-- Jusqu'ici, une seule règle : « tu vois une structure si tu en es le
-- propriétaire ». Un trésorier ne pouvait rien voir. Trois rôles désormais :
--
--   propriétaire : tout (c'est entite.proprietaire_id, inchangé). Seul à gérer
--                  les membres, renommer ou supprimer la structure.
--   trésorier    : lit et écrit toutes les données comptables de la structure
--                  (saisie, imports, classement, subventions, bénévolat, et
--                  plus tard clôture / réouverture). Ne gère pas les membres.
--   lecteur      : lit tout, n'écrit rien (vérificateur, membre du bureau).
--
-- Méthode : deux fonctions, peut_lire_entite et peut_ecrire_entite. Chaque
-- règle « for all » des tables de données est remplacée par une règle de
-- LECTURE (membres) et trois règles d'ÉCRITURE (insert, update, delete :
-- propriétaire et trésorier). est_proprietaire_entite reste strictement le
-- propriétaire (elle n'est plus utilisée par les tables de données).
--
-- Ajout d'un membre : par l'e-mail de son compte (hub.velito.fr), via une
-- fonction contrôlée (seul le propriétaire peut l'appeler). La liste blanche
-- COMPTA_EMAILS_AUTORISES du site reste une seconde barrière : le projet
-- Supabase est partagé avec tout l'écosystème, un compte ne suffit pas.
-- ============================================================================

begin;

create table public.entite_membre (
  entite_id   uuid not null references public.entite (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('tresorier', 'lecteur')),
  ajoute_par  uuid references auth.users (id) on delete set null,
  ajoute_le   timestamptz not null default now(),
  primary key (entite_id, user_id)
);

comment on table public.entite_membre is
  'Membres d''une structure (hors propriétaire) : trésorier (lit et écrit) ou lecteur (lit).';

create index idx_entite_membre_user on public.entite_membre (user_id);

-- ---------------------------------------------------------------------------
-- Fonctions de droits. SECURITY DEFINER + search_path vide : elles lisent
-- entite et entite_membre sans dépendre de la RLS de ces tables (pas de
-- récursion), et ne peuvent pas être détournées par un objet homonyme.
-- ---------------------------------------------------------------------------
create or replace function public.peut_lire_entite(p_entite_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.entite e where e.id = p_entite_id and e.proprietaire_id = (select auth.uid()))
      or exists (select 1 from public.entite_membre m where m.entite_id = p_entite_id and m.user_id = (select auth.uid()));
$$;

create or replace function public.peut_ecrire_entite(p_entite_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.entite e where e.id = p_entite_id and e.proprietaire_id = (select auth.uid()))
      or exists (select 1 from public.entite_membre m
                 where m.entite_id = p_entite_id and m.user_id = (select auth.uid()) and m.role = 'tresorier');
$$;

/** Rôle de l'utilisateur connecté : 'proprietaire', 'tresorier', 'lecteur' ou NULL. */
create or replace function public.role_entite(p_entite_id uuid)
returns text language sql security definer set search_path = '' stable as $$
  select case
    when exists (select 1 from public.entite e where e.id = p_entite_id and e.proprietaire_id = (select auth.uid())) then 'proprietaire'
    else (select m.role from public.entite_membre m where m.entite_id = p_entite_id and m.user_id = (select auth.uid()))
  end;
$$;

-- ---------------------------------------------------------------------------
-- Tables de données : « for all » → lecture membres + écriture trésorier.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  ancienne text;
begin
  foreach t in array array['categorie', 'transaction', 'compte', 'ecriture', 'ligne_ecriture',
                           'compte_tresorerie', 'solde_observe', 'subvention', 'contribution_nature']
  loop
    -- Table absente (base de test partielle) : on passe. En production, toutes existent.
    continue when to_regclass('public.' || t) is null;
    ancienne := t || ': via propriete de l''entite';
    execute format('drop policy if exists %I on public.%I', ancienne, t);
    execute format('create policy %I on public.%I for select using (public.peut_lire_entite(entite_id))',
                   t || ': lecture membres', t);
    execute format('create policy %I on public.%I for insert with check (public.peut_ecrire_entite(entite_id))',
                   t || ': ajout tresorier', t);
    execute format('create policy %I on public.%I for update using (public.peut_ecrire_entite(entite_id)) with check (public.peut_ecrire_entite(entite_id))',
                   t || ': modification tresorier', t);
    execute format('create policy %I on public.%I for delete using (public.peut_ecrire_entite(entite_id))',
                   t || ': suppression tresorier', t);
  end loop;
end $$;

-- justificatif : un maillon plus loin (justificatif → transaction → entité).
drop policy if exists "justificatif: via la transaction parente" on public.justificatif;
create policy "justificatif: lecture membres" on public.justificatif for select
  using (exists (select 1 from public.transaction t where t.id = transaction_id and public.peut_lire_entite(t.entite_id)));
create policy "justificatif: ajout tresorier" on public.justificatif for insert
  with check (exists (select 1 from public.transaction t where t.id = transaction_id and public.peut_ecrire_entite(t.entite_id)));
create policy "justificatif: modification tresorier" on public.justificatif for update
  using (exists (select 1 from public.transaction t where t.id = transaction_id and public.peut_ecrire_entite(t.entite_id)))
  with check (exists (select 1 from public.transaction t where t.id = transaction_id and public.peut_ecrire_entite(t.entite_id)));
create policy "justificatif: suppression tresorier" on public.justificatif for delete
  using (exists (select 1 from public.transaction t where t.id = transaction_id and public.peut_ecrire_entite(t.entite_id)));

-- La structure elle-même : les membres la VOIENT ; la règle existante
-- « proprietaire uniquement » (for all) garde l'écriture au seul propriétaire.
create policy "entite: lecture membres" on public.entite for select
  using (public.peut_lire_entite(id));

-- entite_membre : les membres voient la liste ; aucune écriture directe
-- (pas de policy d'écriture) : on passe par les fonctions ci-dessous.
alter table public.entite_membre enable row level security;
create policy "entite_membre: lecture membres" on public.entite_membre for select
  using (public.peut_lire_entite(entite_id));
grant select on public.entite_membre to authenticated;

-- Fichiers justificatifs (Storage), seulement si le schéma existe (Supabase).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute 'drop policy if exists "justificatifs: lecture si proprietaire de l''entite" on storage.objects';
    execute 'drop policy if exists "justificatifs: upload si proprietaire de l''entite" on storage.objects';
    execute 'drop policy if exists "justificatifs: remplacement si proprietaire de l''entite" on storage.objects';
    execute 'drop policy if exists "justificatifs: suppression si proprietaire de l''entite" on storage.objects';
    execute $p$create policy "justificatifs: lecture membres" on storage.objects for select to authenticated
      using (bucket_id = 'justificatifs' and public.peut_lire_entite(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy "justificatifs: ajout tresorier" on storage.objects for insert to authenticated
      with check (bucket_id = 'justificatifs' and public.peut_ecrire_entite(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy "justificatifs: remplacement tresorier" on storage.objects for update to authenticated
      using (bucket_id = 'justificatifs' and public.peut_ecrire_entite(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy "justificatifs: suppression tresorier" on storage.objects for delete to authenticated
      using (bucket_id = 'justificatifs' and public.peut_ecrire_entite(((storage.foldername(name))[1])::uuid))$p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Gestion des membres : seul le propriétaire, par e-mail du compte hub.
-- ---------------------------------------------------------------------------
create or replace function public.ajouter_membre_entite(p_entite_id uuid, p_email text, p_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not exists (select 1 from public.entite e where e.id = p_entite_id and e.proprietaire_id = (select auth.uid())) then
    raise exception 'Seul le propriétaire de la structure peut gérer ses membres.';
  end if;
  if p_role not in ('tresorier', 'lecteur') then
    raise exception 'Rôle inconnu.';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    return 'compte_inconnu';
  end if;
  if v_user = (select auth.uid()) then
    return 'deja_proprietaire';
  end if;
  insert into public.entite_membre (entite_id, user_id, role, ajoute_par)
  values (p_entite_id, v_user, p_role, (select auth.uid()))
  on conflict (entite_id, user_id) do update set role = excluded.role;
  return 'ok';
end;
$$;

create or replace function public.retirer_membre_entite(p_entite_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.entite e where e.id = p_entite_id and e.proprietaire_id = (select auth.uid())) then
    raise exception 'Seul le propriétaire de la structure peut gérer ses membres.';
  end if;
  delete from public.entite_membre where entite_id = p_entite_id and user_id = p_user_id;
end;
$$;

/** Membres avec leur e-mail, visibles par tout membre de la structure. */
create or replace function public.membres_entite(p_entite_id uuid)
returns table (user_id uuid, email text, role text, ajoute_le timestamptz)
language sql security definer set search_path = '' stable as $$
  select m.user_id, u.email::text, m.role, m.ajoute_le
  from public.entite_membre m
  join auth.users u on u.id = m.user_id
  where m.entite_id = p_entite_id and public.peut_lire_entite(p_entite_id)
  order by m.ajoute_le;
$$;

revoke all on function public.peut_lire_entite(uuid), public.peut_ecrire_entite(uuid), public.role_entite(uuid),
  public.ajouter_membre_entite(uuid, text, text), public.retirer_membre_entite(uuid, uuid),
  public.membres_entite(uuid) from public, anon;
grant execute on function public.peut_lire_entite(uuid), public.peut_ecrire_entite(uuid), public.role_entite(uuid),
  public.ajouter_membre_entite(uuid, text, text), public.retirer_membre_entite(uuid, uuid),
  public.membres_entite(uuid) to authenticated;

commit;

-- Vérification : 4 règles par table de données, aucune ancienne règle « for all ».
select tablename, count(*) as regles,
       count(*) filter (where policyname like '%via propriete%') as anciennes
from pg_policies
where schemaname = 'public'
  and tablename in ('categorie', 'transaction', 'compte', 'ecriture', 'ligne_ecriture', 'compte_tresorerie',
                    'solde_observe', 'subvention', 'contribution_nature', 'justificatif', 'entite_membre')
group by tablename order by tablename;

-- DOWN (annulation) : recréer les règles « for all » des migrations 02, 03,
-- 04, 06 et 08 (copier leurs « create policy »), puis :
-- drop function public.membres_entite(uuid), public.retirer_membre_entite(uuid, uuid),
--   public.ajouter_membre_entite(uuid, text, text), public.role_entite(uuid);
-- drop policy "entite: lecture membres" on public.entite;
-- drop table public.entite_membre;
-- drop function public.peut_ecrire_entite(uuid), public.peut_lire_entite(uuid);
