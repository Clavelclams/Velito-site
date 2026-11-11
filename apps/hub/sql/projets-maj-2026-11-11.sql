-- ============================================================================
-- HUB VELITO : Projets, idées du 11/11/2026 (bilans de réunion, Velito Cloud)
-- ----------------------------------------------------------------------------
-- Même idées que mabb-site/instruction/51_ROADMAP_2026-11-07.md (lignes
-- « Bilans du staff pour les réunions » et « Cloud Velito »), reprises ici
-- pour le suivi sur hub.velito.fr/projets.
-- Idempotent : projet créé s'il n'existe pas, étapes et journal ajoutés
-- seulement s'ils sont absents (même titre).
-- ============================================================================

begin;

insert into shared.projets (slug, nom, resume, statut, url_prod, depot, stack, ordre)
values ('velito-cloud', 'Velito Cloud (NAS et IA locale)',
        'Stockage des photos et vidéos des clubs Venaball sur un NAS : le coach dépose tout, sans tri, dans le dossier de la rencontre, les membres consultent. Highlights vidéo des joueuses, documents du club, IA locale sur un mini PC.',
        'idee', null, null, 'Mini PC (offert par Willy), NAS, IA locale', 120)
on conflict (slug) do nothing;

create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, description text) on commit drop;
insert into _e values
('venaball-serveur', 'Club', 'Bilans du staff pour les réunions', 'a_faire', 3, 200,
 'Le dirigeant règle une récurrence (7 jours, 15 jours ou autre). Chaque membre du staff reçoit une notification « Prépare ton bilan » et peut l''alimenter au fil de la semaine. Le dirigeant voit tous les bilans pour préparer la réunion du vendredi ou l''AG. Lié au module Réunions existant. À spécifier (doc 51).'),
('velito-cloud', 'Prérequis', 'Recevoir le mini PC', 'a_faire', 1, 10, 'Promis par Willy. Rien ne démarre avant.'),
('velito-cloud', 'Cadrage', 'Spec courte : droit à l''image et accès', 'a_faire', 3, 20,
 'Accord parental par joueuse mineure avant toute mise en ligne, accès limité à l''équipe et aux parents, durée de conservation.'),
('velito-cloud', 'Cadrage', 'Choix du NAS, sauvegarde et sécurité', 'a_faire', 3, 30,
 'Capacité, deuxième copie hors du club, accès depuis l''extérieur sans exposer la machine, disponibilité.'),
('velito-cloud', 'Produit', 'Dépôt par rencontre et consultation dans Venaball', 'a_faire', 3, 40,
 'Le coach dépose toutes les photos et vidéos d''une rencontre (exemple : U15) dans un dossier, sans tri ; les membres autorisés consultent depuis l''app.'),
('velito-cloud', 'Produit', 'Documents du club', 'a_faire', 2, 50, 'Les clubs déposent leurs documents sur le même stockage.'),
('velito-cloud', 'Produit', 'Highlights vidéo des joueuses', 'a_faire', 2, 60, null),
('velito-cloud', 'IA', 'IA locale sur le mini PC', 'a_faire', 2, 70, 'Usage à préciser (tri des photos, résumés, assistance) ; les données restent au club.');

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre, e.description
from _e e join shared.projets p on p.slug = e.slug
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

create temp table _j (slug text, d date, type text, titre text, contenu text) on commit drop;
insert into _j values
('venaball-serveur', '2026-11-11', 'decision', 'Bilans du staff avant les réunions',
 'Demande de Clavel : récurrence réglable par le dirigeant, notification de rappel, saisie au fil de la semaine, vue d''ensemble pour la réunion du vendredi et l''AG.'),
('velito-cloud', '2026-11-11', 'note', 'Idée posée, en attente du mini PC',
 'Rien à coder avant le mini PC et la spec sur le droit à l''image des mineures.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, j.d, j.type, j.titre, j.contenu
from _j j join shared.projets p on p.slug = j.slug
where not exists (select 1 from shared.projet_journal x where x.projet_id = p.id and x.date_entree = j.d and x.titre = j.titre);

commit;

select p.slug, p.statut, count(e.id) as etapes
from shared.projets p left join shared.projet_etapes e on e.projet_id = p.id
where p.slug in ('velito-cloud', 'venaball-serveur')
group by p.slug, p.statut;
