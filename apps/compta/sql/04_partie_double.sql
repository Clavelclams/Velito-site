-- ============================================================================
-- VELITO COMPTA — Migration 04 : Socle PARTIE DOUBLE (Lot 5, Bloc 5.1)
-- ----------------------------------------------------------------------------
-- À exécuter APRÈS 01, 02, 03. C'est la FONDATION de la vraie comptabilité :
-- elle ne remplace PAS le modèle recette/dépense (partie simple) qui reste la
-- saisie assistée — elle ajoute la couche « écritures » qui, elle, permettra
-- de produire le FEC, le bilan et le compte de résultat.
--
-- 3 tables : compte (plan comptable), ecriture (en-tête), ligne_ecriture (débit
-- ou crédit sur un compte). Une écriture est ÉQUILIBRÉE : Σdébits = Σcrédits.
-- Cette invariante est garantie par un trigger de contrainte DIFFÉRÉ (vérifié
-- au COMMIT), pas ligne par ligne — sinon on ne pourrait jamais insérer la 1re
-- ligne d'une écriture sans casser l'équilibre.
-- ============================================================================


-- ============================================================================
-- TABLE compte : le PLAN COMPTABLE, propre à chaque entité.
-- ----------------------------------------------------------------------------
-- numero = compte PCG (ex : '512' banque, '606' achats, '706' prestations).
-- classe = 1er chiffre du numéro (1 à 7). On la stocke (avec un CHECK de
-- cohérence) pour trier/agréger vite sans re-parser le numéro à chaque requête.
-- Classes : 1 capitaux, 2 immobilisations, 3 stocks, 4 tiers, 5 financier,
--           6 charges, 7 produits. (6 et 7 = compte de résultat ; 1-5 = bilan.)
-- ============================================================================
create table public.compte (
  id         uuid primary key default gen_random_uuid(),
  entite_id  uuid not null references public.entite (id) on delete cascade,

  numero     text not null check (numero ~ '^[1-7][0-9]*$'),
  libelle    text not null,
  classe     smallint not null check (classe between 1 and 7),

  -- Cohérence : la classe DOIT être le 1er chiffre du numéro.
  constraint classe_coherente check (classe = (left(numero, 1))::smallint),

  active     boolean not null default true,
  cree_le    timestamptz not null default now(),

  unique (entite_id, numero),
  -- Support de la FK composite anti-fuite depuis ligne_ecriture.
  unique (id, entite_id)
);

comment on table public.compte is
  'Plan comptable par entité. classe = 1er chiffre du numéro (CHECK). 6/7 = résultat, 1-5 = bilan.';


-- ============================================================================
-- TABLE ecriture : l'EN-TÊTE d'une écriture comptable.
-- ----------------------------------------------------------------------------
-- journal = code du journal (ACH achats, VEN ventes, BQ banque, OD opérations
-- diverses...). date_ecriture = date comptable. piece = n° de pièce (facture).
-- Le lien vers une transaction de la partie simple (pont, Bloc 5.2) est ajouté
-- ici, nullable : une écriture peut naître d'une transaction OU être saisie
-- directement.
-- ============================================================================
create table public.ecriture (
  id             uuid primary key default gen_random_uuid(),
  entite_id      uuid not null references public.entite (id) on delete cascade,

  -- Pont optionnel avec la partie simple (une transaction => une écriture).
  transaction_id uuid references public.transaction (id) on delete set null,

  journal        text not null check (char_length(journal) between 1 and 8),
  date_ecriture  date not null,
  libelle        text not null check (char_length(libelle) between 1 and 255),
  piece          text,

  cree_le        timestamptz not null default now(),

  unique (id, entite_id)
);

comment on table public.ecriture is
  'En-tête d''écriture. transaction_id = pont optionnel avec la partie simple.';

create index idx_ecriture_entite_date
  on public.ecriture (entite_id, date_ecriture desc);


