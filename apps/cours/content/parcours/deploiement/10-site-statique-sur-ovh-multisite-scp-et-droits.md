---
titre: "Un site statique sur OVH multisite : scp, droits Unix et le 403 qui ne prévient pas"
parcours: "deploiement"
ordre: 10
niveau: "intermediaire"
duree: 25
date: 2026-10-10
---

## Le cours

Le 10/10/2026, tu as mis en ligne deux maquettes VENA : la table de marque UNSS sur `https://tabledemarque.velito.fr` et la page « Étouvie a 70 ans » sur `https://etouvie70.velito.fr`. Pas de Symfony, pas de Next.js, pas de build : des fichiers HTML, JS et images à poser sur un serveur. Cette leçon reprend ce que tu as fait, et surtout les deux pièges que tu as rencontrés.

**Un site statique, c'est quoi.** Le serveur ne calcule rien : il renvoie les fichiers tels quels. Apache reçoit `GET /js/app.js`, cherche `js/app.js` dans le dossier du site, et le renvoie. Tout le travail se fait dans le navigateur. C'est le cas de tes deux maquettes : `index.html`, un dossier `js/` ou `img/`, et pour la table de marque un `sw.js`.

**Le multisite OVH.** Un hébergement mutualisé OVH peut servir plusieurs domaines ou sous-domaines, chacun pointé vers **son propre dossier** dans ton espace. Dans le manager OVH (Hébergements, onglet Multisite, ajouter un domaine ou sous-domaine), tu as donné trois choses :
- le **sous-domaine** (`tabledemarque.velito.fr`) ;
- le **dossier racine** : le dossier de ton hébergement qui sera servi pour ce sous-domaine. C'est là que doivent arriver `index.html` et ses voisins, pas un niveau plus bas ;
- l'option de **configuration DNS automatique** : comme `velito.fr` est géré chez OVH, le manager crée lui-même l'enregistrement qui fait pointer le sous-domaine vers l'hébergement (rappel du mécanisme dans la leçon 02 sur le DNS).

Il faut ensuite que le certificat HTTPS soit actif sur ce sous-domaine (leçon 08). Pour la table de marque ce n'est pas un confort : le service worker et `crypto.subtle` n'existent qu'en contexte sécurisé. En `http://`, l'app se charge, mais sans hors ligne et avec l'empreinte de repli `simple:` au lieu de SHA-256.

**Envoyer les fichiers avec scp.** `scp` copie des fichiers par SSH. Il est livré avec le client OpenSSH de Windows, donc il marche dans PowerShell :

```powershell
scp -r "C:\Users\...\maquette\emarque-unss\*" <login>@ssh.<cluster>.hosting.ovh.net:<dossier-racine>/
```

`-r` veut dire récursif : les dossiers et leur contenu. Le `<login>`, le `<cluster>` et le `<dossier-racine>` sont ceux de l'hébergement velito.fr ; ils ne sont pas recopiés ici.

**Piège 1 : scp -r d'un dossier vers un dossier qui existe déjà.** Si tu tapes `scp -r emarque-unss login@...:tabledemarque` et que `tabledemarque` existe déjà sur le serveur, scp crée `tabledemarque/emarque-unss/` et range tout **dedans**. Le site répond alors une page d'erreur ou un listing, parce que `index.html` est un niveau trop bas. C'est le même comportement que `cp -r` sous Linux : copier un dossier vers un dossier existant le met à l'intérieur. Deux parades : envoyer le **contenu** (`emarque-unss\*`, comme ci-dessus), ou vérifier avec `ls` sur le serveur juste après l'envoi.

**Piège 2 : les droits Unix et le 403 sur tous les .js.** Sous Linux, chaque fichier et dossier a des droits pour trois publics : le propriétaire (u), le groupe (g), les autres (o). Chacun peut lire (r = 4), écrire (w = 2), exécuter ou traverser (x = 1). Apache tourne avec un utilisateur qui n'est pas toi : il passe par les droits « groupe » ou « autres ». Pour servir un fichier, il doit pouvoir **traverser** chaque dossier du chemin (x) et **lire** le fichier (r).

