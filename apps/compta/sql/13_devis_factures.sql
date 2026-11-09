-- ============================================================================
-- VELITO COMPTA : Migration 13, devis, factures, avoirs et clients (09/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier. Prérequis : 01 à 10 et 12
-- (peut_lire_entite / peut_ecrire_entite de la 09, verifier_exercice_ouvert et
-- structure_en_suppression de la 10, maj_modifie_le de la 01, contrainte
-- transaction_id_entite_unique de la 12).
--
-- Règles (cahier des charges « Gestion Compta Nova », plus le droit français
-- de la facturation, appliqués comme des RÈGLES, pas comme du conseil) :
--
--   1. Paramètres vendeur : une ligne par structure. Chaque mention est un
--      champ ; absente = NULL (jamais une valeur inventée). L'app refuse
--      d'émettre tant qu'une mention obligatoire manque.
--   2. Clients : un client utilisé par un devis ou une facture ne se supprime
--      pas. Une facture émise garde un INSTANTANÉ du vendeur et de
--      l'acheteur : modifier une fiche ensuite ne change pas une facture émise.
--   3. Devis : numéro DEV-AAAA-NNN attribué PAR LA BASE à la création.
--      Statuts : brouillon, envoyé, accepté (date d'acceptation obligatoire),
--      refusé. « Expiré » n'est pas stocké : il se calcule à l'affichage.
--      Un devis accepté ou refusé ne se modifie plus, sauf le lien facture_id
--      posé quand on le transforme en facture.
--   4. Facture et avoir : une seule table, colonne sens (facture ou avoir).
--      Le brouillon n'a PAS de numéro. Le numéro légal FAC-AAAA-NNNN (ou
--      AV-AAAA-NNNN pour un avoir) est attribué PAR LA BASE au passage
--      brouillon → émise, dans la même transaction que l'émission : un échec
--      annule tout, compteur compris. Une facture émise ne se supprime pas et
--      ne se modifie plus (trigger) : on la corrige par un avoir.
--   5. Encaissements : jamais de paiement fictif. On RATTACHE une recette
--      réelle déjà en compta (table de liaison, montant affecté). La somme
--      affectée ne dépasse ni le TTC de la facture, ni le montant de
--      l'opération. Une facture n'est jamais une recette : seule l'opération
--      bancaire compte en trésorerie et au résultat.
--   6. Clôture : devis, factures et lignes sont refusés sur un exercice clôturé
--      (ancienne ET nouvelle date, comme la 10). Exception motivée : un
--      encaissement est daté de l'opération bancaire, pas de la facture.
-- ============================================================================

begin;

-- ============================================================================
-- 1. Paramètres de facturation (vendeur), une ligne par structure
-- ----------------------------------------------------------------------------
-- [09/11/2026] Aucune valeur par défaut légale : la mention de TVA et
-- l'indemnité de recouvrement sont des TEXTES saisis (l'app propose une
-- suggestion modifiable). Formats vérifiés quand la valeur est connue.
-- ============================================================================
create table public.facturation_parametres (
  entite_id                     uuid primary key references public.entite (id) on delete cascade,
  denomination                  text check (denomination is null or char_length(trim(denomination)) between 1 and 200),
  forme_juridique               text check (forme_juridique is null or char_length(trim(forme_juridique)) between 1 and 100),
  -- Capital social en centimes (sociétés). NULL = inconnu ou sans objet.
  capital_social_centimes       bigint check (capital_social_centimes is null or capital_social_centimes >= 0),
  adresse                       text check (adresse is null or char_length(trim(adresse)) between 1 and 500),
  siren                         text check (siren is null or siren ~ '^[0-9]{9}$'),
  siret                         text check (siret is null or siret ~ '^[0-9]{14}$'),
  ville_rcs                     text check (ville_rcs is null or char_length(trim(ville_rcs)) between 1 and 100),
  numero_tva_intra              text check (numero_tva_intra is null or numero_tva_intra ~ '^[A-Z]{2}[0-9A-Z]{2,13}$'),
  -- franchise_base : franchise en base de TVA ; assujetti : facture la TVA ;
  -- non_assujetti : hors champ (cas de nombreuses associations).
  regime_tva                    text check (regime_tva is null or regime_tva in ('franchise_base', 'assujetti', 'non_assujetti')),
  mention_tva                   text check (mention_tva is null or char_length(trim(mention_tva)) between 1 and 300),
  conditions_paiement           text check (conditions_paiement is null or char_length(trim(conditions_paiement)) between 1 and 500),
  penalites_retard              text check (penalites_retard is null or char_length(trim(penalites_retard)) between 1 and 500),
  indemnite_recouvrement        text check (indemnite_recouvrement is null or char_length(trim(indemnite_recouvrement)) between 1 and 500),
  iban                          text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[0-9A-Z]{10,30}$'),
  email                         text check (email is null or char_length(trim(email)) between 3 and 200),
  cree_le                       timestamptz not null default now(),
  modifie_le                    timestamptz not null default now(),
  -- Le SIRET commence par le SIREN quand les deux sont connus.
  constraint facturation_parametres_siret_siren check (siren is null or siret is null or left(siret, 9) = siren)
);