-- ============================================================================
-- TABLE ligne_ecriture : une ligne au DÉBIT ou au CRÉDIT d'un compte.
-- ----------------------------------------------------------------------------
-- Montants en CENTIMES (bigint), comme partout. Une ligne est SOIT au débit
-- SOIT au crédit, jamais les deux (CHECK), et jamais nulle des deux côtés.
-- FK composite (compte_id, entite_id) : une ligne ne peut pointer qu'un compte
-- de LA MÊME entité que son écriture (anti-fuite, même principe qu'en 01).
-- ============================================================================
create table public.ligne_ecriture (
  id             uuid primary key default gen_random_uuid(),
  ecriture_id    uuid not null references public.ecriture (id) on delete cascade,
  entite_id      uuid not null references public.entite (id) on delete cascade,
  compte_id      uuid not null,

  debit_centimes  bigint not null default 0 check (debit_centimes  >= 0),
  credit_centimes bigint not null default 0 check (credit_centimes >= 0),

  -- Exactement un côté renseigné (l'autre à 0), et jamais 0/0.
  constraint un_seul_sens check (
    (debit_centimes  > 0 and credit_centimes = 0) or
    (credit_centimes > 0 and debit_centimes  = 0)
  ),

  constraint compte_meme_entite
    foreign key (compte_id, entite_id)
    references public.compte (id, entite_id)
);

comment on table public.ligne_ecriture is
  'Ligne débit OU crédit (CHECK un_seul_sens). Montants centimes. FK composite anti-fuite.';

create index idx_ligne_ecriture_ecriture on public.ligne_ecriture (ecriture_id);
create index idx_ligne_ecriture_compte   on public.ligne_ecriture (compte_id);


-- ============================================================================
-- TRIGGER D'ÉQUILIBRE (Σdébits = Σcrédits), vérifié au COMMIT.
-- ----------------------------------------------------------------------------
-- constraint trigger DEFERRABLE INITIALLY DEFERRED : on peut insérer les lignes
-- une à une dans une transaction ; l'équilibre n'est contrôlé qu'à la fin.
-- Garde-fou suppression : si l'écriture parente n'existe plus (cascade delete),
-- on ne vérifie rien — sinon supprimer une écriture serait impossible.
-- ============================================================================
create or replace function public.verifier_equilibre_ecriture()
returns trigger
language plpgsql
as $$
declare
  v_ecriture uuid;
  v_debit    bigint;
  v_credit   bigint;
begin
  v_ecriture := coalesce(new.ecriture_id, old.ecriture_id);

  -- Écriture supprimée (ses lignes partent en cascade) : rien à vérifier.
  if not exists (select 1 from public.ecriture where id = v_ecriture) then
    return null;
  end if;

  select coalesce(sum(debit_centimes), 0), coalesce(sum(credit_centimes), 0)
    into v_debit, v_credit
    from public.ligne_ecriture
    where ecriture_id = v_ecriture;

  if v_debit = 0 and v_credit = 0 then
    raise exception 'Écriture % sans aucune ligne (montant nul).', v_ecriture;
  end if;
  if v_debit <> v_credit then
    raise exception 'Écriture % déséquilibrée : débit=% ≠ crédit=%.',
      v_ecriture, v_debit, v_credit;
  end if;

  return null;
end;
$$;

create constraint trigger trg_equilibre_ecriture
  after insert or update or delete on public.ligne_ecriture
  deferrable initially deferred
  for each row execute function public.verifier_equilibre_ecriture();


-- ============================================================================
-- RLS : même cloisonnement que partout (propriété de l'entité).
-- ============================================================================
alter table public.compte         enable row level security;
alter table public.ecriture       enable row level security;
alter table public.ligne_ecriture enable row level security;

create policy "compte: via propriete de l'entite"
  on public.compte for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

create policy "ecriture: via propriete de l'entite"
  on public.ecriture for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );

create policy "ligne_ecriture: via propriete de l'entite"
  on public.ligne_ecriture for all
  using      ( public.est_proprietaire_entite(entite_id) )
  with check ( public.est_proprietaire_entite(entite_id) );


-- ============================================================================
-- SEED PCG (à exécuter par entité, APRÈS avoir créé l'entité).
-- ----------------------------------------------------------------------------
-- Plan comptable SIMPLIFIÉ, commun asso + société. La liste canonique vit
-- aussi en TypeScript (lib/services/comptabilite.ts, PCG_BASE) pour un futur
-- seed applicatif. Décommente et remplace TON-ENTITE-UUID.
-- ============================================================================
-- insert into public.compte (entite_id, numero, libelle, classe) values
--   ('TON-ENTITE-UUID','101','Capital',1),
--   ('TON-ENTITE-UUID','106','Réserves',1),
--   ('TON-ENTITE-UUID','120','Résultat de l''exercice',1),
--   ('TON-ENTITE-UUID','218','Matériel',2),
--   ('TON-ENTITE-UUID','401','Fournisseurs',4),
--   ('TON-ENTITE-UUID','411','Clients',4),
--   ('TON-ENTITE-UUID','44566','TVA déductible',4),
--   ('TON-ENTITE-UUID','44571','TVA collectée',4),
--   ('TON-ENTITE-UUID','512','Banque',5),
--   ('TON-ENTITE-UUID','530','Caisse',5),
--   ('TON-ENTITE-UUID','606','Achats non stockés',6),
--   ('TON-ENTITE-UUID','613','Locations',6),
--   ('TON-ENTITE-UUID','616','Assurances',6),
--   ('TON-ENTITE-UUID','626','Frais postaux et télécom',6),
--   ('TON-ENTITE-UUID','627','Services bancaires',6),
--   ('TON-ENTITE-UUID','706','Prestations de services',7),
--   ('TON-ENTITE-UUID','707','Ventes de marchandises',7),
--   ('TON-ENTITE-UUID','740','Subventions d''exploitation',7),
--   ('TON-ENTITE-UUID','756','Cotisations',7),
--   ('TON-ENTITE-UUID','758','Produits divers de gestion',7);
