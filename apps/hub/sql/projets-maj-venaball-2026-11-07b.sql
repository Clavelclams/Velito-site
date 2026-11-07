-- ============================================================================
-- HUB VELITO — Projets : 2e mise à jour Venaball (07/11/2026, après-midi)
-- ----------------------------------------------------------------------------
-- Complète projets-maj-venaball-2026-11-07.sql avec la session Claude
-- « mabb-site » du 02 au 07/11 : sauvegardes testées, diagnostic des deux
-- bases (P0-0), correctifs du 07/11, console super-admin, bugs ouverts.
-- Source détaillée : mabb-site/instruction/51_ROADMAP_2026-11-07.md.
--
-- Idempotent, même méthode que le fichier précédent :
--   - étape existante (même projet, même titre) : statut mis à jour seulement ;
--   - étape absente : ajoutée ;
--   - journal : ajouté seulement si (projet, date, titre) n'existe pas.
-- Aucune donnée personnelle (ni nom, ni e-mail), aucun secret, aucun détail
-- exploitable de l'incident de sécurité. À lancer dans l'éditeur SQL Supabase,
-- APRÈS projets-maj-venaball-2026-11-07.sql.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Étapes existantes dont le statut a changé : (slug, titre, statut, fait_le)
-- ---------------------------------------------------------------------------
create temp table _maj (slug text, titre text, statut text, fait_le date) on commit drop;
insert into _maj values
('venaball-serveur', 'Sauvegarde MABB restaurée une fois pour de vrai', 'fait', '2026-11-02'),
('venaball-serveur', 'Migration MABB vers l''instance Venaball (hébergement cluster102 fermé le 22/10 : vérifier l''état)', 'en_cours', null);

update shared.projet_etapes e
set statut = m.statut,
    fait_le = case when m.statut = 'fait' then m.fait_le end
from _maj m
join shared.projets p on p.slug = m.slug
where e.projet_id = p.id and e.titre = m.titre and e.statut <> m.statut;