comment on table public.facturation_parametres is
  'Mentions du vendeur pour les devis et factures (une ligne par structure). Absente = NULL, jamais inventée.';

-- ============================================================================
-- 2. Clients
-- ============================================================================
create table public.client_facturation (
  id                    uuid primary key default gen_random_uuid(),
  entite_id             uuid not null references public.entite (id) on delete cascade,
  type_client           text not null default 'professionnel' check (type_client in ('particulier', 'professionnel')),
  nom                   text not null check (char_length(trim(nom)) between 1 and 200),
  -- Exigé par l'app pour émettre une facture à un professionnel (réforme).
  siren                 text check (siren is null or siren ~ '^[0-9]{9}$'),
  numero_tva_intra      text check (numero_tva_intra is null or numero_tva_intra ~ '^[A-Z]{2}[0-9A-Z]{2,13}$'),
  adresse_facturation   text check (adresse_facturation is null or char_length(trim(adresse_facturation)) between 1 and 500),
  -- NULL = identique à l'adresse de facturation.
  adresse_livraison     text check (adresse_livraison is null or char_length(trim(adresse_livraison)) between 1 and 500),
  email                 text check (email is null or char_length(trim(email)) between 3 and 200),
  commentaire           text check (commentaire is null or char_length(commentaire) <= 1000),
  cree_le               timestamptz not null default now(),
  modifie_le            timestamptz not null default now(),
  unique (id, entite_id)
);

comment on table public.client_facturation is
  'Clients (acheteurs) d''une structure. Un client utilisé par un devis ou une facture ne se supprime pas.';

create index idx_client_facturation_entite on public.client_facturation (entite_id, nom);

-- ============================================================================
-- 3. Compteur de numéros (interne, jamais exposé)
-- ----------------------------------------------------------------------------
-- [09/11/2026] Même mécanique que note_frais_compteur (sql/12) : une ligne par
-- (structure, série, année), « insert ... on conflict do update ... returning »
-- VERROUILLE la ligne jusqu'à la fin de la transaction. Deux émissions
-- simultanées s'attendent ; un échec annule tout, compteur compris : aucun
-- trou. Séries : DEV (devis), FAC (factures), AV (avoirs).
-- ============================================================================
create table public.facturation_compteur (
  entite_id  uuid not null references public.entite (id) on delete cascade,
  serie      text not null check (serie in ('DEV', 'FAC', 'AV')),
  annee      smallint not null check (annee between 2000 and 2100),
  dernier    integer not null check (dernier > 0),
  primary key (entite_id, serie, annee)
);

comment on table public.facturation_compteur is
  'Dernier numéro attribué par structure, série (DEV, FAC, AV) et année. Écrit uniquement par les triggers.';

-- ============================================================================
-- 4. Factures et avoirs
-- ============================================================================
create table public.facture (
  id                  uuid primary key default gen_random_uuid(),
  entite_id           uuid not null references public.entite (id) on delete cascade,
  -- Un avoir est un document distinct, de même structure, qui référence la
  -- facture d'origine. Montants toujours positifs : c'est le sens qui dit
  -- « avoir ».
  sens                text not null default 'facture' check (sens in ('facture', 'avoir')),
  -- Stocké : brouillon ou émise. Payée, payée partiellement et annulée par
  -- avoir se CALCULENT (encaissements et avoirs), jamais saisis.
  statut              text not null default 'brouillon' check (statut in ('brouillon', 'emise')),
  -- Attribués par le trigger à l'émission (NULL en brouillon), puis immuables.
  numero              text,
  annee_numero        smallint,
  rang                integer check (rang is null or rang > 0),
  client_id           uuid not null,
  date_emission       date,
  date_prestation     date,
  date_echeance       date,
  nature_operation    text check (nature_operation is null or nature_operation in ('biens', 'services', 'mixte')),
  -- Option pour le paiement de la TVA d'après les débits (case à cocher).
  tva_sur_debits      boolean not null default false,
  objet               text check (objet is null or char_length(trim(objet)) between 1 and 200),
  notes               text check (notes is null or char_length(notes) <= 2000),
  facture_origine_id  uuid,
  correction_de       uuid,
  -- Totaux figés à l'émission par le trigger (NULL en brouillon : l'app les
  -- calcule à l'affichage depuis les lignes).
  total_ht_centimes   bigint check (total_ht_centimes is null or total_ht_centimes >= 0),
  total_tva_centimes  bigint check (total_tva_centimes is null or total_tva_centimes >= 0),
  total_ttc_centimes  bigint check (total_ttc_centimes is null or total_ttc_centimes > 0),
  -- Instantanés du vendeur et de l'acheteur, pris à l'émission.
  vendeur             jsonb,
  acheteur            jsonb,
  emise_le            timestamptz,
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now(),

  unique (id, entite_id),
  constraint facture_numero_unique unique (entite_id, numero),
  constraint facture_rang_unique unique (entite_id, sens, annee_numero, rang),
  constraint facture_numero_format check (
    numero is null
    or (sens = 'facture' and numero ~ '^FAC-[0-9]{4}-[0-9]{4,}$')
    or (sens = 'avoir' and numero ~ '^AV-[0-9]{4}-[0-9]{4,}$')
  ),
  constraint facture_brouillon_sans_numero check (statut <> 'brouillon' or (numero is null and rang is null and emise_le is null)),
  constraint facture_emise_complete check (
    statut <> 'emise' or (
      numero is not null and annee_numero is not null and rang is not null and date_emission is not null
      and total_ht_centimes is not null and total_tva_centimes is not null and total_ttc_centimes is not null
      and total_ttc_centimes = total_ht_centimes + total_tva_centimes
      and vendeur is not null and acheteur is not null and emise_le is not null
    )
  ),
  constraint facture_avoir_origine check ((sens = 'avoir') = (facture_origine_id is not null)),
  constraint facture_echeance_apres_emission check (date_echeance is null or date_emission is null or date_echeance >= date_emission),
  constraint facture_pas_elle_meme check ((facture_origine_id is null or facture_origine_id <> id) and (correction_de is null or correction_de <> id)),

  -- FK composites : tout lien reste DANS la structure.
  constraint facture_client_meme_entite
    foreign key (client_id, entite_id) references public.client_facturation (id, entite_id),
  constraint facture_origine_meme_entite
    foreign key (facture_origine_id, entite_id) references public.facture (id, entite_id),
  constraint facture_correction_meme_entite
    foreign key (correction_de, entite_id) references public.facture (id, entite_id)
);

