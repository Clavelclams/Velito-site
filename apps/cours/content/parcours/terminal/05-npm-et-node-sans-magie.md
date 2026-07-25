---
titre: "npm et Node sans magie : install, node_modules, scripts et workspaces"
parcours: "terminal"
ordre: 5
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Tu tapes `npm install` depuis des mois. Aujourd'hui, tu vas enfin savoir ce qu'il fait, ligne par ligne.

D'abord les acteurs. **Node.js** est un programme qui exécute du JavaScript en dehors du navigateur — c'est le moteur. **npm** (Node Package Manager) est livré avec Node : c'est le magasin et le livreur de **paquets**, des morceaux de code écrits par d'autres (React, Next.js, etc.) que ton projet réutilise au lieu de tout réinventer.

Le contrat central, c'est **`package.json`**, la carte d'identité du projet. Il liste notamment :

- `dependencies` : les paquets dont le site a besoin pour fonctionner en production ;
- `devDependencies` : ceux utiles seulement pendant le développement (TypeScript, ESLint…) ;
- `scripts` : des raccourcis de commandes, on y revient.

Alors, que fait vraiment `npm install` ? Il lit `package.json`, contacte le registre npm (un immense entrepôt en ligne), télécharge chaque paquet listé **et tous les paquets dont ces paquets dépendent** (les dépendances des dépendances, en cascade), puis range tout dans le dossier **`node_modules`**. C'est pour ça que ce dossier est énorme : quelques lignes dans `package.json` peuvent déclencher des centaines de téléchargements. Analogie : `package.json` est la liste de courses, `npm install` fait les courses, `node_modules` est le garde-manger rempli. Conséquence capitale : `node_modules` ne se partage jamais (ni Git, ni clé USB) — n'importe qui peut le reconstituer avec un simple `npm install`. Le fichier **`package-lock.json`**, lui, note les versions *exactes* installées, pour que ta machine, celle d'un collègue et Vercel obtiennent le même résultat au bit près. Il se partage, lui.

Ensuite, les **scripts**. Quand tu tapes `npm run dev`, npm ouvre `package.json`, cherche `"dev"` dans `"scripts"`, et exécute la commande écrite en face (chez toi, un `next dev` avec le port 3007). `npm run build` et `npm run check-types` fonctionnent pareil. Intérêt : tout le monde tape les mêmes raccourcis courts, quelle que soit la vraie commande derrière. Bonus : `npm run` sans argument liste tous les scripts disponibles. Ces commandes sont identiques sur Windows et Linux — c'est npm qui gère la différence, d'où le fait que Vercel puisse lancer ton `npm run build` sur ses serveurs.

Reste le mot mystère : **`--workspace`**. Ton `Velito-site` est un **monorepo** : un seul dépôt qui contient plusieurs applications (dans `apps\`), gérées ensemble. Le `package.json` racine déclare ces sous-projets comme *workspaces*. Du coup :

```powershell
# À la racine : installe les dépendances de TOUS les workspaces d'un coup
npm install

# Lance le script "dev" du seul workspace apps/cours (ton site sur le port 3007)
npm run dev --workspace apps/cours

# Vérifie les types TypeScript (script "check-types" du package.json)
npm run check-types
```

`--workspace apps/cours` veut donc dire : « ne lance pas ce script à la racine, lance-le dans le sous-projet `apps/cours` ». Et **Turborepo** (le `turbo.json` que tu as vu leçon 4) est le chef d'orchestre qui sait lancer `build` ou `check-types` sur tous les workspaces dans le bon ordre, en sautant ce qui n'a pas changé. Voilà : plus un seul mot de tes commandes quotidiennes n'est magique.

## À retenir

- `npm install` lit `package.json`, télécharge les paquets et leurs dépendances en cascade, et remplit `node_modules`.
- `node_modules` ne se partage jamais (reconstructible) ; `package-lock.json` fige les versions exactes et se partage.
- `npm run xxx` exécute la commande écrite en face de `"xxx"` dans la section `scripts` du `package.json`.
- Un monorepo regroupe plusieurs apps dans un dépôt ; `--workspace apps/cours` cible le script d'un seul sous-projet.
- `dependencies` = nécessaire en production ; `devDependencies` = utile seulement pour développer.

## Mise en pratique

Objectif : vérifier chaque affirmation du cours dans ton vrai monorepo. Lecture seule, plus un `npm install` (inoffensif : il ne fait que réinstaller ce qui est déjà listé).

1. Va à la racine : `cd "C:\Users\Velito Adventure\Documents\Velito-site"`.
2. Affiche la carte d'identité du projet : `cat package.json`. Repère les sections `"scripts"` et `"workspaces"` (ou le champ équivalent). Note la commande réelle écrite en face de `"build"`.
3. Tape `npm run` (sans rien derrière) : npm liste tous les scripts disponibles. Compare avec ce que tu as lu.
4. Va voir le contrat du workspace : `cat apps\cours\package.json`. Retrouve le script `"dev"` et le port 3007 dedans, ainsi que la différence entre `dependencies` et `devDependencies`.
5. Mesure le garde-manger : `ls node_modules | Measure-Object` affiche le nombre de dossiers dans `node_modules`. Compare ce nombre (souvent plusieurs centaines) au petit nombre de dépendances déclarées dans `package.json` : la différence, ce sont les dépendances des dépendances.
6. Vérifie que tout est reconstructible : lance `npm install` à la racine et observe la sortie — il vérifie et complète `node_modules` d'après `package.json` et `package-lock.json`, sans rien casser.
7. Lance ton site en comprenant chaque mot : `npm run dev --workspace apps/cours`, ouvre `http://localhost:3007`, puis arrête avec `Ctrl+C` (leçon 3).

Résultat attendu : tu sais citer la vraie commande cachée derrière `npm run build`, expliquer pourquoi `node_modules` contient des centaines de dossiers pour quelques lignes de `package.json`, et traduire ta commande quotidienne mot à mot : « npm, lance le script dev du workspace apps/cours ».
