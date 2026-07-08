-- ============================================================================
-- VELITO COMPTA — Migration 03 : Stockage des justificatifs (Lot 2)
-- ----------------------------------------------------------------------------
-- À exécuter APRÈS 01 et 02, dans Supabase : Dashboard > SQL Editor.
--
-- Objectif : un bucket PRIVÉ où déposer les pièces jointes (tickets, factures),
-- avec un cloisonnement par entité IDENTIQUE à celui des tables (RLS).
--
-- Le fichier physique vit dans Supabase Storage ; ses métadonnées vivent dans
-- la table public.justificatif (déjà créée en migration 01, RLS en 02). Le
-- lien entre les deux = la colonne chemin_stockage.
--
-- CONVENTION DE CHEMIN (à respecter côté applicatif, lib/services/fichiers.ts) :
--     {entite_id}/{transaction_id}/{fichier}
-- Le PREMIER segment est l'uuid de l'entité : c'est lui qui pilote la RLS
-- Storage ci-dessous. Un fichier ne peut être lu/écrit que si son 1er dossier
-- correspond à une entité que l'utilisateur possède.
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 : créer le bucket privé (idempotent)
-- ----------------------------------------------------------------------------
-- public = false : AUCUN accès anonyme par URL. La lecture se fera uniquement
-- via des URL signées à durée courte, générées côté serveur pour l'utilisateur
-- autorisé. Un bucket public exposerait tous les tickets à qui a l'URL.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false)
on conflict (id) do nothing;


-- ============================================================================
-- ÉTAPE 2 : policies RLS sur storage.objects (limitées à CE bucket)
-- ----------------------------------------------------------------------------
-- storage.objects a déjà la RLS activée par Supabase. On ajoute nos règles.
--
-- storage.foldername(name) découpe le chemin en tableau de dossiers ; l'indice
-- [1] est le premier segment = l'entite_id. On le caste en uuid et on réutilise
-- EXACTEMENT le même garde-fou que les tables : est_proprietaire_entite().
-- Résultat : le cloisonnement des fichiers est le même que celui des données,
-- défini à un seul endroit conceptuel (la propriété de l'entité).
--
-- Les 4 opérations sont couvertes séparément (Storage l'exige) :
--   SELECT (lister/télécharger), INSERT (uploader), UPDATE (remplacer),
--   DELETE (supprimer). USING filtre l'existant, WITH CHECK valide l'écrit.
-- ============================================================================

create policy "justificatifs: lecture si proprietaire de l'entite"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'justificatifs'
    and public.est_proprietaire_entite( ((storage.foldername(name))[1])::uuid )
  );

create policy "justificatifs: upload si proprietaire de l'entite"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'justificatifs'
    and public.est_proprietaire_entite( ((storage.foldername(name))[1])::uuid )
  );

create policy "justificatifs: remplacement si proprietaire de l'entite"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'justificatifs'
    and public.est_proprietaire_entite( ((storage.foldername(name))[1])::uuid )
  );

create policy "justificatifs: suppression si proprietaire de l'entite"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'justificatifs'
    and public.est_proprietaire_entite( ((storage.foldername(name))[1])::uuid )
  );

-- ============================================================================
-- NOTE DE SÉCURITÉ (à défendre au jury) :
-- La validation du TYPE de fichier (images + PDF) et de la TAILLE se fait
-- côté serveur applicatif (lib/services/fichiers.ts + action d'upload), pas
-- ici : Postgres ne connaît pas le contenu binaire. La RLS Storage garantit
-- le CLOISONNEMENT (qui accède à quoi) ; l'applicatif garantit la NATURE du
-- fichier (quoi est accepté). Deux responsabilités, deux couches.
-- ============================================================================
