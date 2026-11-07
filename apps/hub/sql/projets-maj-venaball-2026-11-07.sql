-- ============================================================================
-- HUB VELITO — Projets : mise à jour Venaball, Venaball Club, serveur (07/11/2026)
-- ----------------------------------------------------------------------------
-- Complète projets-donnees-initiales-2026-11-07.sql avec l'état réel au 07/11
-- (session Claude « PIRB store and mabb-site analysis ») : review Apple,
-- statut commerçant, fiche Play, iPad, specs 47 à 50, correctifs du 29/10.
--
-- Idempotent :
--   - une étape existante (même projet, même titre) n'est que mise à jour de
--     statut, jamais dupliquée ;
--   - une étape absente est ajoutée ;
--   - une entrée de journal n'est ajoutée que si (projet, date, titre) n'existe pas.
-- Aucune donnée personnelle, aucun secret. Prérequis : sql/projets-v1.sql
-- et les données initiales. À lancer dans l'éditeur SQL de Supabase.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Étapes existantes dont le statut a changé : (slug, titre, statut, fait_le)
-- ---------------------------------------------------------------------------
create temp table _maj (slug text, titre text, statut text, fait_le date) on commit drop;
insert into _maj values
('venaball',       'Réponse de la review Apple',        'fait', '2026-11-06'),
('venaball-club',  'Fiche Play (captures, Data safety)', 'en_cours', null);

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
-- Venaball (app joueuse)
('venaball','Stores','Review Apple validée, version 1.0 prête pour la distribution','fait',2,72,'2026-11-06',null,'Les deux apps validées du premier coup.'),
('venaball','Stores','Statut de commerçant (DSA) déclaré chez Apple','fait',2,74,'2026-11-06',null,'Débloque les 27 pays de l''UE, France comprise. Sans lui, l''app était « Vente impossible » en Europe.'),
('venaball','Stores','Accepter le contrat de licence Apple mis à jour','a_faire',1,76,null,null,'Titulaire du compte. Sans ça, plus aucune mise à jour possible.'),
('venaball','Stores','Fiche Play complète (fiche, Data safety, déclaration visuels IA)','fait',2,78,'2026-11-06',null,'11 étapes de configuration sur 11.'),
('venaball','Stores','Déclarer le statut de commerçant chez Google Play','a_faire',2,85,null,'2027-02-01','Obligation DSA. Sans déclaration : plus de mise à jour puis retrait des apps.'),
('venaball','Stores','Promouvoir la 1.0.0 du test interne vers la production Play','a_faire',2,88,null,null,null),
('venaball','Finitions','Onglets : marge basse Android (libellés coupés)','fait',1,92,'2026-10-29',null,null),
('venaball','Finitions','Message clair pour un compte sans fiche joueuse (renvoie vers Venaball Club)','fait',1,94,'2026-10-29',null,null),
('venaball','Finitions','Scouting : retrait de la phrase fausse sur le nom de l''app','fait',1,96,'2026-10-29',null,null),
-- Venaball Club
('venaball-club','Stores','Review Apple validée, version 1.0 prête pour la distribution','fait',2,42,'2026-11-06',null,'Version 1.0 envoyée le 29/10 en iPhone uniquement.'),
('venaball-club','Stores','Statut de commerçant (DSA) déclaré chez Apple','fait',2,44,'2026-11-06',null,null),
('venaball-club','Stores','Accepter le contrat de licence Apple mis à jour','a_faire',1,46,null,null,null),
('venaball-club','Stores','Déposer le premier .aab dans la Play Console (app en brouillon)','a_faire',2,52,null,null,'Google refuse le tout premier envoi automatique.'),
('venaball-club','Stores','Déclarer le statut de commerçant chez Google Play','a_faire',2,54,null,'2027-02-01',null),
('venaball-club','Finitions','Onglets : marge basse Android, dernière ligne de l''accueil visible','fait',1,72,'2026-10-29',null,null),
('venaball-club','Version 1.1','Vraie version iPad : test sur l''iPad d''un employé, captures iPad 13 pouces','a_faire',3,75,null,null,'supportsTablet remis à true le 30/10 ; la 1.0 publiée est iPhone uniquement.'),
('venaball-club','Après la sortie','À-faire du coach : appels, convocations, stats, retours, déplacements (spec 48)','a_faire',3,82,null,null,'mabb-site/instruction/48_A_FAIRE_COACH_SPEC_2026-10-29.md'),
('venaball-club','Après la sortie','Déplacements : véhicules du club, covoiturage, alertes J-7 et mercredi (spec 47)','a_faire',5,84,null,null,'mabb-site/instruction/47_DEPLACEMENTS_SPEC_2026-10-29.md'),
('venaball-club','Après la sortie','Rejoindre un club : invitation e-mail, lien ou code, recherche (spec 49)','a_faire',4,86,null,null,'mabb-site/instruction/49_CLUBS_CREATION_ADHESION_SPEC_2026-10-30.md'),
-- Serveur
('venaball-serveur','Socle','Espace parent dans l''espace club (plus dans l''espace joueuse)','fait',2,42,'2026-10-29',null,null),
('venaball-serveur','Sécurité','Page d''attente aussi sur club. et app. (compte en attente)','fait',1,52,'2026-10-29',null,null),
('venaball-serveur','Sécurité','Rôle rédacteur pour la vitrine (articles, pages, galerie)','fait',1,54,'2026-10-29',null,null),
('venaball-serveur','Sécurité','Nettoyage des super-admins après la bascule (un seul : compte dédié de Clavel)','a_faire',2,56,null,null,'Procédure : doc 46, étape 10.'),
('venaball-serveur','Exploitation','TTL de la zone DNS mabb.fr passé à 300 s','fait',1,85,'2026-10-28',null,null);

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
('venaball','2026-11-06','fait','Review Apple validée','Version 1.0 prête pour la distribution.'),
('venaball','2026-11-06','bug','App introuvable en France malgré la validation','148 pays disponibles, 27 en « Vente impossible » : toute l''UE. Cause : statut de commerçant DSA non déclaré. Les mots-clés n''étaient pas en cause.'),
('venaball','2026-11-06','fait','Statut de commerçant DSA déclaré chez Apple','Adresse de VENA reprise de la fiche D-U-N-S. Déblocage de l''UE sous 24 h.'),
('venaball','2026-10-29','bug','« Airball » partout avec un compte staff','Le compte n''a pas de fiche joueuse : comportement normal, message trompeur. Message remplacé côté serveur.'),
('venaball-club','2026-11-06','fait','Review Apple validée','Version 1.0, iPhone uniquement.'),
('venaball-club','2026-10-30','decision','iPad gardé','Les employés du club travaillent sur iPad. Une autre conversation l''avait désactivé : décision de Clavel, on le garde pour la 1.1.'),
('venaball-club','2026-10-29','decision','Spec 47 Déplacements','Le responsable transport prédéfinit les véhicules du club, chaque coach gère le covoiturage de son équipe. Autorisation de transport cochée par le parent, PDF horodaté.'),
('venaball-club','2026-10-29','decision','Spec 48 À-faire du coach','Une liste unique sur le web et l''app, exigences de fluidité chiffrées. Pas de classement des coachs.'),
('venaball-club','2026-10-30','decision','Spec 49 Créer et rejoindre un club','Quatre portes : invitation e-mail, lien ou QR, code, recherche. Fin de la liste complète des clubs.'),
('venaball-club','2026-10-30','note','Modèle payant après le CDA','Apps gratuites, abonnement payé par le club (pas l''app au téléchargement). Club.plan existe déjà. Contrat de sous-traitance RGPD obligatoire.'),
('venaball-serveur','2026-10-29','decision','Verrou e-mail sur la liaison à une fiche joueuse','Une licence ou un téléphone suffisait pour prendre le compte d''une mineure. Rattachement automatique par e-mail de la fiche seulement.'),
('venaball-serveur','2026-10-29','bug','Compte en attente qui voyait tout le tableau de bord','PendingUserSubscriber ne visait que manager. et pirb., pas club. ni app.'),
('venaball-serveur','2026-10-29','decision','Rôle rédacteur pour la vitrine','Trois comptes étaient super-admins seulement pour publier des articles. Sur une plateforme multi-club, un super-admin voit tous les clubs.');

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