comment on table public.facture is
  'Factures et avoirs. Numéro FAC-AAAA-NNNN ou AV-AAAA-NNNN attribué par la base à l''émission. Émise = figée.';

create index idx_facture_entite_date on public.facture (entite_id, date_emission desc);
create index idx_facture_client on public.facture (client_id);
create index idx_facture_origine on public.facture (facture_origine_id) where facture_origine_id is not null;

-- ============================================================================
-- 5. Lignes de facture
-- ----------------------------------------------------------------------------
-- [09/11/2026] Quantité décimale (numeric, jamais un flottant), prix unitaire
-- HT en centimes, taux de TVA en centièmes de pour cent (20 % = 2000,
-- 5,5 % = 550, 0 accepté). Montant HT de la ligne = quantité × prix arrondi
-- au centime : l'app le calcule, la base vérifie (double barrière, comme
-- trajet_ik). round() sur un numeric arrondit le demi en s'éloignant de zéro.
-- ============================================================================
create table public.facture_ligne (
  id                          uuid primary key default gen_random_uuid(),
  entite_id                   uuid not null references public.entite (id) on delete cascade,
  facture_id                  uuid not null,
  position                    integer not null default 0 check (position >= 0),
  designation                 text not null check (char_length(trim(designation)) between 1 and 500),
  quantite                    numeric(12, 3) not null check (quantite > 0),
  unite                       text check (unite is null or char_length(trim(unite)) between 1 and 30),
  prix_unitaire_ht_centimes   bigint not null check (prix_unitaire_ht_centimes >= 0 and prix_unitaire_ht_centimes <= 100000000000),
  taux_tva_centiemes          integer not null check (taux_tva_centiemes between 0 and 10000),
  montant_ht_centimes         bigint not null check (montant_ht_centimes >= 0),
  cree_le                     timestamptz not null default now(),
  modifie_le                  timestamptz not null default now(),
  constraint facture_ligne_montant_calcule check (montant_ht_centimes = round(quantite * prix_unitaire_ht_centimes)),
  constraint facture_ligne_meme_entite
    foreign key (facture_id, entite_id) references public.facture (id, entite_id) on delete cascade
);

comment on table public.facture_ligne is
  'Lignes d''une facture ou d''un avoir. Montant HT = quantité × prix unitaire arrondi au centime.';

create index idx_facture_ligne_facture on public.facture_ligne (facture_id, position);

-- ============================================================================
-- 6. Devis et lignes de devis
-- ============================================================================
create table public.devis (
  id                  uuid primary key default gen_random_uuid(),
  entite_id           uuid not null references public.entite (id) on delete cascade,
  numero              text not null,
  annee_numero        smallint not null,
  rang                integer not null check (rang > 0),
  client_id           uuid not null,
  objet               text check (objet is null or char_length(trim(objet)) between 1 and 200),
  date_devis          date not null,
  date_fin_validite   date not null,
  statut              text not null default 'brouillon' check (statut in ('brouillon', 'envoye', 'accepte', 'refuse')),
  date_acceptation    date,
  signataire_accord   text check (signataire_accord is null or char_length(trim(signataire_accord)) between 1 and 200),
  -- Facture brouillon créée depuis ce devis (seul champ qui change encore
  -- sur un devis accepté). Facture supprimée : le lien redevient NULL.
  facture_id          uuid,
  notes               text check (notes is null or char_length(notes) <= 2000),
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now(),

  unique (id, entite_id),
  constraint devis_numero_unique unique (entite_id, numero),
  constraint devis_rang_unique unique (entite_id, annee_numero, rang),
  constraint devis_numero_format check (numero ~ '^DEV-[0-9]{4}-[0-9]{3,}$'),
  constraint devis_validite_apres_date check (date_fin_validite >= date_devis),
  constraint devis_acceptation_datee check (
    statut <> 'accepte' or (date_acceptation is not null and date_acceptation >= date_devis)
  ),
  constraint devis_facture_si_accepte check (facture_id is null or statut = 'accepte'),
  constraint devis_client_meme_entite
    foreign key (client_id, entite_id) references public.client_facturation (id, entite_id),
  -- [09/11/2026] « set null (facture_id) » (Postgres 15+) : seule la colonne
  -- facture_id redevient NULL, entite_id reste (sinon NOT NULL violé).
  constraint devis_facture_meme_entite
    foreign key (facture_id, entite_id) references public.facture (id, entite_id) on delete set null (facture_id)
);

