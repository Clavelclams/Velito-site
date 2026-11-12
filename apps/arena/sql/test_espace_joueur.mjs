/**
 * Tests de la migration 010 (espace joueur) sur un vrai moteur Postgres (PGlite).
 *
 * Lancer depuis apps/arena :   node sql/test_espace_joueur.mjs
 *
 * Mise en place : stub des schémas auth et shared de Supabase, rôles, puis
 * migrations 001 à 010 dans l'ordre, comme en production.
 *
 * Ce que ça prouve :
 *  1. la 010 s'exécute, et une DEUXIÈME fois sans erreur (idempotente) ;
 *  2. un compte ne peut être relié qu'à un seul joueur ;
 *  3. une seule demande en attente par compte et par pseudo ;
 *  4. une demande traitée exige qui et quand ;
 *  5. source d'inscription limitée à staff / en_ligne, défaut staff ;
 *  6. RLS : un joueur ne lit que SES demandes, l'anonyme rien du tout.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SQL_DIR = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();
let pass = 0,
  fail = 0;

async function ok(label, fn) {
  try {
    await fn();
    pass++;
    console.log("  PASS  " + label);
  } catch (e) {
    fail++;
    console.log("  FAIL  " + label + " -> " + e.message.split("\n")[0]);
  }
}
async function mustFail(label, sql, params) {
  try {
    await db.query(sql, params);
    fail++;
    console.log("  FAIL  " + label + " -> la requête aurait dû être REFUSÉE");
  } catch {
    pass++;
    console.log("  PASS  " + label + " (refusée comme prévu)");
  }
}
const q = (sql, params) => db.query(sql, params);
const charger = (f) => db.exec(readFileSync(join(SQL_DIR, f), "utf8"));
const comme = (uid) => db.exec(`select set_config('app.uid','${uid}', false);`);

// ---------- 0. Stubs Supabase ----------
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  create schema shared;
  create table shared.organizations (id uuid primary key default gen_random_uuid(), slug text unique, name text);
  create table shared.user_permissions (user_id uuid, organization_id uuid, scope text,
    primary key (user_id, organization_id));
  grant usage on schema shared to anon, authenticated, service_role;
  grant select on all tables in schema shared to anon, authenticated, service_role;
`);

console.log("\n== Migrations ==");
const fichiers = [
  "001_arena_schema_v1.sql",
  "002_arena_formats_jeux.sql",
  "003_arena_poules.sql",
  "004_arena_sport_equipes_elo.sql",
  "005_arena_ordre_participations.sql",
  "006_arena_resultats_externes.sql",
  "007_arena_terrains.sql",
  "008_arena_jeux_fc26.sql",
  "009_arena_joueurs_colonnes.sql",
];
for (const f of fichiers) await ok(f, () => charger(f));
await db.exec(`grant usage on schema arena to anon, authenticated, service_role;`);
await ok("010 s'exécute", () => charger("010_arena_espace_joueur.sql"));
await ok("010 rejouée sans erreur (idempotente)", () => charger("010_arena_espace_joueur.sql"));

// ---------- Données ----------
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const STAFF = "33333333-3333-4333-8333-333333333333";
await q(`insert into auth.users values ($1,'u1@test.fr'),($2,'u2@test.fr'),($3,'staff@test.fr')`, [U1, U2, STAFF]);
const org = (await q(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).rows[0].id;
const j1 = (await q(`insert into arena.joueurs (pseudo) values ('Lea') returning id`)).rows[0].id;
const j2 = (await q(`insert into arena.joueurs (pseudo) values ('Sam') returning id`)).rows[0].id;
const t = (
  await q(
    `insert into arena.tournois (organisation_id, titre, jeu, date_debut, statut)
     values ($1,'Tournoi test','Rocket League', now(), 'OUVERT') returning id, inscription_en_ligne`,
    [org],
  )
).rows[0];

console.log("\n== Règles ==");
await ok("inscription_en_ligne vaut false par défaut", async () => {
  if (t.inscription_en_ligne !== false) throw new Error(String(t.inscription_en_ligne));
});
await ok("participation : source = staff par défaut", async () => {
  const r = await q(`insert into arena.participations (tournoi_id, joueur_id) values ($1,$2) returning source`, [t.id, j1]);
  if (r.rows[0].source !== "staff") throw new Error(r.rows[0].source);
});
await ok("participation : source en_ligne acceptée", () =>
  q(`insert into arena.participations (tournoi_id, joueur_id, source) values ($1,$2,'en_ligne')`, [t.id, j2]),
);
await mustFail(
  "participation : source inconnue",
  `update arena.participations set source = 'pirate' where joueur_id = $1`,
  [j1],
);

await ok("compte relié à un joueur", () => q(`update arena.joueurs set user_id = $1 where id = $2`, [U1, j1]));
await mustFail("même compte relié à un deuxième joueur", `update arena.joueurs set user_id = $1 where id = $2`, [U1, j2]);
await ok("plusieurs joueurs sans compte restent possibles", () =>
  q(`insert into arena.joueurs (pseudo) values ('Noa'),('Ines')`),
);

await ok("U2 demande le pseudo Sam", () =>
  q(`insert into arena.demandes_rattachement (joueur_id, user_id) values ($1,$2)`, [j2, U2]),
);
await mustFail(
  "U2 deuxième demande en attente",
  `insert into arena.demandes_rattachement (joueur_id, user_id) values ($1,$2)`,
  [j1, U2],
);
await mustFail(
  "U1 demande Sam pendant que U2 attend",
  `insert into arena.demandes_rattachement (joueur_id, user_id) values ($1,$2)`,
  [j2, U1],
);
await mustFail(
  "demande acceptée sans qui ni quand",
  `update arena.demandes_rattachement set statut = 'ACCEPTEE' where user_id = $1`,
  [U2],
);
await ok("demande acceptée avec qui et quand", () =>
  q(
    `update arena.demandes_rattachement set statut='ACCEPTEE', traitee_par=$1, traitee_le=now() where user_id=$2`,
    [STAFF, U2],
  ),
);
await ok("après traitement, une nouvelle demande redevient possible", () =>
  q(`insert into arena.demandes_rattachement (joueur_id, user_id) values ($1,$2)`, [j1, U2]),
);

console.log("\n== Droits ==");
await ok("anon : aucun droit sur demandes_rattachement", async () => {
  const r = await q(`select bool_or(has_table_privilege('anon','arena.demandes_rattachement', p)) as un
                     from unnest(array['select','insert','update','delete']) p`);
  if (r.rows[0].un !== false) throw new Error("anon a un droit");
});
await ok("authenticated : lecture seule", async () => {
  const r = await q(`select has_table_privilege('authenticated','arena.demandes_rattachement','select') s,
                            has_table_privilege('authenticated','arena.demandes_rattachement','insert') i`);
  if (r.rows[0].s !== true || r.rows[0].i !== false) throw new Error(JSON.stringify(r.rows[0]));
});
await db.exec(`set role authenticated;`);
await comme(U2);
await ok("U2 lit ses 2 demandes", async () => {
  const r = await q(`select count(*)::int n from arena.demandes_rattachement`);
  if (r.rows[0].n !== 2) throw new Error(String(r.rows[0].n));
});
await comme(U1);
await ok("U1 ne voit pas celles de U2", async () => {
  const r = await q(`select count(*)::int n from arena.demandes_rattachement`);
  if (r.rows[0].n !== 0) throw new Error(String(r.rows[0].n));
});
await mustFail(
  "U1 ne peut pas écrire de demande directement",
  `insert into arena.demandes_rattachement (joueur_id, user_id) values ($1,$2)`,
  [j2, U1],
);
await db.exec(`reset role;`);

console.log(`\n${pass} réussis, ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
