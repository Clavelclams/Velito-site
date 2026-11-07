-- ============================================================================
-- VELITO COMPTA — Migration 10 : clôture d'exercice (07/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier. Prérequis : 01 à 09.
--
-- Règles reprises du cahier des charges « Compta Nova » (pas de son code) :
--   1. L'exercice est l'ANNÉE CIVILE de date_transaction (1er janvier au 31
--      décembre).
--   2. Une ligne se contrôle sur QUATRE dimensions indépendantes :
--        classement    : une catégorie (sauf jambe de virement interne) ;
--        validation    : statut « validee » ;
--        justification : une pièce jointe OU une exception motivée (10 car.) ;
--        pointage      : vue sur le relevé (date + référence de 3 car.),
--                        exigé seulement sur un compte courant ou livret.
--      « Validé » ne vaut ni pointage ni justification.
--   3. Clôturer exige : exercice terminé, aucune ligne bloquante, chaque
--      compte bancaire concordant au dernier relevé de décembre, un motif.
--   4. La clôture enregistre un INSTANTANÉ figé (jsonb). Ensuite la BASE
--      refuse toute écriture datée de cet exercice (triggers), quel que soit
--      l'écran ou le script qui l'envoie : griser un bouton ne suffit pas.
--   5. Données modifiées entre la revue et la confirmation : refus, par
--      comparaison d'une SIGNATURE (nombre de lignes | somme signée | dernier
--      modifie_le en microsecondes) calculée à l'affichage et recalculée ici.
--   6. Réouverture motivée (10 car.), sans rien effacer : la ligne passe à
--      « rouvert », une nouvelle clôture crée une nouvelle ligne.
--   7. Clôture ≠ certification ≠ approbation des comptes par l'AG.
-- ============================================================================

begin;

-- ============================================================================
-- 1. TABLE transaction : pointage et exception de justificatif
-- ============================================================================
alter table public.transaction
  -- Date du relevé sur lequel la ligne a été vue, et sa référence lisible.
  add column pointe_le date,
  add column pointe_ref text,
  -- Pourquoi il n'y a pas de pièce (frais bancaires visibles sur le relevé,
  -- cotisation encaissée sans reçu...). Remplace la pièce, jamais en silence.
  add column exception_justificatif text,
  add constraint pointage_complet
    check ((pointe_le is null) = (pointe_ref is null)),
  add constraint pointe_ref_longueur
    check (pointe_ref is null or char_length(trim(pointe_ref)) between 3 and 120),
  add constraint exception_justificatif_longueur
    check (exception_justificatif is null or char_length(trim(exception_justificatif)) between 10 and 1000);

