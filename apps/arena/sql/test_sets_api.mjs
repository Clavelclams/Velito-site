/**
 * Tests des migrations 013 (sets) et 014 (clés API) sur un vrai Postgres (PGlite).
 *
 * Lancer depuis apps/arena :   node sql/test_sets_api.mjs
 *
 * Ce que ça prouve :
 *  013 : la colonne accepte un détail bien formé et refuse le reste ; le
 *        verrou du règlement §3 protège maintenant les sets ET l'équipe
 *        gagnante d'un match validé ; idempotente.
 *  014 : une clé connue est comptée, une clé inconnue ou révoquée ne rend
 *        rien ; la 121e requête de la minute est refusée ; anon et
 *        authenticated ne lisent pas les tables et n'appellent pas la
 *        fonction ; idempotente.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
/** Refus attendu ET pour la bonne raison (texte du message d'erreur). */
async function refusPar(label, motif, sql, params) {
  try {
    await db.query(sql, params);
    fail++;
    console.log("  FAIL  " + label + " -> la requête aurait dû être REFUSÉE");
  } catch (e) {
    if (e.message.includes(motif)) {
      pass++;
      console.log("  PASS  " + label + " (refusée : " + motif + ")");
    } else {
      fail++;
      console.log("  FAIL  " + label + " -> refusée pour une autre raison : " + e.message.split("\n")[0]);
    }
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

// ---------- Stubs Supabase ----------
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
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
for (const f of [
  "001_arena_schema_v1.sql",
  "002_arena_formats_jeux.sql",
  "003_arena_poules.sql",
  "004_arena_sport_equipes_elo.sql",
  "005_arena_ordre_participations.sql",
  "006_arena_resultats_externes.sql",
  "007_arena_terrains.sql",
  "008_arena_jeux_fc26.sql",
  "009_arena_joueurs_colonnes.sql",
]) await ok(f, () => charger(f));
await db.exec(`grant usage on schema arena to anon, authenticated, service_role;`);
for (const f of ["010_arena_espace_joueur.sql", "011_arena_mon_resume.sql", "012_arena_validation_atomique.sql"]) {
  await ok(f, () => charger(f));
}
await ok("013 s'exécute", () => charger("013_arena_sets.sql"));
await ok("013 rejouée sans erreur", () => charger("013_arena_sets.sql"));
await ok("014 s'exécute", () => charger("014_arena_api_cles.sql"));
await ok("014 rejouée sans erreur", () => charger("014_arena_api_cles.sql"));

// ---------- Données ----------
const org = (await q(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).rows[0].id;
const ja = (await q(`insert into arena.joueurs (pseudo) values ('Aya') returning id`)).rows[0].id;
const jb = (await q(`insert into arena.joueurs (pseudo) values ('Bob') returning id`)).rows[0].id;
const t = (await q(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut) values ($1,'Padel','Padel',now(),'EN_COURS') returning id`, [org])).rows[0].id;
const m = (await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,statut) values ($1,1,0,$2,$3,'A_JOUER') returning id`, [t, ja, jb])).rows[0].id;

console.log("\n== 013 : sets ==");
await ok("détail bien formé accepté", () =>
  q(`update arena.matchs set sets='[[6,4],[3,6],[7,5]]'::jsonb, score_j1=2, score_j2=1, statut='TERMINE' where id=$1`, [m]));
await mustFail("objet au lieu d'un tableau", `update arena.matchs set sets='{"a":1}'::jsonb where id=$1`, [m]);
await mustFail("tableau vide", `update arena.matchs set sets='[]'::jsonb where id=$1`, [m]);
await mustFail("6 sets", `update arena.matchs set sets='[[1,0],[1,0],[1,0],[1,0],[1,0],[1,0]]'::jsonb where id=$1`, [m]);
await ok("validation du match", () =>
  q(`update arena.matchs set statut='VALIDE', gagnant_id=$2 where id=$1`, [m, ja]));
await refusPar("sets modifiés après validation (verrou §3)", "règlement §3", `update arena.matchs set sets='[[6,0],[6,0]]'::jsonb where id=$1`, [m]);
// Match par équipes validé, puis tentative de changer l'équipe gagnante
// vers l'AUTRE équipe du match (valeur légale pour les contraintes : seul
// le verrou peut la refuser).
const e1 = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'Les Renards') returning id`, [t])).rows[0].id;
const e2 = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'Les Loups') returning id`, [t])).rows[0].id;
const me = (await q(`insert into arena.matchs (tournoi_id,round,position,equipe1_id,equipe2_id,score_j1,score_j2,statut,equipe_gagnante_id)
                     values ($1,1,1,$2,$3,2,0,'VALIDE',$2) returning id`, [t, e1, e2])).rows[0].id;