comment on table public.devis is
  'Devis. Numéro DEV-AAAA-NNN attribué par la base à la création. « Expiré » se calcule à l''affichage.';

create index idx_devis_entite_date on public.devis (entite_id, date_devis desc);
create index idx_devis_client on public.devis (client_id);

create table public.devis_ligne (
  id                          uuid primary key default gen_random_uuid(),
  entite_id                   uuid not null references public.entite (id) on delete cascade,
  devis_id                    uuid not null,
  position                    integer not null default 0 check (position >= 0),
  designation                 text not null check (char_length(trim(designation)) between 1 and 500),
  quantite                    numeric(12, 3) not null check (quantite > 0),
  unite                       text check (unite is null or char_length(trim(unite)) between 1 and 30),
  prix_unitaire_ht_centimes   bigint not null check (prix_unitaire_ht_centimes >= 0 and prix_unitaire_ht_centimes <= 100000000000),
  taux_tva_centiemes          integer not null check (taux_tva_centiemes between 0 and 10000),
  montant_ht_centimes         bigint not null check (montant_ht_centimes >= 0),
  cree_le                     timestamptz not null default now(),
  modifie_le                  timestamptz not null default now(),
  constraint devis_ligne_montant_calcule check (montant_ht_centimes = round(quantite * prix_unitaire_ht_centimes)),
  constraint devis_ligne_meme_entite
    foreign key (devis_id, entite_id) references public.devis (id, entite_id) on delete cascade
);

create index idx_devis_ligne_devis on public.devis_ligne (devis_id, position);

-- ============================================================================
-- 7. Encaissements rattachés (table de liaison)
-- ============================================================================
create table public.facture_paiement (
  id                uuid primary key default gen_random_uuid(),
  entite_id         uuid not null references public.entite (id) on delete cascade,
  facture_id        uuid not null,
  -- Recette RÉELLE déjà en compta (importée du relevé ou saisie).
  transaction_id    uuid not null,
  montant_centimes  bigint not null check (montant_centimes > 0),
  cree_le           timestamptz not null default now(),
  constraint facture_paiement_unique unique (facture_id, transaction_id),
  constraint facture_paiement_facture_meme_entite
    foreign key (facture_id, entite_id) references public.facture (id, entite_id),
  -- Sans « on delete » : supprimer une opération qui encaisse une facture
  -- est refusé (on retire d'abord le rattachement).
  constraint facture_paiement_transaction_meme_entite
    foreign key (transaction_id, entite_id) references public.transaction (id, entite_id)
);

comment on table public.facture_paiement is
  'Rattachement d''une recette réelle (transaction) à une facture émise, avec le montant affecté. Jamais de paiement fictif.';

create index idx_facture_paiement_facture on public.facture_paiement (facture_id);
create index idx_facture_paiement_transaction on public.facture_paiement (transaction_id);

-- ============================================================================
-- 8. FONCTIONS ET TRIGGERS
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER + search_path vide, comme la 10 et la 12.
-- ============================================================================

-- 8.1 [09/11/2026] Totaux d'une facture depuis ses lignes. Méthode (identique
-- au service lib/services/facturation) : montant HT arrondi PAR LIGNE, somme
-- des lignes PAR TAUX, TVA = somme HT du taux × taux, arrondie UNE fois par
-- taux, puis TTC = HT + TVA. C'est la règle de la norme EN 16931 (le montant
-- de TVA d'une catégorie se calcule sur sa base imposable) : une plateforme
-- recalcule ainsi et refuserait un écart d'un centime.
create or replace function public.totaux_facture(p_facture_id uuid, out total_ht bigint, out total_tva bigint)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.ht), 0)::bigint,
         coalesce(sum(round(x.ht * x.taux / 10000::numeric)), 0)::bigint
  from (
    select sum(l.montant_ht_centimes) as ht, l.taux_tva_centiemes as taux
    from public.facture_ligne l
    where l.facture_id = p_facture_id
    group by l.taux_tva_centiemes
  ) x;
$$;

-- 8.2 Numéro formaté : au-delà de la largeur, le rang s'écrit tel quel
-- (lpad TRONQUE une chaîne trop longue, leçon de la 12).
create or replace function public.formater_numero_facturation(p_serie text, p_annee smallint, p_rang integer, p_largeur integer)
returns text language sql immutable set search_path = '' as $$
  select p_serie || '-' || p_annee::text || '-' ||
         case when length(p_rang::text) < p_largeur then lpad(p_rang::text, p_largeur, '0') else p_rang::text end;
$$;

