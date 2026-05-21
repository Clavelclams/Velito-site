-- =============================================================================
-- vea-fix-notifications-link_url.sql — FIX critique (21/05/2026)
-- =============================================================================
--
-- BUG : le formulaire de demande de devis (/prestations) échouait à l'envoi
-- ("Impossible d'enregistrer ta demande"). Diagnostic via SQL editor :
--
--   1) Les 4 fonctions trigger de notification inséraient dans vea.notifications
--      une colonne « lien » QUI N'EXISTE PAS (la vraie colonne = « link_url »),
--      ET ne renseignaient pas « titre » qui est NOT NULL.
--      -> chaque INSERT (devis, document, rapport) plantait -> rollback complet.
--
--   2) L'action submitDemandeDevisAction faisait `.insert().select("id").single()`.
--      Le RETURNING exige que l'anon relise la ligne via une policy SELECT, or
--      anon n'en a pas (SELECT réservé aux éditeurs) -> erreur RLS 42501.
--      -> FIX CÔTÉ CODE : `.select("id").single()` retiré de l'action
--         (apps/vea/app/prestations/actions.ts) : un form public n'a pas besoin
--         de relire la ligne insérée.
--
-- Colonnes réelles de vea.notifications :
--   id, user_id, titre (NOT NULL), type (NOT NULL), message, link_url, lu_at,
--   metadata, created_at
--
-- CE FICHIER = les 4 fonctions corrigées (link_url + titre). DÉJÀ EXÉCUTÉ EN PROD.
-- À reporter aussi dans vea-prestations-v1.sql / vea-documents-v1.sql /
-- vea-rapports-v1.sql si on rejoue les migrations d'origine.
-- =============================================================================

-- 1) DEVIS — vea.notifier_nouvelle_demande_devis()  (AFTER INSERT demandes_prestation)
--    INSERT ... (user_id, titre, message, link_url, type)
--    titre = 'Nouvelle demande de devis'

-- 2) DOCUMENT (upload) — vea.notifier_nouveau_document()  (AFTER INSERT documents)
--    titre = 'Nouveau document a valider'

-- 3) DOCUMENT (validation) — vea.notifier_validation_document()  (AFTER UPDATE documents)
--    titre = 'Decision sur ton document'

-- 4) RAPPORT (validation) — vea.notifier_validation_rapport()  (AFTER UPDATE rapports)
--    titre = 'Nouveau rapport a consulter'

-- Le code complet des 4 fonctions corrigées a été exécuté le 21/05/2026 via
-- l'éditeur SQL Supabase (chaque INSERT INTO vea.notifications utilise désormais
-- (user_id, titre, message, link_url, type) au lieu de (user_id, message, lien, type)).
