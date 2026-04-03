# Arborescence du monorepo Velito

> Dernière mise à jour : 03/04/2026
> Exclut : node_modules, .next, .git, .turbo, assets binaires (images/fonts)

## Les 6 modules de l'écosystème Velito

| #   | Module          | URL                    | Port dev | Description                                                                                                                                                                                  | Modèle           | Statut                      |
| --- | --------------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------- |
| 1   | **HUB**         | velito.com             | 3000     | Portail central de l'écosystème. Landing cinématographique scroll-driven qui redirige vers le bon module selon le besoin du visiteur.                                                        | Vitrine          | En dev                      |
| 2   | **VEA**         | vea.velito.com         | 3001     | Velito Esport Amiens — Association loi 1901 d'inclusion sociale par l'esport. Site vitrine + admin + espace membre. Cible : jeunes 16-25 ans des QPV d'Amiens.                               | Asso             | En dev (priorité 1)         |
| 3   | **VENA**        | vena.velito.com        | 3002     | Velito Expertise Numérique Amiens — SASU de Clavel. Agence web, vidéo, formation. Vitrine + portfolio + CRM prospects.                                                                       | Agence (SASU)    | Placeholder                 |
| 4   | **ARENA**       | arena.velito.com       | 3003     | Plateforme de gestion et diffusion de tournois esport. Inscription, brackets, streaming, résultats. Modèle freemium SaaS.                                                                    | SaaS B2C         | Placeholder (CDC V3 rédigé) |
| 5   | **INTERACTIVE** | interactive.velito.com | 3004     | Solution clé en main d'animations esport pour bars, MJC, espaces jeunes. Bornes, écrans, quiz, mini-jeux. Modèle B2B location/abonnement.                                                    | SaaS B2B         | Placeholder (CDC V1 rédigé) |
| 6   | **PRÉVENTION**  | prevention.velito.com  | 3005     | Infrastructure institutionnelle de prévention numérique pour la pratique compétitive encadrée. Outils pour clubs esport, assos jeunesse, MJC, collectivités. Modèle SaaS B2B institutionnel. | SaaS B2B Instit. | Placeholder (CDC V1 rédigé) |

## Arborescence complète