-- [07/11/2026] Reprise de l'existant : une ligne importée d'un relevé PDF
-- Crédit Mutuel a été lue SUR ce relevé, elle est donc pointée. source_ref
-- contient « AAAA-MM-JJ » (import SQL du 07/11) ou « relevé au AAAA-MM-JJ »
-- (import par l'écran) : on en extrait la date de clôture du relevé.
update public.transaction t
set pointe_le  = d.date_releve,
    pointe_ref = 'Relevé Crédit Mutuel au ' || to_char(d.date_releve, 'DD/MM/YYYY')
from (
  select id, substring(source_ref from '\d{4}-\d{2}-\d{2}')::date as date_releve
  from public.transaction
  where source_cle like 'releve-cm:%'
    and pointe_le is null
    and substring(source_ref from '\d{4}-\d{2}-\d{2}') is not null
) d
where t.id = d.id;

-- ============================================================================
-- 2. TABLE cloture_exercice : une ligne par clôture, jamais effacée
-- ----------------------------------------------------------------------------
-- Aucune écriture directe : ni règle RLS d'écriture, ni GRANT d'écriture. On
-- passe par cloturer_exercice() et rouvrir_exercice(), qui vérifient tout.
-- ============================================================================
create table public.cloture_exercice (
  id                 uuid primary key default gen_random_uuid(),
  entite_id          uuid not null references public.entite (id) on delete cascade,
  exercice           smallint not null check (exercice between 2000 and 2100),
  statut             text not null default 'cloture' check (statut in ('cloture', 'rouvert')),
  cloture_le         timestamptz not null default now(),
  cloture_par        uuid references auth.users (id) on delete set null,
  motif              text not null check (char_length(trim(motif)) between 1 and 500),
  instantane         jsonb not null,
  signature          text not null,
  rouvert_le         timestamptz,
  rouvert_par        uuid references auth.users (id) on delete set null,
  motif_reouverture  text check (motif_reouverture is null or char_length(trim(motif_reouverture)) between 10 and 500),
  -- Une ligne « rouvert » porte forcément sa date et son motif ; une ligne
  -- « cloture » n'en porte aucun.
  constraint reouverture_coherente check (
    (statut = 'rouvert') = (rouvert_le is not null and motif_reouverture is not null)
  )
);

comment on table public.cloture_exercice is
  'Clôtures d''exercice (année civile) avec instantané figé. Réouverture = statut rouvert, rien n''est effacé.';

-- Au plus UNE clôture active par structure et par exercice. Les lignes
-- « rouvert » restent en nombre illimité : c'est l'historique.
create unique index cloture_exercice_une_active
  on public.cloture_exercice (entite_id, exercice)
  where statut = 'cloture';

create index idx_cloture_exercice_entite on public.cloture_exercice (entite_id, exercice);

-- ============================================================================
-- 3. FONCTIONS
-- ============================================================================

-- L'exercice est-il clôturé ? SECURITY DEFINER : les triggers l'appellent
-- pour tout le monde, y compris un script d'administration sans session
-- (auth.uid() NULL) : le verrou ne doit dépendre d'aucun droit de lecture.
create or replace function public.exercice_cloture(p_entite_id uuid, p_annee integer)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.cloture_exercice c
    where c.entite_id = p_entite_id and c.exercice = p_annee and c.statut = 'cloture'
  );
$$;

-- [07/11/2026] Signature des lignes d'un exercice : « nombre|somme signée|
-- dernier modifie_le en microsecondes depuis 1970 ». Toute insertion,
-- suppression ou modification la change (le trigger maj_modifie_le de la 01
-- remet modifie_le à now() à chaque UPDATE). Recalculée À L'IDENTIQUE par
-- lib/services/cloture.ts (signatureExercice) ; test_cloture.mjs compare les
-- deux. extract(epoch) renvoie un numeric exact depuis Postgres 14.
create or replace function public.signature_exercice(p_entite_id uuid, p_annee integer)
returns text language plpgsql security definer set search_path = '' stable as $$
declare
  v_signature text;
begin
  if not public.peut_lire_entite(p_entite_id) then
    raise exception 'Structure introuvable.';
  end if;
  select count(*)::text
         || '|' || coalesce(sum(case when t.type = 'recette' then t.montant_ttc_centimes
                                     else -t.montant_ttc_centimes end), 0)::text
         || '|' || coalesce(floor(extract(epoch from max(t.modifie_le)) * 1000000)::bigint, 0)::text
    into v_signature
  from public.transaction t
  where t.entite_id = p_entite_id
    and t.date_transaction between make_date(p_annee, 1, 1) and make_date(p_annee, 12, 31);
  return v_signature;
end;
$$;

-- [07/11/2026] Concordance des comptes bancaires au dernier relevé de
-- décembre. Même règle que soldeRepris() (lib/services/tresorerie.ts) : le
-- solde attendu repart du relevé PRÉCÉDENT (strictement avant), sinon du
-- solde initial ; inconnu reste NULL, jamais 0.
-- Compte concerné : courant ou livret, ET (des lignes dans l'exercice, OU
-- actif avec quelque chose de connu au plus tard le 31/12).
-- Fonction interne : appelée par cloturer_exercice, pas exposée.
create or replace function public.controle_soldes_decembre(p_entite_id uuid, p_annee integer)
returns table (compte_id uuid, nom text, etat text, solde_observe bigint, solde_attendu bigint)
language plpgsql security definer set search_path = '' stable as $$
declare
  v_debut date := make_date(p_annee, 1, 1);
  v_fin   date := make_date(p_annee, 12, 31);
  c       record;
  v_obs   record;
  v_base  record;
