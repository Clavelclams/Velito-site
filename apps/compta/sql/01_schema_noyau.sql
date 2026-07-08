-- ============================================================================
-- VELITO COMPTA — Migration 01 : schéma du noyau (Lot 1)
-- ----------------------------------------------------------------------------
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query
-- Ordre d'exécution : 01_schema_noyau.sql PUIS 02_rls_noyau.sql
--
-- 5 tables : utilisateur, entite, categorie, transaction, justificatif
-- Principe directeur (CDC §5.2) : une transaction appartient à une entité,
-- porte un type, un montant HT/TVA/TTC, une date, une catégorie, et
-- optionnellement un justificatif. Tout le reste se branche sur ce noyau.
-- ============================================================================


-- ============================================================================
-- TABLE 1 : utilisateur
-- ----------------------------------------------------------------------------
-- Rôle : le PROFIL applicatif d'un compte. L'authentification elle-même
-- (email, mot de passe haché, sessions) est gérée par Supabase Auth dans la
-- table auth.users — on ne la recrée PAS (réimplémenter une auth = la source
-- d'erreurs n°1). Cette table prolonge auth.users avec nos données à nous.
--
-- Pourquoi la PK est une FK ? id référence directement auth.users(id) :
-- un profil ne peut pas exister sans compte d'auth, et le même uuid sert
-- partout (c'est lui que renvoie auth.uid() dans les policies RLS).
-- ============================================================================
create table public.utilisateur (
  -- uuid = identifiant universel non devinable (vs un entier auto-incrémenté
  -- qui révèle le nombre de comptes et facilite l'énumération d'URLs).
  id        uuid primary key references auth.users (id) on delete cascade,

  -- Copie de l'email pour l'afficher sans requêter le schéma auth (protégé).
  email     text not null unique,

  -- Nom affiché dans l'interface. Nullable : pas indispensable au démarrage.
  nom_affichage text,

  -- timestamptz = horodatage AVEC fuseau horaire. Toujours timestamptz et
  -- jamais timestamp : stocké en UTC, converti à l'affichage. Évite les bugs
  -- de changement d'heure été/hiver.
  cree_le   timestamptz not null default now()
);

comment on table public.utilisateur is
  'Profil applicatif. 1-pour-1 avec auth.users (Supabase Auth). PK = FK vers auth.users.';

-- Création automatique du profil à l'inscription : quand Supabase Auth insère
-- un compte dans auth.users, ce trigger crée la ligne miroir dans utilisateur.
-- security definer : la fonction s'exécute avec les droits de son créateur
-- (postgres), car l'utilisateur en cours d'inscription n'a pas encore le droit
-- d'écrire dans public.utilisateur. set search_path = '' : oblige à préfixer
-- tous les objets (public.xxx), parade contre le détournement de search_path.
create or replace function public.creer_profil_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = ''
-- DÉFENSIF : ce trigger est sur auth.users, PARTAGÉ par tout Velito (hub, VEA,
-- interactive…). Il se déclenche à CHAQUE inscription. On ne doit JAMAIS pouvoir
-- bloquer un signup : on ignore les doublons et on n'exige rien de plus que id.
as $$
begin
  insert into public.utilisateur (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Trigger sur auth.users PARTAGÉ par tout Velito : il ne doit JAMAIS bloquer
  -- une inscription (ex. signup sans email). On avale toute erreur.
  return new;
end;
$$;

-- drop if exists : rend la migration ré-exécutable (sinon "trigger already exists").
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil_utilisateur();


-- ============================================================================
-- TABLE 2 : entite
-- ----------------------------------------------------------------------------
-- Rôle : une structure juridique gérée dans l'outil (VEA ou VENA aujourd'hui).
-- C'est la clé de voûte du cloisonnement : TOUTE donnée comptable est
-- rattachée à une entité, et les policies RLS (migration 02) filtrent par
-- entité. C'est aussi ce qui rend l'outil multi-tenant dès l'origine.
-- ============================================================================
create table public.entite (
  -- gen_random_uuid() : Postgres génère l'uuid lui-même à l'insertion.
  id               uuid primary key default gen_random_uuid(),

  -- Le propriétaire de l'entité. on delete restrict : on INTERDIT de
  -- supprimer un utilisateur qui possède encore des entités — supprimer un
  -- compte ne doit jamais faire disparaître silencieusement une comptabilité.
  proprietaire_id  uuid not null references public.utilisateur (id) on delete restrict,

  nom              text not null,

  -- Valeur contrainte (CDC §5.3) : un CHECK plutôt que du texte libre.
  -- Utile plus tard : les règles TVA diffèrent entre asso et société.
  type_juridique   text not null check (type_juridique in ('association', 'societe')),

  cree_le          timestamptz not null default now(),

  -- Un même utilisateur ne peut pas avoir deux entités du même nom.
  unique (proprietaire_id, nom)
);

comment on table public.entite is
  'Structure juridique (VEA, VENA...). Toute donnée comptable est cloisonnée par entité.';


-- ============================================================================
-- TABLE 3 : categorie
-- ----------------------------------------------------------------------------
-- Rôle : un poste de recette ou de dépense, PROPRE à une entité (le plan de
-- catégories de l'asso n'est pas celui de la SASU — CDC §3.1).
--
-- Le point technique à défendre : entite_id est présent ICI AUSSI, pas
-- seulement sur transaction. C'est volontairement redondant : c'est ce qui
-- permet (a) le cloisonnement RLS direct et (b) la contrainte composite qui
-- empêche une transaction VEA de pointer vers une catégorie VENA (voir
-- table transaction).
-- ============================================================================
create table public.categorie (
  id         uuid primary key default gen_random_uuid(),

  -- on delete cascade : si une entité est supprimée, ses catégories n'ont
  -- plus aucun sens → suppression en cascade.
  entite_id  uuid not null references public.entite (id) on delete cascade,

  nom        text not null,

  -- Une catégorie classe SOIT des recettes SOIT des dépenses. Évite les
  -- catégories fourre-tout et fiabilise le tableau de bord par catégorie.
  type       text not null check (type in ('recette', 'depense')),

  -- Désactiver une catégorie sans la supprimer : les vieilles transactions
  -- gardent leur classement, mais la catégorie sort des formulaires de saisie.
  -- (Supprimer une catégorie utilisée casserait l'historique comptable.)
  active     boolean not null default true,

  cree_le    timestamptz not null default now(),

  -- Pas deux catégories identiques dans la même entité.
  unique (entite_id, nom, type),

  -- Contrainte "technique" : ne dédoublonne rien (id est déjà unique) mais
  -- crée l'index cible dont la clé étrangère COMPOSITE de transaction a
  -- besoin. Une FK ne peut référencer que des colonnes couvertes par une
  -- contrainte d'unicité.
  unique (id, entite_id)
);

comment on table public.categorie is
  'Plan de catégories PAR entité. unique(id, entite_id) = support de la FK composite anti-fuite inter-entités.';


-- ============================================================================
-- TABLE 4 : transaction  — LE CŒUR DU MODÈLE
-- ----------------------------------------------------------------------------
-- Rôle : une recette ou une dépense. Tout le reste (dashboard, exports,
-- future TVA, futures factures) se branche dessus sans la modifier.
--
-- DÉCISION MONTANTS (à défendre au jury, CDC §4 "Fiabilité des calculs") :
-- les montants sont stockés en CENTIMES, type bigint (entier).
--   - JAMAIS de float/real/double : en binaire, 0.1 n'a pas de représentation
--     exacte. 0.1 + 0.2 = 0.30000000000000004. En comptabilité, des arrondis
--     qui se cumulent = des soldes faux. Éliminatoire.
--   - Pourquoi centimes entiers plutôt que numeric(12,2) ? numeric est exact
--     aussi, MAIS le client JavaScript (supabase-js) renvoie numeric en
--     string pour ne pas perdre de précision — et une addition de strings en
--     JS concatène au lieu d'additionner ("10"+"5"="105"). Un bigint arrive
--     en number JS, exact jusqu'à 2^53 (≈ 90 000 milliards d'euros en
--     centimes : marge confortable). L'entier reste donc fiable DE BOUT EN
--     BOUT, de Postgres jusqu'au navigateur.
--   - La conversion centimes ↔ euros vit à UN SEUL endroit : lib/services/
--     (couche métier), jamais éparpillée dans l'interface.
--
-- DÉCISION HT/TVA/TTC : on ne stocke que 2 des 3 valeurs (TTC et TVA), la
-- 3e (HT) est une COLONNE GÉNÉRÉE : Postgres la calcule et la stocke
-- lui-même (HT = TTC - TVA). Il est physiquement impossible d'avoir une
-- ligne incohérente où HT + TVA ≠ TTC. La cohérence est garantie par la
-- base, pas par la discipline du développeur.
-- ============================================================================
create table public.transaction (
  id                    uuid primary key default gen_random_uuid(),

  -- LA colonne du cloisonnement (CDC §5.3).
  entite_id             uuid not null references public.entite (id) on delete cascade,

  -- Nullable : une ligne importée d'un relevé CSV arrive sans catégorie,
  -- elle est catégorisée ensuite. on ne met PAS de "references" simple ici :
  -- la FK composite en bas de table fait mieux.
  categorie_id          uuid,

  -- Le sens du flux. Valeur contrainte, pas de texte libre (CDC §5.3).
  -- Le montant est TOUJOURS positif ; c'est `type` qui porte le sens.
  -- (Alternative rejetée : montants signés. Un "-" oublié à la saisie
  -- transformerait une dépense en recette sans qu'aucune contrainte ne crie.)
  type                  text not null check (type in ('recette', 'depense')),

  -- Cycle de vie : une saisie manuelle naît 'validee', une ligne importée
  -- d'un CSV naît 'a_verifier' (à catégoriser/confirmer). Extensible plus
  -- tard (ex : 'pointee' lors du rapprochement bancaire) en modifiant le
  -- CHECK — sans toucher aux données existantes.
  statut                text not null default 'validee'
                        check (statut in ('a_verifier', 'validee')),

  -- Type date (sans heure) : une écriture comptable est datée d'un JOUR.
  -- L'heure exacte n'a pas de sens métier ici — elle vit dans cree_le.
  date_transaction      date not null,

  libelle               text not null check (char_length(libelle) between 1 and 255),

  -- Montant TTC en centimes. > 0 : une transaction à zéro n'existe pas.
  montant_ttc_centimes  bigint not null check (montant_ttc_centimes > 0),

  -- TVA en centimes. 0 par défaut : VEA (asso) n'est pas assujettie à la
  -- TVA, et VENA en franchise de base ne facture pas de TVA non plus.
  montant_tva_centimes  bigint not null default 0 check (montant_tva_centimes >= 0),

  -- Colonne générée : calculée par Postgres, non modifiable directement.
  montant_ht_centimes   bigint generated always as
                        (montant_ttc_centimes - montant_tva_centimes) stored,

  -- Horodatage de traçabilité (CDC §5.3) — attendu en contexte comptable.
  cree_le               timestamptz not null default now(),
  modifie_le            timestamptz not null default now(),

  -- La TVA ne peut pas dépasser le TTC (sinon HT négatif).
  constraint tva_coherente check (montant_tva_centimes <= montant_ttc_centimes),

  -- FK COMPOSITE anti-fuite : (categorie_id, entite_id) doit exister DANS
  -- CETTE COMBINAISON dans categorie. Conséquence : une transaction VEA ne
  -- peut référencer qu'une catégorie VEA. Le cloisonnement est garanti par
  -- la structure même de la base, avant même les RLS.
  -- (Si categorie_id est null, la contrainte ne s'applique pas : une
  -- transaction non catégorisée reste valide.)
  constraint categorie_meme_entite
    foreign key (categorie_id, entite_id)
    references public.categorie (id, entite_id)
);

comment on table public.transaction is
  'Cœur du modèle. Montants en centimes (bigint). HT = colonne générée. FK composite = anti-fuite inter-entités.';

-- Mise à jour automatique de modifie_le à chaque UPDATE.
create or replace function public.maj_modifie_le()
returns trigger
language plpgsql
as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

create trigger transaction_maj_modifie_le
  before update on public.transaction
  for each row execute function public.maj_modifie_le();


-- ============================================================================
-- TABLE 5 : justificatif
-- ----------------------------------------------------------------------------
-- Rôle : une pièce jointe (ticket, facture, PDF) rattachée à une transaction.
-- Le FICHIER lui-même vit dans Supabase Storage (bucket privé, Lot 2) ;
-- la base ne stocke que ses métadonnées + son chemin. On ne met JAMAIS de
-- binaire en base : ça la ferait exploser et ruinerait les sauvegardes.
--
-- Relation 1-N : une transaction peut avoir plusieurs justificatifs
-- (ex : ticket + facture détaillée), un justificatif appartient à UNE
-- transaction. La détection "transaction sans justificatif" (Lot 2) est un
-- simple LEFT JOIN ... WHERE justificatif.id IS NULL.
-- ============================================================================
create table public.justificatif (
  id               uuid primary key default gen_random_uuid(),

  -- on delete cascade : supprimer la transaction supprime la ligne de
  -- métadonnées. (Le fichier dans Storage sera nettoyé côté applicatif.)
  transaction_id   uuid not null references public.transaction (id) on delete cascade,

  -- Chemin dans le bucket Storage, ex : "{entite_id}/{transaction_id}/ticket.jpg".
  -- unique : deux justificatifs ne peuvent pas pointer le même fichier.
  chemin_stockage  text not null unique,

  -- Nom d'origine du fichier, pour un affichage lisible ("ticket-leclerc.jpg").
  nom_fichier      text not null,

  -- Type MIME (image/jpeg, application/pdf...) : sert à valider côté serveur
  -- qu'on n'accepte que images et PDF, et à choisir la bonne icône.
  type_mime        text not null,

  -- Taille en octets : contrôle de quota et affichage.
  taille_octets    bigint,

  cree_le          timestamptz not null default now()
);

comment on table public.justificatif is
  'Métadonnées des pièces jointes. Le fichier réel vit dans Supabase Storage (bucket privé).';


-- ============================================================================
-- INDEX DE PERFORMANCE
-- ----------------------------------------------------------------------------
-- CDC §4 : listes fluides avec plusieurs milliers de lignes. Postgres crée
-- automatiquement un index sur les PK et les contraintes unique, mais PAS
-- sur les colonnes de FK — on les ajoute là où on filtrera vraiment.
-- ============================================================================

-- LA requête centrale de l'app : "les transactions de l'entité X, les plus
-- récentes d'abord". Index composite dans cet ordre exact.
create index idx_transaction_entite_date
  on public.transaction (entite_id, date_transaction desc);

-- Agrégations par catégorie (camembert du dashboard).
create index idx_transaction_categorie
  on public.transaction (categorie_id);

-- Chargement du plan de catégories d'une entité.
create index idx_categorie_entite
  on public.categorie (entite_id);

-- Justificatifs d'une transaction.
create index idx_justificatif_transaction
  on public.justificatif (transaction_id);


-- ============================================================================
-- SEED (à exécuter APRÈS avoir créé ton compte via Supabase Auth)
-- ----------------------------------------------------------------------------
-- 1. Crée ton compte (interface de l'app ou Dashboard > Authentication).
-- 2. Récupère ton uuid :   select id, email from auth.users;
-- 3. Décommente et remplace TON-UUID ci-dessous, puis exécute.
-- ============================================================================
-- insert into public.entite (proprietaire_id, nom, type_juridique) values
--   ('TON-UUID', 'VEA',  'association'),
--   ('TON-UUID', 'VENA', 'societe');
