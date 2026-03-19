# Velito — Contexte du projet

## C'est quoi Velito ?
Velito est un ecosysteme numerique modulaire developpe par Clavel NDEMA MOUSSA (VENA).
Il regroupe plusieurs entites sous une meme plateforme technique.

## Les modules
| Module | URL | Statut |
|--------|-----|--------|
| Hub principal | velito.com | En construction |
| VEA (Esport) | vea.velito.com | En construction |
| VENA (Agence) | vena.velito.com | Coming soon |
| ARENA (Tournois) | arena.velito.com | Coming soon |
| Interactive (Bars/MJC) | interactive.velito.com | Coming soon |

## Stack technique
- **Monorepo** : Turborepo
- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Style** : Tailwind CSS
- **Base de donnees** : PostgreSQL + Prisma (a venir)
- **CMS** : a choisir (Payload CMS ou Directus)
- **Deploiement** : Vercel

## Pourquoi ces choix ?
- **Next.js** : SSR natif, SEO, API routes integrees, standard pro
- **Turborepo** : plusieurs apps qui partagent du code commun
- **TypeScript** : detecte les erreurs avant l'execution
- **Tailwind** : styles rapides sans gerer des fichiers CSS complexes

## Architecture des dossiers
```
velito-site/
├── apps/
│   ├── vea/          <- Site VEA (priorite 1)
│   ├── hub/          <- Hub velito.com (priorite 2)
│   ├── vena/         <- VENA (priorite 3)
│   ├── arena/        <- ARENA (priorite 4)
│   └── interactive/  <- Interactive (priorite 5)
├── packages/
│   ├── ui/           <- Composants partages entre toutes les apps
│   ├── eslint-config/
│   └── typescript-config/
├── docs/
│   ├── CONTEXT.md    <- CE FICHIER
│   └── LEARNING.md   <- Journal d'apprentissage
└── instructions/     <- Docs de gouvernance et regles du projet
```

## Ordre de developpement
1. Monorepo Turborepo initialise
2. Site VEA — pages : Accueil, Evenements, Equipe, Partenaires, Mediatheque, Contact
3. Hub velito.com
4. VENA
5. ARENA
6. Interactive

## Regles du projet
- On ne cree pas de fonctionnalite sans comprendre pourquoi
- Chaque composant a un role precis
- Pas de copier-coller sans savoir ce que ca fait
- Toujours committer avec un message clair

## Contacts
- President VEA / Fondateur VENA : Clavel NDEMA MOUSSA
- Email VEA : Vea@velitoesport.com
- Tel : 0670364414