begin
  for c in
    select ct.* from public.compte_tresorerie ct
    where ct.entite_id = p_entite_id
      and ct.nature in ('courant', 'livret')
      and (
        exists (select 1 from public.transaction t
                where t.compte_tresorerie_id = ct.id and t.date_transaction between v_debut and v_fin)
        or (ct.active and (
              ct.date_solde_initial <= v_fin
              or exists (select 1 from public.transaction t where t.compte_tresorerie_id = ct.id and t.date_transaction <= v_fin)
              or exists (select 1 from public.solde_observe o where o.compte_id = ct.id and o.date_releve <= v_fin)))
      )
    order by ct.nom
  loop
    compte_id := c.id;
    nom := c.nom;
    solde_observe := null;
    solde_attendu := null;

    select o.date_releve, o.solde_centimes into v_obs
    from public.solde_observe o
    where o.compte_id = c.id and o.date_releve between make_date(p_annee, 12, 1) and v_fin
    order by o.date_releve desc limit 1;

    if not found then
      etat := 'releve_manquant';
      return next;
      continue;
    end if;
    solde_observe := v_obs.solde_centimes;

    select o.date_releve, o.solde_centimes into v_base
    from public.solde_observe o
    where o.compte_id = c.id and o.date_releve < v_obs.date_releve
    order by o.date_releve desc limit 1;

    if found then
      select v_base.solde_centimes + coalesce(sum(case when t.type = 'recette' then t.montant_ttc_centimes
                                                       else -t.montant_ttc_centimes end), 0)
        into solde_attendu
      from public.transaction t
      where t.compte_tresorerie_id = c.id
        and t.date_transaction > v_base.date_releve and t.date_transaction <= v_obs.date_releve;
    elsif c.solde_initial_centimes is not null then
      select c.solde_initial_centimes + coalesce(sum(case when t.type = 'recette' then t.montant_ttc_centimes
                                                          else -t.montant_ttc_centimes end), 0)
        into solde_attendu
      from public.transaction t
      where t.compte_tresorerie_id = c.id
        and t.date_transaction >= c.date_solde_initial and t.date_transaction <= v_obs.date_releve;
    end if;

    etat := case
      when solde_attendu is null then 'solde_initial_inconnu'
      when solde_attendu = solde_observe then 'concorde'
      else 'ecart'
    end;
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- cloturer_exercice : le serveur de l'app a déjà fait la revue, mais la base
-- RE-VÉRIFIE tout ce qui bloque. Un appel direct (console, script, client
-- modifié) passe par les mêmes contrôles.
-- ---------------------------------------------------------------------------
create or replace function public.cloturer_exercice(
  p_entite_id uuid,
  p_exercice integer,
  p_motif text,
  p_signature text,
  p_instantane jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_debut date;
  v_fin   date;
  v_bloc  record;
  v_cpt   record;
  v_id    uuid;
begin
  if not public.peut_ecrire_entite(p_entite_id) then
    raise exception 'Seuls le propriétaire et le trésorier peuvent clôturer un exercice.';
  end if;
  if p_exercice is null or p_exercice < 2000 or p_exercice > 2100 then
    raise exception 'Exercice invalide.';
  end if;
  v_debut := make_date(p_exercice, 1, 1);
  v_fin   := make_date(p_exercice, 12, 31);

  if current_date <= v_fin then
    raise exception 'L''exercice % n''est pas terminé : la clôture est possible à partir du 01/01/%.', p_exercice, p_exercice + 1;
  end if;
  if char_length(trim(coalesce(p_motif, ''))) = 0 then
    raise exception 'Indique le motif de la clôture.';
  end if;
  if char_length(trim(p_motif)) > 500 then
    raise exception 'Le motif ne peut pas dépasser 500 caractères.';
  end if;

  -- [07/11/2026] Verrou de quelques millisecondes : aucune écriture ne peut
  -- se glisser entre nos contrôles et l'enregistrement de la clôture. Les
  -- écritures concurrentes attendent, puis voient l'exercice clôturé.
  lock table public.transaction, public.justificatif, public.solde_observe in share mode;

  if public.exercice_cloture(p_entite_id, p_exercice) then
    raise exception 'L''exercice % est déjà clôturé.', p_exercice;
  end if;

  -- Les quatre dimensions, ligne par ligne (même règle que etatLigne() côté app).
  select
    count(*) filter (where t.statut <> 'validee')                                       as non_validees,
    count(*) filter (where t.categorie_id is null and t.virement_id is null)             as non_classees,
    count(*) filter (where t.compte_tresorerie_id is null)                               as sans_compte,
    count(*) filter (where t.virement_id is null and t.exception_justificatif is null
                       and not exists (select 1 from public.justificatif j where j.transaction_id = t.id)) as non_justifiees,
    count(*) filter (where c.nature in ('courant', 'livret') and t.pointe_le is null)    as non_pointees
  into v_bloc
  from public.transaction t
  left join public.compte_tresorerie c on c.id = t.compte_tresorerie_id
  where t.entite_id = p_entite_id and t.date_transaction between v_debut and v_fin;

  if v_bloc.non_validees > 0 then
    raise exception 'Clôture refusée : % ligne(s) non validée(s) en %.', v_bloc.non_validees, p_exercice;
  end if;
  if v_bloc.non_classees > 0 then
    raise exception 'Clôture refusée : % ligne(s) sans catégorie en %.', v_bloc.non_classees, p_exercice;
  end if;
  if v_bloc.sans_compte > 0 then
    raise exception 'Clôture refusée : % ligne(s) sans compte en %.', v_bloc.sans_compte, p_exercice;
  end if;
  if v_bloc.non_justifiees > 0 then
    raise exception 'Clôture refusée : % ligne(s) sans justificatif ni exception motivée en %.', v_bloc.non_justifiees, p_exercice;
  end if;
  if v_bloc.non_pointees > 0 then
    raise exception 'Clôture refusée : % ligne(s) bancaire(s) non pointée(s) en %.', v_bloc.non_pointees, p_exercice;
  end if;

  for v_cpt in select * from public.controle_soldes_decembre(p_entite_id, p_exercice) where etat <> 'concorde' loop
    raise exception 'Clôture refusée : le compte « % » ne concorde pas au dernier relevé de décembre %.', v_cpt.nom, p_exercice;
  end loop;

  if p_signature is distinct from public.signature_exercice(p_entite_id, p_exercice) then
    raise exception 'Les données de l''exercice % ont changé depuis ton affichage : recharge la page et refais la revue.', p_exercice;
  end if;

  -- L'instantané est construit par l'app ; on vérifie au moins qu'il parle
  -- du bon exercice, des mêmes lignes et de la même signature.
  if p_instantane is null or jsonb_typeof(p_instantane) <> 'object'
     or (p_instantane ->> 'exercice') is distinct from p_exercice::text
     or (p_instantane ->> 'signature') is distinct from p_signature
     or (p_instantane ->> 'nbLignes') is distinct from split_part(p_signature, '|', 1) then
    raise exception 'Instantané incohérent avec les données de l''exercice : clôture refusée.';
  end if;

  insert into public.cloture_exercice (entite_id, exercice, statut, cloture_par, motif, instantane, signature)
  values (p_entite_id, p_exercice, 'cloture', (select auth.uid()), trim(p_motif), p_instantane, p_signature)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rouvrir_exercice(p_entite_id uuid, p_exercice integer, p_motif text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.peut_ecrire_entite(p_entite_id) then
    raise exception 'Seuls le propriétaire et le trésorier peuvent rouvrir un exercice.';
  end if;
  if char_length(trim(coalesce(p_motif, ''))) < 10 then
    raise exception 'Le motif de réouverture doit faire au moins 10 caractères.';
  end if;
  if char_length(trim(p_motif)) > 500 then
    raise exception 'Le motif ne peut pas dépasser 500 caractères.';
  end if;
  update public.cloture_exercice
  set statut = 'rouvert', rouvert_le = now(), rouvert_par = (select auth.uid()), motif_reouverture = trim(p_motif)
  where entite_id = p_entite_id and exercice = p_exercice and statut = 'cloture';
  if not found then
    raise exception 'L''exercice % n''est pas clôturé.', p_exercice;
  end if;
end;
$$;

-- ============================================================================
-- 4. VERROUILLAGE : triggers BEFORE, ancienne ET nouvelle date
-- ----------------------------------------------------------------------------
-- On contrôle les deux dates d'un UPDATE : sinon on pourrait sortir une ligne
-- de 2023 (clôturé) en la redatant en 2024, ou en faire entrer une.
-- Message lisible : les actions de l'app affichent error.message tel quel.
-- ============================================================================
create or replace function public.verifier_exercice_ouvert(p_entite_id uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_entite_id is not null and p_date is not null
     and public.exercice_cloture(p_entite_id, extract(year from p_date)::integer) then
    raise exception 'Exercice % clôturé : rouvre-le d''abord.', extract(year from p_date)::integer;
  end if;
end;
$$;

-- [07/11/2026] Cas de la suppression d'une STRUCTURE entière : la cascade
-- supprime ses lignes alors que la structure n'est déjà plus visible. On la
-- laisse passer (seul le propriétaire peut supprimer sa structure) ; toute
-- autre suppression d'une ligne d'exercice clôturé est refusée.
create or replace function public.structure_en_suppression(p_entite_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.entite e where e.id = p_entite_id);
$$;

create or replace function public.verrou_exercice_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_transaction);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_transaction);
    return new;
  end if;
  return old;
end;
$$;

create or replace function public.verrou_exercice_solde_observe()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_releve);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_releve);
    return new;
  end if;
  return old;
