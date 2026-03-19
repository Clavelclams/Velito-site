# 04 — Conventions de code et nommage

## Nommage des fichiers
| Type | Convention | Exemple |
|------|-----------|---------|
| Composant React | PascalCase | `NavBar.tsx`, `EventCard.tsx` |
| Page Next.js | toujours `page.tsx` | `app/evenements/page.tsx` |
| Layout Next.js | toujours `layout.tsx` | `app/layout.tsx` |
| Utilitaire/helper | camelCase | `formatDate.ts`, `slugify.ts` |
| Fichier de config | kebab-case ou nom standard | `tailwind.config.ts`, `next.config.ts` |
| Fichier doc | MAJUSCULES ou snake_case numerote | `CONTEXT.md`, `02_ROADMAP.md` |

## Nommage des variables et fonctions
```typescript
// Variables et fonctions : camelCase
const userName = "Clavel"
function getEventList() { ... }

// Types et interfaces : PascalCase
interface EventData { ... }
type UserRole = "admin" | "member"

// Constantes globales : SCREAMING_SNAKE_CASE
const API_BASE_URL = "https://api.velito.com"
const MAX_EVENTS_PER_PAGE = 12
```

## Structure d'un composant React
```typescript
// 1. Imports
import { useState } from "react"

// 2. Types (si necessaire)
interface ButtonProps {
  label: string
  onClick: () => void
}

// 3. Composant (export default)
export default function Button({ label, onClick }: ButtonProps) {
  return (
    <button onClick={onClick} className="bg-blue-500 px-4 py-2 rounded">
      {label}
    </button>
  )
}
```

## Organisation des dossiers dans une app
```
apps/vea/
├── app/
│   ├── layout.tsx          <- Layout principal
│   ├── page.tsx            <- Page d'accueil
│   ├── evenements/
│   │   ├── page.tsx        <- Liste des evenements
│   │   └── [slug]/
│   │       └── page.tsx    <- Detail d'un evenement
│   └── globals.css         <- Styles globaux Tailwind
├── components/             <- Composants specifiques a cette app
│   ├── NavBar.tsx
│   ├── Footer.tsx
│   └── EventCard.tsx
├── lib/                    <- Fonctions utilitaires
│   └── formatDate.ts
└── public/                 <- Images et fichiers statiques
    └── images/
```

## Regles strictes
- Pas de `any` en TypeScript (sauf cas exceptionnel documente)
- Pas de `console.log` en production
- Pas de CSS inline sauf cas tres ponctuel — Tailwind uniquement
- Pas de composant de plus de 150 lignes — decomposer si besoin
- Chaque composant = un fichier
