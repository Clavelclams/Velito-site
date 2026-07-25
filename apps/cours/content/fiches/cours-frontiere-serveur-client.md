---
titre: "La frontière serveur/client : fs ne part jamais dans le navigateur"
projet: "cours"
bloc: 2
themes: ["architecture", "react", "next"]
source: "apps/cours/app/components/RechercheFiches.tsx"
date: 2026-07-24
---

## Le concept

Dans Velito Cours, les fiches sont des fichiers Markdown lus avec `node:fs`
par `lib/fiches/fiches.ts`. Or `fs` n'existe pas dans un navigateur : ce
module est **server-only** par nature. Le jour où j'ai voulu une recherche
interactive (du state React, donc un composant `"use client"`), j'avais un
problème d'architecture : le composant client a besoin des données, mais n'a
pas le droit de toucher à la couche qui les lit.

La solution est un découpage en deux étages :

1. Le dashboard (`app/page.tsx`, Server Component) appelle `listerFiches()`
   côté serveur et récupère les métadonnées (`FicheMeta[]`, sans le corps
   Markdown — inutile pour filtrer) ;
2. Il les passe **en props** à `RechercheFiches` (`"use client"`), qui ne
   fait QUE le filtrage en mémoire, instantané, sans aller-retour serveur.

Détail qui compte : le composant client écrit
`import type { FicheMeta } from "@/lib/fiches/fiches"`. Le mot-clé `type`
garantit que l'import est **effacé à la compilation** — seul le type
TypeScript traverse, jamais le code qui contient `fs`. Sans ce mot-clé, le
bundler tenterait d'embarquer le module et le build casserait.

## Comment je l'explique au jury

« Ma couche d'accès aux données utilise le système de fichiers, elle est
donc strictement côté serveur. Pour la recherche interactive, j'ai appliqué
le pattern recommandé de l'App Router : le Server Component lit les données
et les passe en props à un composant client qui ne gère que l'interactivité.
Les métadonnées seules traversent la frontière — pas le corps des fiches ni
le code de lecture. J'utilise `import type` pour partager les interfaces
TypeScript sans jamais embarquer de code serveur dans le bundle navigateur. »

## La question vicieuse du jury

**« Pourquoi ne pas filtrer côté serveur avec des searchParams, plutôt que
d'envoyer toutes les fiches au client ? »** Réponse : c'est un arbitrage
mesuré, pas un oubli. Les métadonnées d'une fiche pèsent quelques centaines
d'octets ; même à 200 fiches on reste sous la taille d'une petite image, et
le filtrage à chaque frappe devient instantané, sans requête réseau. Le
filtrage serveur par searchParams aurait rendu la page dynamique (adieu le
rendu statique) et ajouté une latence à chaque frappe. Si le volume explosait
un jour (des milliers de fiches), je basculerais vers une recherche serveur
paginée — la couche `fiches.ts` étant isolée, c'est le seul endroit à faire
évoluer.