end;
$$;

create or replace function public.verrou_exercice_contribution()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_contribution);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_contribution);
    return new;
  end if;
  return old;
end;
$$;

-- Un justificatif n'a pas de date : il prend celle de SA transaction.
-- Transaction introuvable = elle est en cours de suppression (cascade) ; son
-- propre verrou a déjà tranché.
create or replace function public.verrou_exercice_justificatif()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_entite uuid;
  v_date   date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select t.entite_id, t.date_transaction into v_entite, v_date
    from public.transaction t where t.id = old.transaction_id;
    perform public.verifier_exercice_ouvert(v_entite, v_date);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select t.entite_id, t.date_transaction into v_entite, v_date
    from public.transaction t where t.id = new.transaction_id;
    perform public.verifier_exercice_ouvert(v_entite, v_date);
    return new;
  end if;
  return old;
end;
$$;

-- Historique immuable : une clôture ne peut que passer de « cloture » à
-- « rouvert », sans toucher à ce qui a été enregistré. Même un appel direct
-- en base ne réécrit pas l'histoire (hors suppression de la structure).
create or replace function public.historique_cloture_immuable()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    raise exception 'Une clôture ne s''efface pas : rouvre l''exercice si besoin.';
  end if;
  if old.statut <> 'cloture' or new.statut <> 'rouvert'
     or (new.entite_id, new.exercice, new.cloture_le, new.cloture_par, new.motif, new.instantane, new.signature)
        is distinct from
        (old.entite_id, old.exercice, old.cloture_le, old.cloture_par, old.motif, old.instantane, old.signature) then
    raise exception 'Une clôture enregistrée ne se modifie pas : seule la réouverture est permise.';
  end if;
  return new;
