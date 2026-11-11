-- ============================================================================
-- HUB VELITO — Projets : mise à jour Venaball (09/11/2026)
-- ----------------------------------------------------------------------------
-- Complète projets-maj-venaball-2026-11-07.sql et -07b.sql avec :
--   - la version 1.1 de Venaball Club (spec 52) et le support iPad des deux apps ;
--   - les analyses du 09/11 (doc 53) : carte des clubs, espace coach,
--     structures transverses (pôle espoir, camp).
-- Sources : mabb-site/instruction/52_CLUB_APP_COMPLETE_SPEC_2026-11-07.md,
-- 53_ESPACE_COACH_STRUCTURES_CARTE_2026-11-09.md, 51_ROADMAP_2026-11-07.md.
--
-- [11/11/2026] Correctif : l'étape « Espace coach V1 » avait un poids de 8,
-- refusé par la contrainte 1 à 5 : le fichier entier avait échoué en prod
-- (audit SQL du 11/11). Poids ramené à 5, le maximum.
--
-- Idempotent, même méthode que les fichiers précédents :
--   - étape existante (même projet, même titre) : statut mis à jour seulement ;
--   - étape absente : ajoutée ;
--   - journal : ajouté seulement si (projet, date, titre) n'existe pas.
-- Aucune donnée personnelle, aucun secret. À lancer dans l'éditeur SQL
-- Supabase, APRÈS les fichiers du 07/11.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Étapes à ajouter si absentes : (slug, lot, titre, statut, poids, ordre, fait_le, echeance, description)
-- ---------------------------------------------------------------------------
create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, fait_le date, echeance date, description text) on commit drop;
insert into _e values
-- Venaball Club
('venaball-club','Version 1.1','Web intégré connecté d''office (ticket à usage unique, section « Sur le web »)','fait',3,100,'2026-11-07',null,'Spec 52, lot A. Les pages de bureau s''ouvrent dans l''app sans reconnexion.'),
('venaball-club','Version 1.1','Plus de carte morte : compteurs Direction, fiche match, recherche dans l''orga, bouton Inviter','fait',3,102,'2026-11-07',null,'Spec 52, lot B.'),
('venaball-club','Version 1.1','Fiche joueuse et écran Membres en natif','fait',3,104,'2026-11-07',null,'Spec 52, lot C. Droits et journal côté serveur.'),
('venaball-club','Version 1.1','Vraie app iPad : orientation libre, colonne de contenu centrée','fait',2,106,'2026-11-07',null,null),
('venaball-club','Version 1.1','Build iOS 1.1, TestFlight iPhone et iPad, captures iPad, soumission Apple','a_faire',3,108,null,null,'Répondre « no » à la connexion Apple : les certificats sont chez Expo.'),
('venaball-club','Espace coach','Analyse de l''espace coach (effectif, créneaux, appel, exercices, bibliothèques)','fait',2,120,'2026-11-09',null,'Doc 53 §3. Questions en attente.'),
('venaball-club','Espace coach','Espace coach V1 : effectif et créneaux depuis l''app, appel enrichi, exercices avec image et plan de séance','a_faire',5,122,null,null,'Environ 10 à 12 jours. Bibliothèque publique et outil de dessin en V2.'),
('venaball-club','Structures','Structures transverses (pôle espoir, camp) : type de club et rattachement avec accord joueuse et parent','a_faire',5,130,null,null,'Doc 53 §4. Relance à J+15, coupure automatique à J+30.'),
-- Venaball (app joueuse)
('venaball','Version 1.1','Vraie app iPad : orientation libre, jeux caméra gardent leur verrou','fait',1,100,'2026-11-07',null,null),
('venaball','Version 1.1','Colonne de contenu limitée sur iPad et version 1.1.0','a_faire',1,102,null,null,null),
('venaball','Version 1.1','Carte des clubs « Explorer » remise, clubs validés géocodés sans migration','a_faire',2,104,null,null,'Doc 53 §2. Le club de Béthune y apparaît une fois validé.'),
('venaball','Version 1.1','Build iOS 1.1, TestFlight, captures iPad, soumission Apple','a_faire',2,106,null,null,null),
-- Serveur
('venaball-serveur','Plateforme','Routes de la 1.1 Club : ticket web, connexion web par ticket, membres, fiche joueuse','fait',2,140,'2026-11-07',null,'Ajouts seulement : la 1.0 en circulation continue de fonctionner.'),
('venaball-serveur','Plateforme','Route de la carte des clubs (géocodage api-adresse en cache 30 jours)','a_faire',1,142,null,null,null);

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, echeance, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then coalesce(e.fait_le, current_date) end,
       e.echeance, e.description
from _e e
join shared.projets p on p.slug = e.slug
where not exists (
  select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre
);

-- ---------------------------------------------------------------------------
-- 2. Journal : (slug, date, type, titre, contenu)
-- ---------------------------------------------------------------------------
create temp table _j (slug text, d date, type text, titre text, contenu text) on commit drop;
insert into _j values
('venaball-club','2026-11-07','decision','Android 1.0 tel quel, la 1.1 d''abord sur l''App Store','Les nouveautés partent sur iPhone et iPad en premier ; Google Play suivra.'),
('venaball-club','2026-11-07','fait','Venaball Club 1.1 codée','Web intégré, fiche match, fiche joueuse, membres, invitation par la feuille de partage, iPad.'),
('venaball-club','2026-11-07','bug','Envoi iOS refusé par Apple','Le dernier build était encore la 1.0.0 (3), déjà envoyé. Il faut compiler la 1.1 avant d''envoyer.'),
('venaball-serveur','2026-11-07','note','Code serveur parti en production avant relecture','Une autre session a tout ajouté d''un coup dans ses commits. Leçon : ajouter fichier par fichier quand deux sessions travaillent en parallèle.'),
('venaball-club','2026-11-09','decision','Espace coach : schéma = image jointe en V1','Les coachs ont déjà leurs schémas (application FIBA, tableau blanc). Éditeur et bibliothèque publique repoussés.'),
('venaball','2026-11-09','note','Carte des clubs à remettre','Retirée le 28/10 car vide. Un deuxième club existe sur Venaball (Béthune) : la carte a maintenant un sens.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, j.d, j.type, j.titre, j.contenu
from _j j
join shared.projets p on p.slug = j.slug
where not exists (
  select 1 from shared.projet_journal x
  where x.projet_id = p.id and x.date_entree = j.d and x.titre = j.titre
);

commit;

-- Vérification
select p.nom,
       count(e.id) filter (where e.statut = 'fait') as faites,
       count(e.id) as etapes
from shared.projets p
left join shared.projet_etapes e on e.projet_id = p.id
where p.slug in ('venaball', 'venaball-club', 'venaball-serveur')
group by p.nom, p.ordre order by p.ordre;