```
velito-site/
├── .env                              # Variables globales monorepo
├── .gitignore
├── .npmrc
├── package.json                      # Racine monorepo (workspaces)
├── turbo.json                        # Config Turborepo (pipelines build/dev/lint)
├── prisma.config.ts                  # Config Prisma (chemin schema)
│
├── prisma/
│   ├── schema.prisma                 # Schéma BDD — User, Participant, Evenement, Participation
│   └── migrations/
│       └── 20260324050053_init/
│           └── migration.sql         # Migration initiale
│
├── docs/
│   ├── CONTEXT.md                    # Contexte projet, stack, modules, ordre de dev
│   ├── LEARNING.md                   # Journal d'apprentissage CDA de Clavel
│   └── cdc/                          # Cahiers des charges de chaque module
│       ├── VELITO_VISION_PRODUIT_V1.pdf          # Vision produit complète (tous modules)
│       ├── CDC_ARENA_V3.pdf                      # CDC Arena détaillé V3
│       ├── ARENA_SPEC_COMPLETE_V1.pdf            # Spécifications techniques Arena
│       ├── Mini_CDC_ARENA_V2.pdf                 # Mini CDC Arena condensé
│       ├── Cahier des Charges Velito Interactive V1.pdf  # CDC Interactive V1
│       └── CDC_Velito_Prevention_Numerique_V1.pdf        # CDC Prévention V1
│
├── instructions/
│   ├── 00_GOVERNANCE.md              # Qui décide quoi, rôles, règles de collaboration
│   ├── 01_ROUTES_STRUCTURE.md        # Structure des routes par app
│   ├── 02_ROADMAP.md                 # Feuille de route des fonctionnalités
│   ├── 03_STACK_TECHNIQUE.md         # Stack détaillée et justifications
│   ├── 04_CONVENTIONS_CODE.md        # Conventions nommage, structure, commits
│   ├── 05_OBJECTIFS_TECHNIQUES.md    # Objectifs perf, SEO, accessibilité
│   ├── 06_DEPLOIEMENT.md             # Stratégie déploiement Vercel
│   ├── 07_SECURITE_RGPD.md           # Sécurité et conformité RGPD
│   ├── 08_DESIGN_SYSTEM.md           # Charte graphique, tokens, composants
│   ├── 09_CLAUDE_INSTRUCTIONS.md     # Instructions pour Claude (context agent)
│   └── 10_ARBORESCENCE.md            # CE FICHIER — arborescence complète
│
│
│ ============================================================
│  APPS — Chaque app = un site Next.js indépendant
│ ============================================================
│
├── apps/
│   │
│   │  ─────────────────────────────────────────────────────
│   │  HUB — velito.com
│   │  Portail central. Landing cinématographique qui guide
│   │  le visiteur vers le bon module Velito.
│   │  Stack : Next.js 16, GSAP ScrollTrigger, Canvas 2D
│   │  ─────────────────────────────────────────────────────
│   │
│   ├── hub/
│   │   ├── package.json              # deps: next, gsap, tailwindcss
│   │   ├── next.config.js
│   │   ├── tsconfig.json             # alias @/* → ./src/*
│   │   ├── tailwind.config.ts        # content: ./src/**, font-orbitron, font-exo
│   │   ├── postcss.config.mjs
│   │   ├── public/
│   │   │   └── assets/cinema/        # 11 fichiers .webp (theater-bg + row1→row10)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── globals.css       # Variables CSS cinema, curseur custom, scrollbar
│   │       │   ├── layout.tsx        # Fonts Orbitron + Exo 2, metadata
│   │       │   └── page.tsx          # Import CinemaHubLoader (Server Component)
│   │       └── components/
│   │           └── CinemaHub/
│   │               ├── CinemaHub.tsx      # Expérience cinéma scroll-driven (GSAP + canvas 2D)
│   │               └── CinemaHubLoader.tsx # Wrapper "use client" + dynamic(ssr:false)
│   │
│   │  ─────────────────────────────────────────────────────
│   │  VEA — vea.velito.com
│   │  Velito Esport Amiens. Association loi 1901.
│   │  Inclusion sociale par l'esport pour les jeunes
│   │  16-25 ans des QPV d'Amiens.
│   │  Stack : Next.js 16, Framer Motion, Prisma, bcryptjs
│   │  ─────────────────────────────────────────────────────
│   │
│   ├── vea/
│   │   ├── package.json              # deps: next, framer-motion, @prisma/client, bcryptjs
│   │   ├── next.config.js
│   │   ├── tsconfig.json             # alias @/* → ./*
│   │   ├── tailwind.config.ts        # tokens VEA: vea-dark, vea-purple, vea-red...
│   │   ├── postcss.config.mjs
│   │   ├── middleware.ts             # Auth middleware: protège /membre/*, /admin/*
│   │   ├── .env                      # DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
│   │   │
│   │   ├── app/
│   │   │   ├── globals.css           # Charte VEA: hero-bg, card-glow, text-gradient-vea...
│   │   │   ├── layout.tsx            # Layout global: Navbar + Footer + Inter font
│   │   │   ├── page.tsx              # Accueil: hero, stats, actions, chiffres, CTA
│   │   │   │
│   │   │   ├── association/page.tsx  # Bureau, équipe opé, impact, historique
│   │   │   ├── esport/page.tsx       # Résultats SF6/Tekken, activités, calendrier
│   │   │   ├── agenda/page.tsx       # Événements à venir + passés (API fetch)
│   │   │   ├── medias/page.tsx       # Galerie photos + vidéos
│   │   │   ├── partenaires/page.tsx  # Institutionnels, terrains, associatifs, privés
│   │   │   ├── contact/page.tsx      # Infos contact + formulaire
│   │   │   ├── inscription/page.tsx  # Inscription événement (check tel → form → success)
│   │   │   ├── impact/page.tsx       # Stats d'impact + chronologie
│   │   │   ├── login/page.tsx        # Connexion utilisateur (charte VEA)
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Dashboard admin (événements, participants)
│   │   │   │   ├── AdminDashboard.tsx # Composant client du dashboard
│   │   │   │   └── login/page.tsx    # Connexion admin (charte VEA)
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── register/route.ts  # POST — inscription user (bcrypt + cookie)
│   │   │   │   │   ├── login/route.ts     # POST — login user + admin .env fallback
│   │   │   │   │   ├── logout/route.ts    # POST — supprime cookies session
│   │   │   │   │   └── me/route.ts        # GET — session utilisateur courante
│   │   │   │   │
│   │   │   │   ├── admin/
│   │   │   │   │   ├── login/route.ts     # POST — login admin
│   │   │   │   │   ├── logout/route.ts    # POST — logout admin
│   │   │   │   │   ├── evenements/
│   │   │   │   │   │   ├── route.ts       # GET/POST événements
│   │   │   │   │   │   ├── [id]/route.ts  # PUT/DELETE événement par ID
│   │   │   │   │   │   └── seed/route.ts  # POST — seed données initiales
│   │   │   │   │   └── participants/
│   │   │   │   │       └── route.ts       # GET participants
│   │   │   │   │
│   │   │   │   ├── evenements/route.ts    # GET — liste événements (public)
│   │   │   │   └── participants/
│   │   │   │       ├── check/route.ts     # POST — vérifier si tel existe
│   │   │   │       └── register/route.ts  # POST — inscrire participant
│   │   │   │
│   │   │   └── evenements/page.tsx        # Alias /evenements (si utilisé)
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Navigation + bouton Connexion
│   │   │   ├── Footer.tsx            # Footer velito.com + vea.velito.com
│   │   │   ├── TopBar.tsx            # Barre supérieure (si utilisée)
│   │   │   ├── ScrollReveal.tsx      # Animation framer-motion au scroll
│   │   │   ├── CountUp.tsx           # Animation compteur chiffres
│   │   │   └── BureauSection.tsx     # Bureau VEA condensable (toggle expand)
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.ts           # Hook auth: user, login(), register(), logout()
│   │   │
│   │   ├── lib/
│   │   │   ├── prisma.ts            # Singleton Prisma Client (anti-leak hot reload)
│   │   │   └── auth.ts              # Utilitaires cookies session (set/get/clear)
│   │   │
│   │   └── public/
│   │       ├── images/
│   │       │   ├── vea-logo-*.svg    # 4 variantes logo VEA
│   │       │   └── bg/*.svg          # Patterns SVG (hero, section, diagonal)
│   │       └── bg-preview.html       # Preview des backgrounds
│   │
│   │  ─────────────────────────────────────────────────────
│   │  VENA — vena.velito.com
│   │  Velito Expertise Numérique Amiens. SASU de Clavel.
│   │  Agence web, vidéo, formation. Vitrine + portfolio.
│   │  ─────────────────────────────────────────────────────
│   │
│   ├── vena/
│   │   ├── package.json
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx              # Page placeholder
│   │   └── public/images/
│   │       └── vena-logo-*.svg       # 9 variantes logo VENA
│   │
│   │  ─────────────────────────────────────────────────────
│   │  ARENA — arena.velito.com
│   │  Plateforme de tournois esport. Inscription,
│   │  brackets, streaming, résultats. SaaS freemium.
│   │  CDC : docs/cdc/CDC_ARENA_V3.pdf
│   │  ─────────────────────────────────────────────────────
│   │
│   ├── arena/
│   │   ├── package.json
│   │   └── app/
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx              # Page placeholder
│   │
│   │  ─────────────────────────────────────────────────────
│   │  INTERACTIVE — interactive.velito.com
│   │  Animations esport pour bars, MJC, espaces jeunes.
│   │  Bornes, écrans, quiz, mini-jeux. B2B location/abo.
│   │  CDC : docs/cdc/Cahier des Charges Velito Interactive V1.pdf
│   │  ─────────────────────────────────────────────────────
│   │
│   ├── interactive/
│   │   ├── package.json
│   │   └── app/
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx              # Page placeholder
│   │
│   │  ─────────────────────────────────────────────────────
│   │  PRÉVENTION — prevention.velito.com
│   │  Infrastructure de prévention numérique pour la
│   │  pratique compétitive encadrée. SaaS B2B institutionnel.
│   │  Cible : clubs esport, assos jeunesse, MJC, collectivités.
│   │  CDC : docs/cdc/CDC_Velito_Prevention_Numerique_V1.pdf
│   │  ─────────────────────────────────────────────────────
│   │
│   └── prevention/
│       ├── package.json
│       └── app/
│           ├── globals.css
│           ├── layout.tsx
│           └── page.tsx              # Page placeholder
│
│
│ ============================================================
│  PACKAGES — Code partagé entre toutes les apps
│ ============================================================
│
├── packages/
│   ├── ui/                           # Composants React partagés
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── code.tsx
│   │
│   ├── database/                     # (Futur) Client Prisma partagé
│   │   ├── package.json
│   │   └── index.ts
│   │
│   ├── eslint-config/                # Config ESLint partagée
│   │   ├── package.json
│   │   ├── base.js
│   │   ├── next.js
│   │   └── react-internal.js
│   │
│   └── typescript-config/            # Config TypeScript partagée
│       ├── package.json
│       ├── base.json
│       ├── nextjs.json
│       └── react-library.json
```

