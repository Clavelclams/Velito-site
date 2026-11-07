-- ============================================================================
-- HUB VELITO — Projets : données initiales (07/11/2026)
-- ----------------------------------------------------------------------------
-- Repris des documents existants : mabb-site/instruction/00_ECOSYSTEME.md,
-- apps/compta/README.md et ETAT_AVANCEMENT.md, README des apps, journal des
-- sessions. Aucun contenu métier confidentiel (CDC MABB, UNSS) : seulement
-- des étapes techniques. À compléter et corriger sur hub.velito.fr/projets.
--
-- Idempotent : un projet existant n'est pas recréé, et les étapes / entrées
-- de journal ne sont ajoutées QUE si le projet n'en a encore aucune.
-- Prérequis : sql/projets-v1.sql.
-- ============================================================================

begin;

create temp table _p (slug text, nom text, resume text, statut text, url_prod text, depot text, stack text, ordre int) on commit drop;
insert into _p values
('venaball', 'Venaball (app joueuse)', 'App mobile des joueuses : stats, convocations, badges, retours du coach, Playground (tir et dribble à la caméra).', 'en_cours', 'https://venaball.fr', 'Clavelclams/Pirb-store', 'Expo SDK 54, React Native 0.81, TypeScript ; API Symfony', 10),
('venaball-club', 'Venaball Club (app staff)', 'App des dirigeants, coachs, bénévoles, trésorier et parents : Stats Live hors ligne, convocations, organisation du week-end, notes de frais.', 'en_cours', 'https://venaball.fr', 'Clavelclams/venaball-club', 'Expo SDK 54, TypeScript ; API Symfony', 20),
('venaball-serveur', 'Venaball serveur (ex-MABB Manager)', 'Le serveur Symfony multi-club : espace club, espace joueuse web, API des deux apps. Deux instances : MABB et Venaball.', 'en_cours', 'https://club.venaball.fr', 'Clavelclams/mabb-site', 'Symfony 7.4, PHP 8.3, Doctrine, Twig', 30),
('velito-compta', 'Velito Compta', 'Pré-comptabilité VEA et VENA : trésorerie associative, partie double, FEC. Base d''une future vraie app de compta.', 'en_cours', 'https://compta.velito.fr', 'Clavelclams/Velito-site (apps/compta)', 'Next.js 16, Supabase', 40),
('vea-site', 'Site VEA', 'Site de l''association : agenda, scan QR de présence, XP et badges, admin des événements, stages.', 'en_cours', 'https://vea.velito.fr', 'Clavelclams/Velito-site (apps/vea)', 'Next.js 16, Supabase', 50),
('hub', 'Hub Velito', 'Point d''entrée de l''écosystème : connexion unique, fournisseur OAuth, suivi des projets.', 'en_cours', 'https://hub.velito.fr', 'Clavelclams/Velito-site (apps/hub)', 'Next.js 16, Supabase, jose', 60),
('vena-site', 'Site VENA (velito.fr)', 'Vitrine de la SASU : présentation, demandes de devis, admin des demandes.', 'en_cours', 'https://velito.fr', 'Clavelclams/Velito-site (apps/vena)', 'Next.js 16, Supabase, Resend', 70),
('arena', 'Arena', 'Plateforme de tournois esport et sport : élimination simple et double, poules, ELO, protection des mineurs.', 'en_cours', 'https://arena.velito.fr', 'Clavelclams/Velito-site (apps/arena)', 'Next.js 16, Supabase, Vitest', 80),
('interactive', 'Velito Interactive', 'Jeux multijoueurs pour bars et MJC : écran TV + téléphones, temps réel.', 'en_cours', 'https://interactive.velito.fr', 'Clavelclams/Velito-site (apps/interactive)', 'Next.js 16, Supabase Realtime', 90),
('cours', 'Cours CDA', 'Espace de révision du titre CDA (jury avril 2027) construit à partir des vrais projets.', 'en_cours', 'https://cours.velito.fr', 'Clavelclams/Velito-site (apps/cours)', 'Next.js 16, Markdown', 100),
('table-de-marque-unss', 'Table de marque UNSS', 'Feuille de match numérique pour les rencontres UNSS. Projet confidentiel : CDC hors de cette page.', 'en_cours', null, null, null, 110);

