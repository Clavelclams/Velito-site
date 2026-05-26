-- ============================================================
-- VEA — Donner l'acces PRESIDENT (owner) a Alban THIERRY
-- ============================================================
--
-- CONTEXTE
--   L'acces aux espaces admin VEA = une ligne dans shared.user_permissions
--   (user_id auth + organization_id de 'vea' + scope).
--     - scope 'editor' : suffit pour le dashboard /admin (events, compta...).
--     - scope 'owner'  : EN PLUS, debloque /admin/president (Espace President,
--                        reserve aux 2 presidents Alban + Clavel).
--   Alban etant VP / co-pilote, on lui met 'owner' -> il a TOUT (dashboard
--   admin + Espace President).
--
-- PRE-REQUIS ABSOLU
--   Alban doit avoir cree un COMPTE via /signup et s'etre connecte au moins
--   une fois -> sinon aucun user_id auth a rattacher. Le CRM indiquait
--   "Compte VEA cree : NON" -> VERIFIE qu'il s'est bien inscrit avant.
--   Si pas de compte, ce script te le dira (raise notice) et ne fera rien.
--
-- UTILISATION
--   Email d'Alban deja renseigne (albanthrr1@gmail.com d'apres le CRM).
--   Lance ce script dans l'editeur SQL Supabase et lis le message en bas.
--
-- NE RETROGRADE PERSONNE (un owner reste owner).
-- ============================================================

do $$
declare
  v_email   text := 'albanthrr1@gmail.com';   -- email du compte d'Alban (CRM)
  v_user_id uuid;
  v_org_id  uuid;
begin
  -- Org VEA
  select id into v_org_id from shared.organizations where slug = 'vea';
  if v_org_id is null then
    raise exception 'Organisation "vea" introuvable dans shared.organizations.';
  end if;

  -- Compte auth d'Alban
  select id into v_user_id from auth.users where lower(email) = lower(v_email);
  if v_user_id is null then
    raise notice 'AUCUN compte pour "%". Alban doit d''abord s''inscrire via /signup, puis relance ce script.', v_email;
    return;
  end if;

  -- Octroi du scope owner
  if exists (
    select 1 from shared.user_permissions
    where user_id = v_user_id and organization_id = v_org_id
  ) then
    update shared.user_permissions
       set scope = 'owner'
     where user_id = v_user_id
       and organization_id = v_org_id;
    raise notice 'Permission mise a jour -> owner pour % (user_id %).', v_email, v_user_id;
  else
    insert into shared.user_permissions (user_id, organization_id, scope)
    values (v_user_id, v_org_id, 'owner');
    raise notice 'Permission owner vea CREEE pour % (user_id %).', v_email, v_user_id;
  end if;
end $$;

-- Verification : doit renvoyer 1 ligne scope = owner.
-- select up.scope, u.email
-- from shared.user_permissions up
-- join auth.users u on u.id = up.user_id
-- join shared.organizations o on o.id = up.organization_id
-- where o.slug = 'vea' and lower(u.email) = lower('albanthrr1@gmail.com');
