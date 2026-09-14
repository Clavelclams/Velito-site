---
titre: "Uploads : la faille de Venaball, ce qu'un fichier peut faire, et où le ranger"
parcours: "securite-web"
ordre: 8
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Accepter un fichier d'un utilisateur, c'est accepter des octets arbitraires sur ton serveur. Trois questions : qu'est-ce que c'est vraiment ? où le mettre ? qui peut le lire ? Venaball a mal répondu à la deuxième et à la troisième, et l'a corrigé le 26 juillet.

**Question 1 : qu'est-ce que c'est ?** Le nom `photo.jpg` est une chaîne choisie par l'expéditeur. Le `Content-Type` de la requête aussi. Aucun des deux ne dit ce que contient le fichier. Seule la lecture des **premiers octets** (les *magic bytes* : `FF D8 FF` pour JPEG, `89 50 4E 47` pour PNG, `25 50 44 46` pour PDF) le dit. En PHP, `finfo` ; en Node, une bibliothèque comme `file-type`. Le module signalements de VENA fait ce contrôle « type MIME réel + extension + taille » dans la Server Action, **avant** l'upload.

Trois contrôles, dans cet ordre : la **taille** (rejeter avant de lire — 5 Mo max), le **type réel** (magic bytes contre une liste blanche), et l'**extension** (qui doit correspondre au type réel — `photo.php.jpg` a une extension `.jpg` mais on la renomme de toute façon, voir plus bas).

**Question 2 : où le mettre ?** C'est la faille de Venaball. Les fichiers étaient écrits dans `public/uploads/` — le dossier servi par Apache. Un contrôleur vérifiait les droits avant d'*afficher* un fichier… mais une URL directe `https://…/uploads/doc-a3f9.pdf` ne passe par aucun contrôleur : Apache lit le disque et sert. Justificatifs de trésorerie, photos de mineures, accessibles à qui devinait le nom.

Deux réponses, de la plus rapide à la plus solide :

- **Le `.htaccess` en refus par défaut** (ce qui a été fait) : `Require all denied`, puis rouvrir uniquement les images d'affichage public, et bloquer l'exécution de scripts. Ça ferme la porte en une soirée sur un système en production. Mais ça dépend d'Apache et de `AllowOverride` : sur Nginx, ou si l'hébergeur change une directive, la protection disparaît **en silence**.
- **Sortir de la racine web** (la correction de fond, à faire) : écrire dans `var/uploads/`, un dossier qu'aucun serveur web ne sert. Le fichier n'est atteignable **que** par un contrôleur, qui vérifie les droits puis rend une `BinaryFileResponse`. Il n'existe plus de chemin où le serveur web sert le fichier seul. C'est ce que fait déjà `DechargeSortieUploader` pour les décharges — le modèle à généraliser.

Sur Supabase, l'équivalent est un **bucket privé** : les fichiers ne sont accessibles que par URL signée à durée limitée, générée par ton code après vérification. Le préfixe `user_id/` dans le chemin isole par utilisateur. C'est ce que fait VENA.

**Question 3 : que peut faire un fichier ?**

- **S'exécuter.** Un `.php` déposé dans un dossier servi par Apache avec PHP activé s'exécute à la première visite. C'est la catastrophe absolue : exécution de code sur ton serveur. Le `.htaccess` de Venaball bloque `.php`, `.phar`, `.phtml`, `.pl`, `.py`, `.cgi`, `.sh` — **en dernier**, parce qu'Apache applique la dernière règle correspondante et qu'un `photo.php.jpg` matche les deux. Et il ne fait **pas** `php_flag engine off`, qui n'existe pas en PHP-FPM (le mode d'OVH) et ferait tomber le site en 500 — un tutoriel copié sans vérifier l'environnement devient une panne.
- **Contenir un exploit** pour le logiciel qui l'ouvrira. Un PDF avec du JavaScript, une image avec un exploit de décodeur. Le serveur ne l'exécute pas, mais le poste de l'admin qui l'ouvre, peut-être. Atténuation : servir avec `Content-Disposition: attachment` (télécharger, pas ouvrir dans le navigateur) et `X-Content-Type-Options: nosniff` (le navigateur ne « devine » pas un type plus dangereux).
- **Écraser un autre fichier** si le nom est réutilisé tel quel. `../../config/services.yaml` comme nom de fichier — la *traversée de répertoire*. Solution : **ne jamais utiliser le nom fourni**. Générer un nom (`uuid.ext`), stocker le nom d'origine en base pour l'affichage.
- **Remplir le disque.** Sans limite de taille. 5 Mo max, vérifié avant lecture.

**Le nom généré règle plusieurs problèmes d'un coup.** `uuid.jpg` : pas de traversée, pas de collision, pas de `photo.php.jpg` (l'extension est celle du type réel, pas du nom envoyé), pas de nom devinable. Le nom d'origine va en base, en texte, échappé à l'affichage.

## À retenir

- Le nom et le `Content-Type` sont des déclarations. Seuls les magic bytes disent ce qu'est un fichier.
- Taille → type réel → extension, dans cet ordre, côté serveur, avant d'écrire.
- Jamais dans la racine web. `var/uploads/` + contrôleur, ou bucket privé + URL signée.
- `.htaccess` = colmatage lié à Apache. Sortir de `public/` = architecture.
- Nom généré (`uuid.ext`), nom d'origine en base. Jamais le nom fourni sur le disque.
- Servir avec `attachment` + `nosniff`. Bloquer l'exécution en dernier ressort.

## Mise en pratique

Objectif : tester le `.htaccess` de Venaball, puis migrer un uploader hors de `public/`.

1. Sur l'instance MABB (ou en local avec Apache) : trouve dans `public/uploads/` un PDF de justificatif (via le back-office). Copie son URL directe, ouvre-la en navigation privée (non connecté) → **403**. Fais pareil avec une photo d'avatar → **200** (autorisée par la liste blanche d'images). Le `.htaccess` fait ce qu'il dit.
2. Dépose un fichier nommé `test.php.jpg` contenant `<?php echo "pwned";` via un uploader (en local !). Ouvre son URL → soit 403 (bloqué), soit le contenu brut affiché en texte, jamais « pwned » exécuté. Si tu vois « pwned », le `.htaccess` ne s'applique pas — vérifie `AllowOverride`.
3. Type réel : dépose le même `test.php.jpg` via un uploader qui vérifie les magic bytes (il devrait le rejeter : ce n'est pas un JPEG). Si l'uploader l'accepte, ajoute la vérification `finfo` dans le service d'upload correspondant.
4. Migration d'un uploader : choisis le plus sensible (justificatifs de trésorerie, `NoteFraisController` ou `TresorerieController`). Sur le modèle de `DechargeSortieUploader` : écrire dans `var/uploads/tresorerie/uuid.ext`, stocker `nomOrigine` et `chemin` en base, créer une route `/tresorerie/justificatif/{id}` avec Voter + `BinaryFileResponse` avec `Content-Disposition: attachment`. Migrer les fichiers existants avec une commande. Une migration Doctrine pour les nouveaux champs.
5. Test fonctionnel anti-IDOR sur la nouvelle route : un trésorier du club A ne télécharge pas le justificatif du club B → 403.
6. VENA : lis la Server Action d'upload des signalements. Vérifie l'ordre taille → type → extension. Ajoute les en-têtes `attachment` + `nosniff` sur la route qui sert le fichier à l'admin.

Résultat attendu : tu as vu le `.htaccess` tenir, un uploader sensible est sorti de `public/`, et tu sais que c'est la migration à généraliser aux six autres.
