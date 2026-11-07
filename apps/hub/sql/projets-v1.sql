-- ============================================================================
-- HUB VELITO — Suivi des projets (07/11/2026)
-- ----------------------------------------------------------------------------
-- hub.velito.fr/projets : chaque projet a sa fiche (résumé, CDC, liens), sa
-- roadmap (étapes pondérées → pourcentage CALCULÉ, jamais saisi), son
-- journal (ce qui a été fait, décisions, bugs) et ses membres.
--
-- Accès :
--   - « admin hub » = propriétaire de l'organisation hub_velito dans
--     shared.user_permissions (aujourd'hui : Clavel). Il voit et gère tout.
--   - Chaque projet a ses membres : proprietaire (gère le projet et ses
--     membres), dev (alimente roadmap et journal), lecteur (lit).
--   - Privé par défaut. Une case « public » expose un RÉSUMÉ seulement
--     (nom, résumé public, pourcentage) via la fonction projets_publics(),
--     jamais le CDC ni le journal.
--
-- Leçon du 07/11 (compta) : RLS + GRANT. Les deux sont posés ici.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table shared.projets (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  nom            text not null check (char_length(trim(nom)) between 1 and 80),
  resume         text check (resume is null or char_length(resume) <= 500),
  statut         text not null default 'en_cours'
                 check (statut in ('idee', 'en_cours', 'en_pause', 'livre', 'abandonne')),
  url_prod       text check (url_prod is null or url_prod ~ '^https://'),
  depot          text check (depot is null or char_length(depot) <= 200),
  stack          text check (stack is null or char_length(stack) <= 200),
  cdc            text check (cdc is null or char_length(cdc) <= 50000),
  public         boolean not null default false,
  resume_public  text check (resume_public is null or char_length(resume_public) <= 500),
  ordre          int not null default 100,
  cree_par       uuid references auth.users (id) on delete set null,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);

create table shared.projet_membres (
  projet_id  uuid not null references shared.projets (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('proprietaire', 'dev', 'lecteur')),
  ajoute_le  timestamptz not null default now(),
  primary key (projet_id, user_id)
);

create table shared.projet_etapes (
  id           uuid primary key default gen_random_uuid(),
  projet_id    uuid not null references shared.projets (id) on delete cascade,
  lot          text check (lot is null or char_length(lot) <= 80),
  titre        text not null check (char_length(trim(titre)) between 1 and 200),
  description  text check (description is null or char_length(description) <= 2000),
  statut       text not null default 'a_faire'
               check (statut in ('a_faire', 'en_cours', 'fait', 'abandonne')),
  -- Poids 1 à 5 : une étape « publier sur les stores » pèse plus qu'un libellé.
  poids        smallint not null default 1 check (poids between 1 and 5),
  ordre        int not null default 100,
  echeance     date,
  fait_le      date,
  cree_par     uuid references auth.users (id) on delete set null,
  cree_le      timestamptz not null default now(),
  maj_le       timestamptz not null default now(),
  -- Une étape faite porte sa date ; une étape non faite n'en a pas.
  constraint fait_le_coherent check ((statut = 'fait') = (fait_le is not null))
);

create table shared.projet_journal (
  id           uuid primary key default gen_random_uuid(),
  projet_id    uuid not null references shared.projets (id) on delete cascade,
  date_entree  date not null default current_date,
  type         text not null default 'fait' check (type in ('fait', 'decision', 'bug', 'note')),
  titre        text not null check (char_length(trim(titre)) between 1 and 200),
  contenu      text check (contenu is null or char_length(contenu) <= 5000),
  auteur       uuid references auth.users (id) on delete set null,
  cree_le      timestamptz not null default now()
);

create index idx_projet_etapes_projet on shared.projet_etapes (projet_id, ordre);
create index idx_projet_journal_projet on shared.projet_journal (projet_id, date_entree desc);
create index idx_projet_membres_user on shared.projet_membres (user_id);

-- maj_le automatique (réutilise la logique classique, fonction propre au schéma)
create or replace function shared.projets_maj_le()
returns trigger language plpgsql as $$
begin
  new.maj_le = now();
  return new;
end;
$$;
create trigger projets_maj_le before update on shared.projets
  for each row execute function shared.projets_maj_le();
create trigger projet_etapes_maj_le before update on shared.projet_etapes
  for each row execute function shared.projets_maj_le();

-- ---------------------------------------------------------------------------
-- Fonctions d'accès (SECURITY DEFINER, search_path verrouillé)
-- Elles lisent les tables de droits sans être bloquées par leur propre RLS
-- (sinon une policy qui interroge projet_membres tournerait en rond).
-- ---------------------------------------------------------------------------
create or replace function shared.est_admin_hub()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from shared.user_permissions p
    join shared.organizations o on o.id = p.organization_id
    where p.user_id = (select auth.uid())
      and o.slug = 'hub_velito'
      and p.scope = 'owner'
  );
