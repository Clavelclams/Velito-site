---
titre: "Ce qui ne va pas encore"
parcours: "venaball-de-zero"
ordre: 17
niveau: "debutant"
duree: 45
date: 2026-10-04
---

## Le cours

Cette leçon est la plus inconfortable du parcours, et peut-être la plus utile pour ton jury. Un projet réel a des défauts. Le jury le sait. Ce qu'il veut voir, c'est si toi, tu les connais. Un candidat qui dit « tout marche » inquiète. Un candidat qui dit « voici mes cinq risques, classés, et comment je les traite » rassure.

### La dette technique, c'est un prêt

La **dette technique** est l'ensemble des raccourcis pris pour aller vite, qu'il faudra « rembourser » plus tard en temps de correction. C'est comme un prêt : aujourd'hui tu as le gymnase plus tôt, mais tu paies des intérêts. Plus tu attends, plus ça coûte, parce que du nouveau code se construit par-dessus les raccourcis.

Ce n'est pas une honte. Venaball est utilisé par un vrai club, il fallait livrer. La faute serait de ne pas tenir la liste. Ta liste existe : `instruction/44_AUDIT_GLOBAL_2026-09-21.md` §1.8 et `instruction/44_AUDIT_COMPLET_2026-09-21.md` §6.3. Ce dernier estime les dettes critiques à « 2 jours » de travail et ajoute : « ce sont aussi ceux qu'un jury CDA regardera ».

Pour chaque point : **ce que c'est**, **le risque**, **la correction**, **comment le dire au jury**.

### Niveau 1 : perdre ou exposer des données

**1. La sauvegarde n'est pas prouvée.**
Ce que c'est : `bin/sauvegarde-bdd.sh` existe (leçon 15), mais rien ne prouve que le cron tourne, aucune restauration n'a été testée, et les fichiers déposés (`public/uploads`, `var/decharges`) ne sont pas sauvegardés. Le doc maître `00_ECOSYSTEME.md` §9 le liste encore à faire.
Risque : le jour où la base est abîmée, tu découvres que le dump est vide ou introuvable.
Correction : poser le cron, télécharger un dump, le restaurer dans une base locale, voir les joueuses ; ajouter une archive des uploads.
Au jury : « J'ai le script, il me manque la preuve. Une sauvegarde jamais restaurée n'est pas une sauvegarde. »

**2. Trois failles d'accès encore ouvertes.** Une **faille** est un défaut qui permet à quelqu'un de faire ce qu'il ne devrait pas. Les audits en listent trois, que je décris volontairement de façon générale :
- une route de l'API joueuse qui affiche des informations de joueuses sans respecter leurs réglages de confidentialité ;
- une recherche de parents, côté staff, qui ne vérifie pas que la personne trouvée appartient bien au même club ;
- deux contrôleurs qui déclarent le même préfixe d'adresse pour les séances, si bien qu'une action de suppression peut viser le mauvais objet.
Risque : fuite d'informations sur des mineures, action destructrice sur la mauvaise donnée.
Correction : filtrer selon les réglages de confidentialité, ajouter le contrôle d'appartenance au club, renommer un des deux préfixes ; puis écrire un test fonctionnel pour chacune.
Au jury : « Ces trois failles ont été trouvées par mes propres audits. Elles sont documentées et passent avant toute nouvelle fonctionnalité. »

**3. La purge RGPD n'est pas planifiée.**
Ce que c'est : le **RGPD** est la loi européenne qui oblige à ne garder les données personnelles que le temps nécessaire. La commande `app:sorties:purger-rgpd` existe (`src/Command/PurgerInscriptionsSortiesCommand.php`), mais aucun fichier `bin/cron-*.php` ne l'appelle. L'audit 44 écrit : « aucune purge RGPD ne tourne ».
Risque : des données de mineures conservées sans limite, ce qui est contraire à la loi.
Correction : un `bin/cron-rgpd-purger.php` sur le modèle des trois existants, et une trace de chaque exécution.
Au jury : « La règle de conservation est codée ; il manque le réveil automatique. »

