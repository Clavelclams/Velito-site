---
titre: "Venaball"
avancement: 75
statut: "en cours"
maj: 2026-07-25
---

## C'est quoi

Venaball est une plateforme de gestion de clubs de basket, développée en Symfony et en production sur OVH (`mabb.fr`, `manager.mabb.fr`, `pirb.mabb.fr`), doublée d'une application mobile Expo pour les joueuses. Le produit a été rebaptisé en cours de route : l'outil de gestion **MABB Manager** est devenu **Venaball Club**, et l'espace joueuse **PIRB** est devenu **Venaball** — le code, lui, garde les anciens noms (namespaces `Pirb`, domaine `pirb.mabb.fr`), seule l'interface parle de Venaball. La plateforme couvre l'effectif, les séances et présences, les rencontres, les stats live, la gamification, le secrétariat, la trésorerie et la vie associative, en multi-club (multi-tenant) avec import des données officielles FFBB.

## Comment c'est construit

**Stack** : Symfony 7.4 (PHP >= 8.2, plateforme 8.3), Doctrine ORM 3, MySQL, Twig + Stimulus/Turbo pour le web, API JSON native pour l'app mobile Expo/React Native (cf. `composer.json`). PDF via Dompdf, imports Excel via PhpSpreadsheet, OCR via Google Vision.

**Monolithe modulaire en 4 domaines** (ADR-0001) : 67 entités réparties en `Core` (socle : `src/Entity/Core/User.php`, `Club.php`, `UserClubRole.php`, `ApiToken.php`), `Sport` (métier : Joueur, Equipe, Seance, Rencontre, Presence...), `Pirb` (espace joueuse) et `Vitrine` (CMS public). 88 contrôleurs, 46 services, 80 migrations.

**Architecture en couches** : Controller mince (ex. `src/Controller/Api/PirbApiController.php`) → Service métier (ex. `src/Service/SaisonService.php`, `src/Service/Sport/CategorieCalculator.php`, `src/Gamification/XpCalculator.php`) → Repository → Entity.

**Sécurité** : sept firewalls séparés par sous-domaine (ADR-0002) ; isolation multi-tenant par `club_id` (ADR-0003) portée par `src/Security/Tenant/TenantResolver.php` (club actif en session, revérifié à chaque lecture) et `src/Security/Voter/ClubVoter.php` (rôles par club via `UserClubRole` : DIRIGEANT, COACH, STAFF, JOUEUR, SECRETAIRE...). L'API mobile s'authentifie par jeton opaque hashé SHA-256 (`src/Security/ApiTokenHandler.php`). RGPD outillé : `src/Service/Rgpd/RgpdAnonymizer.php` et `RgpdExporter.php`. Push mobile via `src/Service/ExpoPushService.php`.

**Tests** : PHPUnit 12, tests unitaires (`tests/Unit/Security/Voter/ClubVoterTest.php`, `tests/Unit/Service/Sport/CategorieCalculatorTest.php`) et fonctionnels anti-IDOR (`tests/Functional/Pirb/PirbIdorTestCase.php`).

## Les décisions techniques et POURQUOI

- **2026-02-12 — ADR-0001, monolithe modulaire** : un seul projet Symfony découpé par domaines plutôt que des microservices — déploiement simple, entités Core partagées, discipline de découpage par dossier.
- **2026-02-12 — ADR-0002, séparation par host + firewalls** : `mabb.fr` / `manager.mabb.fr` / `pirb.mabb.fr`, chaque espace a son fichier de routes et son firewall — isolation forte entre publics.
- **2026-02-12 — ADR-0003, multi-tenant par `club_id`** : une seule base, filtrage systématique côté serveur via Voter — plus simple qu'une base par club, au prix d'une vigilance absolue (tests anti-fuite obligatoires).
- **2026-02-12 — ADR-0004, Twig/UX + API** : pas de SPA ; rendu serveur pour le web, API REST pour le mobile — UX rapide sans complexité front, le mobile consomme la même logique métier.
- **2026-02-12 — ADR-0005, Symfony 7.4 au lieu de 6.4 LTS** : projet en développement initial, pas de contrainte LTS immédiate ; passage en LTS à évaluer avant industrialisation.
- **2026-02-13 — ADR-0006, rôles par club via pivot** : table `UserClubRole` (catalogue + horodatage) plutôt qu'un JSON — audit natif, un user peut être COACH dans un club et PARENT dans un autre.
- **2026-07-06 — ADR-0007 puis ADR-0010, API mobile en Symfony natif** : jetons opaques hashés (entité `ApiToken`, authenticator `access_token` natif) au lieu de LexikJWT — zéro dépendance nouvelle, révocation immédiate ; JWT/API Platform différés en phase 2.
- **2026-07-05 — ADR-0008, stats filtrées par type de rencontre** : les moyennes de saison n'incluent que les matchs OFFICIELS (convention FFBB) — corrige un bug de moyennes gonflées par les matchs internes.
- **2026-07-07 — ADR-0011, `InscriptionSortie` séparée** : les sorties (avec mineures non licenciées) ne passent pas par `EvenementParticipation` — préserve la gamification et cadre le RGPD (purge fin de saison, décharges hors `public/`).

## État d'avancement honnête

D'après `instruction/31_ETAT_REEL_2026-07-13.md` (document maître) et `24_ETAT_AVANCEMENT_VS_CDC` : le **cœur métier utilisé au quotidien par le club MABB est à ~90 %, solide et en prod** ; la vision CDC complète de l'écosystème SaaS est à ~60 % (les pans commerciaux — plans payants, boutique, messagerie — sont volontairement non commencés). Par application : vitrine ~82 %, manager ~82 %, espace joueuse web ~68 %, app mobile ~85 % (bloquée par la sortie stores, pas par le code).

Ce qui est **réellement problématique** (classé par gravité dans le doc d'état) :
- **7 uploaders sur 8 écrivent dans `public/uploads/`** : justificatifs financiers et photos de mineures accessibles par URL devinée (RT-0011, ouvert).
- **Le cron de purge RGPD (`app:sorties:purger-rgpd`) n'est pas déclaré dans le dépôt** : si personne ne l'a configuré sur OVH, la purge n'a jamais tourné.
- **Aucune sauvegarde de la base de prod.**
- Stats live à fiabiliser : minutes jouées et titulaires calculés faux (RT-0012), promotion des sessions manuelle, doublon d'agrégateurs (RT-0013).
- Mailer Brevo posé mais domaine non authentifié (DKIM/SPF à finir).
- Confirmés absents : messagerie interne (seul vrai trou métier), plans/abonnements, QR/carte membre, export iCal, recherche globale.

## Prochaines étapes

1. **Régler la dette RGPD avant tout** : déplacer les uploads sensibles hors de `public/` (sur le modèle de `DechargeSortieUploader`) et vérifier/poser le cron de purge sur OVH.
2. **Mettre en place une sauvegarde de la base de prod** (aucune n'existe).
3. **Sortir l'app sur les stores** (chemin critique du plan de fin de projet, doc 26) : compte Apple Developer, build EAS, TestFlight, test terrain avec une vraie joueuse.
4. **Finir le mailer Brevo** (DKIM/SPF sur la zone DNS OVH) pour que convocations, invitations et reset partent vraiment.
5. **Étoffer les tests** sur Manager et l'API (bloc attendu au jury, aujourd'hui mince) et fiabiliser les stats live (minutes réelles depuis les entrées/sorties `PresenceTerrain`).
