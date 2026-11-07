-- ============================================================================
-- VELITO COMPTA — Migration 08 : subventions et contributions bénévoles (07/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier.
-- Prérequis : 01 à 07.
--
-- Règles reprises des cahiers des charges « Compta Nova » (pas de leur code) :
--
-- SUBVENTIONS
--   1. Un dossier = un financeur, une action, un exercice. Statuts : à
--      préparer, déposée, notifiée, soldée, refusée.
--   2. Demandé, notifié et encaissé sont trois montants DIFFÉRENTS. Saisir
--      une demande ne crée aucun encaissement. Notifié inconnu = NULL, pas 0.
--   3. L'encaissé n'est pas saisi : c'est la somme des recettes rattachées au
--      dossier (colonne transaction.subvention_id, le « financement lié »,
--      distinct de la catégorie). Les dépenses rattachées montrent l'emploi
--      de la subvention (compte rendu financier au financeur).
--
-- CONTRIBUTIONS BÉNÉVOLES (contributions volontaires en nature)
--   4. Trois types : heures de bénévolat (minutes × taux horaire, arrondi au
--      centime), don en nature, frais abandonnés.
--   5. Statuts : brouillon, à vérifier, vérifié, annulé. Seules les fiches
--      « vérifié » comptent dans les totaux.
--   6. Aucune contribution ne crée d'encaissement : elles sont présentées à
--      part des comptes, jamais additionnées aux recettes.
--   7. Frais abandonnés : la date de la renonciation écrite est exigée pour
--      passer en « vérifié ».
--   8. Provenance + clé source unique : les heures reprises de vea.velito.fr
--      (un total par événement, sans nom de bénévole) ne se dupliquent pas.
-- ============================================================================

begin;

create table public.subvention (
  id                         uuid primary key default gen_random_uuid(),
  entite_id                  uuid not null references public.entite (id) on delete cascade,
  financeur                  text not null check (char_length(trim(financeur)) between 1 and 120),
  action                     text not null check (char_length(trim(action)) between 1 and 200),
  exercice                   smallint not null check (exercice between 2000 and 2100),
  statut                     text not null default 'a_preparer'
                             check (statut in ('a_preparer', 'deposee', 'notifiee', 'soldee', 'refusee')),
  montant_demande_centimes   bigint check (montant_demande_centimes is null or montant_demande_centimes >= 0),
  montant_notifie_centimes   bigint check (montant_notifie_centimes is null or montant_notifie_centimes >= 0),
  date_depot                 date,
  date_notification          date,
  -- Date limite du compte rendu financier ou de la justification.
  echeance                   date,
  commentaire                text check (commentaire is null or char_length(commentaire) <= 1000),
  cree_le                    timestamptz not null default now(),
  modifie_le                 timestamptz not null default now(),
  unique (id, entite_id)
);

comment on table public.subvention is
  'Dossiers de subvention. Encaissé = somme des recettes liées (transaction.subvention_id), jamais saisi.';

create trigger subvention_maj_modifie_le
  before update on public.subvention
  for each row execute function public.maj_modifie_le();

-- Financement lié. FK composite : un dossier d'une autre entité est refusé en
-- base. Suppression du dossier : seule la colonne subvention_id repasse à
-- NULL (syntaxe Postgres 15+), la transaction reste.
alter table public.transaction
  add column subvention_id uuid,
  add constraint transaction_subvention_meme_entite
    foreign key (subvention_id, entite_id)
    references public.subvention (id, entite_id)
    on delete set null (subvention_id);

create index idx_transaction_subvention on public.transaction (subvention_id) where subvention_id is not null;
create index idx_subvention_entite on public.subvention (entite_id, exercice);

create table public.contribution_nature (
  id                     uuid primary key default gen_random_uuid(),
  entite_id              uuid not null references public.entite (id) on delete cascade,
  type                   text not null check (type in ('heures_benevoles', 'don_nature', 'frais_abandonnes')),
  date_contribution      date not null,
  libelle                text not null check (char_length(trim(libelle)) between 1 and 255),
  statut                 text not null default 'a_verifier'
                         check (statut in ('brouillon', 'a_verifier', 'verifie', 'annule')),
  -- Heures : minutes et taux horaire ; la valeur est calculée par l'app.
  minutes                integer check (minutes is null or minutes > 0),
  taux_horaire_centimes  integer check (taux_horaire_centimes is null or taux_horaire_centimes > 0),
  nb_personnes           integer check (nb_personnes is null or nb_personnes > 0),
  valeur_centimes        bigint not null check (valeur_centimes >= 0),
  -- Frais abandonnés : date de la renonciation écrite au remboursement.
  date_renonciation      date,
  commentaire            text check (commentaire is null or char_length(commentaire) <= 1000),
  source                 text check (source is null or char_length(source) <= 120),
  source_cle             text check (source_cle is null or char_length(source_cle) <= 255),
  cree_le                timestamptz not null default now(),
  modifie_le             timestamptz not null default now(),
  unique (entite_id, source_cle),
  constraint heures_completes
    check (type <> 'heures_benevoles' or (minutes is not null and taux_horaire_centimes is not null)),
  constraint frais_abandonnes_renonciation
    check (type <> 'frais_abandonnes' or statut <> 'verifie' or date_renonciation is not null)
);

comment on table public.contribution_nature is
  'Contributions volontaires en nature (bénévolat, dons, frais abandonnés). Jamais un encaissement.';

create trigger contribution_nature_maj_modifie_le
  before update on public.contribution_nature
  for each row execute function public.maj_modifie_le();

create index idx_contribution_entite_date on public.contribution_nature (entite_id, date_contribution);

-- RLS : mêmes règles que le reste de compta (propriétaire de l'entité).
alter table public.subvention          enable row level security;
alter table public.contribution_nature enable row level security;

create policy "subvention: via propriete de l'entite"
  on public.subvention for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

create policy "contribution_nature: via propriete de l'entite"
  on public.contribution_nature for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

-- Leçon de la 06 : sans GRANT, Postgres refuse avant même la RLS.
grant select, insert, update, delete on public.subvention          to authenticated;
grant select, insert, update, delete on public.contribution_nature to authenticated;

commit;

-- Vérification : 2 policies, droits pour authenticated, aucun pour anon.
select t,
       has_table_privilege('authenticated', t, 'select') as authenticated_select,
       has_table_privilege('anon', t, 'select')          as anon_select,
       (select count(*) from pg_policies p where 'public.' || p.tablename = t) as policies
from unnest(array['public.subvention', 'public.contribution_nature']) as t;

-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- drop table public.contribution_nature;
-- alter table public.transaction drop constraint transaction_subvention_meme_entite;
-- drop index if exists public.idx_transaction_subvention;
-- alter table public.transaction drop column subvention_id;
-- drop table public.subvention;
-- commit;
