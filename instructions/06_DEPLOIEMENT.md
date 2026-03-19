# 06 — Strategie de deploiement

## Plateforme : Vercel
Vercel est le createur de Next.js. C'est la plateforme la plus optimisee pour deployer du Next.js.

### Pourquoi Vercel ?
- Deploiement automatique a chaque push sur `main`
- Preview deployments sur chaque pull request
- CDN mondial (site rapide partout)
- Support natif des monorepos Turborepo
- Plan gratuit suffisant pour demarrer

## Configuration des domaines
| App | Domaine | Type |
|-----|---------|------|
| Hub | velito.com | Domaine principal |
| VEA | vea.velito.com | Sous-domaine |
| VENA | vena.velito.com | Sous-domaine |
| ARENA | arena.velito.com | Sous-domaine |
| Interactive | interactive.velito.com | Sous-domaine |

## Workflow de deploiement
```
Code local
  |
  v
git push origin dev        <- Push sur branche dev
  |
  v
Vercel Preview Deploy      <- URL de preview pour tester
  |
  v
Merge dev -> main          <- Apres validation
  |
  v
Vercel Production Deploy   <- Deploiement automatique en prod
```

## Variables d'environnement
- Stockees dans Vercel (jamais dans le code)
- Fichier `.env.local` pour le developpement local (dans .gitignore)
- Format : `NEXT_PUBLIC_*` pour les variables accessibles cote client
- Variables sensibles (API keys, DB) : jamais de prefix `NEXT_PUBLIC_`

## Checklist avant deploiement
- [ ] `npm run build` passe sans erreur
- [ ] `npm run lint` passe sans warning
- [ ] Toutes les pages sont testees en local
- [ ] Responsive verifie sur mobile
- [ ] Variables d'environnement configurees sur Vercel
- [ ] Domaine DNS configure
