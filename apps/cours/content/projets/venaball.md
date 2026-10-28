---
titre: "Venaball"
avancement: 75
statut: "en cours"
maj: 2026-10-10
---

## C'est quoi

Venaball est une plateforme de gestion de clubs de basket, développée en Symfony et en production sur OVH (`mabb.fr`, `manager.mabb.fr`, `pirb.mabb.fr`), doublée d'une application mobile Expo pour les joueuses. Le produit a été rebaptisé en cours de route : l'outil de gestion **MABB Manager** est devenu **Venaball Club**, et l'espace joueuse **PIRB** est devenu **Venaball** — le code, lui, garde les anciens noms (namespaces `Pirb`, domaine `pirb.mabb.fr`), seule l'interface parle de Venaball. La plateforme couvre l'effectif, les séances et présences, les rencontres, les stats live, la gamification, le secrétariat, la trésorerie et la vie associative, en multi-club (multi-tenant) avec import des données officielles FFBB.

## Comment c'est construit

**Stack** : Symfony 7.4 (PHP >= 8.2, plateforme 8.3), Doctrine ORM 3, MySQL, Twig + Stimulus/Turbo pour le web, API JSON native pour l'app mobile Expo/React Native (cf. `composer.json`). PDF via Dompdf, imports Excel via PhpSpreadsheet, OCR via Google Vision.

**Monolithe modulaire en 4 domaines** (ADR-0001) : 67 entités réparties en `Core` (socle : `src/Entity/Core/User.php`, `Club.php`, `UserClubRole.php`, `ApiToken.php`), `Sport` (métier : Joueur, Equipe, Seance, Rencontre, Presence...), `Pirb` (espace joueuse) et `Vitrine` (CMS public). 88 contrôleurs, 46 services, 80 migrations.

**Architecture en couches** : Controller mince (ex. `src/Controller/Api/PirbApiController.php`) → Service métier (ex. `src/Service/SaisonService.php`, `src/Service/Sport/CategorieCalculator.php`, `src/Gamification/XpCalculator.php`) → Repository → Entity.

**Sécurité** : sept firewalls séparés par sous-domaine (ADR-0002) ; isolation multi-tenant par `club_id` (ADR-0003) portée par `src/Security/Tenant/TenantResolver.php` (club actif en session, revérifié à chaque lecture) et `src/Security/Voter/ClubVoter.php` (rôles par club via `UserClubRole` : DIRIGEANT, COACH, STAFF, JOUEUR, SECRETAIRE...). L'API mobile s'authentifie par jeton opaque hashé SHA-256 (`src/Security/ApiTokenHandler.php`). RGPD outillé : `src/Service/Rgpd/RgpdAnonymizer.php` et `RgpdExporter.php`. Push mobile via `src/Service/ExpoPushService.php`.

**API de l'app staff (Venaball Club)** : `src/Controller/Api/Club/` (une classe mère `ApiClubController` qui résout le club courant, puis un contrôleur par domaine : coach, saisie Stats Live, notes de frais, cotisations, demandes, secrétariat, documents, événements). Le serveur renvoie les `droits` du compte dans `/api/club/moi`, l'app n'affiche que ce qu'on lui dit.

**Tests** : PHPUnit 12, tests unitaires (`tests/Unit/Security/Voter/ClubVoterTest.php`, `tests/Unit/Service/Sport/CategorieCalculatorTest.php`) et fonctionnels anti-IDOR (`tests/Functional/Pirb/PirbIdorTestCase.php`).

## Les décisions techniques et POURQUOI

