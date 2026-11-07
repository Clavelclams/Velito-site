-- ============================================================================
-- VELITO COMPTA — Migration 06 : trésorerie associative (Lot 6, 07/11/2026)
-- ----------------------------------------------------------------------------
-- À exécuter dans Supabase : Dashboard > SQL Editor, APRÈS 01 à 05.
-- Réversible : bloc DOWN en bas du fichier.
--
-- Origine : cahiers des charges « Compta Nova » du MABB (passation du
-- 06/11/2026). On reprend leurs règles métier, pas leur code :
--   1. Une opération vit sur un COMPTE réel (courant, livret, caisse).
--   2. Un virement interne = deux mouvements opposés liés, qui ne sont ni
--      une recette ni une dépense de l'association.
--   3. La PROVENANCE d'une ligne (fichier, page, ligne) est conservée, et une
--      clé source stable empêche les doublons au réimport.
--   4. Statuts : À classer (pas de catégorie) / À valider / Validé.
--   5. Un SOLDE OBSERVÉ (lu sur un relevé) n'est pas une transaction : il est
--      rangé à part et sert à contrôler le solde calculé.
--   6. Inconnu ≠ zéro : un solde initial non connu reste NULL, jamais 0.
-- ============================================================================

begin;

-- ============================================================================
-- TABLE : compte_tresorerie
-- ----------------------------------------------------------------------------
-- Un compte où l'argent existe vraiment : compte courant, livret, caisse.
-- (À ne pas confondre avec public.compte, qui est un compte du PLAN
-- COMPTABLE pour la partie double.)
--
-- solde_initial_centimes : le solde au matin de date_solde_initial. Signé
-- (un compte peut démarrer à découvert). NULL = pas encore connu : le
-- contrôle mensuel l'affichera comme tel au lieu d'inventer 0.
-- ============================================================================
create table public.compte_tresorerie (
  id                      uuid primary key default gen_random_uuid(),
  entite_id               uuid not null references public.entite (id) on delete cascade,
  nom                     text not null check (char_length(trim(nom)) between 1 and 60),
  nature                  text not null check (nature in ('courant', 'livret', 'caisse', 'autre')),
  solde_initial_centimes  bigint,
  date_solde_initial      date,
  active                  boolean not null default true,
  cree_le                 timestamptz not null default now(),
  unique (entite_id, nom),
  -- Support de la FK composite anti-fuite (même technique que categorie).
  unique (id, entite_id),
  -- Un solde initial n'a de sens qu'avec sa date.
  constraint solde_initial_date
    check ((solde_initial_centimes is null) = (date_solde_initial is null))
);

comment on table public.compte_tresorerie is
  'Comptes réels (courant, livret, caisse) d''une entité. Solde initial NULL = inconnu.';

-- ============================================================================
-- TABLE : solde_observe
-- ----------------------------------------------------------------------------
-- Photographie d'un compte à une date, lue sur un relevé bancaire ou un
-- comptage de caisse. Ce n'est PAS un mouvement : l'enregistrer ne change
-- aucun total. Il sert uniquement au contrôle « calculé = observé ».
-- ============================================================================
create table public.solde_observe (
  id              uuid primary key default gen_random_uuid(),
  entite_id       uuid not null references public.entite (id) on delete cascade,
  compte_id       uuid not null,
  date_releve     date not null,
  solde_centimes  bigint not null,
  reference       text check (reference is null or char_length(reference) <= 120),
  cree_le         timestamptz not null default now(),
  unique (compte_id, date_releve),
  constraint solde_observe_compte_meme_entite
    foreign key (compte_id, entite_id)
    references public.compte_tresorerie (id, entite_id)
    on delete cascade
);

comment on table public.solde_observe is
  'Solde lu sur un relevé à une date. Pas une transaction : sert au rapprochement.';

