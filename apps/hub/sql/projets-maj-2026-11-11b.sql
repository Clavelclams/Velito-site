-- ============================================================================
-- HUB VELITO : Projets, Velito Cloud élargi à tout l'écosystème (11/11/2026)
-- ----------------------------------------------------------------------------
-- Précision de Clavel : le cloud et l'IA locale ne servent pas qu'à Venaball,
-- mais à toutes les activités et tous les projets Velito (VEA, VENA, clubs
-- Venaball, outils du hub). Idempotent.
-- ============================================================================

begin;

update shared.projets
set nom = 'Velito Cloud et IA locale',
    resume = 'Service commun à tout l''écosystème Velito (VEA, VENA, clubs Venaball, outils du hub) : stockage des photos, vidéos et documents sur un NAS, dépôt sans tri par événement ou rencontre, consultation par les personnes autorisées ; IA locale sur un mini PC au service de tous les projets, données gardées en interne.',
    stack = 'Mini PC (offert par Willy), NAS, IA locale, connexion unique du hub'
where slug = 'velito-cloud';

-- L'étape « Venaball » devient une intégration parmi d'autres.
update shared.projet_etapes e
set titre = 'Venaball : dépôt par rencontre et consultation dans l''app'
from shared.projets p
where e.projet_id = p.id and p.slug = 'velito-cloud'
  and e.titre = 'Dépôt par rencontre et consultation dans Venaball';

update shared.projet_etapes e
set titre = 'IA locale au service de tous les projets',
    description = 'Sur le mini PC : tri et recherche dans les photos, résumés, assistance dans compta, VEA, Venaball ; les données restent en interne.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'velito-cloud' and e.titre = 'IA locale sur le mini PC';

create temp table _e (lot text, titre text, poids int, ordre int, description text) on commit drop;
insert into _e values
('Socle', 'Espaces séparés par structure, connexion par le hub', 3, 35,
 'Un espace par structure (VEA, VENA, chaque club Venaball, projets) ; on se connecte avec son compte Velito, chacun ne voit que ce à quoi il a droit.'),
('Produit', 'VEA : photos et vidéos des événements', 2, 42,
 'Dépôt sans tri par événement ; lien avec l''agenda de vea.velito.fr.'),
('Produit', 'VENA : fichiers des prestations clients', 2, 44,
 'Rushs vidéo et photo, livrables, partage avec le client.');

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, description)
select p.id, e.lot, e.titre, 'a_faire', e.poids, e.ordre, e.description
from _e e join shared.projets p on p.slug = 'velito-cloud'
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-11', 'decision', 'Cloud et IA pour tout l''écosystème',
       'Le cloud et l''IA locale servent toutes les activités et tous les projets Velito, pas seulement Venaball.'
from shared.projets p
where p.slug = 'velito-cloud'
  and not exists (select 1 from shared.projet_journal x
                  where x.projet_id = p.id and x.titre = 'Cloud et IA pour tout l''écosystème');

commit;

select p.nom, count(e.id) as etapes
from shared.projets p left join shared.projet_etapes e on e.projet_id = p.id
where p.slug = 'velito-cloud' group by p.nom;
