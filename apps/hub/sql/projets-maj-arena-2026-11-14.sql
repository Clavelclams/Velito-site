-- ============================================================================
-- HUB VELITO : Projets, mise à jour Arena (14/11/2026)
-- ----------------------------------------------------------------------------
-- Score par sets (migration arena 013), API publique par clé (014), pages
-- légales. Idempotent. À lancer dans l'éditeur SQL Supabase APRÈS les
-- migrations 013 et 014 ET le déploiement du code.
-- ============================================================================

begin;

update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-14'),
    description = 'Migration 013 + lib/arena/sets.ts (18 tests) : détail des sets saisi par le staff, score calculé par le serveur, affiché sur la page publique, le widget et les exports. Sets et équipe gagnante ajoutés au verrou §3.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'arena' and e.titre = 'Score par sets (padel, ping-pong)' and e.statut <> 'fait';

update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-14'),
    description = 'Migration 014 : clés en empreinte SHA-256, 120 requêtes/min par clé (compteur atomique). Routes /api/v1/tournois, /tournois/{token}, /classement, lecture ANONYME (RLS publique). Gestion /admin/api, doc /developpeurs. 38 tests PGlite.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'arena' and e.titre = 'API publique par clé' and e.statut <> 'fait';

create temp table _e (lot text, titre text, statut text, poids int, ordre int, fait_le date, description text) on commit drop;
insert into _e values
('Avant ouverture', 'Mentions légales et page « Tes données »', 'fait', 1, 55, '2026-11-14',
 'Écrites d''après ce que le code enregistre réellement : pseudo, année de naissance, résultats, ELO interne jamais publié, cookie de session seulement.');

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then e.fait_le end, e.description
from _e e join shared.projets p on p.slug = 'arena'
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

create temp table _j (type text, titre text, contenu text) on commit drop;
insert into _j values
('decision', 'API gratuite, mais par clé',
 'Une clé ne donne aucun droit en plus : elle sert à savoir qui consomme, à limiter le débit (120/min) et à couper un abus sans couper tout le monde. Lecture avec le client anonyme sans cookie.'),
('decision', 'Sets : le détail fait foi',
 'Quand le staff saisit les sets, le serveur calcule le score en sets gagnés. Le bracket et le classement ne changent pas. Champ facultatif : un format maison garde la saisie simple.'),
('bug', 'Équipe gagnante modifiable après validation',
 'Le verrou du règlement §3 protégeait gagnant_id mais pas equipe_gagnante_id (matchs par équipes). Fermé par la migration 013, prouvé par un test PGlite.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-14', j.type, j.titre, j.contenu
from _j j join shared.projets p on p.slug = 'arena'
where not exists (select 1 from shared.projet_journal x
                  where x.projet_id = p.id and x.date_entree = date '2026-11-14' and x.titre = j.titre);

commit;

select e.lot, e.titre, e.statut from shared.projet_etapes e
join shared.projets p on p.id = e.projet_id where p.slug = 'arena' order by e.ordre;