Windows n'a pas ces droits. À l'envoi, scp a dû en fabriquer, et le dossier `js/` est arrivé en `700` : tout pour toi, rien pour les autres. Résultat : `index.html` (à la racine, lisible) s'affichait, mais chaque `GET /js/...` renvoyait **403 Forbidden**. Sans JavaScript, la table de marque a montré son message de secours, celui d'`index.html` qui dit « L'application ne s'est pas lancée ». Aucune erreur visible dans la page : il faut ouvrir la console (F12, onglet Réseau) pour voir les 403.

La correction, en SSH sur le serveur, dans le dossier racine :

```bash
chmod -R u=rwX,go=rX .
ls -la js/
```

Lis-la lentement : pour tout (`-R`), le propriétaire a lecture et écriture, le groupe et les autres ont lecture. Le `X` **majuscule** ajoute l'exécution seulement aux dossiers (et aux fichiers déjà exécutables). Résultat : dossiers en `755` (rwxr-xr-x), fichiers en `644` (rw-r--r--). C'est la règle à retenir pour un site statique. Ne mets jamais `777` « pour que ça marche » : tout le monde sur la machine pourrait écrire dans tes fichiers.

**Le cas du service worker.** Une fois en ligne, la table de marque met ses fichiers en cache sur la tablette. Si tu renvoies une nouvelle version sans augmenter `VERSION_CACHE` dans `sw.js`, les tablettes déjà passées gardent l'ancienne. Le déploiement d'un site hors ligne, c'est donc : modifier, augmenter `VERSION_CACHE`, envoyer, corriger les droits, vérifier.

**Ce que ce déploiement n'a pas.** Pas de git sur le dossier `maquette/`, donc pas d'historique ni de retour arrière : la version en ligne est la seule autre copie. Pas de script : chaque mise à jour se refait à la main, avec les mêmes pièges. C'est acceptable pour une maquette montrée à un client, pas pour un produit.

## À retenir

- Multisite OVH = un sous-domaine, un dossier racine, un enregistrement DNS (automatique si le domaine est chez OVH), puis un certificat HTTPS.
- `index.html` doit être directement dans le dossier racine : `scp -r dossier` vers un dossier existant le range dedans.
- Apache a besoin de x sur chaque dossier du chemin et de r sur le fichier. Site statique : 755 pour les dossiers, 644 pour les fichiers, avec `chmod -R u=rwX,go=rX .`.
- Un 403 sur les scripts ne se voit pas dans la page : onglet Réseau de la console.
- Service worker et `crypto.subtle` exigent https. À chaque nouvelle version : augmenter `VERSION_CACHE`.

## Mise en pratique

Objectif : refaire l'envoi de la table de marque proprement et l'écrire une fois pour toutes. Moins d'une heure.

1. En SSH sur l'hébergement velito.fr, va dans le dossier racine de `tabledemarque` et lance `ls -la` puis `ls -la js/`. Note les droits que tu vois. S'il reste un sous-dossier `emarque-unss/` imbriqué du premier essai, supprime-le après avoir vérifié qu'il n'est pas servi.
2. Lance `find . -type d ! -perm 755` puis `find . -type f ! -perm 644`. Les deux doivent ne rien afficher.
3. Dans un fichier texte à côté de la maquette (par exemple `maquette/DEPLOIEMENT.txt`), écris la procédure complète : augmenter `VERSION_CACHE`, la commande scp exacte (sans mot de passe), la commande chmod, et les trois vérifications (page qui s'affiche, onglet Réseau sans 403, mode avion puis rechargement).
4. Fais une modification minime (un texte de l'accueil), suis ta procédure à la lettre, puis teste en mode avion sur une tablette ou un téléphone.

C'est réussi quand la nouvelle version s'affiche après rechargement, que l'onglet Réseau ne montre aucun 403, que l'app se recharge en mode avion, et que les deux `find` ne renvoient rien.
