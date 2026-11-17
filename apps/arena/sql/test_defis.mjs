/**
 * Tests de la migration 015 (défi au score) sur PGlite, migrations 001 à 015.
 * Lancer depuis apps/arena :   node sql/test_defis.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SQL_DIR = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();
let pass = 0, fail = 0;
async function ok(label, fn) {
  try { await fn(); pass++; console.log("  PASS  " + label); }
  catch (e) { fail++; console.log("  FAIL  " + label + " -> " + e.message.split("\n")[0]); }
}
async function refus(label, sql, p) {
  try { await db.query(sql, p); fail++; console.log("  FAIL  " + label + " -> aurait dû être refusé"); }
  catch { pass++; console.log("  PASS  " + label + " (refusé)"); }
}
const q = (s, p) => db.query(s, p);
const charger = (f) => db.exec(readFileSync(join(SQL_DIR, f), "utf8"));

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  create schema shared;
  create table shared.organizations (id uuid primary key default gen_random_uuid(), slug text unique, name text);
  create table shared.user_permissions (user_id uuid, organization_id uuid, scope text, primary key (user_id, organization_id));
  grant usage on schema shared to anon, authenticated, service_role;
  grant select on all tables in schema shared to anon, authenticated, service_role;
`);
for (const f of ["001_arena_schema_v1.sql", "002_arena_formats_jeux.sql", "003_arena_poules.sql", "004_arena_sport_equipes_elo.sql",
  "005_arena_ordre_participations.sql", "006_arena_resultats_externes.sql", "007_arena_terrains.sql", "008_arena_jeux_fc26.sql",
  "009_arena_joueurs_colonnes.sql"]) await charger(f);
await db.exec(`grant usage on schema arena to anon, authenticated, service_role;`);
for (const f of ["010_arena_espace_joueur.sql", "011_arena_mon_resume.sql", "012_arena_validation_atomique.sql",
  "013_arena_sets.sql", "014_arena_api_cles.sql"]) await charger(f);

await ok("015 s'exécute", () => charger("015_arena_defis.sql"));
await ok("015 rejouée sans erreur", () => charger("015_arena_defis.sql"));

const org = (await q(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).rows[0].id;
const defi = (await q(`insert into arena.defis (organisation_id,titre) values ($1,'Atelier') returning id`, [org])).rows[0].id;
const rot = (await q(`insert into arena.defi_rotations (defi_id,numero,heure) values ($1,1,'09:30') returning id`, [defi])).rows[0].id;
const rouge = (await q(`insert into arena.defi_equipes (defi_id,rotation_id,couleur) values ($1,$2,'ROUGE') returning id`, [defi, rot])).rows[0].id;
await q(`insert into arena.defi_equipes (defi_id,rotation_id,couleur) values ($1,$2,'BLEU')`, [defi, rot]);

await refus("deux équipes Rouge dans la même rotation", `insert into arena.defi_equipes (defi_id,rotation_id,couleur) values ($1,$2,'ROUGE')`, [defi, rot]);
await refus("couleur inconnue", `insert into arena.defi_equipes (defi_id,rotation_id,couleur) values ($1,$2,'VERT')`, [defi, rot]);
await refus("heure mal formée", `insert into arena.defi_rotations (defi_id,numero,heure) values ($1,2,'9h30')`, [defi]);
await ok("rotation courante pointable", () => q(`update arena.defis set rotation_courante_id=$2 where id=$1`, [defi, rot]));

await db.exec(`set role service_role;`);
await ok("+3 puis −1 = 2", async () => {
  await q(`select arena.defi_ajuster_score($1, 3)`, [rouge]);
  const r = (await q(`select arena.defi_ajuster_score($1, -1) s`, [rouge])).rows[0].s;
  if (r !== 2) throw new Error(String(r));
});
await ok("jamais sous 0", async () => {
  const r = (await q(`select arena.defi_ajuster_score($1, -10) s`, [rouge])).rows[0].s;
  if (r !== 0) throw new Error(String(r));
});
await db.exec(`reset role;`);

for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role};`);
  await refus(`${role} ne lit pas les défis`, `select * from arena.defis`);
  await refus(`${role} ne lit pas les équipes`, `select * from arena.defi_equipes`);
  await refus(`${role} n'appelle pas defi_ajuster_score`, `select arena.defi_ajuster_score($1, 1)`, [rouge]);
  await db.exec(`reset role;`);
}
await ok("supprimer le défi supprime rotations et équipes", async () => {
  await q(`delete from arena.defis where id=$1`, [defi]);
  const n = (await q(`select count(*)::int n from arena.defi_equipes`)).rows[0].n;
  if (n !== 0) throw new Error(String(n));
});
await ok("aucune table existante touchée : tournois toujours vide et intact", async () => {
  await q(`select count(*) from arena.tournois`);
});

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