**4. Des secrets dans l'ancien historique.**
Ce que c'est : le dépôt GitHub a été public. `00_ECOSYSTEME.md` §2.6 indique « données de mineures dans l'historique, dépôt privé depuis le 06/09 », et l'audit 44 parle d'un « historique git avec ancien secret ». Des dumps SQL ont même été commités par le passé.
Risque : quiconque a cloné le dépôt pendant qu'il était public a pu garder une copie.
Correction : considérer tout secret de l'époque comme compromis, donc le changer (on parle de **rotation**) ; nettoyer l'historique avec un outil dédié ; garder le dépôt privé.
Au jury : « J'ai appris que Git n'oublie rien. Le dépôt est privé, et un secret passé par un dépôt public se change, il ne se cache pas. »

### Niveau 2 : la porte d'entrée

**5. Pas de limitation des tentatives de connexion.**
Ce que c'est : dans `config/packages/security.yaml`, le bloc `login_throttling` est commenté sur les quatre firewalls, avec la note « à décommenter après composer require symfony/rate-limiter ».
Risque : un robot peut essayer des milliers de mots de passe sans être freiné (attaque **par force brute**).
Correction : installer le composant `symfony/rate-limiter`, décommenter les blocs, tester.
Au jury : « La configuration est prête et commentée, il manque l'installation du composant. »

**6. Pas de UserChecker.**
Ce que c'est : un **UserChecker** est une classe que Symfony consulte au moment de la connexion pour dire « ce compte est désactivé, refuse ». Aucun n'est configuré ; l'audit note « un compte `isActive=false` peut se connecter ».
Correction : une petite classe qui lève une exception si le compte est inactif, déclarée dans le firewall.

**7. Pas d'en-têtes de sécurité.**
Ce que c'est : les **en-têtes de sécurité** sont des consignes envoyées au navigateur avec chaque page (par exemple « ne m'affiche pas dans le cadre d'un autre site », « charge seulement mes scripts »). Je n'en ai trouvé aucun dans la config ni dans `public/.htaccess`.
Risque : le navigateur n'aide pas à bloquer certaines attaques.
Correction : quelques lignes dans le `.htaccess` ou un écouteur Symfony, puis vérification avec un outil en ligne d'analyse d'en-têtes.

**8. Du HTML affiché brut.**
Ce que c'est : Twig protège par défaut tout texte affiché (leçon 10). Le filtre `|raw` coupe cette protection. J'en compte 14 dans `templates/`, hors usages pour du JSON, sans nettoyeur HTML.
Risque : si un texte saisi par un utilisateur passe par `|raw`, il peut contenir un script qui s'exécute chez les autres (**XSS**).
Correction : installer le composant `symfony/html-sanitizer` et nettoyer à l'enregistrement, ou supprimer les `|raw` inutiles.

**9. Uploads dans `public/`.**
Ce que c'est : les fichiers déposés vivent surtout dans `public/uploads/`, le dossier servi directement par le serveur web. Un `public/uploads/.htaccess` bloque tout sauf les images et interdit l'exécution de scripts : c'est une bonne rustine.
Risque : une rustine dépend d'Apache ; une erreur de configuration ou un changement d'hébergeur, et des PDF redeviennent accessibles par leur adresse.
Correction : déplacer les documents hors de `public/` (comme `var/decharges` déjà) et les servir par un contrôleur qui vérifie les droits.

### Niveau 3 : la maintenance

**10. Des contrôleurs obèses.** `src/Controller/Manager/RencontreController.php` fait 1 466 lignes, `StatsLiveController.php` 1 074. Un **contrôleur** devrait seulement recevoir la demande et appeler des services (leçons 8 et 9). Risque : chaque modification peut casser autre chose. Correction : extraire la logique dans des services, petit à petit, avec un test à chaque extraction.