create or replace function public.prochain_numero_facturation(p_entite_id uuid, p_serie text, p_annee smallint)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_rang integer;
begin
  insert into public.facturation_compteur as c (entite_id, serie, annee, dernier)
  values (p_entite_id, p_serie, p_annee, 1)
  on conflict (entite_id, serie, annee) do update set dernier = c.dernier + 1
  returning c.dernier into v_rang;
  return v_rang;
end;
$$;

-- 8.3 Cycle de vie d'une facture ou d'un avoir.
--   INSERT : toujours en brouillon, sans numéro, sans instantané.
--   brouillon → brouillon : tout se modifie (sauf structure et sens).
--   brouillon → émise : contrôles, numéro légal, totaux, instantanés.
--   émise : plus rien ne change, ni suppression. Correction = avoir.
-- [09/11/2026] Verrou de clôture intégré : ancienne et nouvelle date
-- d'émission (NULL en brouillon = pas encore datée, rien à contrôler).
create or replace function public.controle_facture()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_serie    text;
  v_annee    smallint;
  v_rang     integer;
  v_nb       integer;
  v_ht       bigint;
  v_tva      bigint;
  v_deja     bigint;
  v_origine  public.facture;
  v_param    public.facturation_parametres;
  v_client   public.client_facturation;
  v_doc      text;
begin
  if tg_op = 'DELETE' then
    if public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    if old.statut <> 'brouillon' then
      raise exception 'Document % émis : il ne se supprime pas. Pour l''annuler, émets un avoir.', old.numero;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_emission);
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.statut <> 'brouillon' then
      raise exception 'Une facture naît en brouillon : le numéro légal est attribué à l''émission.';
    end if;
    new.numero := null; new.annee_numero := null; new.rang := null;
    new.total_ht_centimes := null; new.total_tva_centimes := null; new.total_ttc_centimes := null;
    new.vendeur := null; new.acheteur := null; new.emise_le := null;
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_emission);
    return new;
  end if;

  -- UPDATE
  if old.statut = 'emise' then
    raise exception 'Document % émis : il ne se modifie plus. Pour le corriger, prépare un avoir.', old.numero;
  end if;
  if new.entite_id is distinct from old.entite_id or new.sens is distinct from old.sens then
    raise exception 'La structure et le sens (facture ou avoir) d''un document ne se modifient pas.';
  end if;
  perform public.verifier_exercice_ouvert(old.entite_id, old.date_emission);
  perform public.verifier_exercice_ouvert(new.entite_id, new.date_emission);

  if new.statut = 'brouillon' then
    -- Un brouillon reste sans numéro, quoi que l'app envoie.
    new.numero := null; new.annee_numero := null; new.rang := null;
    new.total_ht_centimes := null; new.total_tva_centimes := null; new.total_ttc_centimes := null;
    new.vendeur := null; new.acheteur := null; new.emise_le := null;
    return new;
  end if;

  -- Brouillon → émise.
  v_doc := case new.sens when 'facture' then 'la facture' else 'l''avoir' end;
  if new.date_emission is null then
    raise exception 'Indique la date d''émission de %.', v_doc;
  end if;
  select count(*) into v_nb from public.facture_ligne l where l.facture_id = new.id;
  if v_nb = 0 then
    raise exception 'Ajoute au moins une ligne avant d''émettre %.', v_doc;
  end if;
  if new.sens = 'avoir' then
    select * into v_origine from public.facture f where f.id = new.facture_origine_id;
    if not found or v_origine.statut <> 'emise' or v_origine.sens <> 'facture' then
      raise exception 'Un avoir référence une facture émise.';
    end if;
    if v_origine.client_id <> new.client_id then
      raise exception 'Un avoir s''adresse au client de la facture d''origine.';
    end if;
  end if;
  select * into v_param from public.facturation_parametres p where p.entite_id = new.entite_id;
  if not found then
    raise exception 'Renseigne d''abord les paramètres de facturation de la structure.';
  end if;
  select * into v_client from public.client_facturation c where c.id = new.client_id;

  v_serie := case new.sens when 'facture' then 'FAC' else 'AV' end;
  v_annee := extract(year from new.date_emission)::smallint;
  -- Le compteur est verrouillé à partir d'ici jusqu'à la fin de la transaction.
  v_rang := public.prochain_numero_facturation(new.entite_id, v_serie, v_annee);

  -- [09/11/2026] Chronologie : un numéro plus grand ne peut pas porter une
  -- date plus ancienne qu'un document déjà émis de la même série. Contrôlé
  -- APRÈS la prise du verrou, donc sans course entre deux émissions.
  if exists (
    select 1 from public.facture f
    where f.entite_id = new.entite_id and f.sens = new.sens and f.statut = 'emise'
      and f.date_emission > new.date_emission
  ) then
    raise exception 'Un document de la même série est déjà émis à une date postérieure : la numérotation doit suivre l''ordre des dates.';
  end if;

  select t.total_ht, t.total_tva into v_ht, v_tva from public.totaux_facture(new.id) t;
  if v_ht + v_tva <= 0 then
    raise exception 'Le total de % doit être supérieur à 0.', v_doc;
  end if;
  if new.sens = 'avoir' then
    select coalesce(sum(f.total_ttc_centimes), 0) into v_deja
    from public.facture f
    where f.facture_origine_id = v_origine.id and f.sens = 'avoir' and f.statut = 'emise';
    if v_deja + v_ht + v_tva > v_origine.total_ttc_centimes then
      raise exception 'Les avoirs dépasseraient le montant de la facture %.', v_origine.numero;
    end if;
  end if;

  new.annee_numero := v_annee;
  new.rang := v_rang;
  new.numero := public.formater_numero_facturation(v_serie, v_annee, v_rang, 4);
  new.total_ht_centimes := v_ht;
  new.total_tva_centimes := v_tva;
  new.total_ttc_centimes := v_ht + v_tva;
  new.vendeur := to_jsonb(v_param) - 'entite_id' - 'cree_le' - 'modifie_le';
  new.acheteur := to_jsonb(v_client) - 'entite_id' - 'cree_le' - 'modifie_le' - 'commentaire';
  new.emise_le := now();
  return new;
