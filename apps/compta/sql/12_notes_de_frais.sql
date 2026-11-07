-- ============================================================================
-- VELITO COMPTA — Migration 12 : notes de frais et indemnités kilométriques (07/11/2026)
-- ----------------------------------------------------------------------------
-- Réversible : bloc DOWN en bas du fichier. Prérequis : 01 à 10 (fonctions
-- peut_lire_entite / peut_ecrire_entite de la 09, verifier_exercice_ouvert et
-- structure_en_suppression de la 10, maj_modifie_le de la 01).
--
-- Règles (cahier des charges « Gestion Compta Nova » d'un trésorier, plus le
-- cas réel de VEA : des tickets importés sans compte, payés par un membre) :
--
--   1. Note de frais = un bénéficiaire (nom libre), un objet, une date, un
--      numéro NDF-AAAA-NNN unique par structure, attribué PAR LA BASE, et des
--      lignes. Statuts : brouillon, à vérifier, validée, remboursée, refusée,
--      abandonnée.
--   2. Une ligne = date, libellé, catégorie, montant TTC. Elle peut être liée
--      à une opération déjà saisie (ticket importé avec un compte inconnu).
--      Aucun calcul kilométrique dans une note : carburant et péages sont des
--      dépenses sur justificatif.
--   3. Les IK sont une table à part (trajet_ik). Montant = km × taux, arrondi
--      au centime, PAR TRAJET. Le taux est TOUJOURS saisi par l'association.
--      Le retour n'est jamais doublé : la distance saisie est la distance
--      réellement parcourue ; la case aller_retour est informative.
--      Un trajet rattaché à une note y devient une ligne d'origine « ik ».
--   4. Pas de double comptage : la dépense, c'est le ticket. Le virement qui
--      rembourse le membre n'est PAS une seconde dépense : c'est un virement
--      interne compte courant → compte « Avances des membres » (géré par
--      l'app, avec les tables existantes). Ici, la base garde la trace du
--      règlement (opération bancaire réelle + identifiant du virement).
--   5. Abandon : date de la renonciation écrite + fiche contribution_nature
--      « frais_abandonnes ». Aucun encaissement fictif.
--   6. Une note remboursée ou abandonnée ne se modifie plus (trigger) : on
--      prépare une correction (nouveau brouillon, colonne correction_de).
--   7. Clôture : les trois tables sont datées, leurs écritures sont refusées
--      sur un exercice clôturé (ancienne ET nouvelle date, comme la 10).
-- ============================================================================

begin;

-- ============================================================================
-- 0. Supports des FK composites anti-fuite
-- ----------------------------------------------------------------------------
-- [07/11/2026] Une FK composite (x_id, entite_id) exige un unique (id,
-- entite_id) sur la table visée. categorie et compte_tresorerie l'ont déjà ;
-- transaction et contribution_nature non. id étant déjà unique, ces
-- contraintes ne dédoublonnent rien : elles servent de support.
-- ============================================================================
alter table public.transaction
  add constraint transaction_id_entite_unique unique (id, entite_id);
alter table public.contribution_nature
  add constraint contribution_nature_id_entite_unique unique (id, entite_id);

-- ============================================================================
-- 1. Compteur de numéros (interne, jamais exposé)
-- ----------------------------------------------------------------------------
-- [07/11/2026] Une ligne par (structure, année). Le trigger d'insertion fait
-- « insert ... on conflict do update set dernier = dernier + 1 returning » :
-- la ligne du compteur est VERROUILLÉE jusqu'à la fin de la transaction. Deux
-- créations simultanées s'attendent donc l'une l'autre et reçoivent deux
-- numéros différents. Si la création échoue (droit refusé, CHECK), tout est
-- annulé, compteur compris : pas de trou dû à un échec. Un max()+1 calculé
-- par l'app, lui, donnerait deux fois le même numéro.
-- ============================================================================
create table public.note_frais_compteur (
  entite_id  uuid not null references public.entite (id) on delete cascade,
  annee      smallint not null check (annee between 2000 and 2100),
  dernier    integer not null check (dernier > 0),
  primary key (entite_id, annee)
);

comment on table public.note_frais_compteur is
  'Dernier numéro de note de frais attribué par structure et par année. Écrit uniquement par le trigger de numérotation.';

-- ============================================================================
-- 2. TABLE note_frais
-- ============================================================================
create table public.note_frais (
  id                            uuid primary key default gen_random_uuid(),
  entite_id                     uuid not null references public.entite (id) on delete cascade,
  -- Attribués par le trigger note_frais_numerotation (toute valeur envoyée
  -- par l'app est écrasée), puis immuables.
  numero                        text not null,
  annee_numero                  smallint not null,
  rang                          integer not null check (rang > 0),
  -- La personne qui a avancé l'argent (nom libre : pas forcément un compte).
  beneficiaire                  text not null check (char_length(trim(beneficiaire)) between 1 and 120),
  objet                         text not null check (char_length(trim(objet)) between 1 and 200),
  date_note                     date not null,
  statut                        text not null default 'brouillon'
                                check (statut in ('brouillon', 'a_verifier', 'validee', 'remboursee', 'refusee', 'abandonnee')),
  motif_refus                   text check (motif_refus is null or char_length(trim(motif_refus)) between 3 and 500),
  -- Abandon : date de la renonciation écrite et fiche de contribution créée.
  date_renonciation             date,
  contribution_id               uuid,
  -- Remboursement : l'opération bancaire RÉELLE (importée du relevé) et
  -- l'identifiant du virement interne qu'elle est devenue.
  transaction_remboursement_id  uuid,
  virement_id                   uuid,
  -- Note d'origine quand celle-ci est une correction.
  correction_de                 uuid,
  commentaire                   text check (commentaire is null or char_length(commentaire) <= 1000),
  cree_le                       timestamptz not null default now(),
  modifie_le                    timestamptz not null default now(),

  unique (id, entite_id),
  constraint note_frais_numero_unique unique (entite_id, numero),
  constraint note_frais_rang_unique unique (entite_id, annee_numero, rang),
  constraint note_frais_numero_format check (numero ~ '^NDF-[0-9]{4}-[0-9]{3,}$'),
  constraint note_frais_refus_motive check (statut <> 'refusee' or motif_refus is not null),
  -- Pas de « remboursée » sans opération bancaire réelle : jamais de paiement fictif.
  constraint note_frais_remboursement_reel check (
    statut <> 'remboursee' or (transaction_remboursement_id is not null and virement_id is not null)
  ),
  constraint note_frais_abandon_complet check (
    statut <> 'abandonnee' or (date_renonciation is not null and contribution_id is not null)
  ),
  constraint note_frais_correction_pas_elle_meme check (correction_de is null or correction_de <> id),

  -- FK composites : tout lien reste DANS la structure de la note.
  -- Sans « on delete » : supprimer l'opération de remboursement ou la fiche
  -- de don d'une note réglée est refusé (la preuve du règlement reste).
  constraint note_frais_remboursement_meme_entite
    foreign key (transaction_remboursement_id, entite_id) references public.transaction (id, entite_id),
  constraint note_frais_contribution_meme_entite
    foreign key (contribution_id, entite_id) references public.contribution_nature (id, entite_id),
  constraint note_frais_correction_meme_entite
    foreign key (correction_de, entite_id) references public.note_frais (id, entite_id)
);

comment on table public.note_frais is
  'Notes de frais (avances d''un membre). Numéro NDF-AAAA-NNN attribué par la base. Remboursée = opération bancaire réelle liée.';

create index idx_note_frais_entite_date on public.note_frais (entite_id, date_note desc);

-- ============================================================================
-- 3. TABLE trajet_ik (avant les lignes, qui la référencent)
-- ============================================================================
create table public.trajet_ik (
  id                    uuid primary key default gen_random_uuid(),
  entite_id             uuid not null references public.entite (id) on delete cascade,
  beneficiaire          text not null check (char_length(trim(beneficiaire)) between 1 and 120),
  date_trajet           date not null,
  depart                text not null check (char_length(trim(depart)) between 1 and 120),
  arrivee               text not null check (char_length(trim(arrivee)) between 1 and 120),
  motif                 text not null check (char_length(trim(motif)) between 1 and 200),
  -- Distance RÉELLEMENT parcourue (le retour compris s'il a été fait).
  distance_km           numeric(8, 2) not null check (distance_km > 0 and distance_km <= 100000),
  -- Informatif seulement : la base ne multiplie JAMAIS la distance par 2.
  aller_retour          boolean not null default false,
  -- [07/11/2026] Taux saisi par l'association, en dix-millièmes d'euro par km
  -- (0,6360 €/km = 6360) : un entier, aucun flottant. Pas de défaut, pas de
  -- barème : la colonne est obligatoire et sans valeur par défaut.
  taux_km_dixmillimes   integer not null check (taux_km_dixmillimes > 0 and taux_km_dixmillimes <= 100000),
  montant_centimes      bigint not null check (montant_centimes > 0),
  commentaire           text check (commentaire is null or char_length(commentaire) <= 1000),
  cree_le               timestamptz not null default now(),
  modifie_le            timestamptz not null default now(),
  unique (id, entite_id),
  -- [07/11/2026] Double barrière : l'app calcule le montant (lib/services/ik),
  -- la base vérifie qu'il vaut bien km × taux arrondi au centime. km × dix-
  -- millièmes / 100 = centimes ; round() sur un numeric arrondit le demi vers
  -- le haut pour un positif, comme le service.
  constraint trajet_ik_montant_calcule
    check (montant_centimes = round(distance_km * taux_km_dixmillimes / 100))
);

comment on table public.trajet_ik is
  'Indemnités kilométriques : un trajet, sa distance réelle, le taux saisi, le montant arrondi par trajet.';

create index idx_trajet_ik_entite_date on public.trajet_ik (entite_id, date_trajet desc);

-- ============================================================================
-- 4. TABLE note_frais_ligne
-- ============================================================================
create table public.note_frais_ligne (
  id                    uuid primary key default gen_random_uuid(),
  entite_id             uuid not null references public.entite (id) on delete cascade,
  note_id               uuid not null,
  -- saisie : ligne libre ; operation : liée à une opération déjà en compta ;
  -- ik : un trajet rattaché.
  origine               text not null default 'saisie' check (origine in ('saisie', 'operation', 'ik')),
  date_depense          date not null,
  libelle               text not null check (char_length(trim(libelle)) between 1 and 255),
  -- Nullable en brouillon ; exigée par l'app pour valider.
  categorie_id          uuid,
  montant_ttc_centimes  bigint not null check (montant_ttc_centimes > 0),
  -- Opération liée (origine operation) ou créée à la validation (saisie, ik).
  transaction_id        uuid,
  trajet_id             uuid,
  cree_le               timestamptz not null default now(),
  modifie_le            timestamptz not null default now(),

  constraint ligne_origine_coherente check (
    ((origine = 'ik') = (trajet_id is not null))
    and (origine <> 'operation' or transaction_id is not null)
  ),
  constraint ligne_note_meme_entite
    foreign key (note_id, entite_id) references public.note_frais (id, entite_id) on delete cascade,
  constraint ligne_categorie_meme_entite
    foreign key (categorie_id, entite_id) references public.categorie (id, entite_id),
  -- Opération supprimée : la ligne part avec elle (refusé par le trigger si
  -- la note est déjà validée, ce qui protège les dépenses d'une note réglée).
  constraint ligne_transaction_meme_entite
    foreign key (transaction_id, entite_id) references public.transaction (id, entite_id) on delete cascade,
  constraint ligne_trajet_meme_entite
    foreign key (trajet_id, entite_id) references public.trajet_ik (id, entite_id)
);

comment on table public.note_frais_ligne is
  'Lignes d''une note de frais. Total = somme des lignes (jamais stocké). Liens vers une opération ou un trajet IK.';

create index idx_note_frais_ligne_note on public.note_frais_ligne (note_id, entite_id);
create index idx_note_frais_ligne_transaction on public.note_frais_ligne (transaction_id) where transaction_id is not null;
create index idx_note_frais_ligne_trajet on public.note_frais_ligne (trajet_id) where trajet_id is not null;

-- ============================================================================
-- 5. FONCTIONS ET TRIGGERS
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER + search_path vide, comme la 10 : les contrôles lisent le
-- statut des notes et le compteur sans dépendre de la RLS.
-- ============================================================================

-- 5.0 Libellé affiché d'un statut (les messages d'erreur remontent tels
-- quels à l'écran : pas de « validee » brut).
create or replace function public.libelle_statut_note(p_statut text)
returns text language sql immutable set search_path = '' as $$
  select case p_statut
    when 'brouillon'  then 'brouillon'
    when 'a_verifier' then 'à vérifier'
    when 'validee'    then 'validée'
    when 'remboursee' then 'remboursée'
    when 'refusee'    then 'refusée'
    when 'abandonnee' then 'abandonnée'
    else p_statut
  end;
$$;

-- 5.1 Numérotation à l'insertion.
create or replace function public.numeroter_note_frais()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_annee smallint;
  v_rang  integer;
begin
  v_annee := extract(year from new.date_note)::smallint;
  insert into public.note_frais_compteur as c (entite_id, annee, dernier)
  values (new.entite_id, v_annee, 1)
  on conflict (entite_id, annee) do update set dernier = c.dernier + 1
  returning c.dernier into v_rang;

  new.annee_numero := v_annee;
  new.rang := v_rang;
  -- [07/11/2026] lpad TRONQUE une chaîne plus longue que la largeur demandée
  -- (lpad('1000', 3) = '100') : au-delà de 999, on écrit le rang tel quel.
  new.numero := 'NDF-' || v_annee::text || '-' ||
                case when v_rang < 1000 then lpad(v_rang::text, 3, '0') else v_rang::text end;
  return new;
end;
$$;

-- 5.2 Cycle de vie d'une note (double barrière du service notes-de-frais).
--   brouillon  → à vérifier
--   à vérifier → brouillon, validée, refusée
--   validée    → remboursée, abandonnée
--   remboursée, abandonnée, refusée : plus rien ne change.
-- Modifier l'en-tête sans changer de statut : brouillon et à vérifier seulement.
create or replace function public.controle_note_frais()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    if old.statut in ('validee', 'remboursee', 'abandonnee') then
      raise exception 'Note % : une note validée, remboursée ou abandonnée ne se supprime pas.', old.numero;
    end if;
    return old;
  end if;

  if (new.entite_id, new.numero, new.annee_numero, new.rang)
     is distinct from (old.entite_id, old.numero, old.annee_numero, old.rang) then
    raise exception 'Le numéro et la structure d''une note de frais ne se modifient pas.';
  end if;

  if old.statut in ('remboursee', 'abandonnee', 'refusee') then
    raise exception 'Note % % : elle ne se modifie plus. Prépare une correction.', old.numero,
      public.libelle_statut_note(old.statut);
  end if;

  if new.statut = old.statut then
    if old.statut not in ('brouillon', 'a_verifier') then
      raise exception 'Note % validée : seuls le remboursement ou l''abandon sont possibles.', old.numero;
    end if;
    return new;
  end if;

  if not (
       (old.statut = 'brouillon'  and new.statut = 'a_verifier')
    or (old.statut = 'a_verifier' and new.statut in ('brouillon', 'validee', 'refusee'))
    or (old.statut = 'validee'    and new.statut in ('remboursee', 'abandonnee'))
  ) then
    raise exception 'Changement de statut refusé pour la note % (de « % » vers « % »).', old.numero,
      public.libelle_statut_note(old.statut), public.libelle_statut_note(new.statut);
  end if;

  -- Au règlement, seuls le statut et les champs du règlement changent.
  if new.statut in ('remboursee', 'abandonnee')
     and (new.beneficiaire, new.objet, new.date_note, new.correction_de)
         is distinct from (old.beneficiaire, old.objet, old.date_note, old.correction_de) then
    raise exception 'Note % : le règlement ne modifie pas le contenu de la note.', old.numero;
  end if;
  return new;
end;
$$;

-- 5.3 Verrou de clôture sur note_frais.
-- [07/11/2026] Ancienne ET nouvelle date_note, comme la 10. Exception
-- motivée : le RÈGLEMENT d'une note (validée → remboursée ou abandonnée) est
-- un événement daté de son propre jour, pas de celui de la note. Une note de
-- décembre 2026 remboursée en janvier 2027 doit pouvoir l'être après la
-- clôture de 2026. Le contenu, lui, est figé par controle_note_frais ; on
-- contrôle alors la date du règlement : celle de l'opération bancaire
-- (dont le propre verrou s'applique aussi) ou celle de la renonciation.
create or replace function public.verrou_exercice_note_frais()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_date date;
begin
  if tg_op = 'UPDATE' and old.statut = 'validee' and new.statut in ('remboursee', 'abandonnee') then
    if new.statut = 'remboursee' then
      select t.date_transaction into v_date
      from public.transaction t where t.id = new.transaction_remboursement_id;
    else
      v_date := new.date_renonciation;
    end if;
    perform public.verifier_exercice_ouvert(new.entite_id, v_date);
    return new;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_note);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_note);
    return new;
  end if;
  return old;
end;
$$;

-- 5.4 Lignes : verrou de clôture, note modifiable, lien unique.
-- Une ligne ne change que si sa note est en brouillon ou à vérifier (la
-- validation écrit les liens vers les opérations AVANT de passer la note en
-- « validée »). Note introuvable = elle est en cours de suppression
-- (cascade) : son propre trigger a déjà tranché.
-- Une opération ou un trajet ne peut servir qu'à UNE note non refusée : les
-- lignes d'une note refusée ne comptent plus, on peut les reprendre.
create or replace function public.controle_note_frais_ligne()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_statut text;
  v_numero text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_depense);
    select n.statut, n.numero into v_statut, v_numero from public.note_frais n where n.id = old.note_id;
    if found and v_statut not in ('brouillon', 'a_verifier') then
      raise exception 'Note % : ses lignes ne se modifient plus (statut « % »).', v_numero, public.libelle_statut_note(v_statut);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_depense);
    select n.statut, n.numero into v_statut, v_numero from public.note_frais n where n.id = new.note_id;
    if found and v_statut not in ('brouillon', 'a_verifier') then
      raise exception 'Note % : ses lignes ne se modifient plus (statut « % »).', v_numero, public.libelle_statut_note(v_statut);
    end if;
    if new.transaction_id is not null and exists (
      select 1 from public.note_frais_ligne l
      join public.note_frais n on n.id = l.note_id
      where l.transaction_id = new.transaction_id and l.id <> new.id and n.statut <> 'refusee'
    ) then
      raise exception 'Cette opération figure déjà dans une autre note de frais.';
    end if;
    if new.trajet_id is not null and exists (
      select 1 from public.note_frais_ligne l
      join public.note_frais n on n.id = l.note_id
      where l.trajet_id = new.trajet_id and l.id <> new.id and n.statut <> 'refusee'
    ) then
      raise exception 'Ce trajet est déjà rattaché à une autre note de frais.';
    end if;
    return new;
  end if;
  return old;
end;
$$;

-- 5.5 Trajets : verrou de clôture, et trajet figé dès que sa note est validée.
create or replace function public.controle_trajet_ik()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' and public.structure_en_suppression(old.entite_id) then
      return old;
    end if;
    perform public.verifier_exercice_ouvert(old.entite_id, old.date_trajet);
    if exists (
      select 1 from public.note_frais_ligne l join public.note_frais n on n.id = l.note_id
      where l.trajet_id = old.id and n.statut in ('validee', 'remboursee', 'abandonnee')
    ) then
      raise exception 'Ce trajet figure dans une note validée : il ne se modifie plus.';
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.verifier_exercice_ouvert(new.entite_id, new.date_trajet);
    return new;
  end if;
  return old;
end;
$$;

-- 5.6 [07/11/2026] Trajet modifié : sa ligne IK (note en brouillon ou à
-- vérifier) suit, dans la même transaction. Les lignes d'une note refusée
-- restent telles quelles (historique).
create or replace function public.synchroniser_ligne_ik()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.note_frais_ligne l
  set date_depense = new.date_trajet,
      montant_ttc_centimes = new.montant_centimes,
      libelle = left('Trajet ' || new.depart || ' → ' || new.arrivee || ' (' || new.motif || ')', 255)
  from public.note_frais n
  where l.trajet_id = new.id and n.id = l.note_id and n.statut in ('brouillon', 'a_verifier');
  return null;
end;
$$;

create trigger note_frais_numerotation
  before insert on public.note_frais
  for each row execute function public.numeroter_note_frais();

create trigger note_frais_controle
  before update or delete on public.note_frais
  for each row execute function public.controle_note_frais();

create trigger note_frais_verrou_exercice
  before insert or update or delete on public.note_frais
  for each row execute function public.verrou_exercice_note_frais();

create trigger note_frais_maj_modifie_le
  before update on public.note_frais
  for each row execute function public.maj_modifie_le();

create trigger note_frais_ligne_controle
  before insert or update or delete on public.note_frais_ligne
  for each row execute function public.controle_note_frais_ligne();

create trigger note_frais_ligne_maj_modifie_le
  before update on public.note_frais_ligne
  for each row execute function public.maj_modifie_le();

create trigger trajet_ik_controle
  before insert or update or delete on public.trajet_ik
  for each row execute function public.controle_trajet_ik();

create trigger trajet_ik_maj_modifie_le
  before update on public.trajet_ik
  for each row execute function public.maj_modifie_le();

create trigger trajet_ik_synchro_ligne
  after update on public.trajet_ik
  for each row execute function public.synchroniser_ligne_ik();

-- ============================================================================
-- 6. RLS et GRANT
-- ----------------------------------------------------------------------------
-- Modèle de la 09/11 : lecture pour tout membre, écriture pour propriétaire
-- et trésorier. Leçon de la 06/07 : sans GRANT, Postgres refuse avant même
-- la RLS. Rien pour anon. Le compteur n'a ni règle ni droit : seul le
-- trigger (SECURITY DEFINER) l'écrit.
-- ============================================================================
alter table public.note_frais          enable row level security;
alter table public.note_frais_ligne    enable row level security;
alter table public.trajet_ik           enable row level security;
alter table public.note_frais_compteur enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['note_frais', 'note_frais_ligne', 'trajet_ik'] loop
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

revoke all on public.note_frais_compteur from public, anon, authenticated;

revoke all on function
  public.libelle_statut_note(text),
  public.numeroter_note_frais(),
  public.controle_note_frais(),
  public.verrou_exercice_note_frais(),
  public.controle_note_frais_ligne(),
  public.controle_trajet_ik(),
  public.synchroniser_ligne_ik()
from public, anon, authenticated;

commit;

-- Vérification : 4 règles par table, droits pour authenticated, aucun pour anon,
-- aucun droit sur le compteur.
select t,
       has_table_privilege('authenticated', t, 'select') as authenticated_select,
       has_table_privilege('authenticated', t, 'insert') as authenticated_insert,
       has_table_privilege('anon', t, 'select')          as anon_select,
       (select count(*) from pg_policies p where 'public.' || p.tablename = t) as policies
from unnest(array['public.note_frais', 'public.note_frais_ligne', 'public.trajet_ik', 'public.note_frais_compteur']) as t;

-- ============================================================================
-- DOWN (annulation), à lancer seulement si besoin :
-- begin;
-- drop table public.note_frais_ligne;   -- emporte triggers, règles et droits
-- drop table public.trajet_ik;
-- drop table public.note_frais;
-- drop table public.note_frais_compteur;
-- drop function public.synchroniser_ligne_ik(), public.controle_trajet_ik(),
--   public.controle_note_frais_ligne(), public.verrou_exercice_note_frais(),
--   public.controle_note_frais(), public.numeroter_note_frais(), public.libelle_statut_note(text);
-- alter table public.contribution_nature drop constraint contribution_nature_id_entite_unique;
-- alter table public.transaction drop constraint transaction_id_entite_unique;
-- commit;
-- ============================================================================