## Index des CDC (Cahiers des Charges)

| Document                                     | Module      | Version | Contenu                                                            |
| -------------------------------------------- | ----------- | ------- | ------------------------------------------------------------------ |
| VELITO_VISION_PRODUIT_V1.pdf                 | Tous        | V1      | Vision produit complète, roadmap V1→V3, automations, bugs en cours |
| CDC_ARENA_V3.pdf                             | Arena       | V3      | CDC détaillé : features, BDD, API, UI, déploiement                 |
| ARENA_SPEC_COMPLETE_V1.pdf                   | Arena       | V1      | Spécifications techniques complètes                                |
| Mini_CDC_ARENA_V2.pdf                        | Arena       | V2      | Version condensée du CDC Arena                                     |
| Cahier des Charges Velito Interactive V1.pdf | Interactive | V1      | CDC complet : bornes, écrans, mini-jeux, modèle B2B                |
| CDC_Velito_Prevention_Numerique_V1.pdf       | Prévention  | V1      | CDC complet : modules fonctionnels, archi technique, RGPD, KPIs    |

## Conventions de structure

- **hub** utilise `src/app/` — alias `@/*` → `./src/*`
- **vea** utilise `app/` à la racine — alias `@/*` → `./*`
- **vena, arena, interactive, prevention** utilisent `app/` à la racine (template Turborepo)
- Les assets binaires (images, fonts) sont dans `public/` de chaque app
- Le schema Prisma est à la racine du monorepo (`prisma/schema.prisma`)
- Les variables d'environnement sensibles sont dans `.env` (jamais committées)
- Les CDC sont centralisés dans `docs/cdc/` (pas dans chaque app)
