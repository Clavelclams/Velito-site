---
titre: "Du code au serveur : les trois façons dont tes sites sont servis"
parcours: "deploiement"
ordre: 1
niveau: "debutant"
duree: 20
date: 2026-09-09
---

## Le cours

Tu tapes `git push` et quelque chose apparaît sur internet. Entre les deux, il y a une chaîne d'étapes, et tu as **trois chaînes différentes** selon le projet. Les connaître te dit où chercher quand ça casse.

**Chaîne 1 : Vercel (Velito-site — hub, arena, vea, vena, interactive, compta, cours).**

1. `git push` sur GitHub.
2. GitHub prévient Vercel (webhook).
3. Vercel **clone** le dépôt, lit le *Root Directory* du projet (`apps/cours`), et lance le **build** : `npm install`, puis `next build`. Le build produit des fichiers HTML statiques (les pages SSG), du JavaScript client, et des fonctions serveur (les pages dynamiques, les Server Actions, les routes API).
4. Vercel **déploie** le résultat : les fichiers statiques sur un CDN mondial, les fonctions sur des *serverless functions* (du code qui ne tourne que quand une requête arrive, puis s'éteint).
5. Si le push était sur `main` : le domaine de production (`cours.velito.fr`) pointe vers ce déploiement. Sinon : une URL de *Preview*.

Il n'y a **pas de serveur** au sens classique. Pas de machine qui tourne en permanence, pas de SSH, pas de fichier à copier. Chaque déploiement est **immuable** : on ne modifie pas un déploiement, on en crée un nouveau. C'est pour ça qu'une variable d'environnement ajoutée après coup exige un redeploy.

**Chaîne 2 : OVH mutualisé (Venaball — mabb-site).**

1. `git push` sur GitHub.
2. **Rien ne se passe.** OVH n'écoute pas GitHub.
3. Tu te connectes en **SSH** au serveur OVH (`deploy.ps1` le fait pour toi), et tu lances `git pull` **sur le serveur** : le code est copié depuis GitHub vers le disque du serveur.
4. Puis `composer install` si les dépendances ont changé, `php bin/console cache:clear --env=prod`, `doctrine:migrations:migrate`, `asset-map:compile`.
5. Apache, qui tourne en permanence sur le serveur, sert les fichiers de `public/` et exécute PHP à chaque requête.

Ici, il y a un **vrai serveur**, avec un disque, des fichiers, un processus Apache toujours allumé. Tu peux y déposer un fichier par SFTP et il est servi immédiatement. Tu peux aussi le casser en éditant un fichier à la main. Le déploiement est **mutable** : le serveur est modifié en place.

**Chaîne 3 : SFTP pur (site vitrine venaball.fr).**

Pas de Git, pas de build : des fichiers HTML/CSS/JS écrits à la main, copiés par SFTP dans le dossier web. C'est la chaîne la plus simple et la plus fragile — pas d'historique, pas de retour en arrière, et « la version en ligne est encore celle d'août » parce que personne n'a fait l'upload.

**Ce que « build » veut dire.** Transformer le code source en ce que le serveur sert. Pour Next : compiler TypeScript, pré-rendre les pages statiques, minifier. Pour Symfony : compiler les assets (`asset-map:compile`), chauffer le cache. Un build peut **échouer** — erreur TypeScript, import cassé, variable manquante — et c'est mieux qu'un site cassé : rien n'est déployé tant que le build ne passe pas. Sur Vercel, tu le vois dans l'onglet Deployments. Sur OVH, tu le vois dans ton terminal SSH.

**Ce que « runtime » veut dire.** Le moment où une requête arrive et où du code s'exécute pour y répondre. Une page SSG n'a pas de runtime (le fichier existe déjà). Une Server Action a un runtime (une fonction démarre). Un contrôleur Symfony a un runtime (PHP s'exécute). Les variables d'environnement, les connexions à la base, les erreurs 500 : tout ça vit au runtime.

**Les environnements.** *Local* (ton PC, `npm run dev`, `symfony serve`), *Preview* (Vercel, une URL par branche), *Production* (le vrai domaine). Sur OVH, tu as deux **instances** de production (MABB et Venaball) et pas de preview — tester avant la prod se fait en local. C'est une limite à connaître.

## À retenir

- Vercel : push → build automatique → déploiement immuable sur CDN + fonctions. Pas de serveur.
- OVH : push → **rien**, puis SSH + `git pull` + commandes. Un vrai serveur, mutable.
- SFTP : copier des fichiers. Pas d'historique.
- Build = transformer le code. Échoue avant de casser le site. Runtime = répondre à une requête.
- Local, Preview, Production. OVH n'a pas de Preview : on teste en local.

## Mise en pratique

Objectif : suivre un déploiement de bout en bout sur chaque chaîne, et savoir où lire chaque étape.

1. Vercel : ouvre `vercel.com/vena-s-projects/velito-site-cours/deployments`. Clique sur le dernier déploiement. Lis « Build Logs » en entier : `npm install`, `next build`, le tableau `○ ● ƒ`, le temps. Puis « Deployment Summary » : combien de fonctions serverless, combien de fichiers statiques.
2. Fais un changement d'une ligne dans une fiche de cours, push sur une branche. Regarde le Preview apparaître dans Deployments, clique sur son URL. Ton changement est là, la prod non. Merge : la prod suit.
3. OVH : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, lis `deploy.ps1` en entier. Repère : la vérification de branche, le commit, le push, la connexion SSH, et les quatre commandes exécutées sur le serveur. Pour chacune, écris en un mot ce qu'elle fait.
4. Connecte-toi en SSH à l'instance MABB (les identifiants sont dans ton gestionnaire, pas ici). `ls -la` dans le dossier du site : tu vois `public/`, `var/`, `.env.local`, `vendor/`. `git log --oneline -3` : le serveur a son propre clone. `git status` : propre ? Si non, quelqu'un a modifié un fichier à la main sur le serveur.
5. Compare : sur Vercel, peux-tu modifier un fichier du déploiement ? Non. Sur OVH ? Oui, et c'est un risque. Écris en 3 lignes pourquoi l'immuabilité de Vercel est une protection.
6. Site vitrine : liste les 5 fichiers HTML + `.htaccess` + `assets/` à uploader (doc 43 du 09/09). Fais l'upload SFTP (FileZilla ou WinSCP). Vérifie en ligne. C'est le blocage n°1 de ta liste, et il prend 15 minutes.

Résultat attendu : tu as vu les trois chaînes en action, tu sais où lire chaque étape, et venaball.fr est enfin à jour.
