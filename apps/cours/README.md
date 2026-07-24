# Velito Cours — cours.velito.fr

Espace personnel de révision CDA (jury avril 2027) + suivi de tous mes
projets. V1 volontairement minimale : **les contenus sont des fichiers
Markdown dans `content/`, pas une base de données** — versionnés par Git,
productibles par n'importe quelle conversation Claude, zéro migration.

## Le système "usine à fiches"

```
Conversation Claude du projet X          Ce site (apps/cours)
──────────────────────────────          ─────────────────────
colle PROMPT_FICHES.md                   affiche :
  → met à jour fiches-cda/projet-X.md      · dashboard J−n avant jury
  → génère fiches-cda/X-<concept>.md       · suivi projets (barres d'avancement)
        │                                   · fiches par bloc CDA / projet
        └── je copie les .md ──────────►  content/projets/ et content/fiches/
```

Le prompt réutilisable est dans `PROMPT_FICHES.md`. Deux formats stricts :
fiche projet (frontmatter `titre/avancement/statut/maj`) et fiche de révision
(frontmatter `titre/projet/bloc/themes/source/date`). Le site parse le
frontmatter : un format non conforme = fiche mal affichée.

## Architecture

| Dossier | Rôle |
|---|---|
| `app/` | Pages (dashboard, /fiches/[slug], /projets/[slug], /login) |
| `lib/fiches/` | Accès données : lecture des .md (fs + gray-matter), seule couche à réécrire si un jour on passe en base |
| `lib/supabase/`, `middleware.ts` | Auth reprise de Compta : default-deny + liste blanche (`COURS_EMAILS_AUTORISES`) |
| `content/fiches/` | Fiches de révision (1 fichier = 1 concept) |
| `content/projets/` | Fiches projet (1 fichier = 1 projet, mis à jour, jamais dupliqué) |

Port dev : 3007. Env : voir `.env.example` (mêmes clés Supabase que le hub).

## Décisions (journal CDA)

| Date | Décision | Justification |
|---|---|---|
| 2026-07-10 | Contenu = fichiers Markdown, pas de BDD | Productible par toute session Claude, versionné Git, zéro infra. La couche `lib/fiches` isole ce choix : passage en base possible sans toucher les pages. |
| 2026-07-10 | Deux types de contenu (révision + suivi projet) | Les fiches projet servent trois usages : suivi centralisé, contexte pour l'assistant, brouillon vivant du dossier professionnel CDA. |
| 2026-07-10 | Auth + liste blanche reprises de Compta | Les fiches citent mon code interne : pas public. Pattern déjà éprouvé, copié tel quel. |