- **2026-10-09, Migration MABB vers l'instance Venaball, procédure écrite** (`instruction/46_MIGRATION_MABB_VENABALL_2026-10-09.md`, pas encore commitée au 10/10) : l'hébergement MABB (OVH cluster102, compte de Willy) ferme le 22/10/2026. Une seule instance au lieu de deux (décision de l'audit 44) : le MABB devient un club parmi d'autres. Trois temps : préparation en lecture seule, répétition sans toucher au MABB, bascule DNS avec retour arrière possible jusqu'au 22/10.
- **2026-10-06, Badges de stats qui valorisent autre chose que les points** (`src/Gamification/BadgeChecker.php`, `src/Command/RecalculerBadgesCommand.php`, commits `3f46d3b` et `b76d766`) : passes, rebonds, interceptions, contres. Recalcul à la validation Stats Live, à la validation FFBB et à l'import Easy Stats (`syncPourRencontre`), commande de rattrapage `app:badges:recalculer`. La FFBB est exclue des badges de jeu parce que sa feuille n'a ni rebonds, ni passes, ni pertes : ses zéros donnaient « Mains sûres » à tort. Un badge n'est jamais retiré, même si les stats sont corrigées.
- **2026-10-05, Documents du club ouverts par lien signé** (`src/Controller/Api/Club/ApiClubDocumentController.php`, commit `7c2ab04`) : le navigateur du téléphone ne peut pas envoyer le jeton Bearer de l'app, donc l'app demande un lien HMAC valable 2 minutes, lié au document et au compte, et les droits sont revérifiés à l'ouverture. Une seule route publique ajoutée dans `config/packages/security.yaml`.
- **2026-10-05, API Club lots A et B, les rôles avant le store** (`ApiClubMoiController`, `ApiClubNoteFraisController`, `ApiClubCotisationController`, `ApiClubDemandeController`, `ApiClubSecretariatController`, commits `f8bef56` et `4680a56`) : secrétaire, trésorier et dirigeant ont enfin leurs écrans au lieu d'une 403. Le dirigeant voit la trésorerie sans pouvoir écrire (`TresorerieVoter` VIEW ouvert, MANAGE reste au trésorier). L'annuaire du secrétariat est en lecture seule et journalisé. En vérifiant l'upload des tickets, j'ai trouvé que les images de justificatifs étaient lisibles par URL directe : `public/uploads/.htaccess` ferme maintenant tout accès direct à `uploads/tresorerie` et `uploads/reunions`.
- **2026-10-05, Historique de démo pour la review des stores** (`src/Command/DemoClubCommand.php`, commit `8ea7a83`) : les reviewers Apple et Google doivent voir une app remplie (matchs joués, stats, tirs, retour du coach, convocation). Option `--enrichir` idempotente. Limite écrite dans la doc : le mot de passe par défaut des comptes démo est dans le code d'un dépôt qui a été public, il faut toujours lancer la commande avec `--mot-de-passe=`.
- **2026-10-05, Carte des actions** (`src/Service/Stats/CarteActionsService.php`, commit `f7dd163`) : rebonds, pertes, interceptions placés sur le terrain, dans l'app joueuse et le résumé de match du coach. Elle ne lit que la session officielle ; le shot chart des tirs existant lit encore toutes les sessions (dette connue).
- **2026-10-04, Retours de match signés, brouillon puis envoi** (`src/Entity/Sport/RetourMatch.php`, `src/Service/Stats/RetourCoachService.php`, commits `9b7f4ef` et `1c95825`) : un retour par auteur, la joueuse ne voit que ce qui a été envoyé, elle est prévenue par cloche et push ; les parents ne sont jamais notifiés et une joueuse mineure décide, retour par retour, si son parent peut le lire.
- **2026-10-04, L'import FFBB ne touche plus au statut des rencontres** (`src/Service/Import/ImportRencontresService.php`, migration `Version20261004110000`, commit `e7507bb`) : il écrivait des valeurs hors de `Rencontre::STATUTS`, ce qui rendait les rencontres importées impossibles à modifier, sans message visible. Même jour, l'import Easy Stats ne plante plus quand deux lignes visent la même joueuse (commit `b572f25`).
- **2026-10-03 — Index unique joueur/équipe/saison** (`src/Repository/Sport/JoueurEquipeRepository.php`, commit `a3aa33e`) : le composeur d'équipe créait des doublons de rattachement et tombait en erreur 500. Le même jour, un champ `codeEmarque` ajouté alors que `codeEMarque` existait déjà a cassé tout le site (commit `2fa7cbc`) : depuis, on cherche le nom dans `src/`, `templates/` et `migrations/` avant d'ajouter quoi que ce soit.
- **2026-10-01 — OCR FFBB automatique relançable** (`src/Command/ProcessFfbbResumesOcrCommand.php`, commit `c443cc1`) : un marqueur « traité » et une empreinte du PDF évitent de retraiter deux fois le même fichier, et une saisie manuelle n'est jamais écrasée. Limite : la commande renvoie toujours « succès », même en cas d'erreur.
- **2026-09-30 — Un seul service pour notifier, trois canaux** (`src/Service/Otm/OtmNotifier.php`, commit `c5621ac`) : in-app, push et mail derrière un point d'entrée unique, chaque canal isolé dans son propre try/catch. Les contrôleurs n'envoient rien eux-mêmes.
- **2026-09-30 — Une règle de saison unique (juillet)** (`src/Service/SaisonService.php`, `src/EventListener/SaisonQueryListener.php`, commit `d00f6ed`) : au lieu de dates recopiées dans plusieurs fichiers. Pas encore totalement unique : `EvaluationMatchRepository::saisonBounds()` et `GenerateurSeancesService` partent encore du 1er septembre.
- **2026-09-30 — Passage de saison : simuler avant de confirmer** (`src/Controller/Manager/PassageSaisonController.php`, commit `dccc05b`) : une opération massive passe d'abord par une simulation. Limite : pas de transaction autour, et aucune sauvegarde exigée avant.
- **2026-09-14 — `AutoLinkBenevoleListener` rendu multi-club** (commit `a82f229`) : un nouvel inscrit n'est plus rattaché au premier club par ordre alphabétique.

- **2026-09-09 — Une base de code, deux instances** : le même dépôt sert MABB Manager (`manager.mabb.fr`, cluster102, MariaDB 10.4) et Venaball Club (`club.venaball.fr` / `api.venaball.fr`, cluster100, MySQL 8.4). L'identité de marque est résolue sur le host (`MarqueResolver`), avec repli sûr sur MABB.
- **2026-09-09 — Idempotence des saisies mobiles** : `action_match.client_uid` unique + score adverse envoyé en absolu et non en delta. Une réponse perdue en 4G de gymnase ne crée plus de doublon.
- **2026-09-09 — Migrations portables** : tout DML est gardé (`AND slug = 'mabb'`), un club s'identifie par slug jamais par id, syntaxe commune MySQL/MariaDB, plus de données nominatives.
- **2026-09-09 — Validation des clubs par `valide_at` + `valide_par_id`** plutôt qu'un booléen : le quand et le qui gratuitement, méthode `valider()` idempotente.

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

**Mise à jour du 2026-10-04 (audit du code, pas de la doc).** Le produit avance vite : 83 commits depuis le 16/08 (saisons, OTM, imports FBI et EasyStats, OCR FFBB, multi-club). Les comptes développeur Apple et Google sont ouverts. (Correction du 2026-10-10 : cette ligne disait « l'hébergement MABB est renouvelé » ; `instruction/00_ECOSYSTEME.md` dit l'inverse, il ferme le 22/10/2026.) Mais la partie « projet défendable » a pris du retard :
- **Aucun test écrit depuis le 07/07** (153 méthodes de test au total, rien sur l'API Club, les imports, la trésorerie, le RGPD) et **aucune CI** qui les lance.
- **Pas de limitation des tentatives de connexion sur le web** (`login_throttling` commenté dans `config/packages/security.yaml`, `symfony/rate-limiter` absent), pas de `UserChecker` : un compte désactivé peut encore se connecter.
- **Aucun en-tête de sécurité**, et 14 `|raw` affichent du HTML du CMS sans nettoyage.
- **Trois failles d'autorisation connues et encore ouvertes** (une API qui ne respecte pas les réglages de confidentialité, une recherche qui sort du club, deux routes en collision). Fiches à écrire une fois corrigées.
- **Purge RGPD jamais planifiée**, crons OTM et OCR non vérifiés sur les serveurs.
- **Deux procédures de déploiement contradictoires** : `deploy.ps1` fait `git pull` et vide le cache avant les migrations, `00_ECOSYSTEME.md` §2.6 l'interdit.
- **Côté dossier CDA** : pas de MCD/MLD, pas d'UML exploitable (`puml/index.puml` vide, la commande `make:puml` existe), pas de maquettes. `shemas/dictionnaire_db.md` et l'ADR-0006 ne correspondent plus au code.

**Mise à jour du 2026-10-10 (21 commits du 04/10 au 06/10, aucun depuis).** Gros lot fonctionnel : API Club lots A, B, C (rôles, secrétariat, effectif, pointage, documents), retours de match signés, carte des actions, badges de stats, compte démo pour la review. Presque toutes les lignes du journal (§10.2) sont marquées « fait, à tester » : codé, pas encore éprouvé en prod ni dans un build de l'app. Ce qui pèse :
- **Le 22/10/2026, l'hébergement MABB ferme.** La base du club et ses fichiers doivent être sur l'instance Venaball avant. La procédure existe (doc 46 du 09/10) mais rien n'est exécuté au 10/10 d'après le dépôt, et l'accès OVH de Willy n'était pas disponible le 06/10. Sans cette migration, l'app du store ne sert aucune joueuse réelle.
- **Toujours aucun test depuis le 07/07** : rien sur `RetourMatch`, rien sur le lien signé des documents, alors que ce sont deux règles d'accès. Toujours pas de CI pour PHPUnit (le seul workflow GitHub, `parse-positions-ffbb.yml`, ne lance pas les tests).
- **`login_throttling` toujours commenté** dans les quatre firewalls de `config/packages/security.yaml`.
- **Les documents ENT qui sont des images restent lisibles par URL directe** : `src/Service/DocumentUploader.php` les écrit dans `public/uploads/ent/{clubId}/` avec un nom `uniqid` (dérivé de l'horloge, donc devinable), et `public/uploads/.htaccess` n'a fermé que `tresorerie` et `reunions`. Le lien signé protège la porte de l'API, pas cette fenêtre-là.
- **Deux écarts de droits assumés entre l'app et le web** (documents « Parents et staff », documents rattachés à une joueuse) : l'app est plus stricte, le web n'est pas encore aligné.
- Un badge n'est jamais retiré : si une stat erronée est corrigée, le badge gagné à tort reste.

Ce qui est **réellement problématique** (classé par gravité dans le doc d'état) :
- **Uploads : colmaté, pas réglé** (26/07). Un `.htaccess` en refus par défaut dans `public/uploads/` bloque l'accès direct à tout sauf les images d'affichage public, et neutralise l'exécution de scripts. Mais les fichiers sont toujours DANS la racine web : la protection disparaît en silence sur un serveur qui ne lit pas les `.htaccess` (Nginx) ou si `AllowOverride` est désactivé. La correction de fond — écrire hors de `public/` et servir via un contrôleur — reste à faire.
- **Le cron de purge RGPD (`app:sorties:purger-rgpd`) n'est toujours pas déclaré dans le dépôt** : si personne ne l'a configuré sur OVH, la purge n'a jamais tourné. Point ouvert.
- ~~**Fuite inter-clubs latente (09/09)** : `AutoLinkBenevoleListener` rattachait un nouvel inscrit au premier club actif.~~ Corrigé le 2026-09-14 (commit `a82f229`).
- **286 constats « le club = la MABB »** recensés dans l'audit du 09/09 (doc 42 §2), rien corrigé encore.
- **`venaball club-store` (5 100 lignes) sans remote git** depuis le 13/08 : un disque qui lâche, et l'app staff disparaît.
- **Un secret de dev commité dans `.env.dev`** (signe les tickets SSO) : à régénérer.
- **Sauvegarde de la base : le script existe, rien ne prouve qu'elle tourne.** `bin/sauvegarde-bdd.sh` est correct (`mysqldump --single-transaction`, gzip, alerte si le dump fait moins de 10 Ko, rotation 14 jours). Mais aucune trace que le cron soit posé, la dernière ligne du journal (`instruction/13_CLAUDE_LOG.md`) dit « toujours pas de sauvegarde de la base de prod », **aucune restauration n'a jamais été testée**, et les fichiers uploadés ne sont sauvegardés nulle part. Correction du 2026-10-04 : cette fiche disait à tort « en place depuis le 13/07, cron à 4 h ».
- Stats live à fiabiliser : minutes jouées et titulaires calculés faux (RT-0012), promotion des sessions manuelle, doublon d'agrégateurs (RT-0013).
- Mailer Brevo posé mais domaine non authentifié (DKIM/SPF à finir).
- Confirmés absents : messagerie interne (seul vrai trou métier), plans/abonnements, QR/carte membre, export iCal, recherche globale.

## Prochaines étapes

1. **Migrer le MABB vers l'instance Venaball avant le 22/10/2026** en suivant la doc 46 (répétition d'abord, puis bascule DNS avec Willy). Le dump fait pour la migration est aussi l'occasion de tester enfin une restauration réelle, uploads et `var/decharges` compris.
2. **Fermer les trois failles d'autorisation ouvertes, chacune avec un test** (avant toute soumission des apps sur les stores), fermer l'accès direct aux images de `uploads/ent`, puis activer `login_throttling` + un `UserChecker`.
3. **Tester en prod tout ce qui est « fait, à tester »** depuis le 04/10 (retours de match, lots A/B/C de l'API Club, badges), puis lancer `app:demo:club --enrichir` sur VELITO avec un mot de passe à moi.
4. **Mettre une CI** (`.github/workflows/ci.yml` : PHPUnit sur MySQL de test) et écrire les premiers tests sur `RetourCoachService` (qui lit quoi) et sur le lien signé des documents (expiré, signature fausse, rôle retiré).
5. **Sortir les apps sur les stores**, puis le **dossier CDA** : MCD/MLD, diagramme de classes via `make:puml`, maquettes, plan de tests.
