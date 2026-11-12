/**
 * Tests de la migration 012 (validation atomique) sur un vrai moteur Postgres (PGlite).
 *
 * Lancer depuis apps/arena :   node sql/test_validation_atomique.mjs
 *
 * Mise en place : stub des schémas auth et shared de Supabase, rôles, puis
 * migrations 001 à 010 dans l'ordre, comme en production.
 *
 * Ce que ça prouve :
 *  1. la 012 s'exécute deux fois (idempotente) ;
 *  2. une validation passe le match en VALIDE, place le gagnant au tour
 *     suivant et écrit le journal, en individuel comme en équipes ;
 *  3. une deuxième validation du même match est REFUSÉE (double clic,
 *     deux membres du staff) ;
 *  4. si un placement échoue, RIEN n'est écrit (ni VALIDE, ni journal) ;
 *  5. seul service_role peut appeler la fonction.
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

await ok("011 s'exécute", () => charger("011_arena_mon_resume.sql"));
await ok("011 rejouée sans erreur", () => charger("011_arena_mon_resume.sql"));
await ok("012 s'exécute", () => charger("012_arena_validation_atomique.sql"));
await ok("012 rejouée sans erreur", () => charger("012_arena_validation_atomique.sql"));

// ---------- Données ----------
const STAFF = "99999999-9999-4999-8999-999999999999";
await q(`insert into auth.users values ($1,'staff@test.fr')`, [STAFF]);
const org = (await q(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).rows[0].id;
const ids = [];
for (const p of ["Aya", "Bob", "Cid", "Dan"]) ids.push((await q(`insert into arena.joueurs (pseudo) values ($1) returning id`, [p])).rows[0].id);
const t = (await q(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut) values ($1,'Test','Jeu',now(),'EN_COURS') returning id`, [org])).rows[0].id;
const match = async (round, position, j1, j2, s1, s2, statut) =>
  (await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,score_j1,score_j2,statut)
            values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`, [t, round, position, j1, j2, s1, s2, statut])).rows[0].id;
const m0 = await match(1, 0, ids[0], ids[1], 3, 1, "TERMINE");
const m1 = await match(1, 1, ids[2], ids[3], 0, 2, "TERMINE");
const finale = await match(2, 0, null, null, null, null, "A_JOUER");
const tAutre = (await q(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut) values ($1,'Autre','Jeu',now(),'EN_COURS') returning id`, [org])).rows[0].id;
const autre = (await q(`insert into arena.matchs (tournoi_id,round,position,statut) values ($1,2,0,'A_JOUER') returning id`, [tAutre])).rows[0].id;
const appel = (matchId, gagnant, placements, equipes = false, tournoi = t) =>
  q(`select arena.appliquer_validation($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)`,
    [tournoi, matchId, gagnant, equipes, JSON.stringify(placements), STAFF, JSON.stringify({ gagnant_id: gagnant })]);
const ligne = async (id) => (await q(`select * from arena.matchs where id=$1`, [id])).rows[0];
const nbLogs = async () => (await q(`select count(*)::int n from arena.logs where action='MATCH_VALIDE'`)).rows[0].n;

console.log("\n== Validation ==");
await db.exec(`set role service_role;`);
await ok("m0 validé, A placé en finale (c1), journal écrit", async () => {
  await appel(m0, ids[0], [{ match_id: finale, slot: "c1", camp_id: ids[0] }]);
  const r = await ligne(m0), f = await ligne(finale);
  if (r.statut !== "VALIDE" || r.gagnant_id !== ids[0] || r.valide_par !== STAFF) throw new Error(JSON.stringify(r));
  if (f.joueur1_id !== ids[0]) throw new Error("finale c1 = " + f.joueur1_id);
  if ((await nbLogs()) !== 1) throw new Error("journal");
});
await mustFail("m0 validé une deuxième fois",
  `select arena.appliquer_validation($1,$2,$3,false,'[]'::jsonb,$4,'{}'::jsonb)`, [t, m0, ids[0], STAFF]);
await ok("après le refus : toujours 1 seule ligne de journal", async () => {
  if ((await nbLogs()) !== 1) throw new Error(String(await nbLogs()));
});
await mustFail("m1 avec un placement vers un match inexistant",
  `select arena.appliquer_validation($1,$2,$3,false,$4::jsonb,$5,'{}'::jsonb)`,
  [t, m1, ids[3], JSON.stringify([{ match_id: "00000000-0000-4000-8000-000000000000", slot: "c2", camp_id: ids[3] }]), STAFF]);
await ok("…et RIEN n'a été écrit : m1 encore TERMINE, journal inchangé", async () => {
  const r = await ligne(m1);
  if (r.statut !== "TERMINE" || r.gagnant_id !== null) throw new Error(JSON.stringify(r));
  if ((await nbLogs()) !== 1) throw new Error("journal");
});
await mustFail("placement vers un match DÉJÀ VALIDÉ (m0)",
  `select arena.appliquer_validation($1,$2,$3,false,$4::jsonb,$5,'{}'::jsonb)`,
  [t, m1, ids[3], JSON.stringify([{ match_id: m0, slot: "c2", camp_id: ids[3] }]), STAFF]);
await ok("…m0 inchangé (Bob toujours en c2) et m1 toujours TERMINE", async () => {
  const r0 = await ligne(m0), r1 = await ligne(m1);
  if (r0.joueur2_id !== ids[1] || r1.statut !== "TERMINE") throw new Error(JSON.stringify({ r0, r1 }));
});
await mustFail("placement vers un match d'un AUTRE tournoi",
  `select arena.appliquer_validation($1,$2,$3,false,$4::jsonb,$5,'{}'::jsonb)`,
  [t, m1, ids[3], JSON.stringify([{ match_id: autre, slot: "c2", camp_id: ids[3] }]), STAFF]);
await ok("m1 validé normalement ensuite, D placé en finale (c2)", async () => {
  await appel(m1, ids[3], [{ match_id: finale, slot: "c2", camp_id: ids[3] }]);
  const f = await ligne(finale);
  if (f.joueur1_id !== ids[0] || f.joueur2_id !== ids[3]) throw new Error(JSON.stringify(f));
});
// Match encore TERMINE dédié : sans ça, le refus viendrait de l'étape 1
// (match pas TERMINE) et on ne testerait pas le slot.
await db.exec(`reset role;`);
const m2 = await match(1, 2, ids[0], ids[2], 1, 0, "TERMINE");
await db.exec(`set role service_role;`);
await mustFail("slot invalide",
  `select arena.appliquer_validation($1,$2,$3,false,$4::jsonb,$5,'{}'::jsonb)`,
  [t, m2, ids[0], JSON.stringify([{ match_id: finale, slot: "x", camp_id: ids[0] }]), STAFF]);
await ok("…m2 toujours TERMINE après le slot invalide", async () => {
  if ((await ligne(m2)).statut !== "TERMINE") throw new Error("validé");
});
await mustFail("match d'un autre tournoi",
  `select arena.appliquer_validation(gen_random_uuid(),$1,$2,false,'[]'::jsonb,$3,'{}'::jsonb)`, [m1, ids[3], STAFF]);
await db.exec(`reset role;`);

console.log("\n== Équipes ==");
const t2 = (await q(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut,discipline,taille_equipe) values ($1,'Padel','Padel',now(),'EN_COURS','SPORT',2) returning id`, [org])).rows[0].id;
const e1 = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'E1') returning id`, [t2])).rows[0].id;
const e2 = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'E2') returning id`, [t2])).rows[0].id;
const mE = (await q(`insert into arena.matchs (tournoi_id,round,position,equipe1_id,equipe2_id,score_j1,score_j2,statut) values ($1,1,0,$2,$3,6,4,'TERMINE') returning id`, [t2, e1, e2])).rows[0].id;
const fE = (await q(`insert into arena.matchs (tournoi_id,round,position,statut) values ($1,2,0,'A_JOUER') returning id`, [t2])).rows[0].id;
await db.exec(`set role service_role;`);
await ok("équipes : vainqueur en equipe_gagnante_id, placé en equipe1_id", async () => {
  await appel(mE, e1, [{ match_id: fE, slot: "c1", camp_id: e1 }], true, t2);
  const r = await ligne(mE), f = await ligne(fE);
  if (r.equipe_gagnante_id !== e1 || r.gagnant_id !== null || f.equipe1_id !== e1) throw new Error(JSON.stringify({ r, f }));
});
await db.exec(`reset role;`);

console.log("\n== Droits ==");
await ok("service_role seul peut exécuter", async () => {
  const sig = "arena.appliquer_validation(uuid,uuid,uuid,boolean,jsonb,uuid,jsonb)";
  const r = await q(`select has_function_privilege('service_role',$1,'execute') s,
                            has_function_privilege('authenticated',$1,'execute') a,
                            has_function_privilege('anon',$1,'execute') n`, [sig]);
  const x = r.rows[0];
  if (x.s !== true || x.a !== false || x.n !== false) throw new Error(JSON.stringify(x));
});

console.log(`\n${pass} réussis, ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
