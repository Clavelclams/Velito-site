---
titre: "Vercel et le monorepo : Root Directory, Turbo, Preview et Production"
parcours: "deploiement"
ordre: 3
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

Un dépôt GitHub, sept projets Vercel. Chaque push sur `main` peut déclencher jusqu'à sept builds. Comprendre comment Vercel lit ton monorepo évite les « ça a buildé cours alors que j'ai touché arena » et les « la variable est là mais le build ne la voit pas ».

**Un projet Vercel = un Root Directory.** Le projet `velito-site-cours` a pour Root Directory `apps/cours`. Vercel clone tout le dépôt, mais considère ce dossier comme la racine de l'application : c'est là qu'il cherche `package.json`, `next.config.js`, et c'est de là qu'il lance le build. Sept projets, sept Root Directory différents, un seul dépôt.

**La commande d'install remonte à la racine.** Dans un monorepo npm workspaces, `node_modules` est à la racine, partagé. Si Vercel faisait `npm install` dans `apps/cours`, il n'aurait pas les packages partagés (`@repo/ui`). D'où le réglage *Install Command* : `npm install --prefix=../..` — remonte de deux niveaux, installe à la racine. Tu l'as configuré en août ; c'est ce qui a résolu `Can't resolve 'gray-matter'`.

**La commande de build passe par Turbo.** `turbo run build` (avec un `--filter` implicite par le Root Directory) plutôt que `next build` direct. Deux raisons : Turbo construit d'abord les **dépendances** (`packages/ui` avant `apps/cours` — le `"dependsOn": ["^build"]` de `turbo.json`), et il **met en cache** : si `apps/arena` n'a pas changé depuis le dernier build, Turbo le saute. C'est ce qui fait qu'un push qui ne touche que `apps/cours` ne rebuilde pas les six autres — pour de vrai, il faut aussi le réglage suivant.

**« Ignored Build Step » : ne pas builder ce qui n'a pas changé.** Par défaut, chaque push déclenche un build sur **chaque** projet Vercel connecté au dépôt. Sept builds pour une fiche Markdown. Le réglage *Ignored Build Step* dans chaque projet permet une commande qui répond « rien n'a changé ici, ne builde pas » : `npx turbo-ignore` sait le faire pour un monorepo Turbo (il compare les fichiers du Root Directory et de ses dépendances avec le dernier déploiement). Si ce n'est pas configuré, vérifie : ça économise du temps de build et des minutes de ton quota Hobby.

**Turbo et les variables d'environnement.** Rappel du parcours React, leçon 9, parce que c'est ici que ça mord : Turbo isole l'environnement du build pour que son cache soit fiable. Une variable **non listée** dans `turbo.json → tasks.build.env` n'existe pas pendant `next build`. Une `NEXT_PUBLIC_*` non listée est inlinée **vide**. Une variable serveur non listée est lue au runtime, donc ça marche… sauf si tu l'utilises au build. Règle : toute variable utilisée par une app est dans `turbo.json`.

**Preview vs Production.** Push sur `main` → déploiement **Production**, le domaine `cours.velito.fr` bascule dessus automatiquement. Push sur toute autre branche → déploiement **Preview**, URL générée (`velito-site-cours-git-<branche>-vena-s-projects.vercel.app`), le domaine de prod ne bouge pas. Les variables d'environnement ont une portée (Production / Preview / Development) : une variable « Production only » n'est pas dans un Preview — utile pour pointer un Preview vers une base de test, piège si tu oublies.

**L'environnement est figé à la création.** Vercel capture les variables au moment où le déploiement est **créé** (le push), pas au build. Le 9 septembre, la variable a été sauvegardée une seconde après le push : le déploiement est parti sans. **Nouvelle variable = Redeploy**, même commit, environnement rafraîchi. Le bouton est dans le menu `…` du déploiement. Décoche « Use existing Build Cache » si tu veux être sûr que rien de figé ne traîne.

**Rollback instantané.** Chaque déploiement Production reste accessible. Si le dernier casse : Deployments → un déploiement précédent → `…` → « Promote to Production ». Le domaine bascule en secondes, sans rebuild. C'est le grand avantage de l'immuabilité : revenir en arrière ne demande pas de refaire.

**Lire un échec de build.** Deployments → le déploiement rouge → Build Logs. Cherche la première ligne `Error`. Les classiques : `Module not found` (import cassé ou dépendance non installée — vérifie l'Install Command), `Type error` (TypeScript — reproduis avec `npx tsc --noEmit`), `Failed to load SWC binary` (jamais sur Vercel, seulement en local sur un autre OS), variable `undefined` au build (pas dans `turbo.json`).

## À retenir

- Un projet Vercel = un Root Directory. Sept projets, un dépôt.
- Install Command `npm install --prefix=../..` : les `node_modules` sont à la racine du monorepo.
- Build via Turbo : dépendances d'abord, cache ensuite. `turbo-ignore` pour ne pas builder ce qui n'a pas changé.
- Variable non listée dans `turbo.json` = vide au build.
- `main` → Production. Autre branche → Preview. Environnement figé à la création → Redeploy pour une nouvelle variable.
- Rollback = Promote un ancien déploiement. Secondes, pas de rebuild.

## Mise en pratique

Objectif : configurer `turbo-ignore`, provoquer un échec de build, et faire un rollback.

1. Vercel → `velito-site-cours` → Settings → Git → Ignored Build Step. Mets `npx turbo-ignore`. Sauvegarde. Fais la même chose sur les six autres projets. Push une modification qui ne touche que `apps/cours/content` : dans Deployments, seuls cours (et peut-être hub si `packages/ui` a changé) buildent ; les autres affichent « Canceled » / « Skipped ».
2. Vérifie les Install/Build Commands de chaque projet (Settings → General). Note-les. Sont-ils identiques ? S'il y a une différence non justifiée, harmonise.
3. Échec volontaire : sur une branche, ajoute `const x: number = "texte";` dans un fichier de cours. Push. Le Preview passe rouge. Ouvre Build Logs, trouve `Type error`. Corrige, push, vert. Tu sais lire un échec.
4. Portée des variables : ajoute `NEXT_PUBLIC_TEST_PORTEE=preview-seulement` en Preview only. Push une branche, ouvre le Preview : affiche-la dans un composant → visible. Merge sur main → en prod, vide. Retire la variable.
5. Rollback : Deployments → un déploiement Production d'hier → `…` → Promote to Production. Ouvre `cours.velito.fr` : la version d'hier. Puis promeus le dernier. Tu sais revenir en arrière en 10 secondes.
6. Audit `turbo.json` : pour chaque app, `findstr /s "process.env\." apps\<app>` → liste des variables utilisées. Compare avec `tasks.build.env`. Ajoute les manquantes.

Résultat attendu : `turbo-ignore` actif partout, un échec de build lu et corrigé, un rollback fait, et `turbo.json` complet.