**11. Pas de CI, tests à l'arrêt.** Aucun robot ne lance PHPUnit, et le dernier commit sur `tests/` date du 07/07/2026 (leçon 16). Correction : un workflow GitHub qui lance `php bin/phpunit` à chaque push, puis un test par faille corrigée.

**12. Un déploiement fragile.** `deploy.ps1` vide le cache avant les migrations, sans sauvegarde ni retour arrière (leçon 15).

**13. Des docs périmées.** `instruction/11_CHECKLIST_RELEASE.md` date du 2026-02-12 et parle de `ClubScopeVoter` et de clés JWT dans `config/jwt/`, alors que le voter s'appelle `ClubVoter` et que l'ADR-0010 de `08_ADR.md` a choisi des jetons opaques. `tests/README.md` aussi est en retard. Risque : le jury lit un document faux. Correction : les mettre à jour ou les marquer « archive ».

### Ce qui est solide

Pour équilibrer, et c'est vrai :
- **L'isolation multi-club** : `src/Security/Voter/ClubVoter.php` et `src/Security/Tenant/TenantResolver.php`, avec 31 tests unitaires à eux deux.
- **Des tests anti-IDOR fonctionnels** dans `tests/Functional/Pirb/`.
- **Des décisions écrites** : 11 ADR dans `instruction/08_ADR.md`, un registre technique et un registre sécurité et RGPD.
- **Un dictionnaire de données** de 1 947 lignes dans `shemas/dictionnaire_db.md`.
- **Des audits honnêtes et datés** (41, 44), qui ont trouvé les failles ci-dessus.
- **Un produit réel**, utilisé par un club, avec une API pour deux apps mobiles.

### Ce que tu dis au jury

« Mon projet a de la dette technique, et je la tiens à jour dans des audits datés. Les priorités sont claires : prouver la sauvegarde par une restauration, fermer trois failles d'accès connues, planifier la purge RGPD et activer la limitation des tentatives de connexion. Ensuite viennent la CI, l'allègement des gros contrôleurs et la mise à jour des documents périmés. Ces défauts ne m'empêchent pas de dormir parce que je sais exactement où ils sont, et c'est ce que je veux montrer : un développeur qui voit les risques avant qu'ils ne deviennent des incidents. »

## À retenir

- La dette technique est un prêt : on va vite aujourd'hui, on paie plus tard avec des intérêts ; l'important est de tenir la liste.
- Niveau 1 : sauvegarde non prouvée, trois failles d'accès ouvertes, purge RGPD non planifiée, anciens secrets dans un historique qui a été public.
- Niveau 2 : pas de limitation de connexion, pas de UserChecker, pas d'en-têtes de sécurité, 14 `|raw` sans nettoyage, uploads dans `public/`.
- Niveau 3 : contrôleurs obèses, pas de CI, tests arrêtés depuis juillet, déploiement fragile, docs périmées.
- Ce qui est solide : multi-club testé, tests anti-IDOR, 11 ADR, registres, dictionnaire de données, produit réel.
- Au jury, chaque défaut se présente en quatre temps : quoi, risque, correction, priorité.

## Mise en pratique

Exercice de 50 minutes.

1. Ouvre `instruction/44_AUDIT_COMPLET_2026-09-21.md` §6.3. Pour chaque dette listée, écris une ligne dans un tableau à quatre colonnes : ce que c'est (en mots simples), risque, correction, temps estimé.
2. Classe tes lignes de 1 à N par priorité, en justifiant les trois premières en une phrase.
3. Dans mabb-site, vérifie toi-même deux constats de cette leçon : cherche `login_throttling` dans `config/packages/security.yaml`, et compte les lignes de `src/Controller/Manager/RencontreController.php`.
4. Entraîne-toi à présenter à voix haute deux défauts en moins d'une minute chacun, sans t'excuser.

C'est réussi quand ton tableau tient sur une page, que tu as vérifié deux constats de tes propres yeux, et que tu peux présenter un défaut sans dire « c'est pas grave ».
