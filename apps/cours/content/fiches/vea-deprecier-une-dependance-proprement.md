---
titre: "Déprécier une dépendance sans casser le build : le stub qui échoue au bon moment"
projet: "vea"
bloc: 3
themes: ["architecture", "deploiement"]
source: "apps/vea/lib/prisma.ts"
date: 2026-09-04
---

## Le concept

VEA tournait sur MySQL avec Prisma. Tout est passé sur Supabase : plus de `schema.prisma`, plus de base MySQL. Restaient des `import prisma from "@/lib/prisma"` éparpillés dans du code peut-être mort, peut-être pas.

Trois options, et la troisième est la bonne.

**Supprimer le fichier.** Chaque import résiduel casse la compilation. Il faut donc tous les trouver d'un coup, dans une application qu'on n'a plus complètement en tête. C'est faisable, mais ça transforme une migration en chasse exhaustive avant de pouvoir déployer quoi que ce soit.

**Le laisser tel quel.** `new PrismaClient()` s'exécute **au chargement du module**, donc au build Vercel, et échoue avec « Prisma Client non généré ». Le build entier tombe pour un import que personne n'utilise peut-être jamais.

**Le stub qui échoue à l'usage** :

```ts
const prisma = new Proxy({}, {
  get() {
    throw new Error(
      "Prisma est déprécié sur VEA (migré vers Supabase). Cet appel ne devrait plus exister."
    );
  },
}) as unknown as Record<string, never>;

export default prisma;
```

Le `Proxy` intercepte tout accès à une propriété. Importer le module ne fait rien — aucune connexion, aucune initialisation. Écrire `prisma.participants` déclenche le `get`, qui lève une erreur **explicite, nommée, datée**.

Le déplacement est là : l'échec passe du **chargement** à l'**usage**. Le code mort n'est plus un problème, seul le code vivant l'est. Et quand il l'est, le message dit ce qui s'est passé et quoi faire, au lieu d'un « Prisma Client non généré » qui envoie chercher au mauvais endroit.

Le commentaire d'en-tête complète le dispositif : il dit que c'est déprécié, pourquoi, et vers quoi migrer. Une dépréciation qui ne dit pas où aller n'est qu'une panne différée.

## Comment je l'explique au jury

« En migrant VEA de Prisma vers Supabase, il restait des imports vers un client Prisma qui n'existait plus. Supprimer le fichier aurait cassé la compilation partout à la fois ; le laisser aurait fait tomber le build Vercel, parce que l'instanciation se fait au chargement du module. J'ai mis un `Proxy` qui ne fait rien à l'import et lève une erreur explicite au premier accès à une propriété. Ça déplace l'échec du chargement vers l'usage : le code mort ne bloque plus rien, et le code vivant qui utiliserait encore Prisma échoue avec un message qui dit ce qui s'est passé. C'est une dépréciation progressive plutôt qu'une suppression tout ou rien. »

## La question vicieuse du jury

**« Vous laissez du code cassé en production en espérant que personne ne l'appelle. C'est une dette, pas une solution. »**

C'est une dette, et je la revendique comme telle — mais une dette **visible et instrumentée**, ce qui n'est pas la même chose qu'un oubli. Ce qui manque pour la solder proprement : un `grep` sur `lib/prisma` me dirait aujourd'hui combien d'imports subsistent, et le vrai travail est de les reprendre un par un. Ce qui rend l'attente supportable, c'est que l'erreur est explicite : si un chemin oublié est emprunté, je le vois dans les logs avec un message qui me dit exactement quoi corriger — au lieu d'une erreur de connexion MySQL vers une base qui n'existe plus, où je perdrais une heure. Le vrai défaut de mon dispositif est ailleurs : rien ne m'**alerte**. Il faudrait que ce `throw` remonte dans un outil de suivi d'erreurs, sinon je dépends de quelqu'un qui tombe sur la page cassée et me le signale. Le stub était le bon geste pour débloquer la migration en une soirée ; il ne devient une solution que si je le fais disparaître, et cette suppression n'est pas encore programmée.
