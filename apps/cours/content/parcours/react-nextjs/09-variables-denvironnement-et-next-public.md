---
titre: "Variables d'environnement : NEXT_PUBLIC_, Sensitive, et pourquoi un redeploy est obligatoire"
parcours: "react-nextjs"
ordre: 9
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

Trois incidents en un mois autour des variables d'environnement : un lien qui n'apparaissait pas sur le hub, une variable « Sensitive » qui arrivait vide, un déploiement parti avant que la variable soit enregistrée. Chaque fois, la même cause : ne pas savoir **quand** et **où** une variable est lue. Cette leçon le fixe une fois pour toutes.

**Deux moments, deux mondes.** Une variable peut être lue :

- **Au build** — quand `next build` tourne sur Vercel. Sa valeur est alors **inlinée** : le texte `process.env.X` dans ton code est remplacé par la valeur littérale. Le résultat est figé dans les fichiers produits.
- **Au runtime** — quand une requête arrive et que du code serveur s'exécute. La variable est lue dans l'environnement du processus à ce moment-là.

Et une variable peut être vue :

- **Par le serveur uniquement** — le défaut. `process.env.COURS_EMAILS_AUTORISES` n'existe que dans le code qui tourne sur Vercel.
- **Par le navigateur aussi** — si elle commence par `NEXT_PUBLIC_`. Next l'inline **au build** dans le JavaScript client. Elle devient **publique** : n'importe qui peut la lire dans le code source de ta page.

Croise les deux : une `NEXT_PUBLIC_*` est inlinée au build, donc figée — changer sa valeur dans Vercel **sans rebuild** ne change rien. Une variable serveur classique est lue au runtime, mais **Vercel fige l'ensemble des variables au moment où le déploiement est créé** — pas quand il build, quand il est *créé*. C'est ce qui s'est passé le 9 septembre : ton push a créé le déploiement une seconde avant que `COURS_EMAILS_AUTORISES` soit sauvegardée, et le déploiement est parti avec un environnement qui ne la contenait pas. Un Redeploy — même commit, environnement rafraîchi — a suffi.

**Règle pratique : toute nouvelle variable exige un nouveau déploiement.** Ce n'est pas un bug Vercel, c'est une garantie : un déploiement est reproductible parce que son environnement ne bouge pas après coup.

**Ce qui doit être `NEXT_PUBLIC_` et ce qui ne doit pas.** Public : ce que le navigateur a **besoin** de connaître et qui **peut** être connu de tous — l'URL de Supabase, la clé `anon` (conçue pour être publique, la RLS fait le reste), l'URL du hub. Jamais public : `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, la liste blanche des emails, tout secret. Le test : « si cette valeur est dans le code source visible par tous, est-ce grave ? » Si oui, pas de préfixe.

**Le piège « Sensitive » de Vercel.** Marquer une variable *Sensitive* empêche de la relire dans l'interface après création — bien pour un secret. Mais ça la rend **indisponible au build** pour l'inlining. Une `NEXT_PUBLIC_*` Sensitive arrive donc **vide** dans le bundle client. Ton propre code le documente en commentaire dans plusieurs apps — c'est une leçon apprise à la dure. Règle : **`NEXT_PUBLIC_` et Sensitive sont incompatibles.** Une variable serveur peut être Sensitive sans problème (elle est lue au runtime).

**Turborepo et la liste `env`.** Dans un monorepo, Turbo isole l'environnement de chaque build pour que le cache soit fiable : il ne transmet **que** les variables listées dans `turbo.json → tasks.build.env`. Une variable absente de cette liste n'existe pas pendant `next build`, donc une `NEXT_PUBLIC_*` non listée est inlinée vide, silencieusement. C'est pour ça que `NEXT_PUBLIC_COURS_URL` et `COURS_EMAILS_AUTORISES` ont dû y être ajoutées. Quand une variable « ne marche pas » en prod alors qu'elle est bien dans Vercel, c'est la première chose à vérifier.

**En local : `.env.local`.** Jamais commité, lu par `next dev` et `next build`. `.env` (commité) porte les valeurs par défaut non secrètes et sert de documentation. Même logique qu'en Symfony.

**Lire une variable proprement côté serveur.** `process.env.X` renvoie `string | undefined`. Ne suppose jamais qu'elle existe :

```ts
const url = process.env.NEXT_PUBLIC_COURS_URL;
if (!url) return null;      // ou lever une erreur explicite au démarrage
```

Le middleware de cours fait ce test — et c'est là que la leçon précédente t'a montré qu'il faut refuser, pas laisser passer.

## À retenir

- `NEXT_PUBLIC_*` = inliné au build, visible par tous. Le reste = serveur, runtime.
- Vercel fige l'environnement à la **création** du déploiement → nouvelle variable = redeploy.
- `NEXT_PUBLIC_` + Sensitive = valeur vide. Incompatibles.
- Turbo ne transmet que les variables listées dans `turbo.json` → oubli = vide silencieux.
- Un secret n'a jamais de préfixe `NEXT_PUBLIC_`. Test : « grave si visible par tous ? »

## Mise en pratique

Objectif : voir l'inlining de tes yeux, reproduire le vide Turbo, et auditer tes variables.

1. Dans `apps/cours/.env.local`, ajoute `NEXT_PUBLIC_TEST_LECON=bonjour` et `TEST_SECRET_LECON=chut`. Dans un Client Component, affiche les deux : `{process.env.NEXT_PUBLIC_TEST_LECON}` et `{process.env.TEST_SECRET_LECON}`. Dev server : la première s'affiche, la seconde est vide. Le navigateur ne voit pas les variables serveur.
2. `npx turbo run build --filter=cours`. Puis cherche la valeur dans le build : `findstr /s "bonjour" apps\cours\.next\static\chunks\*.js`. Elle est là, en clair, dans du JavaScript public. C'est ça, l'inlining. Fais la même recherche pour `chut` : absente.
3. Reproduis le vide Turbo : retire `NEXT_PUBLIC_TEST_LECON` de… rien, elle n'est pas dans `turbo.json`. Rebuild avec Turbo : la variable est vide. Ajoute-la à `tasks.build.env` dans `turbo.json`, rebuild : elle revient. Tu viens de vivre le piège de l'isolation.
4. Audit : ouvre Vercel → projet `velito-site-cours` → Environment Variables. Pour chaque variable, réponds : build ou runtime ? publique ou serveur ? Sensitive ou pas ? Y a-t-il une `NEXT_PUBLIC_` marquée Sensitive ? (Si oui, c'est une bombe à retardement.)
5. Vérifie `turbo.json` : chaque variable utilisée dans une app est-elle listée ? `findstr /s "process.env." apps\*\app\*.tsx apps\*\lib\*.ts` te donne la liste des usages ; compare.
6. Nettoie : retire les deux variables de test du `.env.local`, de `turbo.json` et du composant.

Résultat attendu : tu sais lire l'inlining dans un bundle, tu as reproduit le vide Turbo, et tu as audité tes variables avec les bonnes questions.
