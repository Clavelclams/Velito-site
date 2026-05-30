# État du projet Velito — 30/05/2026

> Audit complet de l'écosystème Velito (monorepo Turborepo Next.js 16 + Supabase).
> Cible : Clavel NDEMA MOUSSA — préparation jury CDA (AFPA Amiens, avril 2027) + planification roadmap.
>
> **Méthode** : scan automatisé des 4 apps + packages partagés + docs. Reflète l'état réel du code, pas une projection.

---

## Vue d'ensemble

L'écosystème Velito = **2 entités juridiques distinctes** réunies dans un même monorepo :

| Entité | Type | Statut | Sous-domaines |
|---|---|---|---|
| **VEA** | Association loi 1901 (esport inclusif) | Production live | `vea.velito.fr` |
| **VENA** + écosystème | SASU (agence numérique) + 4 produits | Mix prod/dev | `velito.fr` (VENA), `hub.velito.fr`, `interactive.velito.fr`, `arena.velito.fr`*, `prevention.velito.fr`* |

*\* Placeholders, pas encore d'app dédiée.*

**Séparation auth cruciale** : VEA est **isolée** au niveau session du reste de l'écosystème (cf. `docs/SSO_ARCHITECTURE.md` §7 bis — éviter qu'un user VENA ait des droits VEA implicites et inversement, pour des raisons juridiques et RGPD).

---

## 1. Hub (`hub.velito.fr`)

**Rôle** : point d'entrée central de l'écosystème + Identity Provider OAuth/OIDC en cours de construction.

**Stack** : Next.js 16, React 19, Tailwind 3, `@supabase/ssr`, ogl/Three.js (3D), gsap.

### Routes/Pages livrées

| Route | Rôle | Statut |
|---|---|---|
| `/` | Galaxy 3D (InfiniteMenu 9 modules) + fallback reduced-motion accessible | ✅ Live |
| `/login` | Auth email/password, lit `?return=` pour SSO returnTo | ✅ Live |
| `/forgot-password` | Demande reset (anti-énumération, message générique unique) | ✅ Live (testé E2E) |
| `/reset-password` | Pose nouveau mdp depuis lien email (recovery hash ou PKCE) | ✅ Live (testé E2E) |
| `/account` | Dashboard user : identité, apps activées (`shared.app_memberships`), apps à découvrir, déconnexion | ✅ Live |
| `/construction?slug=...` | Placeholder pour modules pas encore prod (arena, interactive, prevention, plateforme, prod, store, morse) | ✅ Live |

### Composants notables