end;
$$;

-- 8.4 Lignes de facture : seulement sur un brouillon, verrou de clôture sur
-- la date d'émission prévue. Facture introuvable = suppression en cascade.
create or replace function public.controle_facture_ligne()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_f public.facture;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    select * into v_f from public.facture f where f.id = old.facture_id;
    if found then
      if v_f.statut <> 'brouillon' then
        raise exception 'Document % émis : ses lignes ne se modifient plus.', v_f.numero;
      end if;
      perform public.verifier_exercice_ouvert(v_f.entite_id, v_f.date_emission);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select * into v_f from public.facture f where f.id = new.facture_id;
    if found then
      if v_f.statut <> 'brouillon' then
        raise exception 'Document % émis : ses lignes ne se modifient plus.', v_f.numero;
      end if;
      perform public.verifier_exercice_ouvert(v_f.entite_id, v_f.date_emission);
    end if;
    return new;
  end if;
  return old;
end;
$$;

-- 8.5 Devis : numérotation à l'insertion, cycle de vie, clôture.
--   brouillon → envoyé ; envoyé → brouillon, accepté, refusé.
--   Contenu modifiable en brouillon et envoyé seulement.
--   Accepté : seul facture_id change (transformation en facture, ou retour
--   à NULL si la facture brouillon est supprimée). Refusé : figé.
-- [09/11/2026] Clôture : le contenu suit date_devis (ancienne et nouvelle) ;
-- un simple changement de cycle de vie (envoi, acceptation, refus) est daté
-- de son propre jour : on contrôle alors la date d'acceptation si elle
-- existe, comme le règlement d'une note de frais (sql/12).
create or replace function public.controle_devis()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rang     integer;
  v_contenu_change boolean;
begin
  if tg_op = 'DELETE' then
    if public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    if old.statut <> 'brouillon' then
      raise exception 'Devis % : seul un brouillon se supprime.', old.numero;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_devis);
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.statut <> 'brouillon' or new.facture_id is not null then
      raise exception 'Un devis naît en brouillon, sans facture liée.';
    end if;
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_devis);
    new.annee_numero := extract(year from new.date_devis)::smallint;
    v_rang := public.prochain_numero_facturation(new.entite_id, 'DEV', new.annee_numero);
    new.rang := v_rang;
    new.numero := public.formater_numero_facturation('DEV', new.annee_numero, v_rang, 3);
    return new;
  end if;

  -- UPDATE
  if (new.entite_id, new.numero, new.annee_numero, new.rang)
     is distinct from (old.entite_id, old.numero, old.annee_numero, old.rang) then
    raise exception 'Le numéro et la structure d''un devis ne se modifient pas.';
  end if;

  -- Seul le lien vers la facture change (transformation, ou facture supprimée).
  if (to_jsonb(new) - 'facture_id' - 'modifie_le') = (to_jsonb(old) - 'facture_id' - 'modifie_le') then
    if new.facture_id is distinct from old.facture_id then
      if old.statut <> 'accepte' then
        raise exception 'Devis % : seul un devis accepté se transforme en facture.', old.numero;
      end if;
      if old.facture_id is not null and new.facture_id is not null then
        raise exception 'Devis % : il a déjà été transformé en facture.', old.numero;
      end if;
    end if;
    return new;
  end if;

  if old.statut in ('accepte', 'refuse') then
    raise exception 'Devis % % : il ne se modifie plus.', old.numero,
      case old.statut when 'accepte' then 'accepté' else 'refusé' end;
  end if;
  if new.facture_id is distinct from old.facture_id then
    raise exception 'Devis % : le lien vers la facture se pose seul, sur un devis accepté.', old.numero;
  end if;

  if new.statut <> old.statut and not (
       (old.statut = 'brouillon' and new.statut = 'envoye')
    or (old.statut = 'envoye' and new.statut in ('brouillon', 'accepte', 'refuse'))
  ) then
    raise exception 'Changement de statut refusé pour le devis %.', old.numero;
  end if;

  v_contenu_change := (to_jsonb(new) - 'statut' - 'date_acceptation' - 'signataire_accord' - 'modifie_le')
                      <> (to_jsonb(old) - 'statut' - 'date_acceptation' - 'signataire_accord' - 'modifie_le');
  if new.statut in ('accepte', 'refuse') and v_contenu_change then
    raise exception 'Devis % : l''acceptation ou le refus ne modifie pas le contenu du devis.', old.numero;
  end if;

  if v_contenu_change or (new.statut in ('brouillon', 'envoye') and old.statut = new.statut) then
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_devis);
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_devis);
  elsif new.date_acceptation is not null then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_acceptation);
  end if;
  return new;
