# ARENA — Webapp tournois (arena.velito.fr)

Hub de gestion de tournois esport amateur. V1 = MVP resserré ciblé sur le
tournoi VEA de la rentrée 2026.

**📋 Document de référence dev : `Application/arena-store/ARENA_CADRAGE_V1.md`**
(scope V1, décisions, corrections vs la spec de mars, roadmap).
La vision long terme reste dans `CDC/arena/ARENA_SPEC_COMPLETE_V1.pdf`.

## État actuel (24/07/2026)

| Élément | Statut |
|---|---|
| `lib/bracket.ts` | ✅ Algo élimination simple, testé (13 tests Vitest) |
| `lib/bracket.test.ts` | ✅ `npx vitest run apps/arena/lib` (installer vitest si absent : `npm i -D vitest`) |
| `sql/001_arena_schema_v1.sql` | 🟡 Draft à relire puis passer en migration Supabase |
| Routes / UI | ⬜ À construire (S2-S3) |

## Ce qui est volontairement différent de la spec de mars 2026

1. **Pas de table BracketNode** — le parent d'un match `(round, position)` se
   calcule : `(round + 1, floor(position / 2))`. Une table en moins, zéro sync.
2. **Supabase SQL direct** (comme VEA/Interactive), pas le Prisma racine
   (legacy MySQL, ne pas toucher).
3. **Auth = SSO cookie `.velito.fr` existant**, pas de middleware Bearer custom.
4. Trois bugs de l'algo de la spec corrigés (double-bye, shuffle biaisé,
   égalité non gérée) — détails en tête de `lib/bracket.ts`.

## Dev

```bash
npm run dev        # port 3003
npx vitest run apps/arena/lib   # tests bracket (depuis la racine du monorepo)
```

## Scope V1 (rappel anti-dérive)

Tournoi → inscriptions/check-in QR → bracket élim simple → scores validés →
page publique temps réel → export JSON. Prévention en contenu statique.
**Tout le reste est V2** (badges, dépenses, autres formats, API publique, imports, app native).
