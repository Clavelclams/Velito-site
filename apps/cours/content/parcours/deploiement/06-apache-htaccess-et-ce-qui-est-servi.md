---
titre: "Apache et .htaccess : ce qui est servi, ce qui ne l'est pas, et l'ordre des règles"
parcours: "deploiement"
ordre: 6
niveau: "solide"
duree: 20
date: 2026-09-09
---

## Le cours

Sur OVH, Apache est le serveur web. Il reçoit chaque requête HTTP, décide s'il sert un fichier du disque ou s'il passe la main à PHP. Ce qu'il fait est réglé par des fichiers `.htaccess` dans tes dossiers — et Venaball en a deux qui comptent.

**Le principe : `public/` est la racine web.** Tout ce qui est dans `public/` est accessible par URL : `public/index.php` → `/`, `public/assets/app.css` → `/assets/app.css`, `public/uploads/doc.pdf` → `/uploads/doc.pdf`. Tout ce qui est **hors** de `public/` — `src/`, `config/`, `var/`, `.env.local` — n'est pas atteignable. C'est la première protection : ton code et tes secrets ne sont pas dans le dossier servi. Le multisite OVH pointe `manager.mabb.fr` vers `www/public` pour cette raison (ou vers `www/` avec un `.htaccess` racine qui redirige — vérifie lequel).

**`public/.htaccess` : le front controller.** Symfony génère un `.htaccess` (via `symfony/apache-pack`) qui dit : « si le fichier demandé existe sur le disque, sers-le ; sinon, envoie tout à `index.php` ». C'est ce qui fait que `/joueuses/42` — qui n'est pas un fichier — arrive au routeur Symfony. Les lignes clés :

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
```

`!-f` = « n'est pas un fichier existant ». Une requête vers un fichier réel (`/assets/app.css`) ne passe **pas** par PHP — c'est plus rapide, et c'est aussi ce qui rendait `/uploads/doc.pdf` accessible sans contrôleur.

**`public/uploads/.htaccess` : le verrou du 26 juillet.** Lis-le comme une séquence :

```apache
Options -Indexes                       # pas de listing de dossier
Require all denied                     # tout fermé par défaut
<FilesMatch "\.(jpe?g|png|gif|webp|avif|ico|heic|heif)$">
    Require all granted                # sauf les images d'affichage
</FilesMatch>
<FilesMatch "\.(php|phar|phtml|php[0-9]|pl|py|cgi|sh|htaccess)$">
    Require all denied                 # et jamais les scripts, en DERNIER
</FilesMatch>
```

Trois mécanismes : `-Indexes` (sans lui, `/uploads/` affiche la liste des fichiers), `Require all denied` puis rouverture ciblée (deny by default), et le blocage des scripts **en dernier** — parce qu'à égalité de correspondance, Apache applique la **dernière** règle. `photo.php.jpg` matche les deux `FilesMatch` ; celui du bas gagne ; refusé.

Ce qui n'y est **pas**, et pourquoi : `php_flag engine off` — n'existe pas en PHP-FPM (le mode d'OVH), et ferait tomber tout le site en 500. Un tutoriel écrit pour `mod_php` appliqué à FPM est une panne. **Vérifie toujours le mode PHP de ton hébergeur avant de copier une directive.**

**`AllowOverride` : la condition de tout ça.** Un `.htaccess` n'est lu que si la configuration Apache globale le permet (`AllowOverride All` ou au moins `FileInfo AuthConfig`). Sur OVH mutualisé, c'est activé. Sur un serveur que tu configurerais toi-même, ou sur Nginx (qui n'a pas de `.htaccess` du tout), **la protection disparaît sans erreur**. C'est la limite structurelle : un `.htaccess` protège sur Apache avec `AllowOverride`, point. La correction de fond — sortir les uploads de `public/` — ne dépend d'aucun serveur.

**Les en-têtes.** `Header always set X-Content-Type-Options "nosniff"` dans `.htaccess` (module `mod_headers`, présent chez OVH). C'est là que se posent les en-têtes de sécurité du parcours Sécurité, leçon 10, pour un site Apache. Le site vitrine venaball.fr a reçu compression (`mod_deflate`), cache (`mod_expires`) et CSP le 9 septembre par ce moyen.

**Diagnostiquer.** Un 500 juste après avoir touché un `.htaccess` = erreur de syntaxe ou directive inconnue (comme `php_flag` en FPM). Apache refuse tout le dossier. Retire la dernière ligne ajoutée, recharge. Les logs Apache sont dans le manager OVH (Statistiques et logs) — avec un délai. Un 403 sur un fichier = `Require all denied` qui s'applique (voulu ou pas). Un listing de dossier = `-Indexes` manquant.

## À retenir

- `public/` est servi ; tout le reste ne l'est pas. Ton code et tes secrets sont hors de `public/`.
- `RewriteCond !-f` : un fichier existant est servi directement, sans PHP. C'est rapide, et c'est pourquoi les uploads étaient exposés.
- `.htaccess` uploads : `-Indexes`, deny by default, images rouvertes, scripts bloqués **en dernier**.
- Pas de `php_flag` en FPM. Vérifie le mode PHP avant de copier.
- `.htaccess` ne vit que sur Apache avec `AllowOverride`. Sortir les fichiers de `public/` ne dépend de rien.

## Mise en pratique

Objectif : lire et tester les deux `.htaccess`, provoquer un 500, et poser les en-têtes de sécurité.

1. SSH MABB : `cat public/.htaccess`. Repère `RewriteCond` et `RewriteRule`. Puis `curl -I https://manager.mabb.fr/assets/app.css` (un fichier réel → 200 sans PHP) et `curl -I https://manager.mabb.fr/joueuses` (pas un fichier → passe par `index.php` → 302 vers login probablement).
2. `cat public/uploads/.htaccess`. Puis `curl -I https://manager.mabb.fr/uploads/` → 403 (pas de listing). `curl -I https://manager.mabb.fr/uploads/<un-avatar-existant>.jpg` → 200. `curl -I https://manager.mabb.fr/uploads/<un-pdf-existant>.pdf` → 403.
3. Le 500 volontaire (en **local** avec Apache, ou sur l'instance Venaball qui a peu de trafic, très vite) : ajoute `php_flag engine off` en fin de `public/uploads/.htaccess`. `curl -I …/uploads/avatar.jpg` → 500. Retire la ligne immédiatement. Tu as vu ce qu'une directive inconnue fait.
4. Vérifie `AllowOverride` : crée `public/test-override/.htaccess` avec `Require all denied` et un `index.html` dedans. `curl -I …/test-override/` → 403 = `.htaccess` lu. 200 = pas lu, toutes tes protections `.htaccess` sont inertes. Supprime le dossier.
5. En-têtes : dans `public/.htaccess`, après `RewriteEngine On`, ajoute `Header always set X-Content-Type-Options "nosniff"`, `Header always set X-Frame-Options "DENY"`, `Header always set Referrer-Policy "strict-origin-when-cross-origin"`. `curl -I https://manager.mabb.fr/` : les trois apparaissent. Si 500 : `mod_headers` absent (improbable chez OVH) — retire.
6. Lis le `.htaccess` du site vitrine venaball.fr (dans le dossier local `venaball`). Compare avec celui de Symfony : lequel a une CSP ? Ajoute une CSP `Report-Only` sur Symfony et regarde les violations dans la console.

Résultat attendu : tu lis un `.htaccess` ligne par ligne, tu as vérifié qu'il est bien appliqué, et tes en-têtes de sécurité sont posés côté Apache.
