/**
 * Test du script de purge des tournois de test (maintenance/2026-11-17)
 * sur un vrai Postgres (PGlite), avec les migrations 001 à 014.
 *
 * Lancer depuis apps/arena :   node sql/test_purge_tests.mjs
 *
 * Données : les 5 tournois de test (mêmes tokens qu'en prod), avec journal,
 * consentements, badges, ELO, équipes de padel, PLUS un vrai tournoi où joue
 * un des joueurs de test, et un joueur relié à un compte.
 * Ce que ça prouve : les 5 partent avec tout ce qui en dépend ; le vrai
 * tournoi, son joueur et le joueur avec compte restent ; Otiil3v4lc reste ;
 * les deux triggers append-only sont réactivés ; rejoué, le script refuse.
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
const q = (sql, p) => db.query(sql, p);
const un = async (sql, p) => (await q(sql, p)).rows[0];
const charger = (f) => db.exec(readFileSync(join(SQL_DIR, f), "utf8"));

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  create schema shared;
  create table shared.organizations (id uuid primary key default gen_random_uuid(), slug text unique, name text);
  create table shared.user_permissions (user_id uuid, organization_id uuid, scope text, primary key (user_id, organization_id));
  grant usage on schema shared to anon, authenticated, service_role;
  grant select on all tables in schema shared to anon, authenticated, service_role;
`);
for (const f of ["001_arena_schema_v1.sql", "002_arena_formats_jeux.sql", "003_arena_poules.sql",
  "004_arena_sport_equipes_elo.sql", "005_arena_ordre_participations.sql", "006_arena_resultats_externes.sql",
  "007_arena_terrains.sql", "008_arena_jeux_fc26.sql", "009_arena_joueurs_colonnes.sql"]) await charger(f);
await db.exec(`grant usage on schema arena to anon, authenticated, service_role;`);
for (const f of ["010_arena_espace_joueur.sql", "011_arena_mon_resume.sql", "012_arena_validation_atomique.sql",
  "013_arena_sets.sql", "014_arena_api_cles.sql"]) await charger(f);

// ---------- Données ----------
const org = (await un(`insert into shared.organizations (slug,name) values ('vea','VEA') returning id`)).id;
const USER = "11111111-1111-4111-8111-111111111111";
await q(`insert into auth.users values ($1,'x@test.fr')`, [USER]);
const joueur = async (pseudo, userId = null) =>
  (await un(`insert into arena.joueurs (pseudo,user_id) values ($1,$2) returning id`, [pseudo, userId])).id;
const tournoi = async (titre, token, taille = 1) =>
  (await un(`insert into arena.tournois (organisation_id,titre,jeu,date_debut,statut,qr_token,taille_equipe,discipline)
             values ($1,$2,'Jeu',now(),'TERMINE',$3,$4,$5) returning id`,
    [org, titre, token, taille, taille > 1 ? "SPORT" : "ESPORT"])).id;

const TOKENS = ["eef7b601-6186-4003-b8c3-09aeabf3042b", "ca9ca298-5b6e-41d3-b495-3048aeab3906",
  "93f1fd1d-e23c-4a7b-9221-95039e3b1de4", "506d504d-6f0b-4ad0-9da5-24382ebdab9c", "b7b71dc7-be5c-420f-9aab-b225aa5d24ab"];
const tTest = [];
for (const [i, tok] of TOKENS.entries()) tTest.push(await tournoi(`test ${i}`, tok, i === 1 ? 2 : 1));
const tVrai = await tournoi("Vrai tournoi", "00000000-0000-4000-8000-0000000000aa");

const otiil = await joueur("Otiil3v4lc");
const kenji = await joueur("Kenji");
const nova = await joueur("Nova");
const mixte = await joueur("Mixte"); // joue dans un test ET dans le vrai tournoi
const compte = await joueur("AvecCompte", USER); // joue dans un test, a un compte
const vrai = await joueur("VraiJoueur");
const nina = await joueur("Nina");
const omar = await joueur("Omar");

const participe = (t, j) => q(`insert into arena.participations (tournoi_id,joueur_id) values ($1,$2)`, [t, j]);
for (const j of [otiil, kenji, nova, mixte, compte]) await participe(tTest[0], j);
await participe(tVrai, mixte);
await participe(tVrai, vrai);
const m0 = (await un(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,score_j1,score_j2,statut,gagnant_id)
                      values ($1,1,1,$2,$3,2,0,'VALIDE',$2) returning id`, [tTest[0], kenji, nova])).id;
await q(`insert into arena.matchs (tournoi_id,round,position,joueur1_id,joueur2_id,statut) values ($1,1,1,$2,$3,'A_JOUER')`, [tVrai, mixte, vrai]);
// Padel : équipes
await participe(tTest[1], nina);
await participe(tTest[1], omar);
const eq = (await un(`insert into arena.equipes (tournoi_id,nom) values ($1,'Paire') returning id`, [tTest[1]])).id;
await q(`insert into arena.equipes_membres (tournoi_id,equipe_id,joueur_id) values ($1,$2,$3),($1,$2,$4)`, [tTest[1], eq, nina, omar]);
// Journal, consentements, badges, ELO
await q(`insert into arena.logs (action,tournoi_id,match_id) values ('MATCH_VALIDE',$1,$2),('TOURNOI_DEMARRE',$3,null)`, [tTest[0], m0, tVrai]);
await q(`insert into arena.consentements (joueur_id,type,accorde) values ($1,'CGU',true),($2,'CGU',true)`, [kenji, vrai]);
const badge = (await un(`insert into arena.badges (code,nom) values ('CHAMPION','Champion') returning id`)).id;
await q(`insert into arena.badges_joueurs (joueur_id,badge_id,tournoi_id) values ($1,$3,$2),($4,$3,$2)`, [otiil, tTest[0], badge, kenji]);
await q(`insert into arena.elo_joueurs (joueur_id,discipline,note) values ($1,'ESPORT',1020),($2,'ESPORT',1010),($3,'ESPORT',990)`, [otiil, mixte, kenji]);

// ---------- Purge ----------
console.log("\n== Purge ==");
await ok("le script s'exécute", () => charger("maintenance/2026-11-17_purge_tournois_test.sql"));

const n = async (sql, p) => Number((await un(sql, p)).n);
await ok("les 5 tournois de test ont disparu, le vrai reste", async () => {
  if ((await n(`select count(*) n from arena.tournois where qr_token = any($1::uuid[])`, [TOKENS])) !== 0) throw new Error("tests restants");
  if ((await n(`select count(*) n from arena.tournois where id=$1`, [tVrai])) !== 1) throw new Error("vrai tournoi supprimé");
});
await ok("matchs, participations, équipes des tests supprimés ; ceux du vrai tournoi gardés", async () => {
  if ((await n(`select count(*) n from arena.matchs`)) !== 1) throw new Error("matchs");
  if ((await n(`select count(*) n from arena.participations`)) !== 2) throw new Error("participations");
  if ((await n(`select count(*) n from arena.equipes`)) !== 0) throw new Error("équipes");
});
await ok("joueurs fictifs supprimés (Kenji, Nova, Nina, Omar)", async () => {
  if ((await n(`select count(*) n from arena.joueurs where pseudo in ('Kenji','Nova','Nina','Omar')`)) !== 0) throw new Error("restent");
});
await ok("gardés : Otiil3v4lc, joueur avec compte, joueur aussi présent ailleurs, vrai joueur", async () => {
  if ((await n(`select count(*) n from arena.joueurs where pseudo in ('Otiil3v4lc','AvecCompte','Mixte','VraiJoueur')`)) !== 4) throw new Error("manquant");
});
await ok("badges des tests retirés, ELO de test d'Otiil retiré, ELO de Mixte gardé", async () => {
  if ((await n(`select count(*) n from arena.badges_joueurs`)) !== 0) throw new Error("badges");
  if ((await n(`select count(*) n from arena.elo_joueurs where joueur_id=$1`, [otiil])) !== 0) throw new Error("elo otiil");
  if ((await n(`select count(*) n from arena.elo_joueurs where joueur_id=$1`, [mixte])) !== 1) throw new Error("elo mixte");
});
await ok("journal : ligne du test supprimée, ligne du vrai tournoi gardée, purge journalisée", async () => {
  if ((await n(`select count(*) n from arena.logs where action='MATCH_VALIDE'`)) !== 0) throw new Error("log test");
  if ((await n(`select count(*) n from arena.logs where tournoi_id=$1`, [tVrai])) !== 1) throw new Error("log vrai");
  const p = await un(`select detail from arena.logs where action='PURGE_TOURNOIS_TEST'`);
  if (!p || p.detail.tournois.length !== 5 || p.detail.joueurs_supprimes.length !== 4) throw new Error(JSON.stringify(p));
});
await ok("consentements du vrai joueur gardés", async () => {
  if ((await n(`select count(*) n from arena.consentements where joueur_id=$1`, [vrai])) !== 1) throw new Error("consentement");
});
await ok("les deux triggers append-only sont réactivés (DELETE refusé)", async () => {
  let refuse = 0;
  try { await q(`delete from arena.logs`); } catch { refuse++; }
  try { await q(`delete from arena.consentements`); } catch { refuse++; }
  if (refuse !== 2) throw new Error(`${refuse}/2 refus`);
});
await ok("rejoué, le script s'arrête sans rien toucher", async () => {
  let arrete = false;
  try { await charger("maintenance/2026-11-17_purge_tournois_test.sql"); } catch (e) { arrete = e.message.includes("Attendu 5"); }
  await q("rollback").catch(() => {});
  if (!arrete) throw new Error("pas arrêté");
  if ((await n(`select count(*) n from arena.joueurs`)) !== 4) throw new Error("joueurs touchés");
});

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
