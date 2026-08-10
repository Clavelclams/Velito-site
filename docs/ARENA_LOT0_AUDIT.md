# ARENA — Rapport d'audit Lot 0

> Livrable des Tâches 3, 4 et 5 du Lot 0 (feuille de route ARENA v2, août 2026).
> Audit réalisé le 10/08/2026 sur le code réel du dépôt (`apps/arena`) + vérification prod.
> Transparence : l'essentiel du code audité a été écrit dans des sessions Claude
> récentes pilotées par Clavel — l'audit revalide contre les fichiers, pas de mémoire.

---

## 1. Cause racine du bug `/admin` (Tâche 1 — corrigée)

`app/admin/layout.tsx` → `getContexteStaff()` → `createClient()` qui **lève une
exception** quand `SUPABASE_URL` / `SUPABASE_ANON_KEY` sont absentes. Or ces
variables n'ont jamais été configurées sur le projet Vercel arena. Une config
absente était traitée comme un bug imprévu au lieu d'un état prévisible.

**Correctif livré** (branche `fix/admin-500` à pousser) :
- `configSupabasePresente()` + `getContexteStaff()` qui ne lève plus jamais pour un problème de config (log serveur + retour null)
- Écran explicite « app non reliée à sa base » dans le layout admin (messages distingués, convention écosystème)
- `app/global-error.tsx` : filet ultime pour les erreurs du layout racine (le `error.tsx` de segment ne les attrape pas)

**Le correctif rend l'écran propre ; il ne rend PAS `/admin` fonctionnel.**
Restent à faire côté admin humain : env Vercel + création des tables Supabase.

---

## 2. Conformité règlement ↔ code (Tâche 3)

| Promesse du règlement | État | Fichier |
|---|---|---|
| Joueur non check-in n'entre pas dans le bracket | ✅ Implémenté | `lib/arena/actions.ts` (`demarrerTournoi`, filtre `check_in = true`) |
| Bracket généré automatiquement par tirage au sort | ✅ Implémenté + testé | `lib/bracket.ts` (Fisher-Yates + `genererBracketEliminationSimple`) |
| Byes attribués par tirage si effectif ≠ puissance de 2 | ✅ Implémenté + testé | `lib/bracket.ts` (test anti « double-bye ») |
| Validation staff fait avancer le gagnant | ✅ Implémenté + testé (algo) | `lib/arena/actions.ts` (`validerScore`) + `lib/bracket.ts` (`progresserGagnant`) |
| La validation est définitive (verrouillage) | 🟡 Partiel | `lib/arena/actions.ts` (`saisirScore` refuse un match VALIDE) — verrou **applicatif uniquement**, aucun verrou DB (trigger/contrainte) |
| Saisies et modifications historisées | 🟡 Partiel | `lib/arena/actions.ts` (`log()` → `arena_logs`, avec ancien/nouveau score) — code complet, mais **la table n'existe pas encore en base** |

**⚠️ Réserve globale majeure** : le SQL (`apps/arena/sql/001_arena_schema_v1.sql`)
n'a **jamais été exécuté** dans Supabase. Toutes les lignes « implémenté »
ci-dessus sont vraies au niveau du code (typecheck strict 0 erreur, 22 tests
unitaires verts) mais **aucun tournoi n'a jamais tourné de bout en bout**.
Le règlement publié promet des comportements qu'aucune infrastructure ne porte
encore. Ce n'est pas mentir au public tant qu'aucun tournoi n'est annoncé,
mais c'est LA dette à résorber avant toute communication.

**Trouvaille d'audit (remontée, pas corrigée — hors périmètre Lot 0)** :
`demarrerTournoi` n'est pas protégé contre le double-clic : deux soumissions
quasi simultanées passeraient toutes deux le test `statut === "OUVERT"` et
généreraient **deux brackets**. À corriger au Lot 2 (verrou par transition
atomique : `UPDATE ... WHERE statut = 'OUVERT'` + vérif du rowcount).

---

## 3. Inventaire technique (Tâche 4)

**Tables dans le schéma `arena.` de Supabase : AUCUNE.**
Le fichier SQL existant crée 7 tables préfixées `arena_*` dans `public`
(organisations, membres_orga, joueurs, tournois, participations, matchs, logs)
avec RLS lecture publique / écriture membres. Jamais exécuté. À **réécrire en
schéma `arena.`** avant exécution (conforme feuille de route §4.1) — coût
faible puisque la base est vierge.

**Routes existantes** :

