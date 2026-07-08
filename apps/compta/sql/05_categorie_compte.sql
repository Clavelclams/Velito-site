-- ============================================================================
-- VELITO COMPTA — Migration 05 : lien Categorie -> Compte PCG (Bloc mapping)
-- ----------------------------------------------------------------------------
-- A executer APRES 04. Relie chaque categorie a un compte du plan comptable
-- (partie double). Objectif : quand une transaction est classee dans une
-- categorie, l'ecriture generee utilise le BON compte de charge/produit
-- (ex : "Materiel" -> 606 ou 218), au lieu du compte par defaut 606/706.
--
-- Nullable : une categorie sans compte reste valide -> l'ecriture retombe sur
-- le compte par defaut (retro-compatible, migration progressive).
--
-- FK COMPOSITE (compte_id, entite_id) -> compte(id, entite_id) : garantit qu'une
-- categorie ne peut pointer qu'un compte de SA PROPRE entite (meme parade
-- anti-fuite que transaction -> categorie en migration 01).
--
-- Re-executable : drop constraint if exists + add column if not exists.
-- ============================================================================

alter table public.categorie
  add column if not exists compte_id uuid;

alter table public.categorie
  drop constraint if exists categorie_compte_meme_entite;

alter table public.categorie
  add constraint categorie_compte_meme_entite
  foreign key (compte_id, entite_id)
  references public.compte (id, entite_id)
  on delete set null;

comment on column public.categorie.compte_id is
  'Compte PCG de rattachement (nullable). Sert au pont partie double : sinon compte par defaut 606/706.';