insert into shared.projets (slug, nom, resume, statut, url_prod, depot, stack, ordre)
select slug, nom, resume, statut, url_prod, depot, stack, ordre from _p
on conflict (slug) do nothing;

-- Étapes : (slug, lot, titre, statut, poids, ordre, fait_le)
create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, fait_le date) on commit drop;
insert into _e values
-- Venaball
('venaball','Socle','Stats, convocations, badges, Playground v14','fait',3,10,'2026-10-06'),
('venaball','Socle','Retours du coach et carte des actions','fait',2,20,'2026-10-06'),
('venaball','Socle','Signaler et masquer sur toutes les cartes','fait',1,30,'2026-10-05'),
('venaball','Stores','Permissions Android inutiles bloquées, écran web limité à nos domaines','fait',1,40,'2026-10-29'),
('venaball','Stores','Fiche Google Play et test interne','fait',2,50,'2026-10-29'),
('venaball','Stores','Build iOS production et soumission App Store (build 3)','fait',3,60,'2026-10-30'),
('venaball','Stores','Réponse de la review Apple','en_cours',2,70,null),
('venaball','Stores','Test interne Play bloqué sur le Xiaomi','a_faire',1,80,null),
('venaball','Stores','Build Android production et publication Play','a_faire',3,90,null),
('venaball','Après la sortie','Vérification de l''e-mail à l''inscription','a_faire',2,100,null),
('venaball','Après la sortie','App en thème clair (v1.1)','a_faire',2,110,null),
('venaball','Après la sortie','Playground : détection automatique fiable du panier','a_faire',3,120,null),
-- Venaball Club
('venaball-club','Socle','Stats Live v2 hors ligne (file idempotente)','fait',3,10,'2026-10-04'),
('venaball-club','Socle','Rôles : trésorier, secrétariat, coach (lots A, B, C)','fait',3,20,'2026-10-06'),
('venaball-club','Stores','Build Android production','fait',1,30,'2026-10-29'),
('venaball-club','Stores','Build iOS 3 et soumission App Store','fait',3,40,'2026-10-30'),
('venaball-club','Stores','Fiche Play (captures, Data safety)','en_cours',2,50,null),
('venaball-club','Stores','Notifications push Android (FCM)','a_faire',2,60,null),
('venaball-club','Stores','Compteur Stats Live qui ne se recharge pas au retour sur l''onglet','a_faire',1,70,null),
('venaball-club','Après la sortie','Trésorerie v2 inspirée de Compta Nova (prompt prêt)','a_faire',5,80,null),
('venaball-club','Après la sortie','Assistant IA (propositions validées par un humain)','a_faire',3,90,null),
-- Serveur
('venaball-serveur','Socle','Multi-club : tenant, voter, marque par domaine','fait',3,10,'2026-09-09'),
('venaball-serveur','Socle','Import FFBB et lecture des PDF (Google Vision)','fait',3,20,'2026-10-02'),
('venaball-serveur','Socle','Organisation du week-end (OTM, notifications)','fait',2,30,'2026-09-30'),
('venaball-serveur','Socle','Retours de match signés, badges calculés depuis les stats','fait',2,40,'2026-10-06'),
('venaball-serveur','Sécurité','Verrou e-mail sur la liaison à une fiche joueuse','fait',2,50,'2026-10-29'),
('venaball-serveur','Sécurité','Limitation des connexions, UserChecker, IDOR parent, collision /seances','a_faire',3,60,null),
('venaball-serveur','Sécurité','Purge RGPD automatique et polices en local','a_faire',2,70,null),
('venaball-serveur','Exploitation','Sauvegarde MABB restaurée une fois pour de vrai','a_faire',3,80,null),
('venaball-serveur','Exploitation','Migration MABB vers l''instance Venaball (hébergement cluster102 fermé le 22/10 : vérifier l''état)','a_faire',5,90,null),
('venaball-serveur','Exploitation','Crons OVH (OTM, lecture des PDF)','a_faire',2,100,null),
-- Compta
('velito-compta','Noyau','Transactions, catégories, import CSV, export','fait',3,10,'2026-07-07'),
('velito-compta','Noyau','Partie double, FEC, bilan et compte de résultat','fait',3,20,'2026-07-07'),
('velito-compta','Trésorerie','Comptes réels, soldes observés, virements, contrôle mensuel','fait',3,30,'2026-11-07'),
('velito-compta','Trésorerie','Registre des tickets VEA importé (81 paiements)','fait',1,40,'2026-11-07'),
('velito-compta','Trésorerie','Connexion par le hub (Se connecter avec Velito)','en_cours',1,50,null),
('velito-compta','Trésorerie','Solde initial et import des relevés bancaires VEA','a_faire',2,60,null),
('velito-compta','Trésorerie','Rattacher les 22 tickets sans compte','a_faire',1,70,null),
('velito-compta','Suite','Clôture d''exercice et réouverture motivée','a_faire',3,80,null),
('velito-compta','Suite','Subventions et budgets','a_faire',3,90,null),
('velito-compta','Suite','Facturation VENA (devis, facture, facture électronique)','a_faire',5,100,null),
('velito-compta','Suite','Plusieurs utilisateurs par structure','a_faire',2,110,null),
-- VEA
('vea-site','Socle','Site public et agenda','fait',2,10,'2026-05-21'),
('vea-site','Socle','Scan QR de présence, XP et badges','fait',3,20,'2026-05-21'),
('vea-site','Socle','Admin des événements, présences, droit bénévole','fait',2,30,'2026-10-28'),
('vea-site','Socle','Séances récurrentes et agenda regroupé par série','fait',1,40,'2026-10-28'),
('vea-site','Socle','Page Stages','fait',1,50,'2026-10-28'),
('vea-site','À faire','Fusion des fiches en double (Hadjar, Tony, Johann…)','a_faire',2,60,null),
('vea-site','À faire','Fermer l''inscription publique directe de participants','a_faire',2,70,null),
('vea-site','À faire','Page de progression et badges de tous les membres','a_faire',2,80,null),
('vea-site','À faire','E-mails fiables (domaine vérifié)','a_faire',2,90,null),
-- Hub
('hub','Socle','Connexion unique (cookie partagé .velito.fr)','fait',3,10,'2026-05-31'),
('hub','Socle','Fournisseur OAuth et OIDC (PKCE, JWKS)','fait',3,20,'2026-06-11'),
('hub','Socle','hCaptcha sur la connexion','fait',1,30,'2026-06-11'),
('hub','Projets','Page Projets (roadmap, journal, CDC, membres)','en_cours',2,40,null),
('hub','Sécurité','Redirection ouverte après connexion corrigée','en_cours',1,50,null),
('hub','Sécurité','Code OAuth échangé une seule fois de façon atomique','a_faire',2,60,null),
('hub','Sécurité','Limitation de débit sur authorize et token','a_faire',2,70,null),
('hub','Projets','Vitrine publique des projets','a_faire',1,80,null),
-- VENA
('vena-site','Socle','Site vitrine et formulaire de devis','fait',2,10,'2026-05-21'),
('vena-site','Socle','Admin des demandes et chatbot FAQ','fait',1,20,'2026-05-21'),
('vena-site','À faire','Connexion admin réparée (par le hub)','en_cours',1,30,null),
('vena-site','À faire','Mails Resend avec un domaine vérifié','a_faire',2,40,null),
('vena-site','À faire','Traiter les demandes en attente','a_faire',1,50,null),
('vena-site','À faire','Espace client VENA','a_faire',5,60,null),
-- Arena
('arena','Socle','Élimination simple et double, poules, ELO','fait',3,10,'2026-08-12'),
('arena','Socle','Protection des mineurs et effacement RGPD','fait',2,20,'2026-09-09'),
('arena','Avant ouverture','Validation de score dans une transaction','a_faire',2,30,null),
('arena','Avant ouverture','Erreurs SQL vérifiées partout','a_faire',1,40,null),
('arena','Avant ouverture','Connexion des joueurs','a_faire',3,50,null),
('arena','Avant ouverture','Ouverture publique','a_faire',2,60,null),
-- Interactive
('interactive','Socle','Neuf jeux jouables','fait',3,10,'2026-07-10'),
('interactive','Socle','Temps réel et reconnexion en cours de partie','fait',2,20,'2026-06-09'),
('interactive','Avant de vendre','Jeton joueur lisible par tous (faille)','a_faire',3,30,null),
('interactive','Avant de vendre','Contraintes de type de jeu incohérentes en base','a_faire',1,40,null),
('interactive','Avant de vendre','Premier vrai lieu client','a_faire',2,50,null),
-- Cours
('cours','Socle','Parcours, fiches et fiches projet','fait',3,10,'2026-10-28'),
('cours','Socle','Quiz et XP','fait',2,20,'2026-08-11'),
('cours','Jury','Rapport d''enquête par projet (prompt prêt)','a_faire',2,30,null),
('cours','Jury','Préparation du jury d''avril 2027','a_faire',3,40,null),
-- Table de marque UNSS
('table-de-marque-unss','Cadrage','Maquette en ligne','fait',1,10,'2026-10-27'),
('table-de-marque-unss','Cadrage','Cahier des charges V0.4','fait',1,20,'2026-10-27'),
('table-de-marque-unss','Cadrage','Rendez-vous UNSS','a_faire',1,30,null),
('table-de-marque-unss','Réalisation','Développement','a_faire',3,40,null);

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then coalesce(e.fait_le, current_date) end
from _e e
join shared.projets p on p.slug = e.slug
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id);