-- ============================================================================
-- TABLE transaction : nouvelles colonnes
-- ============================================================================
alter table public.transaction
  -- Compte réel. NULL autorisé : on ne sait pas toujours (ticket payé avec
  -- une carte inconnue). Inconnu ≠ deviné.
  add column compte_tresorerie_id uuid,
  -- Les deux jambes d'un virement interne partagent ce même identifiant.
  add column virement_id uuid,
  -- Provenance : d'où vient la ligne (nom de fichier, puis page ou ligne).
  add column source_fichier text check (source_fichier is null or char_length(source_fichier) <= 255),
  add column source_ref     text check (source_ref is null or char_length(source_ref) <= 120),
  -- Clé stable calculée à l'import : réimporter le même fichier ne crée rien.
  add column source_cle     text check (source_cle is null or char_length(source_cle) <= 255),
  -- Note libre (ce qui reste à vérifier, explication d'un écart).
  add column commentaire    text check (commentaire is null or char_length(commentaire) <= 1000),
  add constraint transaction_compte_meme_entite
    foreign key (compte_tresorerie_id, entite_id)
    references public.compte_tresorerie (id, entite_id),
  -- Unique classique (pas partiel) : Postgres considère deux NULL comme
  -- différents, donc les saisies manuelles (sans clé) ne se gênent pas, et
  -- l'upsert « ignorer les doublons » de l'import peut viser cette contrainte.
  add constraint transaction_source_unique unique (entite_id, source_cle),
  -- Une jambe de virement est forcément rattachée à un compte.
  add constraint virement_sur_un_compte
    check (virement_id is null or compte_tresorerie_id is not null);

-- Statuts : on ajoute « a_classer » (aucune catégorie encore). Les valeurs
-- existantes restent valides : a_verifier (= « À valider ») et validee.
alter table public.transaction drop constraint transaction_statut_check;
alter table public.transaction
  add constraint transaction_statut_check
    check (statut in ('a_classer', 'a_verifier', 'validee'));

-- Une opération validée doit être classée (règle Nova : on ne valide pas
-- une ligne dont on ne connaît pas la nature). Les virements internes en
-- sont exemptés : ils n'ont pas de catégorie par construction.
alter table public.transaction
  add constraint validee_implique_categorie
    check (statut <> 'validee' or categorie_id is not null or virement_id is not null)
    not valid;
-- NOT VALID : la règle s'applique à toute nouvelle écriture, sans échouer sur
-- d'éventuelles lignes anciennes (validées sans catégorie avant cette règle).

create index idx_transaction_compte_date
  on public.transaction (compte_tresorerie_id, date_transaction);
create index idx_transaction_virement
  on public.transaction (virement_id) where virement_id is not null;
create index idx_compte_tresorerie_entite
  on public.compte_tresorerie (entite_id);

-- ============================================================================
-- RLS : même cloisonnement que le reste (propriétaire de l'entité)
-- ============================================================================
alter table public.compte_tresorerie enable row level security;
alter table public.solde_observe     enable row level security;

create policy "compte_tresorerie: via propriete de l'entite"
  on public.compte_tresorerie
  for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

create policy "solde_observe: via propriete de l'entite"
  on public.solde_observe
  for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

commit;

-- Vérification
select table_name, (select count(*) from pg_policies p where p.tablename = t.table_name) as policies
from information_schema.tables t
where table_schema = 'public' and table_name in ('compte_tresorerie', 'solde_observe');

-- ============================================================================
-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- alter table public.transaction drop constraint validee_implique_categorie;
-- update public.transaction set statut = 'a_verifier' where statut = 'a_classer';
-- alter table public.transaction drop constraint transaction_statut_check;
-- alter table public.transaction add constraint transaction_statut_check
--   check (statut in ('a_verifier', 'validee'));
-- alter table public.transaction
--   drop constraint virement_sur_un_compte,
--   drop constraint transaction_source_unique,
--   drop constraint transaction_compte_meme_entite,
--   drop column commentaire, drop column source_cle, drop column source_ref,
--   drop column source_fichier, drop column virement_id, drop column compte_tresorerie_id;
-- drop table public.solde_observe;
-- drop table public.compte_tresorerie;
-- commit;
-- ============================================================================
