/**
 * Tests de la migration 011 (arena.mon_resume) sur un vrai moteur Postgres (PGlite).
 *
 * Lancer depuis apps/arena :   node sql/test_mon_resume.mjs
 *
 * Mise en place : stub des schémas auth et shared de Supabase, rôles, puis
 * migrations 001 à 010 dans l'ordre, comme en production.
 *
 * Ce que ça prouve :
 *  1. la 011 s'exécute deux fois (idempotente) ;
 *  2. chaque compte ne voit QUE son propre résumé (aucun paramètre) ;
 *  3. les compteurs sont justes : tournois pointés, matchs validés hors
 *     byes, victoires en individuel ET en équipe, titres ;
 *  4. un compte sans joueur, ou anonymisé, n'obtient rien ;
 *  5. anon ne peut pas appeler la fonction.
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

await ok("011 s'exécute", () => charger("011_arena_mon_resume.sql"));
await ok("011 rejouée sans erreur", () => charger("011_arena_mon_resume.sql"));

// ---------- Données ----------
const U1 = "11111111-1111-4111-8111-111111111111"; // Léa, a joué
const U2 = "22222222-2222-4222-8222-222222222222"; // Sam, a joué
const U3 = "33333333-3333-4333-8333-333333333333"; // compte sans joueur
await q(`insert into auth.users values ($1,'lea@test.fr'),($2,'sam@test.fr'),($3,'x@test.fr')`, [U1, U2, U3]);
const org = (await q(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).rows[0].id;
const lea = (await q(`insert into arena.joueurs (pseudo,user_id) values ('Lea',$1) returning id`, [U1])).rows[0].id;
const sam = (await q(`insert into arena.joueurs (pseudo,user_id) values ('Sam',$1) returning id`, [U2])).rows[0].id;
const noa = (await q(`insert into arena.joueurs (pseudo) values ('Noa') returning id`)).rows[0].id;
const tournoi = async (titre, statut, extra = "") =>
  (await q(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut${extra ? ",discipline,taille_equipe" : ""})
            values ($1,$2,'Jeu',now(),$3${extra}) returning id`, [org, titre, statut])).rows[0].id;
// Esport terminé : Léa bat Sam en demi, perd la finale contre Noa ; un bye pour Léa (ne compte pas).
const t1 = await tournoi("Esport", "TERMINE");
for (const j of [lea, sam, noa]) await q(`insert into arena.participations (tournoi_id,joueur_id,check_in) values ($1,$2,true)`, [t1, j]);
await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,gagnant_id,statut) values ($1,1,0,$2,$3,$2,'VALIDE')`, [t1, lea, sam]);
await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,gagnant_id,is_bye,statut) values ($1,1,1,$2,$2,true,'VALIDE')`, [t1, lea]);
await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,gagnant_id,statut) values ($1,2,0,$2,$3,$3,'VALIDE')`, [t1, lea, noa]);
await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,statut) values ($1,3,0,$2,$3,'A_JOUER')`, [t1, lea, sam]);
// Padel terminé : Léa + Noa gagnent contre Sam (seul) ; titre CHAMPION pour Léa.
const t2 = await tournoi("Padel", "TERMINE", ",'SPORT',2");
for (const j of [lea, sam, noa]) await q(`insert into arena.participations (tournoi_id,joueur_id,check_in) values ($1,$2,true)`, [t2, j]);
const eqA = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'A') returning id`, [t2])).rows[0].id;
const eqB = (await q(`insert into arena.equipes (tournoi_id,nom) values ($1,'B') returning id`, [t2])).rows[0].id;
await q(`insert into arena.equipes_membres (tournoi_id,equipe_id,joueur_id) values ($1,$2,$3),($1,$2,$4),($1,$5,$6)`, [t2, eqA, lea, noa, eqB, sam]);
await q(`insert into arena.matchs (tournoi_id,round,position,equipe1_id,equipe2_id,equipe_gagnante_id,statut) values ($1,1,0,$2,$3,$2,'VALIDE')`, [t2, eqA, eqB]);
const badge = (await q(`insert into arena.badges (code,nom) values ('CHAMPION','Champion') returning id`)).rows[0].id;
await q(`insert into arena.badges_joueurs (joueur_id,badge_id,tournoi_id) values ($1,$2,$3)`, [lea, badge, t2]);
// Tournoi ouvert, Léa inscrite non pointée : ne compte pas.
const t3 = await tournoi("A venir", "OUVERT");
await q(`insert into arena.participations (tournoi_id,joueur_id) values ($1,$2)`, [t3, lea]);

console.log("\n== Résumés ==");
await db.exec(`set role authenticated;`);
const resume = async (uid) => {
  await comme(uid);
  return (await q(`select * from arena.mon_resume()`)).rows;
};
await ok("Léa : 2 tournois, 3 matchs, 2 victoires, 1 titre", async () => {
  const r = (await resume(U1))[0];
  const attendu = { pseudo: "Lea", profil_public: true, tournois: 2, matchs: 3, victoires: 2, titres: 1 };
  if (JSON.stringify(r) !== JSON.stringify(attendu)) throw new Error(JSON.stringify(r));
});
await ok("Sam : 2 tournois, 2 matchs, 0 victoire, 0 titre", async () => {
  const r = (await resume(U2))[0];
  if (r.tournois !== 2 || r.matchs !== 2 || r.victoires !== 0 || r.titres !== 0 || r.pseudo !== "Sam") throw new Error(JSON.stringify(r));
});
await ok("compte sans joueur : aucune ligne", async () => {
  if ((await resume(U3)).length !== 0) throw new Error("une ligne");
});
await ok("non connecté (uid vide) : aucune ligne", async () => {
  await db.exec(`select set_config('app.uid','', false);`);
  if ((await q(`select * from arena.mon_resume()`)).rows.length !== 0) throw new Error("une ligne");
});
await db.exec(`reset role;`);
await q(`update arena.joueurs set anonymise = true where id = $1`, [sam]);
await db.exec(`set role authenticated;`);
await ok("joueur anonymisé : aucune ligne", async () => {
  if ((await resume(U2)).length !== 0) throw new Error("une ligne");
});
await db.exec(`reset role;`);

console.log("\n== Droits ==");
await ok("authenticated peut appeler, anon non", async () => {
  const r = await q(`select has_function_privilege('authenticated','arena.mon_resume()','execute') a,
                            has_function_privilege('anon','arena.mon_resume()','execute') b`);
  if (r.rows[0].a !== true || r.rows[0].b !== false) throw new Error(JSON.stringify(r.rows[0]));
});
await db.exec(`set role anon;`);
await mustFail("anon appelle la fonction", `select * from arena.mon_resume()`);
await db.exec(`reset role;`);

console.log(`\n${pass} réussis, ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
