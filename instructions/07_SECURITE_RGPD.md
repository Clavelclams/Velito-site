# 07 — Securite et RGPD

## RGPD — Obligations legales

### Ce qu'on DOIT faire (obligatoire)
1. **Mentions legales** sur chaque site (nom, SIRET, hebergeur, contact)
2. **Politique de confidentialite** expliquant quelles donnees on collecte et pourquoi
3. **Bandeau cookies** si on utilise des cookies non-essentiels (analytics, etc.)
4. **Formulaires** : consentement explicite avant collecte de donnees
5. **Droit de suppression** : possibilite pour l'utilisateur de demander la suppression de ses donnees

### Donnees collectees par app
| App | Donnees collectees | Base legale |
|-----|-------------------|-------------|
| VEA | Nom, email (formulaire contact) | Consentement |
| Hub | Aucune pour l'instant | — |
| VENA | Nom, email, message (formulaire devis) | Consentement |
| ARENA | Pseudo, email (inscription tournoi) | Consentement + contrat |
| Interactive | Nom, email (demande demo) | Consentement |

## Securite technique

### Regles de base
- **Jamais** de mot de passe, API key ou secret dans le code source
- Fichier `.env.local` pour le dev (dans `.gitignore`)
- Variables sensibles uniquement dans Vercel Dashboard
- HTTPS obligatoire (Vercel le fait automatiquement)

### Headers de securite (a configurer dans next.config.ts)
- `X-Frame-Options: DENY` (empeche l'embedding dans une iframe)
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (force HTTPS)
- `Content-Security-Policy` (a definir selon les besoins)

### Fichier .gitignore — elements critiques
```
# Environnement
.env
.env.local
.env.production

# Dependances
node_modules/

# Build
.next/
out/

# OS
.DS_Store
Thumbs.db
```

## Checklist RGPD par site
- [ ] Mentions legales presentes et a jour
- [ ] Politique de confidentialite redigee
- [ ] Bandeau cookies si analytics active
- [ ] Formulaires avec checkbox de consentement
- [ ] Email de contact pour les demandes RGPD
- [ ] Donnees stockees en UE (verifier l'hebergeur)