end;
$$;

-- 8.6 Lignes de devis : brouillon ou envoyé seulement ; clôture sur date_devis.
create or replace function public.controle_devis_ligne()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_d public.devis;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    select * into v_d from public.devis d where d.id = old.devis_id;
    if found then
      if v_d.statut not in ('brouillon', 'envoye') then
        raise exception 'Devis % : ses lignes ne se modifient plus.', v_d.numero;
      end if;
      perform public.verifier_exercice_ouvert(v_d.entite_id, v_d.date_devis);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select * into v_d from public.devis d where d.id = new.devis_id;
    if found then
      if v_d.statut not in ('brouillon', 'envoye') then
        raise exception 'Devis % : ses lignes ne se modifient plus.', v_d.numero;
      end if;
      perform public.verifier_exercice_ouvert(v_d.entite_id, v_d.date_devis);
    end if;
    return new;
  end if;
  return old;
end;
$$;

-- 8.7 Encaissements : facture émise (sens facture), recette réelle hors
-- virement, somme affectée ≤ TTC de la facture et ≤ montant de l'opération.
-- Un rattachement ne se modifie pas : on le retire et on le refait.
-- [09/11/2026] Les deux lignes (facture, opération) sont verrouillées
-- (« for update ») avant de sommer : deux rattachements simultanés ne
-- peuvent pas dépasser ensemble. Clôture : date de l'OPÉRATION bancaire
-- (une facture de décembre se paie en janvier, après la clôture).
create or replace function public.controle_facture_paiement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_f      public.facture;
  v_t      public.transaction;
  v_somme  bigint;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Un encaissement rattaché ne se modifie pas : retire-le puis rattache-le à nouveau.';
  end if;
  if tg_op = 'DELETE' then
    if public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    select * into v_t from public.transaction t where t.id = old.transaction_id;
    perform public.verifier_exercice_ouvert(old.entite_id, v_t.date_transaction);
    return old;
  end if;

  -- Lien vers une autre structure : même réponse qu'une ligne absente (la FK
  -- composite le refuserait aussi, mais ce trigger passe avant elle).
  select * into v_f from public.facture f where f.id = new.facture_id for update;
  if not found or v_f.entite_id <> new.entite_id then
    raise exception 'Facture introuvable dans cette structure.';
  end if;
  if v_f.statut <> 'emise' or v_f.sens <> 'facture' then
    raise exception 'Un encaissement se rattache à une facture émise (pas à un brouillon ni à un avoir).';
  end if;
  select * into v_t from public.transaction t where t.id = new.transaction_id for update;
  if not found or v_t.entite_id <> new.entite_id then
    raise exception 'Opération introuvable dans cette structure.';
  end if;
  if v_t.type <> 'recette' or v_t.virement_id is not null then
    raise exception 'Seule une recette réelle (hors virement interne) encaisse une facture.';
  end if;
  perform public.verifier_exercice_ouvert(new.entite_id, v_t.date_transaction);

  select coalesce(sum(p.montant_centimes), 0) into v_somme from public.facture_paiement p where p.facture_id = new.facture_id;
  if v_somme + new.montant_centimes > v_f.total_ttc_centimes then
    raise exception 'Encaissement refusé : la somme affectée dépasserait le TTC de la facture %.', v_f.numero;
  end if;
  select coalesce(sum(p.montant_centimes), 0) into v_somme from public.facture_paiement p where p.transaction_id = new.transaction_id;
  if v_somme + new.montant_centimes > v_t.montant_ttc_centimes then
    raise exception 'Encaissement refusé : le montant affecté dépasse ce qui reste de l''opération.';
  end if;
  return new;
end;
$$;

-- 8.8 Une opération qui encaisse une facture garde son sens et un montant au
-- moins égal à ce qui est affecté (sinon la facture serait « payée » par de
-- l'argent qui n'existe plus).
create or replace function public.controle_transaction_encaissement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_affecte bigint;
begin
  select coalesce(sum(p.montant_centimes), 0) into v_affecte
  from public.facture_paiement p where p.transaction_id = old.id;
  if v_affecte > 0 and (new.type <> 'recette' or new.virement_id is not null or new.montant_ttc_centimes < v_affecte) then
    raise exception 'Cette opération encaisse une ou plusieurs factures : retire d''abord le rattachement avant de changer son sens ou de baisser son montant.';
  end if;
  return new;
end;
$$;

-- 8.9 Client : message clair avant le refus de la clé étrangère.
create or replace function public.controle_client_facturation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.structure_en_suppression(old.entite_id) then
    return old;
  end if;
  if exists (select 1 from public.facture f where f.client_id = old.id and f.statut = 'emise') then
    raise exception 'Ce client figure sur une facture émise : il ne se supprime pas.';
  end if;
  if exists (select 1 from public.facture f where f.client_id = old.id)
     or exists (select 1 from public.devis d where d.client_id = old.id) then
    raise exception 'Ce client figure sur des devis ou des brouillons : supprime-les d''abord.';
  end if;
  return old;
