# 03 — Stack technique et justifications

## Stack principale
| Technologie | Version | Role | Pourquoi ce choix |
|-------------|---------|------|-------------------|
| Turborepo | latest | Monorepo manager | Gere les builds en parallele, cache intelligent, standard Vercel |
| Next.js | 16.x | Framework React | SSR, App Router, API routes, standard industrie |
| React | 19.x | UI library | Ecosysteme massif, composants reutilisables |
| TypeScript | 5.x | Langage | Typage statique, detection erreurs avant runtime |
| Tailwind CSS | 4.x | Styling | Utility-first, rapide a ecrire, coherent |
| ESLint | 9.x | Linter | Qualite de code, detection de problemes |

## Stack prevue (a venir)
| Technologie | Role | Quand |
|-------------|------|-------|
| Prisma | ORM (acces base de donnees) | Phase 4-5 |
| PostgreSQL | Base de donnees | Phase 4-5 |
| Supabase | Backend-as-a-Service | Phase 4-5 |
| Payload CMS ou Directus | CMS headless | Phase 2-3 |
| Vercel | Hebergement / Deploiement | Phase 1 |

## Ce qu'on n'utilise PAS (et pourquoi)
| Technologie | Pourquoi on l'evite |
|-------------|---------------------|
| WordPress | Pas assez flexible, pas de monorepo, dette technique |
| Vanilla CSS | Trop lent a ecrire, inconsistant, dur a maintenir |
| JavaScript pur | Pas de typage = bugs en production |
| Create React App | Obsolete, pas de SSR, pas de routing fichier |
| Express.js seul | Next.js gere deja les API routes |

## Versions et compatibilite
- Node.js : >= 18.x (LTS recommande)
- npm : >= 9.x
- Git : >= 2.x
- Les versions exactes sont lockees dans `package-lock.json`