await refusPar("équipe gagnante modifiée après validation (trou fermé)", "règlement §3",
  `update arena.matchs set equipe_gagnante_id=$2 where id=$1`, [me, e2]);
await ok("terrain toujours modifiable après validation", () =>
  q(`update arena.matchs set terrain='Court 2' where id=$1`, [m]));

console.log("\n== 014 : clés API ==");
const empreinte = (cle) => createHash("sha256").update(cle).digest("hex");
const CLE = "arena_cle-de-test";
const cle = (await q(`insert into arena.api_cles (organisation_id,nom,prefixe,empreinte) values ($1,'Site du club','arena_cle-de',$2) returning id`, [org, empreinte(CLE)])).rows[0].id;
await mustFail("empreinte qui n'est pas du SHA-256 hex", `insert into arena.api_cles (organisation_id,nom,prefixe,empreinte) values ($1,'X2','x','abc')`, [org]);

const consommer = async (e, limite = 120) =>
  (await q(`select * from arena.api_consommer($1,$2)`, [e, limite])).rows;

await db.exec(`set role service_role;`);
await ok("clé connue : autorisée, 119 restantes", async () => {
  const r = await consommer(empreinte(CLE));
  if (r.length !== 1 || r[0].autorise !== true || r[0].restant !== 119 || r[0].organisation_id !== org) throw new Error(JSON.stringify(r));
});
await ok("clé inconnue : aucune ligne", async () => {
  const r = await consommer(empreinte("arena_inconnue"));
  if (r.length !== 0) throw new Error(JSON.stringify(r));
});
await ok("dernier usage noté", async () => {
  const r = (await q(`select dernier_usage_le from arena.api_cles where id=$1`, [cle])).rows[0];
  if (!r.dernier_usage_le) throw new Error("vide");
});
await ok("limite à 3 : la 4e requête de la minute est refusée", async () => {
  // Déjà 1 requête comptée cette minute ; on en fait 3 de plus avec limite 3.
  const r2 = await consommer(empreinte(CLE), 3);
  const r3 = await consommer(empreinte(CLE), 3);
  const r4 = await consommer(empreinte(CLE), 3);
  if (r2[0].autorise !== true || r3[0].autorise !== true || r4[0].autorise !== false || r4[0].restant !== 0) {
    throw new Error(JSON.stringify([r2, r3, r4]));
  }
});
await ok("une seule ligne de compteur pour la minute (pas de doublon)", async () => {
  const r = (await q(`select count(*)::int n, max(nb)::int nb from arena.api_usage where cle_id=$1`, [cle])).rows[0];
  if (r.n !== 1 || r.nb !== 4) throw new Error(JSON.stringify(r));
});
await ok("vieux compteurs purgés à la première requête d'une minute", async () => {
  await q(`insert into arena.api_usage values ($1, now() - interval '2 days', 50)`, [cle]);
  await q(`delete from arena.api_usage where cle_id=$1 and minute=date_trunc('minute', now())`, [cle]);
  await consommer(empreinte(CLE));
  const r = (await q(`select count(*)::int n from arena.api_usage where cle_id=$1 and minute < now() - interval '1 day'`, [cle])).rows[0];
  if (r.n !== 0) throw new Error(String(r.n));
});
await ok("clé révoquée : aucune ligne", async () => {
  await q(`update arena.api_cles set revoquee_le=now() where id=$1`, [cle]);
  const r = await consommer(empreinte(CLE));
  if (r.length !== 0) throw new Error(JSON.stringify(r));
});
await db.exec(`reset role;`);

for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role};`);
  await mustFail(`${role} ne lit pas arena.api_cles`, `select * from arena.api_cles`);
  await mustFail(`${role} ne lit pas arena.api_usage`, `select * from arena.api_usage`);
  await mustFail(`${role} n'appelle pas api_consommer`, `select * from arena.api_consommer('x')`);
  await db.exec(`reset role;`);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
