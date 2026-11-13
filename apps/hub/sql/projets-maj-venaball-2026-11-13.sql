-- ============================================================================
-- HUB VELITO : Projets, mise à jour Venaball du 12 et 13/11/2026
-- ----------------------------------------------------------------------------
-- Sorties stores 1.1, lot migration (groupes, CEC, prévenir d'une absence),
-- appel enrichi, séances annulées et fermetures, bilans du staff (spec 58),
-- crons VELITO. Source : mabb-site/instruction/00_ECOSYSTEME.md §10.2
-- (lignes 16 sexvicies à 18), docs 58, 59, 61.
--
-- Idempotent, même méthode que les fichiers précédents :
--   - étape existante (même projet, même titre) : statut mis à jour seulement
--     s'il change ;
--   - étape absente : ajoutée ;
--   - journal : ajouté seulement si (projet, date, titre) n'existe pas.
-- Aucune donnée personnelle, aucun secret. À lancer dans l'éditeur SQL
-- Supabase, APRÈS projets-maj-2026-11-13.sql.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Étapes existantes dont le statut change : (slug, titre, statut)
-- ---------------------------------------------------------------------------
create temp table _maj (slug text, titre text, statut text) on commit drop;
insert into _maj values
('venaball-club','Build iOS 1.1, TestFlight iPhone et iPad, captures iPad, soumission Apple','fait'),
('venaball-club','Déposer le premier .aab dans la Play Console (app en brouillon)','fait'),
('venaball-club','Fiche Play (captures, Data safety)','fait'),
('venaball-club','Accepter le contrat de licence Apple mis à jour','fait'),
('venaball','Build iOS 1.1, TestFlight, captures iPad, soumission Apple','fait'),
('venaball','Promouvoir la 1.0.0 du test interne vers la production Play','fait'),
('venaball','Build Android production et publication Play','fait'),
('venaball','Mises à jour à distance (EAS Update) pour les correctifs sans review','fait'),
('venaball','Accepter le contrat de licence Apple mis à jour','fait'),
('venaball-serveur','Crons OVH (OTM, lecture des PDF)','fait'),
('venaball-serveur','Sauvegarde MABB restaurée une fois pour de vrai','fait'),
('venaball-serveur','Limitation des connexions, UserChecker, IDOR parent, collision /seances','en_cours');

update shared.projet_etapes e
set statut = m.statut,
    fait_le = case when m.statut = 'fait' then coalesce(e.fait_le, date '2026-11-13') else null end
from _maj m join shared.projets p on p.slug = m.slug
where e.projet_id = p.id and e.titre = m.titre and e.statut is distinct from m.statut;

-- ---------------------------------------------------------------------------
-- 2. Étapes à ajouter si absentes : (slug, lot, titre, statut, poids, ordre, description)
-- ---------------------------------------------------------------------------
create temp table _e (slug text, lot text, titre text, statut text, poids int, ordre int, description text) on commit drop;
insert into _e values
-- Venaball Club
('venaball-club','Novembre 2026','Version 1.1.0 publiée sur l''App Store et Google Play','fait',3,300,
 'Apple a validé la 1.1.0 le 12/11, publiée à la main. Les mises à jour EAS (runtime 1.1.0) arrivent au deuxième lancement.'),
('venaball-club','Novembre 2026','Appel : tout cocher ou décocher, « Pas sur ce créneau », « Toutes pas sur ce créneau »','fait',2,302,
 'Une joueuse qui s''entraîne avec un autre groupe ne prend plus d''absence (aucune ligne gardée).'),
('venaball-club','Novembre 2026','Appel web : joueuse hors effectif, enfant sans fiche, « Équipes présentes » pour la CEC','fait',2,304,
 'Écoles de mini basket : fiche minimale créée et rangée dans le groupe.'),
('venaball-club','Novembre 2026','Séances annulées : annuler ou rétablir une séance, fermetures au planning, vue parent','fait',2,306,
 'Joueuses, parents et coachs prévenus par push pour une séance isolée.'),
('venaball-club','Novembre 2026','Mes bilans : bilan du staff avant une réunion (brouillon, envoi, partage)','fait',2,308,'Spec 58, première version.'),
('venaball-club','Novembre 2026','Parcours parent : validation avec rôle et enfant, comptes à placer, parents dans Membres','fait',2,310,'Spec 59, lots A et B.'),
('venaball-club','Novembre 2026','Orga du week-end : domicile seulement, filtres domicile et extérieur, vivier par rôle','fait',1,312,null),
('venaball-club','Suite','Message « Nouvelle version prête, redémarrer » à l''ouverture','a_faire',2,320,
 'Demande un nouveau build et un passage par les stores. Évite le piège du deuxième lancement.'),
('venaball-club','Suite','Appel natif : « Équipes présentes » et enfant sans fiche','a_faire',2,322,'Aujourd''hui seulement sur le web.'),
('venaball-club','Suite','Bilans v2 : questions éditables, bilans récurrents, chiffres de la période','a_faire',3,324,null),
('venaball-club','Suite','« Je viens au match » et coup de pouce à tout membre (M2)','a_faire',3,326,'Doc 61, M2.'),
-- Venaball (app joueuse)
('venaball','Novembre 2026','Version 1.1.0 publiée sur l''App Store et Google Play','fait',3,300,
 'Une joueuse restée en 1.0.0 ne reçoit aucune mise à jour EAS : elle doit passer par le store.'),
('venaball','Novembre 2026','Mes entraînements et prévenir d''une absence ou d''un retard','fait',2,302,
 'Doc 61, M1. Absence et retard acceptés d''office ; « j''étais là » validé par le coach.'),
('venaball','Novembre 2026','Entraînements annulés affichés, boutons « prévenir » masqués','fait',1,304,null),
('venaball','Suite','Message « Nouvelle version prête, redémarrer » à l''ouverture','a_faire',2,320,null),
-- Serveur
('venaball-serveur','Novembre 2026','Lot migration : groupes (écoles, open gym), CEC composée U13 à U18, présence déclarée','fait',3,300,
 'Doc 61 §0, M1 et M3. Deux migrations sur VELITO et MABB, sauvegarde avant chacune.'),
('venaball-serveur','Novembre 2026','Groupe « U15 B et U18 B » et fusion des séances passées (app:seances:fusionner-groupe)','fait',2,302,
 '42 séances passées fusionnées, appels conservés.'),
('venaball-serveur','Novembre 2026','Séances annulées et fermetures (vacances zone B 2026-2027 préchargeables)','fait',2,304,
 'Migration du 13/11. Une séance déjà pointée n''est jamais annulée.'),
('venaball-serveur','Novembre 2026','Bilans du staff (spec 58) : demandes, réponses, relance la veille','fait',3,306,'Migration du 13/11, cron horaire.'),
('venaball-serveur','Novembre 2026','Règles OTM : 2 h d''écart, majeurs pour délégué et responsable de salle','fait',1,308,null),
('venaball-serveur','Novembre 2026','Anti-robots sur l''inscription et le contact, robots.txt (IA bloquées)','fait',1,310,null),
('venaball-serveur','Novembre 2026','Crons VELITO : résumé des absences aux coachs, relance des bilans, sauvegarde 3 h','fait',1,312,null),
('venaball-serveur','Exploitation','Crons et sauvegarde nocturne sur MABB (autre compte OVH)','a_faire',1,320,null),
('venaball-serveur','Dette','Lien historique Joueur.equipe encore lu par d''anciennes pages, taux d''équipe sans la CEC','a_faire',2,322,null);

insert into shared.projet_etapes (projet_id, lot, titre, statut, poids, ordre, fait_le, description)
select p.id, e.lot, e.titre, e.statut, e.poids, e.ordre,
       case when e.statut = 'fait' then date '2026-11-13' end, e.description
from _e e join shared.projets p on p.slug = e.slug
where not exists (select 1 from shared.projet_etapes x where x.projet_id = p.id and x.titre = e.titre);

-- ---------------------------------------------------------------------------
-- 3. Journal : (slug, date, type, titre, contenu)
-- ---------------------------------------------------------------------------
create temp table _j (slug text, d date, type text, titre text, contenu text) on commit drop;
insert into _j values
('venaball','2026-11-12','bug','Les iPhone restés en 1.0.0 ne voyaient pas les nouveautés',
 'Les mises à jour EAS visent la 1.1.0. Cause trouvée chez une joueuse ; la 1.1.0 était validée par Apple mais pas encore publiée (publication manuelle).'),
('venaball-club','2026-11-12','fait','Venaball et Venaball Club 1.1.0 publiées',
 'Publication manuelle dans App Store Connect pour les deux apps.'),
('venaball-serveur','2026-11-12','bug','404 après l''appel web : deux contrôleurs sur /seances/{id}',
 'La bibliothèque de fiches gagnait sur la fiche séance (ordre alphabétique). Préfixe déplacé sous /bibliotheque. Noté dans l''audit du 06/09, jamais corrigé.'),
('venaball-serveur','2026-11-12','bug','Simulation de planning : U15 B devenu « ambigu » après création du groupe',
 'Le nom « U15 B et U18 B » ressemblait à U15 B. Un second --execute aurait désactivé la CEC. Les groupes sont exclus de la recherche d''équipes. Leçon : relancer la simulation après chaque --execute.'),
('venaball-serveur','2026-11-13','bug','Envoi des convocations de réunion en 500 sur Venaball',
 'Variable EMAIL_EXPEDITEUR absente du serveur VELITO. Repli sur MAILER_FROM dans services.yaml.'),
('venaball-club','2026-11-13','decision','Créneaux partagés : groupe commun plutôt que deux appels',
 'U15 B et U18 B s''entraînent ensemble par secteur : un groupe composé, un seul appel, « Pas sur ce créneau » pour l''autre secteur.'),
('venaball-club','2026-11-13','decision','Bilans du staff v1 : questionnaire de 2024 fixe, lancement à la main',
 'Visibilité « dirigeant » par défaut. Éditeur de questions et récurrence en v2.'),
('venaball-club','2026-11-13','note','Pause des nouvelles fonctions 2 à 3 semaines',
 'Faire vivre ce qui est livré (prévenir, bilans, fermetures, groupes), noter les retours des coachs, puis corriger. Préparer le dossier CDA.');

insert into shared.projet_journal (projet_id, date_entree, type, titre, contenu)
select p.id, j.d, j.type, j.titre, j.contenu
from _j j join shared.projets p on p.slug = j.slug
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
