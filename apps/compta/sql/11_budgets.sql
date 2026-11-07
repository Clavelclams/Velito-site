-- ============================================================================
-- VELITO COMPTA — Migration 11 : budgets prévisionnels (07/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier.
-- Prérequis : 01, 02, 06 à 09 (fonctions peut_lire_entite / peut_ecrire_entite
-- de la 09, fonction maj_modifie_le de la 01).
--
-- Règles reprises du cahier des charges « Compta Nova » (pas de son code) :
--   1. Une enveloppe budgétaire = un exercice (année civile), une catégorie,
--      un montant prévu. Le SENS (recette ou dépense) se lit sur la catégorie :
--      on ne le duplique pas ici, deux sources finiraient par se contredire.
--   2. Une seule enveloppe par (entité, exercice, catégorie). Réenregistrer
--      la même enveloppe met à jour l'existante (upsert côté app).
--   3. Le montant prévu est en centimes entiers, jamais négatif. Une
--      catégorie sans enveloppe n'a pas de prévu (affiché « — »), ce n'est
--      pas un prévu à 0 : l'absence de ligne porte cette information.
--   4. Le réalisé n'est PAS stocké : il se calcule à partir des opérations
--      (lib/services/budgets.ts), virements internes exclus.
--   5. FK composite (categorie_id, entite_id) : une enveloppe VEA ne peut pas
--      pointer une catégorie VENA (même parade que transaction, sql/01).
--      Le support unique (id, entite_id) existe déjà sur categorie (sql/01).
-- ============================================================================

begin;

create table public.budget (
  id                uuid primary key default gen_random_uuid(),
  entite_id         uuid not null references public.entite (id) on delete cascade,
  -- Année civile de l'exercice, même borne que subvention.exercice (sql/08).
  exercice          smallint not null check (exercice between 2000 and 2100),
  categorie_id      uuid not null,
  montant_centimes  bigint not null check (montant_centimes >= 0),
  commentaire       text check (commentaire is null or char_length(commentaire) <= 1000),
  cree_le           timestamptz not null default now(),
  modifie_le        timestamptz not null default now(),
  -- [07/11/2026] Cible de l'upsert « on conflict (entite_id, exercice, categorie_id) ».
  constraint budget_enveloppe_unique unique (entite_id, exercice, categorie_id),
  -- [07/11/2026] Catégorie de la MÊME entité, sinon refus. Une catégorie
  -- n'est jamais supprimée quand elle sert (on l'archive) ; si une catégorie
  -- inutilisée est supprimée, ses enveloppes partent avec elle.
  constraint budget_categorie_meme_entite
    foreign key (categorie_id, entite_id)
    references public.categorie (id, entite_id)
    on delete cascade
);

comment on table public.budget is
  'Enveloppes budgétaires : exercice + catégorie (le sens vient de la catégorie). Réalisé calculé, jamais stocké.';

create trigger budget_maj_modifie_le
  before update on public.budget
  for each row execute function public.maj_modifie_le();

-- La contrainte unique indexe déjà (entite_id, exercice, ...) pour les
-- lectures par exercice. Cet index sert la FK côté catégorie (cascade).
create index idx_budget_categorie on public.budget (categorie_id, entite_id);

-- [07/11/2026] RLS sur le modèle de la 09 : lecture pour tout membre,
-- écriture pour le propriétaire et le trésorier.
alter table public.budget enable row level security;

create policy "budget: lecture membres" on public.budget for select
  using (public.peut_lire_entite(entite_id));
create policy "budget: ajout tresorier" on public.budget for insert
  with check (public.peut_ecrire_entite(entite_id));
create policy "budget: modification tresorier" on public.budget for update
  using (public.peut_ecrire_entite(entite_id))
  with check (public.peut_ecrire_entite(entite_id));
create policy "budget: suppression tresorier" on public.budget for delete
  using (public.peut_ecrire_entite(entite_id));

-- [07/11/2026] Leçon de la 06/07 : sans GRANT, Postgres refuse avant même la
-- RLS. Rien pour anon : compta est 100 % privé (revoke explicite au cas où
-- des privilèges par défaut du projet en accorderaient).
grant select, insert, update, delete on public.budget to authenticated;
revoke all on public.budget from anon;

commit;

-- Vérification : 4 règles, droits pour authenticated, aucun pour anon.
select has_table_privilege('authenticated', 'public.budget', 'select') as authenticated_select,
       has_table_privilege('authenticated', 'public.budget', 'insert') as authenticated_insert,
       has_table_privilege('anon', 'public.budget', 'select')          as anon_select,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'budget') as policies;

-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- drop table public.budget;  -- emporte trigger, index, règles et droits
-- commit;