$$;

-- Rôle de l'utilisateur courant sur un projet ('admin', 'proprietaire', 'dev',
-- 'lecteur') ou null s'il n'y a pas accès.
create or replace function shared.role_projet(p_projet uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when shared.est_admin_hub() then 'admin'
    else (select m.role from shared.projet_membres m
          where m.projet_id = p_projet and m.user_id = (select auth.uid()))
  end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table shared.projets        enable row level security;
alter table shared.projet_membres enable row level security;
alter table shared.projet_etapes  enable row level security;
alter table shared.projet_journal enable row level security;

-- projets : lire si membre ; créer/supprimer = admin ; modifier = admin ou propriétaire
create policy "projets: lecture membres" on shared.projets
  for select to authenticated using (shared.role_projet(id) is not null);
create policy "projets: creation admin" on shared.projets
  for insert to authenticated with check (shared.est_admin_hub());
create policy "projets: modification admin ou proprietaire" on shared.projets
  for update to authenticated
  using (shared.role_projet(id) in ('admin', 'proprietaire'))
  with check (shared.role_projet(id) in ('admin', 'proprietaire'));
create policy "projets: suppression admin" on shared.projets
  for delete to authenticated using (shared.est_admin_hub());

-- membres : lire si membre du projet ; gérer = admin ou propriétaire
create policy "membres: lecture" on shared.projet_membres
  for select to authenticated using (shared.role_projet(projet_id) is not null);
create policy "membres: gestion" on shared.projet_membres
  for all to authenticated
  using (shared.role_projet(projet_id) in ('admin', 'proprietaire'))
  with check (shared.role_projet(projet_id) in ('admin', 'proprietaire'));

-- étapes : lire si membre ; écrire = admin, propriétaire ou dev
create policy "etapes: lecture" on shared.projet_etapes
  for select to authenticated using (shared.role_projet(projet_id) is not null);
create policy "etapes: ecriture" on shared.projet_etapes
  for all to authenticated
  using (shared.role_projet(projet_id) in ('admin', 'proprietaire', 'dev'))
  with check (shared.role_projet(projet_id) in ('admin', 'proprietaire', 'dev'));

-- journal : lire si membre ; ajouter = admin/propriétaire/dev en son nom ;
-- modifier/supprimer = son auteur, ou admin/propriétaire
create policy "journal: lecture" on shared.projet_journal
  for select to authenticated using (shared.role_projet(projet_id) is not null);
create policy "journal: ajout" on shared.projet_journal
  for insert to authenticated
  with check (shared.role_projet(projet_id) in ('admin', 'proprietaire', 'dev')
              and auteur = (select auth.uid()));
create policy "journal: modification" on shared.projet_journal
  for update to authenticated
  using (auteur = (select auth.uid()) or shared.role_projet(projet_id) in ('admin', 'proprietaire'))
  with check (shared.role_projet(projet_id) in ('admin', 'proprietaire', 'dev'));
create policy "journal: suppression" on shared.projet_journal
  for delete to authenticated
  using (auteur = (select auth.uid()) or shared.role_projet(projet_id) in ('admin', 'proprietaire'));

-- ---------------------------------------------------------------------------
-- Ajouter un membre par son email (auth.users n'est pas lisible depuis l'API) :
-- fonction contrôlée, réservée à l'admin ou au propriétaire du projet.
-- Renvoie un code lisible au lieu de révéler quoi que ce soit d'autre.
-- ---------------------------------------------------------------------------
create or replace function shared.ajouter_membre_projet(p_projet uuid, p_email text, p_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if coalesce(shared.role_projet(p_projet), '') not in ('admin', 'proprietaire') then
    return 'interdit';
  end if;
  if p_role not in ('proprietaire', 'dev', 'lecteur') then
    return 'role_invalide';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    return 'compte_inconnu';
  end if;
  insert into shared.projet_membres (projet_id, user_id, role)
  values (p_projet, v_user, p_role)
  on conflict (projet_id, user_id) do update set role = excluded.role;
  return 'ok';
end;
$$;

-- Liste des membres avec leur email (même raison : auth.users non exposé).
create or replace function shared.membres_projet(p_projet uuid)
returns table (user_id uuid, email text, role text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text, m.role
  from shared.projet_membres m
  join auth.users u on u.id = m.user_id
  where m.projet_id = p_projet
    and shared.role_projet(p_projet) is not null
  order by m.role, u.email;
$$;

-- Vitrine : résumé des projets cochés « public », sans CDC ni journal.
create or replace function shared.projets_publics()
returns table (slug text, nom text, resume_public text, statut text, url_prod text, pourcentage int)
language sql stable security definer set search_path = '' as $$
  select p.slug, p.nom, p.resume_public, p.statut, p.url_prod,
         coalesce(round(100.0 * sum(e.poids) filter (where e.statut = 'fait')
                  / nullif(sum(e.poids) filter (where e.statut <> 'abandonne'), 0))::int, 0)
  from shared.projets p
  left join shared.projet_etapes e on e.projet_id = p.id
  where p.public
  group by p.id
  order by p.ordre, p.nom;
$$;

-- ---------------------------------------------------------------------------
-- GRANT (sans eux, la RLS ne sert à rien : Postgres refuse avant)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on shared.projets        to authenticated;
grant select, insert, update, delete on shared.projet_membres to authenticated;
grant select, insert, update, delete on shared.projet_etapes  to authenticated;
grant select, insert, update, delete on shared.projet_journal to authenticated;
revoke all on function shared.ajouter_membre_projet(uuid, text, text) from public, anon;
revoke all on function shared.membres_projet(uuid) from public, anon;
grant execute on function shared.ajouter_membre_projet(uuid, text, text) to authenticated;
grant execute on function shared.membres_projet(uuid) to authenticated;
grant execute on function shared.est_admin_hub() to authenticated;
grant execute on function shared.role_projet(uuid) to authenticated;
grant execute on function shared.projets_publics() to anon, authenticated;
-- Constaté en production : le schéma shared accorde par défaut des droits à
-- anon sur les nouvelles tables. On les retire (un visiteur non connecté ne
-- lit rien directement ; la vitrine passe par projets_publics()).
revoke all on shared.projets, shared.projet_membres, shared.projet_etapes, shared.projet_journal from anon;

commit;

-- Vérification
select t, has_table_privilege('authenticated', t, 'select') as authenticated, has_table_privilege('anon', t, 'select') as anon
from unnest(array['shared.projets', 'shared.projet_etapes', 'shared.projet_journal', 'shared.projet_membres']) t;

-- DOWN :
-- drop function if exists shared.projets_publics(), shared.membres_projet(uuid),
--   shared.ajouter_membre_projet(uuid, text, text), shared.role_projet(uuid), shared.est_admin_hub();
-- drop table if exists shared.projet_journal, shared.projet_etapes, shared.projet_membres, shared.projets;
-- drop function if exists shared.projets_maj_le();
