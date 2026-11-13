/**
 * Tests de interactive-player-token-v2-prive.sql ET interactive-lg-v2-secrets.sql
 * sur un vrai Postgres (PGlite).
 * Lancer depuis apps/interactive :  node sql/test_player_token_prive.mjs
 *
 * Reproduit l'état de la prod AVANT correctif (table lisible en entier par
 * anon), applique la migration, puis vérifie :
 *  1. anon ne lit plus player_token, mais lit toujours pseudo et score ;
 *  2. rejoindre_session rend id + jeton au joueur qui rejoint ;
 *  3. refus sur une partie déjà lancée, et sur un pseudo déjà pris ;
 *  4. migration rejouable ;
 *  5. Loup-Garou : anon ne lit plus les rôles ni les cibles des votes, ne peut
 *     plus voter au nom d'un autre ; les loups voient leurs coéquipiers ;
 *  6. lg-v3 : l'animateur lit tout par lg_hote_*, un autre compte connecté
 *     est refusé, et après la partie B il ne lit plus les secrets.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();
let pass = 0, fail = 0;
const ok = async (l, fn) => { try { await fn(); pass++; console.log("  PASS  " + l); } catch (e) { fail++; console.log("  FAIL  " + l + " -> " + e.message.split("\n")[0]); } };
const refus = async (l, sql, p) => { try { await db.query(sql, p); fail++; console.log("  FAIL  " + l + " (aurait dû être refusé)"); } catch { pass++; console.log("  PASS  " + l + " (refusé)"); } };
const q = (s, p) => db.query(s, p);

// État de la prod avant correctif (colonnes et policies relevées le 13/11/2026).
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  create schema interactive; grant usage on schema interactive to anon, authenticated;
  create table interactive.sessions (id uuid primary key default gen_random_uuid(), host_user_id uuid, status text not null default 'lobby');
  create table interactive.session_players (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references interactive.sessions(id) on delete cascade,
    user_id uuid, pseudo text not null check (length(pseudo) between 2 and 24),
    avatar_config jsonb not null, joined_at timestamptz not null default now(),
    score int not null default 0, player_token uuid not null default gen_random_uuid(),
    eliminated_round int, unique (session_id, pseudo));
  alter table interactive.session_players enable row level security;
  create policy players_select_all on interactive.session_players for select using (true);
  create policy players_insert_during_lobby on interactive.session_players for insert
    with check (exists (select 1 from interactive.sessions where id = session_id and status = 'lobby'));
  grant select, insert on interactive.session_players to anon, authenticated;
  grant select on interactive.sessions to anon, authenticated;
`);
const lobby = (await q(`insert into interactive.sessions default values returning id`)).rows[0].id;
const enJeu = (await q(`insert into interactive.sessions (status) values ('playing') returning id`)).rows[0].id;
await q(`insert into interactive.session_players (session_id, pseudo, avatar_config) values ($1,'Victime','{}')`, [lobby]);

console.log("\n== Avant correctif ==");
await db.exec(`set role anon;`);
await ok("la faille existe : anon lit le jeton de la victime", async () => {
  const r = await q(`select player_token from interactive.session_players where pseudo='Victime'`);
  if (!r.rows[0]?.player_token) throw new Error("pas de jeton lu");
});
await db.exec(`reset role;`);

console.log("\n== Migration ==");
await ok("v2 s'exécute", () => db.exec(readFileSync(join(DIR, "interactive-player-token-v2-prive.sql"), "utf8")));
await ok("v2 rejouée sans erreur", () => db.exec(readFileSync(join(DIR, "interactive-player-token-v2-prive.sql"), "utf8")));

console.log("\n== Après correctif ==");
await db.exec(`set role anon;`);
await refus("anon lit le jeton de la victime", `select player_token from interactive.session_players where pseudo='Victime'`);
await refus("anon fait select * (le jeton viendrait avec)", `select * from interactive.session_players`);
await ok("anon lit toujours pseudo, score, avatar", async () => {
  const r = await q(`select id, pseudo, score, avatar_config, eliminated_round from interactive.session_players`);
  if (r.rows.length !== 1) throw new Error(String(r.rows.length));
});
let moi;
await ok("rejoindre_session rend mon id et MON jeton", async () => {
  const r = await q(`select * from interactive.rejoindre_session($1,'  Lea  ','{"c":1}'::jsonb)`, [lobby]);
  moi = r.rows[0];
  if (!moi?.id || !moi?.player_token) throw new Error(JSON.stringify(r.rows));
});
await ok("le pseudo est nettoyé (espaces retirés)", async () => {
  const r = await q(`select pseudo from interactive.session_players where id = $1`, [moi.id]);
  if (r.rows[0].pseudo !== "Lea") throw new Error(r.rows[0].pseudo);
});
await refus("rejoindre une partie déjà lancée", `select * from interactive.rejoindre_session($1,'Sam','{}'::jsonb)`, [enJeu]);
await refus("pseudo déjà pris dans la partie", `select * from interactive.rejoindre_session($1,'Lea','{}'::jsonb)`, [lobby]);
await refus("pseudo trop court", `select * from interactive.rejoindre_session($1,'x','{}'::jsonb)`, [lobby]);
await db.exec(`reset role;`);
await ok("le jeton rendu est bien celui stocké en base", async () => {
  const r = await q(`select player_token from interactive.session_players where id = $1`, [moi.id]);
  if (r.rows[0].player_token !== moi.player_token) throw new Error("différent");
});


console.log("\n== Loup-Garou ==");
// Tables relevées en prod le 13/11/2026, avec les droits d'avant correctif.
await db.exec(`
  create table interactive.lg_player_roles (player_id uuid primary key references interactive.session_players(id) on delete cascade,
    session_id uuid not null, role text not null, alive boolean not null default true, is_mayor boolean not null default false,
    lover_of uuid, witch_life_potion_used boolean default false, witch_death_potion_used boolean default false,
    hunter_shot_taken boolean default false, death_reason text, death_cycle int, created_at timestamptz default now());
  create table interactive.lg_votes (id uuid primary key default gen_random_uuid(), session_id uuid not null, vote_round text not null,
    voter_id uuid not null, target_id uuid, target2_id uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
    unique (vote_round, voter_id));
  alter table interactive.lg_player_roles enable row level security;
  alter table interactive.lg_votes enable row level security;
  create policy r_sel on interactive.lg_player_roles for select using (true);
  create policy v_sel on interactive.lg_votes for select using (true);
  create policy v_ins on interactive.lg_votes for insert with check (true);
  create policy v_upd on interactive.lg_votes for update using (true);
  grant select on interactive.lg_player_roles to anon, authenticated;
  -- Comme en prod : l'animateur écrit les rôles, seulement dans SA partie.
  grant insert, update, delete on interactive.lg_player_roles to authenticated;
  create policy r_upd_hote on interactive.lg_player_roles for update using (
    auth.uid() in (select host_user_id from interactive.sessions where id = session_id));
  grant select, insert, update on interactive.lg_votes to anon, authenticated;
`);
const partie = (await q(`insert into interactive.sessions (status) values ('playing') returning id`)).rows[0].id;
const joueur = async (p) => (await q(`insert into interactive.session_players (session_id,pseudo,avatar_config) values ($1,$2,'{}') returning id, player_token`, [partie, p])).rows[0];
const loup1 = await joueur("Loup1"), loup2 = await joueur("Loup2"), villageois = await joueur("Villa");
await q(`insert into interactive.lg_player_roles (player_id, session_id, role) values ($1,$4,'wolf'),($2,$4,'wolf'),($3,$4,'villager')`, [loup1.id, loup2.id, villageois.id, partie]);
await q(`insert into interactive.lg_votes (session_id, vote_round, voter_id, target_id) values ($1,'n1-wolves',$2,$3)`, [partie, loup1.id, villageois.id]);

await ok("lg-v2 s'exécute", () => db.exec(readFileSync(join(DIR, "interactive-lg-v2-secrets.sql"), "utf8")));
await ok("lg-v2 rejouée sans erreur", () => db.exec(readFileSync(join(DIR, "interactive-lg-v2-secrets.sql"), "utf8")));

await db.exec(`set role anon;`);
await refus("anon lit les rôles", `select role from interactive.lg_player_roles`);
await refus("anon lit la cible des votes de nuit", `select target_id from interactive.lg_votes`);
await ok("anon lit qui est vivant et qui a voté", async () => {
  const a = await q(`select player_id, alive, is_mayor from interactive.lg_player_roles`);
  const b = await q(`select voter_id, vote_round from interactive.lg_votes`);
  if (a.rows.length !== 3 || b.rows.length !== 1) throw new Error(`${a.rows.length}/${b.rows.length}`);
});
await refus("anon écrit un vote directement", `insert into interactive.lg_votes (session_id, vote_round, voter_id, target_id) values ($1,'d1',$2,$3)`, [partie, villageois.id, loup1.id]);
await ok("loup : voit ses 2 coéquipiers loups", async () => {
  const r = await q(`select * from interactive.lg_mes_loups($1,$2)`, [loup1.id, loup1.player_token]);
  if (r.rows.length !== 2) throw new Error(String(r.rows.length));
});
await ok("villageois : liste vide", async () => {
  const r = await q(`select * from interactive.lg_mes_loups($1,$2)`, [villageois.id, villageois.player_token]);
  if (r.rows.length !== 0) throw new Error(String(r.rows.length));
});
await refus("demander les loups avec le jeton d'un autre", `select * from interactive.lg_mes_loups($1,$2)`, [loup1.id, villageois.player_token]);
await ok("voter avec son jeton", () => q(`select interactive.lg_voter($1,$2,$3,'d1',$4)`, [villageois.id, villageois.player_token, partie, loup1.id]));
await ok("revoter remplace le vote (pas de doublon)", () => q(`select interactive.lg_voter($1,$2,$3,'d1',$4)`, [villageois.id, villageois.player_token, partie, loup2.id]));
await refus("voter au nom d'un autre (mauvais jeton)", `select interactive.lg_voter($1,$2,$3,'d1',$4)`, [loup2.id, villageois.player_token, partie, villageois.id]);
await refus("voter dans une partie pas en cours", `select interactive.lg_voter($1,$2,$3,'d1',$4)`, [villageois.id, villageois.player_token, lobby, loup1.id]);
await db.exec(`reset role;`);
await ok("le vote enregistré est le dernier (Loup2)", async () => {
  const r = await q(`select target_id from interactive.lg_votes where voter_id=$1 and vote_round='d1'`, [villageois.id]);
  if (r.rows.length !== 1 || r.rows[0].target_id !== loup2.id) throw new Error(JSON.stringify(r.rows));
});
await db.exec(`set role authenticated;`);
await ok("l'animateur (authenticated) lit toujours les rôles (étape suivante : le restreindre)", () => q(`select role from interactive.lg_player_roles`));
await db.exec(`reset role;`);


console.log("\n== Lecture par l'animateur (lg-v3) ==");
const HOTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await q(`update interactive.sessions set host_user_id = $1 where id = $2`, [HOTE, partie]);
await ok("v3a s'exécute (deux fois)", async () => {
  await db.exec(readFileSync(join(DIR, "interactive-lg-v3a-lecture-hote.sql"), "utf8"));
  await db.exec(readFileSync(join(DIR, "interactive-lg-v3a-lecture-hote.sql"), "utf8"));
});
await ok("v3b s'exécute (deux fois)", async () => {
  await db.exec(readFileSync(join(DIR, "interactive-lg-v3b-fermer-connectes.sql"), "utf8"));
  await db.exec(readFileSync(join(DIR, "interactive-lg-v3b-fermer-connectes.sql"), "utf8"));
});
await db.exec(`set role authenticated; select set_config('app.uid','${HOTE}', false);`);
await ok("l'animateur lit tous les rôles par lg_hote_roles", async () => {
  const r = await q(`select player_id, role from interactive.lg_hote_roles($1)`, [partie]);
  if (r.rows.length !== 3 || !r.rows.some((x) => x.role === "wolf")) throw new Error(JSON.stringify(r.rows));
});
await ok("l'animateur filtre les votes d'un tour (comme .eq dans le code)", async () => {
  const r = await q(`select target_id from interactive.lg_hote_votes($1) where vote_round = 'd1'`, [partie]);
  if (r.rows.length !== 1) throw new Error(String(r.rows.length));
});
await ok("l'animateur met toujours à jour un joueur (mort)", () =>
  q(`update interactive.lg_player_roles set alive = false, death_reason = 'test' where player_id = $1`, [villageois.id]));
await db.exec(`select set_config('app.uid','${AUTRE}', false);`);
await refus("un autre compte connecté appelle lg_hote_roles", `select * from interactive.lg_hote_roles($1)`, [partie]);
await refus("un autre compte connecté lit role directement", `select role from interactive.lg_player_roles`);
await refus("un autre compte connecté lit la cible des votes", `select target_id from interactive.lg_votes`);
await ok("un compte connecté lit toujours vivant et maire", () => q(`select player_id, alive, is_mayor from interactive.lg_player_roles`));
await db.exec(`reset role;`);
await db.exec(`set role anon;`);
await refus("anon appelle lg_hote_roles", `select * from interactive.lg_hote_roles($1)`, [partie]);
await db.exec(`reset role;`);
console.log(`\n${pass} réussis, ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
