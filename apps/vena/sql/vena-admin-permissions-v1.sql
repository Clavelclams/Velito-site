-- ============================================================
-- VENA admin v1 — org "vena" + permission superadmin + RLS demandes_contact
-- À exécuter dans Supabase SQL Editor (projet Velito).
-- Idempotent : peut être relancé sans casser.
-- ============================================================

-- 1) Organisation VENA dans le schéma partagé
insert into shared.organizations (slug, name)
values ('vena', 'Velito Expertise Numérique Amiens')
on conflict (slug) do nothing;

-- 2) Permission OWNER pour le superadmin (lookup par email dans auth.users)
insert into shared.user_permissions (user_id, organization_id, scope)
select au.id, o.id, 'owner'
from auth.users au
join shared.organizations o on o.slug = 'vena'
where au.email = 'clavelndemamoussa@gmail.com'
on conflict (user_id, organization_id) do update set scope = 'owner';

-- 3) GRANT : le rôle authenticated doit pouvoir lire/maj la table
grant select, update on vena.demandes_contact to authenticated;

-- 4) RLS : lecture des demandes par les membres de l'org vena
alter table vena.demandes_contact enable row level security;

drop policy if exists "vena admins read demandes" on vena.demandes_contact;
create policy "vena admins read demandes" on vena.demandes_contact
  for select to authenticated
  using (exists (
    select 1
    from shared.user_permissions up
    join shared.organizations o on o.id = up.organization_id
    where up.user_id = auth.uid() and o.slug = 'vena'
  ));

-- 5) RLS : mise à jour du statut par les membres de l'org vena
drop policy if exists "vena admins update demandes" on vena.demandes_contact;
create policy "vena admins update demandes" on vena.demandes_contact
  for update to authenticated
  using (exists (
    select 1
    from shared.user_permissions up
    join shared.organizations o on o.id = up.organization_id
    where up.user_id = auth.uid() and o.slug = 'vena'
  ))
  with check (true);