end;
$$;

create trigger transaction_verrou_exercice
  before insert or update or delete on public.transaction
  for each row execute function public.verrou_exercice_transaction();

create trigger solde_observe_verrou_exercice
  before insert or update or delete on public.solde_observe
  for each row execute function public.verrou_exercice_solde_observe();

create trigger justificatif_verrou_exercice
  before insert or update or delete on public.justificatif
  for each row execute function public.verrou_exercice_justificatif();

create trigger contribution_nature_verrou_exercice
  before insert or update or delete on public.contribution_nature
  for each row execute function public.verrou_exercice_contribution();

create trigger cloture_exercice_immuable
  before update or delete on public.cloture_exercice
  for each row execute function public.historique_cloture_immuable();

-- ============================================================================
-- 5. RLS et GRANT
-- ----------------------------------------------------------------------------
-- Leçon de la 06 : sans GRANT, Postgres refuse avant même la RLS. Ici,
-- LECTURE seule pour authenticated (membres de la structure), aucune écriture
-- directe : clôturer et rouvrir passent par les fonctions. Rien pour anon.
-- ============================================================================
alter table public.cloture_exercice enable row level security;

create policy "cloture_exercice: lecture membres" on public.cloture_exercice for select
  using (public.peut_lire_entite(entite_id));

