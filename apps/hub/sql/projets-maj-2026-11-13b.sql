-- ============================================================================
-- HUB VELITO : Projets, sécurité Interactive et OAuth (13/11/2026, 2e lot)
-- Idempotent. À lancer après le déploiement du code correspondant.
-- ============================================================================

begin;

create temp table _maj (slug text, titre text, description text) on commit drop;
insert into _maj values
('interactive', 'Jeton joueur lisible par tous (faille)',
 'Jeton lisible seulement par son joueur (droits par colonne, fonction rejoindre_session). En vérifiant, trouvé et fermé aussi : rôles du Loup-Garou lisibles par tous, cibles des votes de nuit, vote au nom d''un autre. 27 tests PGlite. Reste : restreindre aussi les joueurs connectés (étape ajoutée).'),
('interactive', 'Contraintes de type de jeu incohérentes en base',
 'Vérifié en prod le 13/11 : la contrainte est déjà propre (pinpoint, draw, laser ; plus de geo ni d''undercover).'),
('hub', 'Code OAuth échangé une seule fois de façon atomique',
 'Consommation du code et rotation du refresh token par écriture conditionnelle : une seule requête gagne en cas d''envoi simultané.');

update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-13'), description = m.description
from _maj m join shared.projets p on p.slug = m.slug
where e.projet_id = p.id and e.titre = m.titre and e.statut <> 'fait';

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, description)
select p.id, 'Avant de vendre', 'Loup-Garou : l''animateur lit les rôles par une fonction réservée à l''hôte', 'a_faire', 2, 35,
       'Puis retirer aussi les colonnes secrètes au rôle authenticated (un joueur connecté à un compte Velito peut encore les lire).'
from shared.projets p
where p.slug = 'interactive'
  and not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id
                  and x.titre = 'Loup-Garou : l''animateur lit les rôles par une fonction réservée à l''hôte');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-13', 'bug', 'Loup-Garou : rôles et votes lisibles par tous',
       'Un commentaire du code affirmait que Realtime ignore les droits par colonne ; vérifié faux dans la base (realtime.apply_rls contrôle has_column_privilege). Les secrets sont désormais fermés aux joueurs non connectés.'
from shared.projets p
where p.slug = 'interactive'
  and not exists (select 1 from shared.projet_journal x where x.projet_id = p.id
                  and x.titre = 'Loup-Garou : rôles et votes lisibles par tous');

commit;
