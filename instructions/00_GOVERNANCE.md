# 00 — Gouvernance du projet Velito

## Proprietaire
- **Nom** : Clavel NDEMA MOUSSA
- **Structure** : VENA (Velito Expertise Numerique Amiens) — SASU
- **Role** : Fondateur, developpeur principal, architecte technique

## Entites sous Velito
| Entite | Type | Role |
|--------|------|------|
| VEA | Association loi 1901 | Inclusion par l'esport |
| VENA | SASU | Agence de dev web / numerique |
| ARENA | Plateforme | Gestion de tournois esport |
| Interactive | Plateforme | Solutions pour bars/MJC gaming |

## Processus de decision
- Clavel decide seul sur l'architecture et les priorites
- Toute feature doit etre justifiee (pas de dev "pour voir")
- Les choix techniques sont documentes dans CONTEXT.md
- Les apprentissages sont traces dans LEARNING.md

## Regles de contribution
- Branches : `main` (production), `dev` (developpement), `feature/*` (nouvelles fonctionnalites)
- Commits : messages clairs en francais ou anglais, format : `type: description`
  - Exemples : `feat: ajout page evenements`, `fix: correction navbar mobile`, `docs: mise a jour CONTEXT.md`
- Pas de push direct sur `main` sans verification
- Tout code doit compiler (`npm run build`) avant merge

## Propriete intellectuelle
- Tout le code est propriete de VENA (SASU)
- Les contenus VEA appartiennent a l'association VEA
- Licence du repo : privee (pas open source pour l'instant)