end;
$$;

create trigger facture_controle
  before insert or update or delete on public.facture
  for each row execute function public.controle_facture();

create trigger facture_maj_modifie_le
  before update on public.facture
  for each row execute function public.maj_modifie_le();

create trigger facture_ligne_controle
  before insert or update or delete on public.facture_ligne
  for each row execute function public.controle_facture_ligne();

create trigger facture_ligne_maj_modifie_le
  before update on public.facture_ligne
  for each row execute function public.maj_modifie_le();

create trigger devis_controle
  before insert or update or delete on public.devis
  for each row execute function public.controle_devis();

create trigger devis_maj_modifie_le
  before update on public.devis
  for each row execute function public.maj_modifie_le();

create trigger devis_ligne_controle
  before insert or update or delete on public.devis_ligne
  for each row execute function public.controle_devis_ligne();

create trigger devis_ligne_maj_modifie_le
  before update on public.devis_ligne
  for each row execute function public.maj_modifie_le();

create trigger facture_paiement_controle
  before insert or update or delete on public.facture_paiement
  for each row execute function public.controle_facture_paiement();

create trigger transaction_controle_encaissement
  before update on public.transaction
  for each row execute function public.controle_transaction_encaissement();

create trigger client_facturation_controle
  before delete on public.client_facturation
  for each row execute function public.controle_client_facturation();

create trigger client_facturation_maj_modifie_le
  before update on public.client_facturation
  for each row execute function public.maj_modifie_le();

create trigger facturation_parametres_maj_modifie_le
  before update on public.facturation_parametres
  for each row execute function public.maj_modifie_le();

-- ============================================================================
-- 9. RLS et GRANT
-- ----------------------------------------------------------------------------
-- Modèle de la 09 et de la 12 : lecture pour tout membre, écriture pour
-- propriétaire et trésorier. Sans GRANT, Postgres refuse avant la RLS. Rien
-- pour anon. Le compteur n'a ni règle ni droit : seuls les triggers l'écrivent.
-- ============================================================================
alter table public.facturation_parametres enable row level security;
alter table public.client_facturation     enable row level security;
alter table public.facturation_compteur   enable row level security;
alter table public.facture                enable row level security;
alter table public.facture_ligne          enable row level security;
alter table public.devis                  enable row level security;
alter table public.devis_ligne            enable row level security;
alter table public.facture_paiement       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['facturation_parametres', 'client_facturation', 'facture', 'facture_ligne',
                           'devis', 'devis_ligne', 'facture_paiement'] loop
    execute format('create policy %I on public.%I for select using (public.peut_lire_entite(entite_id))',
                   t || ': lecture membres', t);
    execute format('create policy %I on public.%I for insert with check (public.peut_ecrire_entite(entite_id))',
                   t || ': ajout tresorier', t);
    execute format('create policy %I on public.%I for update using (public.peut_ecrire_entite(entite_id)) with check (public.peut_ecrire_entite(entite_id))',
                   t || ': modification tresorier', t);
    execute format('create policy %I on public.%I for delete using (public.peut_ecrire_entite(entite_id))',
                   t || ': suppression tresorier', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

revoke all on public.facturation_compteur from public, anon, authenticated;

revoke all on function
  public.totaux_facture(uuid),
  public.formater_numero_facturation(text, smallint, integer, integer),
  public.prochain_numero_facturation(uuid, text, smallint),
  public.controle_facture(),
  public.controle_facture_ligne(),
  public.controle_devis(),
  public.controle_devis_ligne(),
  public.controle_facture_paiement(),
  public.controle_transaction_encaissement(),
  public.controle_client_facturation()
from public, anon, authenticated;

commit;

-- Vérification : 4 règles par table, droits pour authenticated, aucun pour anon,
-- aucun droit sur le compteur.
select t,
       has_table_privilege('authenticated', t, 'select') as authenticated_select,
       has_table_privilege('authenticated', t, 'insert') as authenticated_insert,
       has_table_privilege('anon', t, 'select')          as anon_select,
       (select count(*) from pg_policies p where 'public.' || p.tablename = t) as policies
from unnest(array['public.facturation_parametres', 'public.client_facturation', 'public.facture', 'public.facture_ligne',
                  'public.devis', 'public.devis_ligne', 'public.facture_paiement', 'public.facturation_compteur']) as t;

-- ============================================================================
-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- drop trigger if exists transaction_controle_encaissement on public.transaction;
-- drop table public.facture_paiement;   -- emporte triggers, règles et droits
-- drop table public.devis_ligne;
-- drop table public.devis;
-- drop table public.facture_ligne;
-- drop table public.facture;
-- drop table public.client_facturation;
-- drop table public.facturation_compteur;
-- drop table public.facturation_parametres;
-- drop function public.controle_client_facturation(), public.controle_transaction_encaissement(),
--   public.controle_facture_paiement(), public.controle_devis_ligne(), public.controle_devis(),
--   public.controle_facture_ligne(), public.controle_facture(),
--   public.prochain_numero_facturation(uuid, text, smallint),
--   public.formater_numero_facturation(text, smallint, integer, integer),
--   public.totaux_facture(uuid);
-- commit;
-- ============================================================================
