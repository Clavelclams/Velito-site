# ARENA — Velito Tournois

Hub de tournois esport amateur. Brackets, scores validés, résultats qui ne se
perdent plus. App du monorepo Velito — `arena.velito.fr` — port dev **3003**.

## État d'avancement

- ✅ **S1** — Algo bracket élimination simple (`lib/bracket.ts`, pur, 13 tests
  vitest) + schéma SQL (`sql/001_arena_schema_v1.sql`, 7 tables + RLS).
- ✅ **S2** — Supabase branché (SSO cookie `.velito.fr`, même pattern que le
  hub) + flux orga complet : créer un tournoi, inscriptions/check-in jour J,
  démarrage (génération du bracket en base), saisie puis validation des scores
  (double étape), progression automatique des gagnants, logs d'audit.
- ✅ **S3** — Page publique `/t/[qr_token]` (bracket en direct, refresh auto
  15 s), QR code imprimable (`/admin/tournois/[id]/qr`), export JSON public
  (`/api/export/[qr_token]`), page prévention statique (`/prevention`).
- ⬜ **S4** — Durcissement : comptes joueurs (auth hub), multi-orgas, imports
  start.gg (V2). Voir `ARENA_CADRAGE_V1.md` (dossier Application/arena-store).

## Architecture (à savoir défendre)

- **Server Components + Server Actions uniquement** — pas de route API custom
  pour le flux orga, pas de state client. Un seul composant `"use client"` :
  `AutoRefresh` (polling de la page publique).
- **Sécurité en 3 couches** : (1) chaque Server Action commence par
  `requireStaff()` ; (2) les écritures passent par le client `service_role`
  server-only APRÈS ce contrôle ; (3) la RLS Postgres reste active en filet
  (lecture publique = tournois non-BROUILLON seulement).
- **Logique métier isolée** : `lib/bracket.ts` est pur (zéro dépendance,
  zéro I/O), testé par `lib/bracket.test.ts`. Les actions orchestrent, elles ne
  décident pas.
- **Traçabilité** : toute action sensible écrit dans `arena_logs`
  (qui/quoi/quand + ancien/nouveau score) — utile en litige ET pour les
  bilans d'activité VEA.

## Dev local

```bash
npm install               # à la racine du monorepo
cp .env.example .env.local  # puis remplir (mêmes valeurs que le hub)
npm run dev               # http://localhost:3003
npm run test              # 13 tests bracket
```

Prérequis : `sql/001_arena_schema_v1.sql` exécuté dans Supabase + seed d'une
organisation et d'un membre ADMIN (voir le cadrage).

## Pièges connus

- Le monorepo active `noUncheckedIndexedAccess` : `tableau[i]` est typé
  `T | undefined` → pas de swap destructuré, pas d'index sans garde.
- Les `NEXT_PUBLIC_*` marquées Sensitive sur Vercel arrivent vides au runtime →
  toujours lire `SUPABASE_URL` (runtime) en priorité (leçon du bug devis VENA).
