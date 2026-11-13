-- ============================================================================
-- HUB VELITO : nouveau projet « Boîtes à livres d'Amiens » (13/11/2026)
-- Idempotent : projet créé s'il n'existe pas, étapes et journal ajoutés
-- seulement s'ils sont absents (même titre).
-- ============================================================================

begin;

insert into shared.projets (slug, nom, resume, statut, url_prod, depot, stack, ordre)
values ('boites-a-livres', 'Boîtes à livres d''Amiens',
        'Carte et fiches des boîtes à livres d''Amiens, signalements sans compte (vide, abîmée, j''ai déposé), QR code sur chaque boîte, espace bénévoles. Porté par VEA, conçu bénévolement par VENA. Existe que le budget participatif soit voté ou non.',
        'en_cours', 'https://livres.velito.fr', 'Clavelclams/Velito-site (apps/livres)',
        'Next.js 16, Supabase, Leaflet + OpenStreetMap, Tailwind', 95)
on conflict (slug) do nothing;

create temp table _e (lot text, titre text, statut text, poids int, ordre int, description text) on commit drop;
insert into _e values
('V1', 'Carte, liste et « la plus proche de moi »', 'fait', 2, 10, 'Leaflet + OpenStreetMap, liste accessible, position gardée dans le téléphone.'),
('V1', 'Fiche boîte et signalements sans compte', 'fait', 3, 20, 'Déposé, pris, vide, abîmée ; champ piège, 20 par heure et par boîte ; aucune donnée personnelle.'),
('V1', 'Espace bénévoles et QR codes à imprimer', 'fait', 3, 30, 'Accès par les droits VEA de shared.user_permissions.'),
('V1', 'Schéma livres, règles testées', 'fait', 2, 40, '23 tests de règles, 14 contrôles SQL sur PGlite.'),
('Mise en ligne', 'Exécuter le schéma et exposer le schéma livres', 'a_faire', 1, 50, null),
('Mise en ligne', 'Projet Vercel apps/livres et domaine livres.velito.fr', 'a_faire', 1, 60, 'Action de Clavel.'),
('Mise en ligne', 'Recenser les boîtes existantes et coller les QR codes', 'a_faire', 3, 70, 'Relevé terrain, ou OpenStreetMap si les boîtes y sont.'),
('Mise en ligne', 'Adresse du siège de VEA dans les mentions légales', 'a_faire', 1, 80, null),
('V2', 'Compte Velito facultatif, points et badges', 'a_faire', 3, 90, null),
('V2', 'Compteur public, agenda des animations, API en lecture', 'a_faire', 2, 100, null),
('Budget participatif', 'Résultat du vote (25/11/2026)', 'a_faire', 1, 110, 'Vote jusqu''au 15/11. Si lauréat : 10 boîtes neuves, installation été-automne 2027.');

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then date '2026-11-13' end, e.description
from _e e join shared.projets p on p.slug = 'boites-a-livres'
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-13', 'decision', 'Site public d''abord, sans compte',
       'Un site installable comme une app (pas de store), sans compte en V1 ; points et badges en V2 avec le compte Velito facultatif ; Ma Ville lira ces données plus tard. Le site vit même si le budget participatif n''est pas voté.'
from shared.projets p
where p.slug = 'boites-a-livres'
  and not exists (select 1 from shared.projet_journal x where x.projet_id = p.id and x.titre = 'Site public d''abord, sans compte');

commit;
