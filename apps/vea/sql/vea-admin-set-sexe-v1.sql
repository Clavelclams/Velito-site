-- vea-admin-set-sexe-v1.sql
-- Fonction permettant a un admin VEA (editor+) de definir le sexe d'un
-- participant, y compris une fiche qui n'est pas la sienne (cas des membres
-- inscrits via /signup, ou le sexe n'est pas demande -> reste NULL).
--
-- SECURITY DEFINER : s'execute avec les droits du proprietaire (bypass RLS),
-- mais verifie EN INTERNE que l'appelant a bien une permission vea editor/owner.
-- Donc impossible de l'appeler depuis un compte lambda.

create or replace function vea.admin_set_participant_sexe(p_id uuid, p_sexe text)
returns void
language plpgsql
security definer
set search_path = vea, shared, public
as $$
declare
  v_ok boolean;
begin
  -- L'appelant doit avoir une permission vea editor ou owner.
  select exists (
    select 1
    from shared.user_permissions up
    join shared.organizations o on o.id = up.organization_id
    where up.user_id = auth.uid()
      and o.slug = 'vea'
      and up.scope in ('editor', 'owner')
  ) into v_ok;

  if not v_ok then
    raise exception 'forbidden: vea editor permission required';
  end if;

  if p_sexe not in ('F', 'M', 'X') then
    raise exception 'invalid sexe (attendu F, M ou X)';
  end if;

  update vea.participants
  set sexe = p_sexe
  where id = p_id;
end;
$$;

grant execute on function vea.admin_set_participant_sexe(uuid, text) to authenticated;
