---
titre: "SSG contre cookies() : pourquoi mon header est un composant client"
projet: "cours"
bloc: 3
themes: ["performance", "rendu-statique", "next"]
source: "apps/cours/app/components/EnTete.tsx"
date: 2026-07-24
---

## Le concept

Mes pages de fiches utilisent `generateStaticParams()` : elles sont
**pré-générées au build** (SSG). Au moment d'ajouter un header commun avec un
bouton Déconnexion, le réflexe naturel était de vérifier la session Supabase
dans le layout racine pour masquer le bouton sur `/login` : appeler
`cookies()` côté serveur et décider quoi afficher.

Piège : dans Next.js, lire `cookies()` rend le rendu **dynamique** — logique,
un cookie n'existe qu'au moment d'une requête, pas au build. Et comme le
layout racine enveloppe TOUTES les pages, un seul appel à `cookies()` dedans
aurait converti tout le site en rendu à la demande. Mon SSG mourait pour un
bouton.

La sortie propre : un composant client (`EnTete.tsx`) qui utilise
`usePathname()` pour se masquer sur `/login`. Aucune lecture de session,
donc aucun impact sur le mode de rendu. La preuve est dans la sortie du
build : `/fiches/[slug]` et `/projets/[slug]` sont toujours marqués `●`
(SSG), le dashboard `○` (statique), seul `/login` est `ƒ` (dynamique).

Et la sécurité ? Elle n'a jamais dépendu du header : c'est le middleware
(default-deny + liste blanche) qui protège les routes. Le header est de la
navigation, pas une couche de sécurité — confondre les deux est exactement
le genre d'erreur qu'un jury guette.

## Comment je l'explique au jury

« J'ai fait un choix de rendu mesurable : mes fiches sont pré-générées au
build pour être servies statiquement. Quand j'ai ajouté le header global,
j'ai évité de lire les cookies dans le layout racine, car cela aurait forcé
tout le site en rendu dynamique. J'ai déplacé la seule logique nécessaire —
se masquer sur la page de connexion — dans un composant client basé sur
l'URL. Je vérifie l'impact de ce genre de décision dans la sortie du build,
qui indique le mode de rendu de chaque route. »

## La question vicieuse du jury

**« Un utilisateur non connecté voit donc le bouton Déconnexion si le
middleware le laisse passer ? »** Réponse : le middleware ne le laisse
justement jamais passer — toute route non publique sans session est
redirigée vers `/login` avant même le rendu. Et si le bouton s'affichait par
erreur, cliquer dessus appellerait une server action qui déconnecte une
session inexistante : aucun impact sécurité. L'affichage est du confort ;
l'autorisation est dans le middleware. Deux responsabilités, deux endroits.