-- ---------------------------------------------------------------------------
-- 2. Étapes à ajouter si absentes : (slug, lot, titre, statut, poids, ordre, fait_le, echeance, description)
-- ---------------------------------------------------------------------------
create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, fait_le date, echeance date, description text) on commit drop;
insert into _e values
-- Serveur : exploitation et sécurité
('venaball-serveur','Exploitation','Sauvegarde Venaball restaurée et vérifiée','fait',2,81,'2026-11-02',null,'Base et fichiers des deux instances rapatriés hors serveur, empreintes vérifiées, restauration locale identique à la prod.'),
('venaball-serveur','Sécurité','Vérification PHP2Shell : PHP 8.3.36 servi sur les deux instances','fait',2,57,'2026-11-02',null,'Version corrigée, aucun fichier suspect, secrets de prod distincts de l''ancien secret de développement. Rapport privé hors dépôt.'),
('venaball-serveur','Sécurité','Analyse des logs OVH du 20 au 22/10, crons et comptes FTP-SSH','a_faire',2,58,null,null,'Dernier point de la vérification PHP2Shell. Décide d''une éventuelle rotation des secrets.'),
('venaball-serveur','Exploitation','Bascule : finir la doc 46 (temps 3), web et apps sur une seule base','a_faire',5,91,null,null,'Diagnostic du 07/11 : le web écrit sur cluster102, les apps lisent une copie du 09/10 sur cluster100. Prévoir l''export des clubs nés sur Venaball depuis le 09/10.'),
('venaball-serveur','Exploitation','Les mails ne partent pas depuis Venaball (mot de passe oublié bloqué)','a_faire',3,95,null,null,'Mails en file Messenger : vérifier le consommateur (cron) et le transport.'),
-- Serveur : fiabilité des apps
('venaball-serveur','Fiabilité','Erreur 500 aléatoire sur l''accueil coach (interblocage SQL)','fait',3,110,'2026-11-07',null,'Chaque requête des apps écrivait un journal de connexion et la date de dernière connexion ; les appels parallèles se bloquaient. Écriture déplacée à la vraie connexion.'),
('venaball-serveur','Fiabilité','Messages d''erreur humains renvoyés par l''API','a_faire',2,120,null,null,null),
('venaball-serveur','Fiabilité','Pages d''erreur en code 404 (elles répondent 200)','a_faire',1,130,null,null,null),
('venaball-serveur','Fiabilité','Notifications push : un envoi par app, refus journalisés, reçus Expo lus','a_faire',3,140,null,null,'Les jetons des deux apps sont mélangés par compte : un lot mixte serait refusé en entier par Expo.'),
-- Serveur : console super-admin et clubs
('venaball-serveur','Plateforme','Super-admin : plus de rattachement automatique à un club ni de blocage « en attente »','fait',2,150,'2026-11-07',null,'Le super-admin n''apparaît dans aucune liste de membres.'),
('venaball-serveur','Plateforme','Console super-admin : archiver, restaurer, rattacher un club doublon vide, sortie du mode support','en_cours',3,160,null,null,'Codé le 07/11, à déployer. Journal des actions dans un fichier dédié.'),
('venaball-serveur','Plateforme','Création de club : refus des doublons (même nom, même slug)','en_cours',2,170,null,null,'Deux doublons du MABB avaient été créés par des membres qui ne trouvaient pas leur club.'),
('venaball-serveur','Plateforme','Console : comptes sans club et action « Rattacher » (lot A)','a_faire',3,180,null,null,'32 comptes sans club actif côté apps au 07/11, dont 8 demandes validées depuis sur le web seulement.'),
('venaball-serveur','Plateforme','Club non validé archivé automatiquement après 30 jours','a_faire',1,190,null,null,null),
-- App joueuse
('venaball','Fiabilité','Tirer pour rafraîchir et rechargement au retour sur chaque écran','a_faire',3,200,null,null,'Aucun écran ne l''a aujourd''hui.'),
('venaball','Fiabilité','Plus aucun message technique à l''écran','a_faire',2,210,null,null,null),
('venaball','Fiabilité','Notifications push Android (Firebase, FCM)','a_faire',2,220,null,null,'Aucun push Android possible sans google-services.json et clés FCM dans EAS.'),
('venaball','Fiabilité','Retour sûr partout (écran ouvert par une notification)','a_faire',1,230,null,null,null),
('venaball','Fiches store','Fiche Play en français par défaut, captures sans barre TestFlight','a_faire',1,240,null,null,null),
('venaball','Socle','Mises à jour à distance (EAS Update) pour les correctifs sans review','a_faire',2,250,null,null,null),
-- App Club
('venaball-club','Fiabilité','Accueil coach : une carte en échec ne bloque plus les autres','a_faire',2,200,null,null,null),
('venaball-club','Fiabilité','File hors ligne : plafond de tentatives, aucun rejet perdu en silence','a_faire',2,210,null,null,null),
('venaball-club','Fiabilité','Écran « aucun club » avec une sortie (demande d''adhésion)','a_faire',2,220,null,null,null),
('venaball-club','Fiabilité','Plus aucun message technique à l''écran','a_faire',2,230,null,null,null);

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
-- 3. Journal : (slug, date, type, titre, contenu)
-- ---------------------------------------------------------------------------
create temp table _j (slug text, d date, type text, titre text, contenu text) on commit drop;
insert into _j values
('venaball-serveur','2026-11-02','fait','Sauvegardes des deux instances testées','Restauration locale identique à la prod (mêmes comptages). Copies serveur à supprimer.'),
('venaball-serveur','2026-11-02','note','Vérification PHP2Shell','PHP corrigé sur les deux instances, rien de suspect. Il reste les logs OVH du 20 au 22/10.'),
('venaball-serveur','2026-11-07','bug','Web et apps sur deux bases différentes','Le temps 3 de la doc 46 (bascule) n''a jamais eu lieu : les apps lisent une copie figée au 09/10, le site MABB écrit ailleurs. Explique les données manquantes et une partie des comptes sans club.'),
('venaball-serveur','2026-11-07','bug','Erreur 500 aléatoire sur l''accueil coach','Interblocage SQL : un listener de sécurité écrivait en base à chaque requête des apps. Leçon : sur un pare-feu sans état, l''authentification se rejoue à chaque appel.'),
('venaball-serveur','2026-11-07','bug','Super-admin inscrit d''office au MABB','La règle « un seul club validé = rattachement automatique » ne regardait pas qui se connectait. Corrigée pour le super-admin, à revoir pour tous.'),
('venaball-serveur','2026-11-07','decision','Un seul super-admin, invisible des clubs','Console : archiver plutôt que supprimer, rattacher seulement un doublon vide, membres déplacés en demande d''adhésion.'),
('venaball-serveur','2026-11-07','decision','Roadmap 51','Ordre : débloquer les gens, bascule, fiabilité des usages de la semaine, adoption, puis trésorerie v2 et IA.'),
('venaball','2026-11-07','bug','Notifications push jamais vérifiées de bout en bout','Android impossible sans Firebase ; iOS jamais testé sur un vrai appareil.'),
('venaball-club','2026-11-07','bug','Comptes bloqués à la connexion','Mot de passe oublié en panne côté Venaball et comptes créés sur le web après le 09/10 absents de la base des apps.');

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
