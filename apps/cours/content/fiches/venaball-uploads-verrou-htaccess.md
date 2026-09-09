---
titre: "La faille que j'ai trouvée dans mon propre code : des fichiers privés servis par Apache"
projet: "venaball"
bloc: 3
themes: ["securite-applicative", "rgpd", "deploiement"]
source: "public/uploads/.htaccess (commit 145d853, 26/07/2026)"
date: 2026-09-04
---

## Le concept

Venaball écrit ses fichiers déposés dans `public/uploads/` : justificatifs de trésorerie, documents de réunion, feuilles de match, photos de joueuses — dont des mineures.

Mes contrôleurs vérifiaient bien les droits avant d'afficher un fichier. Le problème est ailleurs : **`public/` est le dossier servi par Apache**. Une requête vers `https://.../uploads/doc-a3f9.pdf` ne passe par aucun contrôleur — Apache lit le fichier sur le disque et le renvoie. Tout mon contrôle d'accès était contourné par une URL directe, sans authentification.

Les noms contenaient un identifiant court, donc devinable. Et deux PDF de réunion nominatifs s'étaient même retrouvés dans le dépôt Git.

Le correctif est un `.htaccess` en **refus par défaut** :

```apache
Options -Indexes

# Tout est fermé par défaut...
Require all denied

# ...sauf les images d'illustration, chargées directement par les pages.
<FilesMatch "\.(jpe?g|png|gif|webp|avif|ico|heic|heif)$">
    Require all granted
</FilesMatch>

# Pas d'exécution de script, quoi qu'il arrive. Ce bloc vient EN DERNIER.
<FilesMatch "\.(php|phar|phtml|php[0-9]|pl|py|cgi|sh|htaccess)$">
    Require all denied
</FilesMatch>
```

Trois choses s'y jouent.

**Le sens du défaut.** On ferme tout, puis on rouvre une liste courte. Un nouveau type de document déposé demain sera protégé sans que j'aie rien à faire — alors qu'une liste d'interdictions aurait laissé passer tout ce que je n'avais pas prévu.

**L'ordre des blocs.** Le blocage des scripts vient en dernier, parce qu'à égalité de correspondance, Apache applique la **dernière** règle qui s'applique. Un fichier déguisé en `photo.php.jpg` correspond aux deux motifs ; c'est le refus qui gagne.

**Ce qui n'est pas écrit.** Pas de `php_flag engine off` — cette directive n'existe pas quand PHP tourne en FPM/CGI, comme chez OVH, et elle ferait tomber tout le site en erreur 500. Une protection copiée d'un tutoriel sans vérifier l'environnement d'exécution devient une panne.

Les documents restent accessibles, mais **par l'application** : le contrôleur vérifie les droits puis envoie le fichier lui-même.

## Comment je l'explique au jury

« J'ai trouvé cette faille dans mon propre code lors d'un audit. J'écrivais les fichiers déposés dans le dossier servi par Apache : mes contrôleurs vérifiaient bien les droits, mais une URL directe court-circuitait complètement le contrôleur — Apache servait le fichier depuis le disque. Des justificatifs financiers et des photos de mineures étaient accessibles à qui devinait le nom. J'ai posé un `.htaccess` en refus par défaut : tout est fermé, seules les images d'affichage public sont rouvertes, et les documents passent par l'application qui vérifie les droits avant de les envoyer. J'ai aussi bloqué l'exécution de scripts, avec le bloc en dernier parce qu'Apache applique la dernière règle correspondante — sinon un fichier nommé `photo.php.jpg` passait. »

## La question vicieuse du jury

**« Un `.htaccess` ne protège que sur Apache. Si vous migrez sur Nginx, ou si un jour la directive `AllowOverride` est désactivée ? »**

La protection disparaît en silence — et c'est la vraie faiblesse de ce correctif. Un `.htaccess` n'est lu que si l'hébergeur autorise `AllowOverride`, Nginx ne le lit pas du tout, et rien ne me préviendrait : le site continuerait de fonctionner normalement, avec les fichiers de nouveau exposés. C'est un correctif adapté à **mon** hébergement OVH mutualisé, pas une solution d'architecture. La bonne réponse, c'est de **sortir les fichiers de la racine web** — les écrire dans `var/uploads/`, hors de tout dossier servi, et les délivrer uniquement via un contrôleur qui vérifie les droits puis rend une `BinaryFileResponse`. Là, il n'existe plus aucun chemin où le serveur web peut atteindre le fichier tout seul, quel que soit le serveur. C'est une migration : il faut déplacer l'existant, réécrire les chemins en base et adapter chaque affichage. Le `.htaccess` a fermé la porte en une soirée sur un système en production avec des données réelles ; le déplacement est la correction de fond, et elle est dans mes prochaines étapes.
