# Velito — Contexte du projet

## C'est quoi Velito ?
Velito est un écosystème numérique modulaire développé par Clavel NDEMA MOUSSA (VENA).
Il regroupe plusieurs entités sous une même plateforme technique.

## Les modules
| Module | URL | Statut |
|--------|-----|--------|
| Hub principal | velito.com | 🔧 En construction |
| VEA (Esport) | vea.velito.com | 🔧 En construction |
| VENA (Agence) | vena.velito.com | ⏳ Coming soon |
| ARENA (Tournois) | arena.velito.com | ⏳ Coming soon |
| Interactive (Bars/MJC) | interactive.velito.com | ⏳ Coming soon |

## Stack technique
- **Monorepo** : Turborepo
- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Style** : Tailwind CSS
- **Base de données** : PostgreSQL + Prisma (à venir)
- **CMS** : à choisir (Payload CMS ou Directus)
- **Déploiement** : Vercel

## Pourquoi ces choix ?
- **Next.js** : SSR natif, SEO, API routes intégrées, standard pro
- **Turborepo** : plusieurs apps qui partagent du code commun
- **TypeScript** : détecte les erreurs avant l'exécution
- **Tailwind** : styles rapides sans gérer des fichiers CSS complexes

## Architecture des dossiers
```
velito-site/
├── apps/
│   ├── vea/          ← Site VEA (priorité 1)
│   ├── hub/          ← Hub velito.com (priorité 2)
│   ├── vena/         ← VENA (priorité 3)
│   ├── arena/        ← ARENA (priorité 4)
│   └── interactive/  ← Interactive (priorité 5)
├── packages/
│   ├── ui/           ← Composants partagés entre toutes les apps
│   ├── eslint-config/
│   └── typescript-config/
└── docs/
    ├── CONTEXT.md    ← CE FICHIER
    └── LEARNING.md   ← Journal d'apprentissage
```

## Ordre de développement
1. ✅ Monorepo Turborepo initialisé
2. 🔧 Site VEA — pages : Accueil, Événements, Équipe, Partenaires, Médiathèque, Contact
3. ⏳ Hub velito.com
4. ⏳ VENA
5. ⏳ ARENA
6. ⏳ Interactive

## Règles du projet
- On ne crée pas de fonctionnalité sans comprendre pourquoi
- Chaque composant a un rôle précis
- Pas de copier-coller sans savoir ce que ça fait
- Toujours committer avec un message clair

## Contacts
- Président VEA / Fondateur VENA : Clavel NDEMA MOUSSA
- Email VEA : Vea@velitoesport.com
- Tél : 0670364414
