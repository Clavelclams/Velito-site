-- ============================================================
-- VEA — Bilan public d'un evenement (chiffres editoriaux + visibilite)
-- ============================================================
--
-- CONTEXTE
--   Sur une card d'event PASSE, on veut pouvoir afficher un "bilan public"
--   destine aux curieux, aux institutions et aux clients prestation :
--   combien de monde, mixite F/G, joueurs/spectateurs/benevoles, + un texte
--   de recap. Ces chiffres sont SAISIS A LA MAIN par l'admin (ils ne viennent
--   PAS du compteur de presences/scan : sur un stand, 50 personnes peuvent
--   venir sans que 50 aient scanne le QR). C'est donc un bilan EDITORIAL.
--
--   L'admin choisit, ligne par ligne, ce qui est rendu public (cases a cocher)
--   et un interrupteur global "bilan public oui/non". Tant que bilan_public est
--   false, rien n'est expose cote site public.
--
-- STRATEGIE (additive)
--   On ajoute des colonnes sur vea.evenements (relation 1:1 avec l'event,
--   donc pas besoin d'une table separee). Les colonnes chiffres sont nullable
--   (NULL = "non renseigne", different de 0). Les colonnes bilan_show_* sont
--   les interrupteurs de visibilite par metrique.
--
--   La RLS de vea.evenements autorise deja : SELECT public (anon) pour
--   l'agenda, UPDATE pour les editeurs vea (cf. updateEventAction qui marche
--   deja). Ces nouvelles colonnes heritent de ces politiques -> AUCUN
--   changement de RLS necessaire. La page publique ne lira QUE les events
--   avec bilan_public = true (filtre applicatif) et n'expose jamais de noms.
--
-- IDEMPOTENT : ADD COLUMN IF NOT EXISTS -> relancable sans risque.
-- ============================================================

alter table vea.evenements
  -- Interrupteur global : tant que false, aucun bilan n'est visible publiquement.
  add column if not exists bilan_public        boolean not null default false,

  -- Texte de recap libre (la partie editoriale : "Super aprem sur le stand...").
  add column if not exists bilan_recap          text,

  -- Chiffres saisis a la main (nullable : NULL = non renseigne).
  add column if not exists bilan_nb_total        integer,
  add column if not exists bilan_nb_filles       integer,
  add column if not exists bilan_nb_garcons      integer,
  add column if not exists bilan_nb_joueurs      integer,
  add column if not exists bilan_nb_spectateurs  integer,
  add column if not exists bilan_nb_benevoles    integer,

  -- Visibilite par metrique (l'admin coche/decoche ce qui est public).
  -- Defaults : on montre le total, la mixite et les roles ; les benevoles
  -- sont masques par defaut (souvent un petit nombre interne).
  add column if not exists bilan_show_total       boolean not null default true,
  add column if not exists bilan_show_genre       boolean not null default true,
  add column if not exists bilan_show_joueurs      boolean not null default true,
  add column if not exists bilan_show_spectateurs  boolean not null default true,
  add column if not exists bilan_show_benevoles    boolean not null default false;

-- Verification rapide (a lire dans l'editeur SQL Supabase apres execution) :
--   select event_slug, bilan_public, bilan_nb_total, bilan_recap
--   from vea.evenements
--   order by date desc;