- `Galaxy` + `GalaxyHero` + `InfiniteMenu` (3D WebGL sphère rotative — 9 médaillons cliquables)
- `ModulesList` (fallback HTML accessible, lecteurs d'écran + clavier)
- `SearchPanel` (recherche globale FTS scoring TF-IDF maison — 579 entrées indexées via build-time crawler)
- `NavBar` + `NavBarSlot` (header avec auth-aware "Mon compte / Se déconnecter")
- `LoginForm`, `ForgotPasswordForm`, `ResetPasswordForm` (validation client + server actions)

### Infrastructure SSO

- `middleware.ts` : refresh session Supabase à chaque request, injecte `Domain=.velito.fr` (env `COOKIE_DOMAIN`)
- Pattern officiel `@supabase/ssr`, HttpOnly + Secure + SameSite=Lax
- Cookie partagé cross-subdomain (hub ↔ interactive ↔ arena ↔ prevention ↔ vena, **PAS vea**)

### Migrations SQL en prod

- `shared-identity-v1.sql` : `shared.users.origin_app`, `shared.app_memberships`, RLS self-select, `register_app_membership()` SECURITY DEFINER
- `oauth-tables-v1.sql` : 5 tables `oauth_clients/codes/tokens/consents/jwks` + RLS server-only + helper cleanup + seed 5 first-party clients (hub, interactive, arena, prevention, vena — **pas vea**)
- Paire RSA RS256 active dans `oauth_jwks` (kid `99c3db9d...`)

### Fonctionnalités livrées ✅

- Authentification email/password + reset password complet (4 fichiers, anti-énumération, anti-faille "reset = signup")
- Session SSO cross-subdomain `.velito.fr`
- Dashboard `/account` avec memberships RLS-protégés
- Recherche globale Cmd/Ctrl+K (579 entrées indexées build-time)
- Galaxy 3D + fallback reduced-motion
- Socle OAuth/OIDC (tables + clé signature) — endpoints à venir

### Ce qui manque / TODO

- ❌ Endpoints OAuth `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`, `/.well-known/openid-configuration`, `/jwks.json` (tasks #210)
- ❌ Consent screen `/oauth/consent` (task #211)
- ❌ Client popup OAuth côté apps consommatrices avec PKCE + callback (task #212)
- ❌ Tests E2E + audit sécu OAuth (task #213)
- ⚠️ Rotation JWKS avant prod réelle (task #7 — clé actuelle a transité par le chat dev)
- ⚠️ Bug hydration mismatch Next.js 16 sur certaines pages (warning métadata SSR)
- ⚠️ Page d'accueil galaxie : sections "Comment ça marche" + "Module vedette VEA" + Footer pas finalisés

### Statut global

**LIVE partiellement** — auth + account + recherche en prod ; OAuth en chantier (Phase 2 de 6 faite).

---

## 2. VEA (`vea.velito.fr`)

**Rôle** : Association loi 1901 — site vitrine + admin + espace membre. Cible jeunes 16-25 ans des QPV d'Amiens.

**Stack** : Next.js 16, Supabase Auth, RLS Postgres, schema `vea`.

### Routes/Pages livrées

**Public** :
- `/` : accueil institutionnel (hero, marquee photos, 5 stats clés, reconnaissance presse, 4 piliers)
- `/agenda`, `/evenements` (redirect), `/inscription` : événements + pré-inscription
- `/prestations` : page B2B 3 packs (A: animation, B: tournoi, C: prévention) + form devis 4 blocs
- `/joueurs` : listing public participants avec profils
- `/impact` : bilan associatif
- `/esport` : résultats compétitions + presse
- `/association`, `/contact`, `/partenaires` : pages institutionnelles
- `/agenda/[slug]` : bilan public post-event

**Auth** :
- `/login`, `/signup` (avec détection ex-licenciés Yapla par téléphone)
- `/auth/forgot-password`, `/auth/reset-password`, `/auth/callback`

**User connecté** :
- `/profil` : XP/niveau, badges, dotations, tournois saison, notifications
- `/scan/[token]` : QR scan event (auth OU guest 2-step)

**Admin (scope editor VEA)** :
- `/admin` : dashboard stats
- `/admin/evenements` : CRUD events + bilan public + QR + add manuel participants
- `/admin/compta` : transactions trésorier (scope `treasurer`)
- `/admin/documents` : upload justificatifs
- `/admin/rapports` : bilans mensuels/annuels
- `/admin/heures` : log bénévolat + XP auto
- `/admin/tournois` : jeux compétition
- `/admin/recompenses` : grille récompenses
- `/admin/demandes` : suivi devis B2B
- `/admin/bilan` : historique anciens licenciés + champ sexe
- `/admin/president` : espace réservé (données sensibles)

### Modules fonctionnels

- **Événements & Agenda** : token UUID par event → QR code, scan actif/désactif, bilan public, historique Old VEA hardcodé
- **Gamification XP/Badges** : barème (tournoi +10, podium +5, bénévolat +15/h, urgent +20), formule niveau 25×N×(N-1), saison 2026/27 ("l'Éveil") rétroactive depuis 20/05/2026
- **Scan QR multi-motif** : présence / bénévolat / participation tournoi
- **Trésorerie/Compta** : scope `treasurer` (Maya, Christ), balance par saison, FK documents
- **Prestations/Devis B2B** : 3 packs, workflow statut, notifications cloche dirigeants
- **Documents** : upload justificatifs, archivage
- **Rapports** : bilan mensuel/annuel structuré
- **Tournois online** : jeux compétition read-only admin
- **Profil personnel** : progression saison sélectionnable, cards events/heures/niveaux, badges/dotations
- **External links** : Discord/Twitch dans profil
- **Avatars** : upload Supabase Storage

### Migrations SQL en prod (13/16 exécutées)

- `vea-badges-statut-v3.sql`, `vea-gamification-v2.sql`, `vea-compta-v1.sql`, `vea-prestations-v1.sql`, `vea-documents-v1.sql`, `vea-rapports-v1.sql`, `vea-tournois-online-v1.sql`, `vea-preinscriptions-event-v1.sql`, `vea-bilan-public-event-v1.sql`, `vea-merge-preinscrit-phone-v1/v2.sql`, `vea-admin-set-sexe-v1.sql`, `vea-jeux-competition-v1.sql`, `vea-fix-notifications-link_url.sql`

### Auth & permissions

- Supabase Auth (migration 17/05/2026)
- Système `shared.user_permissions` (org/app/scope)
- Scopes : owner, editor, viewer + extra `treasurer` pour compta
- Cookie `vea.velito.fr` **uniquement** (pas de `Domain=.velito.fr` — isolation volontaire)
- RLS Postgres fine-grained sur tables `vea.*`

### Ce qui manque / TODO

- ❌ Task #149 : Éditeur sexe membres dans `/admin/bilan` (champ existe, UI polish manquant)
- ❌ Task #166 : Refonte DA éditoriale admin (front public refait 22/05, back-office pas harmonisé)
- ⚠️ Fonction trigger `trigger_logs_xp_apply` / `recalc_participant_xp` bloquée (vea-gamification-v2.sql partie 2 non exécutée — relecture avant prod)
- ⚠️ Prisma client importé mais non utilisé (migration Supabase incomplète, dette tech)
- ⚠️ Events historique hardcodé `lib/events-historique.ts` (DB-driven v2)
- ❌ Webhooks Discord/Twitch événements
- ❌ Export CSV bilans admin

### Statut global

**PRODUCTION LIVE** depuis 20/05/2026.
- 100+ membres actifs, ~2k participations historiques
- 3686h bénévolat valorisé, 300+ jeunes accompagnés
- Architecture isolée du reste Velito (séparation juridique)

---

## 3. VENA (`velito.fr`)

**Rôle** : Agence numérique SASU. Vitrine commerciale + collecte de devis.

**Stack** : Next.js 16, React 19, Tailwind, GSAP, Supabase, Resend.

### Routes/Pages livrées

| Route | Rôle |
|---|---|
| `/` | Landing pro (4 services, 3 convictions, mot Clavel, écosystème) |
| `/contact` | Formulaire devis multi-blocs avec RGPD consent |
| `/lien` | Linktree-like (LanyardCard + FlowingMenu marquee GSAP) |
| `/mentions-legales` | RGPD + légal complet |
| `/admin` | Dashboard demandes devis (stats, filtres, workflow) |
| `/admin/signalements` | Module shared modération |
| `/login` | Authentification Supabase |

### Composants notables

- **FlowingMenu** : marquee animé GSAP au survol (bulles logos VEA/VENA/MABB + textes pastilles)
- **LanyardCard** : carte d'identité interactive flip + drag swing (recto = Clavel, verso = logo VENA)
- **ContactForm** : 11 champs structurés, validation double client/serveur, Resend best-effort
- **DemandesManager** : admin client component, filtres statut, batch actions
- **Lanyard3D** : composant prêt (three.js + rapier) mais inactif (besoin `card.glb`)

### Fonctionnalités livrées ✅

- Landing pro complète avec manifeste positionnement
- Formulaire devis public RLS-protégé + emails Resend (alert bureau + accusé client)
- Page `/lien` (linktree alternatif Velito-stylé)
- Admin panel auth Supabase scope `vena` owner
- Workflow statut demandes (nouveau → en_cours → devis_envoye → gagne/perdu/spam)

### Migrations SQL

- `vena-demandes-contact-v1.sql` : table principale + RLS INSERT public + helper `is_vena_admin()`
- `vena-admin-permissions-v1.sql` : org `vena` dans shared + permission owner
- `shared-signalements-v1.sql` : module partagé modération

### Ce qui manque / TODO

- ⚠️ Asset `/lien/clavel.jpg` absent (utilise initiales "CN" par défaut)
- ⚠️ Sync Notion CRM des demandes (TODO marqué dans actions.ts, vise `vena-prospecting-agent` skill)
- ⚠️ Lanyard 3D inactif (besoin du fichier `card.glb`)
- ❌ Sections landing additionnelles à confirmer/finaliser

### Statut global

**LIVE en production** sur `velito.fr` (domaine racine, pas de sous-domaine).

---

## 4. Interactive (`interactive.velito.fr`)

**Rôle** : Solution clé en main d'animations gaming pour bars/MJC. Modèle B2B location/abonnement.

**Stack** : Next.js 16, Supabase, multi-tenant. Port dev 3004.

### Routes/Pages livrées

| Route | Rôle | Statut |
|---|---|---|
| `/` | Landing prospect-conversion (hero, 4 jeux, 6 atouts, 3 tarifs, signature VENA) | ✅ Complète |
| `/signup` | Création compte local (email/mdp + ContinueWithVena) | ✅ Complète |
| `/dashboard` | Espace animateur loggé | ✅ Shell + DashboardLoggedOut |
| `/host` | Écran TV maître de session | 🟡 Maquette statique |
| `/play/[code]` | Manette mobile joueur | 🟡 Maquette statique |

### Surfaces de l'app

| Surface | Cible | Branding |
|---|---|---|
| Landing `/` | Prospects (gérants bars/MJC) | Velito |
| `/dashboard` (loggé) | Animateur staff | Velito |
| `/host` (écran TV) | Tout le bar pendant la partie | 🎨 Bar (à venir) |
| `/play/[code]` (manette) | Clients du bar | 🎨 Bar (à venir) |

### Modèle de données Supabase

**Schema `interactive`** :
- `tenants` : id, slug, name, logo_url, theme_primary/secondary, promo_message, locale_default
- `sessions` : code, pin, status (lobby/running/results/ended), mode, current_game, current_round
- `session_players` : pseudo, score, player_token (uuid localStorage), is_connected, kicked_at
- `session_events` : type + payload jsonb (audit / rejouabilité)

**RPC SECURITY DEFINER en prod** :
- `submit_answer(session_id, player_token, round, answer)` — scoring autoritaire serveur (STUB pour l'instant, retourne 0)
- `rejoin(code, player_token)` — reconnexion joueur via token localStorage

**RLS** : lecture publique sur sessions/players/events (MVP bar), write-gated sur tenants via `is_staff()`.

### Multi-tenant & branding

- Table `tenants` prête (logo, couleurs, promo_message)
- Org liée via `shared.organizations` (VENA éditeur central)
- **Visuel non appliqué** : pas d'injection tenant au runtime, CSS `--tenant-accent` hard-codé à `#8b5cf6`
- Décision archi (validée Clavel) : modèle **hybride** — empreinte Velito discrète (footer + splash 2s) avec upgrade Pro pour retirer

### Auth

- Server Component `/dashboard` lit session Supabase via cookie partagé `.velito.fr`
- Sign-up local (`/signup`) OU ContinueWithVena (popup OAuth — Phase 5 OAuth)
- Joueurs `/play` : anon, player_token uuid stocké localStorage

### Fonctionnalités livrées ✅

- Landing prospect complète (hero, 4 jeux, 6 atouts, tarifs 29/39/devis)
- Signup local avec form classique + ContinueWithVena
- Dashboard auth-gated avec DashboardLoggedOut accessible
- SSO via hub (cookie partagé `.velito.fr`, middleware refresh)
- 2 RPC autoritaires en prod (scoring + reconnexion)
- UX "Jouer" au lieu de B2B "Espace animateur" (landing + signup + dashboard)
- Schema SQL complet avec RLS

### Ce qui manque / TODO (gros)

**Tables de contenu jeux NON créées** :
- ❌ `geo_questions` (lat, lng, label, difficulty, pack_id)
- ❌ `quiz_packs` (name, questions[], choices[], answer_idx)
- ❌ `blind_tracks` (url_audio, title, artist, pack_id)
- ❌ `petitbac_categories` (name, locale)

→ Impact : RPC `submit_answer()` est STUB (score_delta = 0). Vrai calcul = distance(geo) / vitesse(quiz/blind) / validation(petitbac).

**Realtime channels NON wirés** :
- `/host` et `/play/[code]` créent leurs clients Supabase mais ne `.channel(code).subscribe()` pas
- TV pas connectée au lobby joueur live
- Manette pas wirée au state jeu

**Branding tenant visuel non appliqué** :
- Table prête, CSS variables prêtes, mais pas d'injection dynamique au runtime
- Task #5 : POC + UI admin `/dashboard/branding`

**UI Host écran TV vide** :
- Maquette statique uniquement (QR placeholder, CODE placeholder)
- Machine à états absente (lobby → question → réponse → leaderboard → fin)

**Manette mobile `/play/[code]` vide** :
- Champ pseudo disabled
- Pas d'UI jeu (Géo = carte click, Quiz = MCQ, Blind = input, Petit Bac = grid lettres)

**Loup-Garou V2** : mentionné dans CDC Interactive v2.1, pas dans les 4 jeux MVP

### Statut global

**DEV AVANCÉ** — fondations posées, pas encore vraiment jouable.

Estimation MVP 3 joueurs jouables : 2-3 sprints (tables contenu + Realtime + UI jeu + host TV).

---

## 5. Arena & Prévention (placeholders)

**Pas encore d'app dédiée** dans le monorepo. Renvoient vers `hub.velito.fr/construction?slug=arena` et `prevention` respectivement.

- **Arena** : plateforme tournois esport (CDC v3 rédigé, scaffold à venir)
- **Prévention** : infrastructure SaaS B2B prévention numérique (CDC v1 rédigé)

Les **oauth_clients** sont déjà seedés pour les 2 (anticipation Phase 5 OAuth).

---

## 6. Packages partagés

**`packages/ui`** :
- `Button`, `Card`, `Code`
- `ContinueWithVena` — bouton OAuth-style avec logo VENA inline, prend `hubUrl` + `returnTo`

**`packages/typescript-config`** :
- `base.json`, `nextjs.json`, `react-library.json`

**`packages/eslint-config`** :
- Config partagée Next + React 19

**`scripts/`** :
- `build-search-index.mjs` : crawler regex des `<h1>/<h2>/<h3>/<p>/<li>` dans toutes les apps → `apps/hub/public/search-index.json` (579 entrées)
- `generate-oauth-jwks.mjs` : génère paire RSA 2048 + affiche SQL INSERT (clé privée jamais commitée)

---

## 7. Documentation `/docs`

- `SSO_ARCHITECTURE.md` : archi cookie partagé `.velito.fr` + séparation VEA §7 bis (défense jury CDA)
- `OAUTH_ARCHITECTURE.md` : roadmap OAuth/OIDC 6 phases, schéma SQL, sécurité par menace, faille "reset = signup déguisé" §8 bis
- `ETAT_PROJET_2026-05-30.md` : ce document
- `LEARNING.md`, `CONTEXT.md` : notes archi historiques
- `instructions/` : routes structure + conventions code + arborescence
- CDC v2 par app (PDF + sources)
- Fiches produit par app

---

## 8. Roadmap consolidée (priorités)

### 🔴 Critique (à finir avant déploiement OAuth prod)

1. **OAuth Phase 3** — Endpoints `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo`, `/.well-known/openid-configuration`, `/jwks.json` (task #210, ~3-4h)
2. **OAuth Phase 4** — Consent screen + storage consents RGPD-friendly (task #211, ~2-3h)
3. **OAuth Phase 5** — Client OAuth Interactive avec popup + PKCE + callback (task #212, ~2-3h)
4. **OAuth Phase 6** — Tests E2E + audit sécu (task #213, ~2h)
5. **Rotation JWKS** avant prod réelle (task #7)
6. **Audit sécu global** Velito (task #217) — `/security-review` slash command + audit manuel

### 🟠 Haute priorité (déblocage features)

7. **Interactive — Tables de contenu jeux** : `geo_questions`, `quiz_packs`, `blind_tracks`, `petitbac_categories`. Sans ça, scoring = stub.
8. **Interactive — Realtime channels** : wire `/host` et `/play/[code]` à Supabase Realtime
9. **Interactive — UI jeu** : Géo (carte), Quiz (MCQ), Blind (audio), Petit Bac (grid lettres)
10. **Interactive — UI Host TV** : machine à états (lobby → question → réponse → leaderboard → fin)
11. **Branding tenant Interactive** (task #5) : POC + UI admin
12. **VEA — Fonction trigger XP recalc** : débloquer `trigger_logs_xp_apply` (vea-gamification-v2.sql partie 2)

### 🟡 Moyenne (polish + dette tech)

13. **VEA — Task #149** : éditeur sexe membres `/admin/bilan`
14. **VEA — Task #166** : refonte DA éditoriale back-office (homogénéiser avec front public refait 22/05)
15. **VEA — Nettoyage Prisma** : retirer client Prisma inutilisé (migration Supabase incomplète)
16. **VEA — Events historique DB-driven** : migrer `lib/events-historique.ts` en table
17. **VENA — Asset `/lien/clavel.jpg`** : ajouter la photo (placeholder initiales actuellement)
18. **VENA — Sync Notion CRM** : auto-sync demandes_contact vers Notion via `vena-prospecting-agent` skill
19. **Hub — Bug hydration Next.js 16** : warning métadata SSR sur certaines pages
20. **Hub — Sections landing** : "Comment ça marche" + "Module vedette VEA" + Footer

### 🟢 Basse (futur)

21. **Interactive — Tier Pro business** (task #6) : modèle économique upgrade
22. **TODO prod** `play.velito.fr` redirect Vercel (task #206)
23. **Arena scaffold** : créer l'app Next.js
24. **Prévention scaffold** : créer l'app Next.js
25. **VEA — Webhooks Discord/Twitch** événements
26. **VEA — Export CSV bilans** admin
27. **Loup-Garou V2** Interactive

---

## 9. Statut global Velito au 30/05/2026

| App | Statut | Production |
|---|---|---|
| Hub | 🟡 Mix prod + dev | Live partielle (auth, account, search, recovery) — OAuth en chantier |
| VEA | 🟢 Production | Live depuis 20/05/2026 |
| VENA | 🟢 Production | Live (velito.fr) |
| Interactive | 🟡 Dev avancé | Pas vraiment jouable (fondations posées) |
| Arena | ⚪ Placeholder | Pas d'app |
| Prévention | ⚪ Placeholder | Pas d'app |

**Forces** :
- Architecture multi-app cloisonnée propre (séparation VEA juridique respectée)
- Auth/SSO solide (cookie domain + middleware + RLS)
- Patterns sécurité respectés (anti-énumération, anti-faille "reset = signup", anti-CSRF state, anti-XSS)
- Documentation archi solide (défendable jury CDA : `SSO_ARCHITECTURE.md` + `OAUTH_ARCHITECTURE.md`)
- 13/16 migrations SQL VEA + 2 migrations Hub + 5 migrations VENA en prod

**Faiblesses** :
- Interactive très en retard côté UX joueur (manette + host TV)
- OAuth pas encore fonctionnel end-to-end
- Audit sécu global pas encore fait
- Dette tech VEA (Prisma résiduel, events hardcodés)

**Pour le jury CDA (avril 2027)** :
- 5 docs archi prêtes à défendre (SSO, OAuth, CDCs v2 par app, fiches produit)
- Patterns industriels appliqués (PKCE, JWT RS256, JWKS rotation, RLS, cookie HttpOnly)
- Mini-architectures décisionnelles dans chaque doc (justification des choix)

---

*Rapport généré le 30/05/2026 via audit automatisé du monorepo (4 agents Explore en parallèle + consolidation).*
