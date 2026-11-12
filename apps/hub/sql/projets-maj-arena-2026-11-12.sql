-- ============================================================================
-- HUB VELITO : Projets, mise à jour Arena (12/11/2026)
-- ----------------------------------------------------------------------------
-- Espace joueur (migration arena 010, en prod), pont VEA ↔ Arena (011, en
-- prod), widget intégrable. Idempotent : étape existante = statut mis à jour,
-- étape absente = ajoutée, journal ajouté seulement s'il n'existe pas.
-- À lancer dans l'éditeur SQL Supabase APRÈS le déploiement du code.
-- ============================================================================

begin;

-- L'étape prévue depuis le 07/11 est faite.
update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-12'),
    description = 'Compte Velito partagé (pas d''OIDC pour un sous-domaine), page /moi, rattachement de pseudo validé par le staff, inscription en ligne par tournoi.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'arena' and e.titre = 'Connexion des joueurs' and e.statut <> 'fait';

update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-12'),
    description = 'Migration 012 : fonction arena.appliquer_validation, tout ou rien, refuse une double validation. 29 tests PGlite.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'arena' and e.titre = 'Validation de score dans une transaction' and e.statut <> 'fait';

update shared.projet_etapes e
set statut = 'fait', fait_le = coalesce(e.fait_le, date '2026-11-12'),
    description = 'Toutes les écritures des Server Actions vérifient { error } : score, check-in, statut, litige, consentements, effacement ELO, badges. Journal non bloquant mais jamais silencieux.'
from shared.projets p
where e.projet_id = p.id and p.slug = 'arena' and e.titre = 'Erreurs SQL vérifiées partout' and e.statut <> 'fait';

create temp table _e (lot text, titre text, statut text, poids int, ordre int, fait_le date, description text) on commit drop;
insert into _e values
('Avant ouverture', 'Pont VEA ↔ Arena : liens réels et vrais résultats sur le profil VEA', 'fait', 2, 52, '2026-11-12',
 'Fonction arena.mon_resume() sans paramètre (lit auth.uid()), carte Arena du profil VEA, « Organisé par » sur la page tournoi.'),
('Interop', 'Widget intégrable sur le site d''un club', 'fait', 2, 70, '2026-11-12',
 'Route /widget/t/[token], lecture seule, seule route autorisée en iframe.'),
('Interop', 'API publique par clé', 'a_faire', 3, 80, null, null),
('Interop', 'Score par sets (padel, ping-pong)', 'a_faire', 2, 90, null, null);

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then e.fait_le end, e.description
from _e e join shared.projets p on p.slug = 'arena'
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

create temp table _j (type text, titre text, contenu text) on commit drop;
insert into _j values
('decision', 'Connexion joueur sans OIDC',
 'Arena est un sous-domaine de velito.fr : le cookie de session du hub suffit. L''OIDC du hub reste pour une future app hors velito.fr.'),
('fait', 'Espace joueur en production',
 'Migration 010 appliquée et vérifiée (6 contrôles), /moi en ligne. Leçon : la migration doit passer avant le code, sinon la création de tournoi plante.'),
('bug', 'Validation non atomique et double validation possible',
 'Un échec après le passage en VALIDE bloquait le tableau ; deux validations simultanées comptaient l''ELO deux fois. Corrigé par la migration 012. Le test a aussi révélé qu''un placement pouvait réécrire un match déjà validé : garde ajoutée.'),
('bug', 'Score refusé par la base affiché comme enregistré',
 'supabase-js ne lève pas d''exception sur une erreur SQL : chaque écriture vérifie maintenant { error }.'),
('fait', 'Profil VEA relié à Arena',
 'La carte « Niveau Arena » recopiait le niveau VEA ; elle affiche maintenant tournois, victoires et titres réels.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, date '2026-11-12', j.type, j.titre, j.contenu
from _j j join shared.projets p on p.slug = 'arena'
where not exists (select 1 from shared.projet_journal x
                  where x.projet_id = p.id and x.date_entree = date '2026-11-12' and x.titre = j.titre);

commit;

select e.lot, e.titre, e.statut from shared.projet_etapes e
join shared.projets p on p.id = e.projet_id where p.slug = 'arena' order by e.ordre;