| Route | Type | Rôle |
|---|---|---|
| `/` | Page publique | Accueil + liste tournois publiés |
| `/prevention`, `/reglement` | Pages publiques statiques | Contenu éditorial |
| `/t/[token]` | Page publique | Bracket temps réel (polling 15 s), token = `qr_token` |
| `/api/export/[token]` | Route Handler GET | Export JSON public (RLS appliquée) |
| `/admin` | Redirect → `/admin/tournois` | — |
| `/admin/tournois` (+ `/nouveau`, `/[id]`, `/[id]/qr`) | Pages staff | CRUD tournoi, check-in, scores, QR imprimable |
| `middleware.ts` | Edge | Refresh session + cookie `.velito.fr` |
| `error.tsx`, `global-error.tsx`, `not-found.tsx` | Filets | Plus de 500 brute possible |

**Branchement OIDC : NON.** ARENA consomme aujourd'hui le **cookie SSO partagé**
(pattern `docs/SSO_ARCHITECTURE.md` §5, identique hub/interactive). Aucun code
OAuth/PKCE côté arena. Le client `arena` est seedé côté hub. Branchement PKCE = Lot 1.

**Versions réelles** (`apps/arena/package.json`) : Next.js **16.2.0**, React
**^19.2.0**, Tailwind **^3.4.19** (v3 ✓), TypeScript 5.9.2, @supabase/ssr 0.5.2.
**Gestionnaire : npm** (package-lock.json à la racine) — ⚠️ contradiction avec
la feuille de route qui impose pnpm. À trancher par Clavel ; recommandation :
rester npm (migration pnpm = chantier séparé sans gain immédiat).

**Prisma : absent d'arena.** Résidus dans le repo : `prisma/` + `prisma.config.ts`
à la racine et client inutilisé côté VEA (dette déjà identifiée, hors périmètre).

**Tests : OUI** — vitest, **22 tests verts** : 13 sur `lib/bracket.ts`
(génération, byes, progression, simulation complète 5 joueurs) + 9 sur
`lib/arena/transitions.ts` et `affichage.ts`. Le tracker Notion (« aucun test »)
est faux.

---

## 4. Lecture de la qualité du code existant (Tâche 5)

**Points forts** : logique métier isolée en modules purs testés (bracket,
transitions) ; Server Components + Server Actions sans état client (1 seul
composant client : AutoRefresh) ; erreurs métier gérées par redirection
`?erreur=` + bandeau (pas de 500 sur une égalité saisie) ; journal d'audit
prévu sur chaque action sensible avec ancien/nouveau ; commentaires français
pédagogiques ; conventions env héritées du bug VENA respectées.

**Points faibles** : aucune exécution réelle (base absente) ; verrou de
validation applicatif seulement ; pas de protection double-soumission sur
`demarrerTournoi` ; rôles ADMIN/STAFF non différenciés dans le code (le champ
existe en base) ; mono-organisation câblé dans `getContexteStaff` (limite
multi-tenant, isolation RLS jamais testée par un test dédié) ; `shared.user_permissions`
non réutilisé (système parallèle `arena_membres_orga` — écart avec le Lot 1).

## 5. Écarts CDC / feuille de route ↔ réalité

- Auth : cookie SSO au lieu d'OIDC PKCE (prévu Lot 1, décision actée)
- Formats : seule l'élimination simple existe (double élim + poules = Lot 2)
- Schéma : `public.arena_*` au lieu de `arena.*` (à corriger avant exécution)
- RGPD : rien d'implémenté (consentements, mineurs, effacement = Lot 1)
- Pages spectateur/participant : page publique unique `/t/[token]` (pas de « mon match / mon adversaire »)
- Export JSON : déjà fait (Lot 4 partiellement entamé)

## 6. Estimation de charge révisée

| Lot | Feuille de route | Révisé après audit | Justification |
|---|---|---|---|
| Lot 0 | 2-3 j | ✅ fait (reste : validation + push) | — |
| Lot 1 (socle) | 5-7 j | **6-8 j** | Rien du Lot 1 n'existe (OIDC, RGPD, rôles, schéma arena., tests isolation). Pas de baisse magique. |
| Lot 2 (esport cœur) | 10-12 j | **5-7 j** | Élimination simple + check-in + scores + QR + logs déjà écrits et testés unitairement. Restent : double élim, poules, page participant, anti double-submit, tests d'intégration. |
| Lot 3 (imports) | 5-6 j | 5-6 j | Rien de fait |
| Lot 4 (classement/API) | 4 j | **3 j** | Export JSON déjà livré |
| Lots 5-7 (sport + qualité) | 23-28 j | 23-28 j | Rien de fait |

**Total esport + socle : ~19-24 j** au lieu de 24-29 j. Total général : **~42-52 j**.

---

*Prochain jalon après validation de ce rapport : push de `fix/admin-500`,
puis Lot 1 — en commençant par la réécriture du SQL en schéma `arena.`.*