-- Journal : (slug, date, type, titre, contenu)
create temp table _j (slug text, d date, type text, titre text, contenu text) on commit drop;
insert into _j values
('venaball','2026-10-30','fait','Soumission App Store (build 3)','Publication manuelle. Captures 1179×2556 exigées par Apple.'),
('venaball','2026-10-29','bug','Écran web limité à nos domaines','Un startsWith sur une URL n''est pas un contrôle d''origine : https://api.venaball.fr.site-piege.com passait.'),
('venaball-club','2026-10-30','fait','Soumission App Store (build 3)',null),
('venaball-club','2026-11-07','decision','Compta associative construite dans Venaball','Reprise des règles de Compta Nova (Willy). Pas d''API vers le hub : deux piles, deux comptabilités différentes.'),
('venaball-serveur','2026-10-03','bug','Champ codeEmarque en double : erreur 500 sur tout le site','PHP refuse deux méthodes de même nom à la casse près. Toujours grep -i un nom avant de l''ajouter.'),
('venaball-serveur','2026-09-06','decision','Dépôt passé en privé',null),
('velito-compta','2026-11-07','fait','Trésorerie associative en ligne','Comptes réels, contrôle mensuel, statuts, import sans doublon. Registre VEA importé.'),
('velito-compta','2026-11-07','bug','Pages Trésorerie en erreur 500','Les nouvelles tables n''avaient pas de GRANT pour authenticated. Le test SQL accordait tout lui-même : il vérifie maintenant les droits réels.'),
('vea-site','2026-10-29','bug','Historique de Farah Ben Salah jamais importé','Aucune présence mal rattachée : la fiche Notion n''avait pas été reprise. Corrigé avec une table de trace.'),
('vea-site','2026-10-28','fait','Mercredis Elbeuf jusqu''au 16/12','Vacances zone B et fériés sautés automatiquement.'),
('hub','2026-11-07','fait','Page Projets','Roadmap pondérée, journal, CDC, membres par projet.'),
('vena-site','2026-11-07','bug','Connexion admin bloquée sur « Connexion… »','Les clés Supabase marquées Sensitive n''étaient pas dans le JavaScript livré. Connexion déléguée au hub.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, j.d, j.type, j.titre, j.contenu
from _j j
join shared.projets p on p.slug = j.slug
where not exists (select 1 from shared.projet_journal x where x.projet_id = p.id);

commit;

-- Vérification
select p.nom, count(distinct e.id) as etapes, count(distinct j.id) as journal
from shared.projets p
left join shared.projet_etapes e on e.projet_id = p.id
left join shared.projet_journal j on j.projet_id = p.id
group by p.nom, p.ordre order by p.ordre;
