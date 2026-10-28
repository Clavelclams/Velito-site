---
titre: "Défendre Venaball devant le jury"
parcours: "venaball-de-zero"
ordre: 18
niveau: "debutant"
duree: 60
date: 2026-10-04
---

## Le cours

Tu arrives au bout du parcours. Tu as vu Venaball de dehors, puis chaque pièce, puis ses défauts. Cette dernière leçon transforme tout ça en une prestation : ce que tu montres au jury, ce que tu dis, et comment tu réponds quand une question te met en difficulté.

### Le jury CDA, c'est quoi

Le titre professionnel **CDA** (Concepteur Développeur d'Applications, niveau 6) est délivré après une épreuve devant un **jury** de professionnels du métier. En général, l'épreuve s'appuie sur un **dossier de projet** (un document écrit où tu racontes ton projet réel : besoin, conception, réalisation, tests, déploiement), une **présentation orale** de ce projet, un **entretien technique** où le jury creuse tes choix, un questionnaire professionnel et un entretien final sur ton parcours. Les durées exactes, l'ordre et les documents à rendre : **à vérifier auprès de l'AFPA**, dans le référentiel et le règlement de ta session. Ne te fie pas à ce que dit un forum.

Retiens l'esprit : le jury ne note pas Venaball, il note **toi**. Un projet modeste parfaitement compris bat un projet énorme récité. C'est comme un entretien avec un recruteur de club : il ne regarde pas seulement les trophées de l'équipe, il veut savoir ce que tu faisais sur le terrain.

### Les trois blocs, et où sont tes preuves

Le titre se découpe en trois **CCP** (certificats de compétences professionnelles). Pour chacun, voici les morceaux de Venaball qui servent de preuve, et les trous à combler d'ici avril. Les intitulés précis des compétences sont à relire dans le référentiel officiel.

**CCP1 : Développer une application sécurisée.**
- Interfaces : les templates Twig de `templates/manager/` et `templates/pirb/` (leçon 10), et les deux apps Expo (`Pirb store`, `venaball club-store`) pour le mobile.
- Composants métier : les services de `src/Service/`, par exemple `src/Service/Sport/CategorieCalculator.php` (leçon 9).
- Sécurité : `src/Security/Voter/ClubVoter.php`, jetons CSRF sur les formulaires, mots de passe hachés (leçon 11).
- Gestion de projet : le journal et le chemin critique de `instruction/00_ECOSYSTEME.md`.
- Trou : les maquettes d'écran. Il n'y en a pas. Tu peux en refaire quelques-unes à partir des écrans existants, en le disant honnêtement.

**CCP2 : Concevoir et développer une application sécurisée organisée en couches.**
- Architecture : `instruction/08_ADR.md`, avec 11 décisions, dont ADR-0001 (monolithe modulaire Symfony), ADR-0002 (séparation par host et firewalls), ADR-0003 (multi-tenant par `club_id`), ADR-0010 (API mobile avec jeton opaque).
- Couches : contrôleurs (`src/Controller/`), services (`src/Service/`), entités et repositories (`src/Entity/`, `src/Repository/`), vues (`templates/`).
- Base de données : 68 fichiers d'entités dans `src/Entity/`, environ 90 migrations dans `migrations/`, le dictionnaire `shemas/dictionnaire_db.md` (1 947 lignes).
- Trous : **aucun MCD ni MLD** (le **MCD**, modèle conceptuel de données, est le schéma des « choses » et de leurs liens ; le **MLD**, modèle logique, le traduit en tables et clés). **Aucun UML exploitable** : `puml/index.puml` ne contient qu'une classe d'exemple `Client`. Bonne nouvelle : la commande `make:puml` existe dans `src/Command/PumlCommand.php` et génère un diagramme de classes à partir des entités. C'est un point de départ, à réduire aux 10 à 15 entités centrales pour qu'il reste lisible.

**CCP3 : Préparer le déploiement d'une application sécurisée.**
- Tests : 153 méthodes dans `tests/`, dont les tests anti-IDOR de `tests/Functional/Pirb/` (leçon 16).
- Déploiement : `deploy.ps1`, la procédure de `00_ECOSYSTEME.md` §2.6, les crons de `bin/cron-*.php`, la sauvegarde `bin/sauvegarde-bdd.sh` (leçon 15).
- Trous : **pas de plan de tests** écrit, **pas de cahier de recette**, **pas de CI**, **pas de document de déploiement à jour** (le script et la doc maître divergent, `11_CHECKLIST_RELEASE.md` est périmé), **pas de restauration de sauvegarde prouvée**.

### Ton plan d'ici avril

Dans l'ordre, sans t'éparpiller : fermer les failles critiques (leçon 17), restaurer une sauvegarde une fois, écrire un MCD et un MLD sur une dizaine de tables centrales, générer et nettoyer un diagramme de classes avec `make:puml`, poser une CI qui lance `php bin/phpunit`, écrire un plan de tests et une recette, réécrire une procédure de déploiement unique. Chaque morceau est un chapitre de ton dossier.

### Ton pitch de deux minutes

À apprendre, puis à dire avec tes mots :

« Je m'appelle Clavel, je suis en alternance CDA. Mon projet s'appelle Venaball. Au départ, c'était l'outil d'un club de basket d'Amiens, l'Amiens Métropole Basket Ball : les coachs géraient les convocations, les présences et les stats sur papier et dans des groupes de messagerie. J'ai construit une application web en Symfony 7.4 et PHP 8.3, avec une base MySQL, qui sert trois publics : le staff du club, les joueuses et le grand public avec le site vitrine.

Le cœur technique, c'est le multi-club. Un seul code, une seule base, et chaque donnée appartient à un club. Un voter Symfony, le ClubVoter, vérifie sur chaque action que la personne a le bon rôle dans le bon club, et des tests fonctionnels prouvent qu'une joueuse ne peut pas ouvrir les données d'une autre équipe en changeant un numéro dans l'adresse. Le même code tourne sur deux instances : celle du club historique et Venaball, ouverte à d'autres clubs.

L'application expose aussi une API pour deux apps mobiles en React Native avec Expo : une pour les joueuses, une pour le staff, avec par exemple la saisie des statistiques en direct pendant le match.

J'ai documenté mes choix dans onze ADR et j'ai fait réaliser des audits réguliers. Je connais les limites : la couverture de tests est partielle, il n'y a pas encore d'intégration continue, et quelques failles connues sont en cours de correction. Je vais vous montrer comment l'application est organisée, puis une fonctionnalité de bout en bout : la convocation d'une joueuse à un match. »

### Vingt questions probables, et une réponse qui tient

1. **Pourquoi Symfony ?** Framework PHP structuré, sécurité intégrée (firewalls, voters, CSRF), Doctrine pour la base, et l'hébergement OVH mutualisé fait tourner PHP.
2. **Pourquoi un monolithe et pas des microservices ?** Je suis seul, un seul déploiement est plus simple à maîtriser. C'est l'ADR-0001.
3. **Comment un club ne voit-il pas les données d'un autre ?** Chaque entité métier porte un club ; `TenantResolver` détermine le club courant, `ClubVoter` refuse si l'utilisateur n'a pas de rôle dans ce club.
4. **C'est quoi une IDOR et comment tu t'en protèges ?** Changer un identifiant dans l'URL pour voir la donnée d'un autre. Je vérifie l'appartenance côté serveur et je le prouve par des tests qui exigent un 403.
5. **Comment sont stockés les mots de passe ?** Hachés par Symfony (`password_hashers` réglé sur `auto` dans `security.yaml`), jamais en clair. Le hachage est à sens unique.
6. **Comment l'app mobile s'authentifie ?** Par un jeton envoyé dans l'en-tête de chaque requête, un jeton opaque choisi à la place de JWT (ADR-0010).
7. **C'est quoi une migration ?** Un fichier versionné qui modifie la structure de la base, pour que tous les serveurs aient le même schéma.
8. **Montre-moi ton MCD.** Aujourd'hui j'ai un dictionnaire de données de près de 2 000 lignes ; je prépare un MCD et un MLD sur les tables centrales pour le dossier.
9. **Quels tests as-tu ?** 140 unitaires, surtout sur la sécurité multi-club, et 13 fonctionnels anti-IDOR, lancés avec PHPUnit.
10. **Qu'est-ce qui n'est pas testé ?** L'API Club, les imports, la trésorerie, la purge RGPD. C'est une limite connue ; je commencerais par l'API Club.
11. **As-tu une intégration continue ?** Non. C'est une limite connue. Je poserais un workflow GitHub qui lance les tests à chaque push et bloque si un test casse.
12. **Comment déploies-tu ?** Push sur GitHub, puis sur le serveur en SSH : récupération du code, Composer, migrations, vidage du cache.
13. **Ton déploiement a-t-il des défauts ?** Oui : le script vide le cache avant les migrations, ne sauvegarde pas avant et n'a pas de retour arrière. Je corrigerais l'ordre et ajouterais un dump automatique avant migration.
14. **Comment protèges-tu les secrets ?** Dans `.env.local` sur le serveur, ignoré par Git. Le dépôt a été public par le passé : j'en ai tiré la règle de changer tout secret exposé et de garder le dépôt privé.
15. **Et si le serveur brûle ?** Un dump quotidien compressé avec rotation sur 14 jours. Limite connue : il faut une copie hors serveur et une restauration testée, c'est dans mes priorités.
16. **Comment respectes-tu le RGPD avec des mineures ?** Registre RGPD, consentement, commande de purge des inscriptions. Limite connue : la purge n'est pas encore planifiée en cron.
17. **Que se passe-t-il si quelqu'un tente 10 000 mots de passe ?** Aujourd'hui rien ne le freine : la limitation est préparée mais commentée. C'est une correction d'une heure : installer le rate limiter et réactiver la config.
18. **Pourquoi `RencontreController` fait 1 466 lignes ?** Parce que la logique a grandi dans le contrôleur. Je l'extrairais en services, un morceau à la fois, avec un test à chaque étape.
19. **Une fonctionnalité de bout en bout ?** La convocation : la coach coche des joueuses, `ConvocationController` vérifie le droit, des services (`ConvocationManager`, `ConvocationMailerService`) enregistrent et préviennent, la joueuse répond depuis son espace ou l'app (leçon 13).
20. **Que ferais-tu autrement si tu recommençais ?** Les tests et la CI dès le premier jour, et un dépôt privé dès le premier commit.

Remarque la forme des réponses 10, 11, 13, 15, 16, 17 : **constat, limite connue, correction précise**. C'est la formule qui tient. Ne dis jamais « ça marche » si tu ne l'as pas vérifié.

### La question piège : « C'est toi qui as écrit ce code ? »

Elle viendra, sous une forme ou une autre. Ne mens pas, et ne t'écrase pas non plus. Le jury cherche à savoir si tu comprends et si tu assumes. Une réponse possible :

« J'ai utilisé une IA comme outil de développement, comme d'autres utilisent l'autocomplétion ou Stack Overflow. Mais c'est moi qui ai défini le besoin avec le club, pris les décisions d'architecture que j'ai écrites dans les ADR, relu et déployé chaque modification, et organisé les audits qui ont trouvé les défauts. Je me suis aperçu que je ne maîtrisais pas tous les détails, alors j'ai repris mon propre projet fichier par fichier pour pouvoir l'expliquer. Posez-moi une question sur n'importe quelle partie, je vous montre le code et je vous explique ce qu'il fait. »

Puis prouve-le : ouvre un fichier, lis-le ligne par ligne, comme dans ce parcours. C'est exactement pour ce moment-là que tu as fait les 17 leçons précédentes.

Deux pièges à éviter. Ne prétends pas avoir tout tapé seul : si le jury te demande d'expliquer une ligne et que tu bloques, ton crédit tombe. Et ne minimise pas ton rôle : décider, vérifier, déployer et corriger, c'est le métier de concepteur.

### Ce que tu dis au jury

« Venaball est un projet réel, utilisé par un club, que j'ai conçu et fait évoluer vers une plateforme multi-club. Je peux vous montrer où se trouve chaque compétence du titre dans mon code, et aussi ce qui manque encore. J'ai utilisé une IA comme outil, mais les choix, la vérification et la mise en production sont les miens, et je peux expliquer chaque partie. Mes limites sont documentées et classées par priorité, avec pour chacune la correction que je mettrais en place. »

## À retenir

- Le jury note ta compréhension, pas la taille du projet ; format et durées de l'épreuve : à vérifier auprès de l'AFPA.
- CCP1 : templates, services, ClubVoter, CSRF ; CCP2 : ADR, couches, entités, migrations, dictionnaire ; CCP3 : tests, déploiement, crons, sauvegarde.
- Trous à combler d'ici avril : MCD et MLD, UML via `make:puml`, maquettes, plan de tests et recette, CI, doc de déploiement unique, restauration testée.
- Le pitch de deux minutes présente le besoin, le cœur technique (multi-club), l'API mobile et les limites connues.
- Formule pour les questions difficiles : constat, limite connue, correction précise.
- Sur l'IA : outil assumé, mais besoin, choix, vérification et compréhension sont les tiens, et tu le prouves en lisant ton code.

## Mise en pratique

Exercice de 55 minutes.

1. Enregistre-toi avec ton téléphone en train de dire le pitch, sans lire. Réécoute, chronomètre, et note les passages où tu hésites.
2. Choisis cinq questions parmi les vingt. Pour chacune, ouvre le fichier de mabb-site qui prouve ta réponse et note son chemin exact à côté.
3. Lance `php bin/console make:puml` dans mabb-site, sur ton PC. Attention : la commande réécrit `puml/index.puml` (aujourd'hui un simple exemple) et essaie de produire `puml/index.png` avec le programme PlantUML, qui doit être installé pour l'image. Ouvre le fichier `.puml` produit et note les 10 à 15 entités que tu garderais dans ton diagramme de classes du dossier.
4. Fais-toi poser la question piège par quelqu'un, et réponds à voix haute avec tes mots, puis ouvre un fichier au hasard (par exemple `tests/Functional/Pirb/PirbSeancesIdorTest.php`) et explique-le.

C'est réussi quand ton pitch tient entre 1 min 45 et 2 min 15 sans notes, que tes cinq réponses ont chacune un chemin de fichier, et que tu as expliqué un fichier tiré au hasard sans te réfugier derrière « c'est l'IA qui l'a fait ».