revoke all on public.cloture_exercice from public, anon, authenticated;
grant select on public.cloture_exercice to authenticated;

revoke all on function
  public.exercice_cloture(uuid, integer),
  public.signature_exercice(uuid, integer),
  public.controle_soldes_decembre(uuid, integer),
  public.cloturer_exercice(uuid, integer, text, text, jsonb),
  public.rouvrir_exercice(uuid, integer, text),
  public.verifier_exercice_ouvert(uuid, date),
  public.structure_en_suppression(uuid)
from public, anon, authenticated;

grant execute on function
  public.exercice_cloture(uuid, integer),
  public.signature_exercice(uuid, integer),
  public.cloturer_exercice(uuid, integer, text, text, jsonb),
  public.rouvrir_exercice(uuid, integer, text)
to authenticated;

commit;

-- Vérification : lecture pour authenticated, rien pour anon, 1 règle, 5 triggers.
select has_table_privilege('authenticated', 'public.cloture_exercice', 'select') as authenticated_select,
       has_table_privilege('authenticated', 'public.cloture_exercice', 'insert') as authenticated_insert,
       has_table_privilege('anon', 'public.cloture_exercice', 'select')          as anon_select,
       (select count(*) from pg_policies p where p.tablename = 'cloture_exercice') as policies,
       (select count(*) from pg_trigger g where g.tgname like '%verrou_exercice' or g.tgname = 'cloture_exercice_immuable') as triggers;

-- ============================================================================
-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- drop trigger if exists cloture_exercice_immuable on public.cloture_exercice;
-- drop trigger if exists contribution_nature_verrou_exercice on public.contribution_nature;
-- drop trigger if exists justificatif_verrou_exercice on public.justificatif;
-- drop trigger if exists solde_observe_verrou_exercice on public.solde_observe;
-- drop trigger if exists transaction_verrou_exercice on public.transaction;
-- drop function public.historique_cloture_immuable(), public.verrou_exercice_justificatif(),
--   public.verrou_exercice_contribution(), public.verrou_exercice_solde_observe(),
--   public.verrou_exercice_transaction(), public.structure_en_suppression(uuid),
--   public.verifier_exercice_ouvert(uuid, date), public.rouvrir_exercice(uuid, integer, text),
--   public.cloturer_exercice(uuid, integer, text, text, jsonb), public.controle_soldes_decembre(uuid, integer),
--   public.signature_exercice(uuid, integer), public.exercice_cloture(uuid, integer);
-- drop table public.cloture_exercice;
-- alter table public.transaction
--   drop constraint exception_justificatif_longueur,
--   drop constraint pointe_ref_longueur,
--   drop constraint pointage_complet,
--   drop column exception_justificatif, drop column pointe_ref, drop column pointe_le;
-- commit;
-- ============================================================================
