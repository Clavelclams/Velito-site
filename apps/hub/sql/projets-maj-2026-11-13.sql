-- ============================================================================
-- HUB VELITO : Projets, remise à niveau du 13/11/2026
-- ----------------------------------------------------------------------------
-- Les étapes de Compta étaient restées au 07/11 alors que plusieurs lots ont
-- été livrés depuis (migrations compta 06 à 13, toutes exécutées en prod).
-- Ajoute aussi le travail du 11 au 13/11 sur velito.fr et le hub.
-- Idempotent. À lancer après projets-maj-arena-2026-11-12.sql.
-- ============================================================================

begin;

-- 1. Compta : étapes livrées --------------------------------------------------
create temp table _maj (slug text, titre text, statut text, description text) on commit drop;
insert into _maj values
('velito-compta', 'Solde initial et import des relevés bancaires VEA', 'fait',
 'Import des relevés PDF Crédit Mutuel, contrôle des soldes (soldeRepris). Relevés 2022-2023 chargés ; ceux de 2026 restent à importer (étape séparée).'),
('velito-compta', 'Clôture d''exercice et réouverture motivée', 'fait',
 'Migration 10 : 4 dimensions par ligne, signature, instantané, verrous.'),
('velito-compta', 'Subventions et budgets', 'fait', 'Migrations 08 et 11, dossier d''AG.'),
('velito-compta', 'Plusieurs utilisateurs par structure', 'fait',
 'Migration 09 : propriétaire, trésorier, lecteur ; mode lecture seule.'),
('velito-compta', 'Facturation VENA (devis, facture, facture électronique)', 'en_cours',
 'Devis, factures, avoirs et encaissements livrés (migration 13). Reste : facture électronique via une plateforme agréée.');

update shared.projet_etapes e
set statut = m.statut,
    fait_le = case when m.statut = 'fait' then coalesce(e.fait_le, date '2026-11-13') else null end,
    description = m.description
from _maj m join shared.projets p on p.slug = m.slug
where e.projet_id = p.id and e.titre = m.titre and e.statut is distinct from m.statut;

-- 2. Étapes à ajouter si absentes ----------------------------------------------
create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, description text) on commit drop;
insert into _e values
('velito-compta', 'Livré en novembre', 'Notes de frais et indemnités kilométriques', 'fait', 2, 200,
 'Migration 12 : avances des membres, remboursement, abandon de frais en don.'),
('velito-compta', 'Livré en novembre', 'À traiter, pointage et justificatifs', 'fait', 2, 210, null),
('velito-compta', 'Données', 'Importer les relevés bancaires 2026', 'a_faire', 1, 220,
 'Action de Clavel : télécharger les PDF depuis la banque puis les importer.'),
('velito-compta', 'Données', 'Classer les lignes « à classer » et valider', 'a_faire', 1, 230, null),
('velito-compta', 'VENA', 'Choisir une plateforme agréée (réception des factures)', 'a_faire', 1, 240,
 'Réception obligatoire depuis le 01/09/2026 ; émission pour les petites entreprises au 01/09/2027.'),
('vena-site', 'Visibilité', 'Page Réalisations, robots, sitemap et données structurées', 'fait', 1, 100,
 'Portfolio (Venaball, Interactive, sites de l''écosystème), robots d''entraînement IA refusés, robots de recherche acceptés.'),
('vena-site', 'Visibilité', 'Anti-spam du formulaire de devis', 'fait', 1, 105,
 'Au 13/11, au moins 11 des 16 demandes non traitées venaient de robots. Champ piège, délai minimum, détection de charabia, service contrôlé ; pas d''accusé de réception aux robots.'),
('hub', 'Pilotage', 'Vue d''ensemble des projets (bandeau sur /projets)', 'fait', 1, 100,
 'Avancement global, projets ouverts en même temps, travail restant, alerte au-delà de 3 projets actifs.'),
('hub', 'Qualité', 'README, .env.example, robots et sitemap', 'fait', 1, 110, null);

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then date '2026-11-13' end, e.description
from _e e join shared.projets p on p.slug = e.slug
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

-- 3. Journal ---------------------------------------------------------------------
insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-13', 'decision', 'Bilan stratégique du 13/11',
       'Douze projets ouverts, aucun livré, aucun revenu logiciel. Décision proposée : trois chantiers actifs (Venaball pour le jury, un premier client VENA, une première soirée Interactive payée), le reste en pause ou en maintenance.'
from shared.projets p
where p.slug = 'hub'
  and not exists (select 1 from shared.projet_journal x
                  where x.projet_id = p.id and x.titre = 'Bilan stratégique du 13/11');

commit;

select p.slug, e.titre, e.statut from shared.projet_etapes e
join shared.projets p on p.id = e.projet_id
where p.slug in ('velito-compta', 'vena-site', 'hub') order by p.slug, e.ordre;
