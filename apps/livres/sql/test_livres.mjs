/**
 * Test du schéma `livres` sur un vrai Postgres (PGlite).
 * Lancer depuis apps/livres :  node sql/test_livres.mjs
 *
 * Prouve : migration rejouable ; lecture publique des boîtes actives
 * seulement ; aucun accès public aux signalements ; aucune écriture publique ;
 * garde-fous de saisie (coordonnées hors Amiens, slug, type, message long).
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

await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users (id uuid primary key);
`);
const schema = readFileSync(join(DIR, "001_livres_schema.sql"), "utf8");
await ok("schéma s'exécute", () => db.exec(schema));
await ok("schéma rejoué sans erreur", () => db.exec(schema));

await db.exec(`set role service_role;`);
await ok("service_role ajoute 2 boîtes (une active, une retirée)", () => q(`
  insert into livres.boites (slug, nom, lat, lng, origine, active) values
  ('parc-saint-pierre', 'Parc Saint-Pierre', 49.9005, 2.3070, 'existante', true),
  ('ancienne-boite', 'Ancienne boîte', 49.89, 2.30, 'existante', false)`));
await ok("service_role enregistre un signalement", async () => {
  const b = (await q(`select id from livres.boites where slug='parc-saint-pierre'`)).rows[0].id;
  await q(`insert into livres.signalements (boite_id, type, message) values ($1, 'vide', 'plus rien dedans')`, [b]);
});
await refus("coordonnées hors Amiens (Paris)", `insert into livres.boites (slug, nom, lat, lng) values ('paris','Paris',48.85,2.35)`);
await refus("slug invalide", `insert into livres.boites (slug, nom, lat, lng) values ('Pas Bon!','X',49.9,2.3)`);
await refus("type de signalement inconnu", `insert into livres.signalements (boite_id, type) select id, 'hack' from livres.boites limit 1`);
await refus("message de plus de 300 caractères", `insert into livres.signalements (boite_id, type, message) select id, 'vide', repeat('x', 301) from livres.boites limit 1`);
await refus("photo en http (non sécurisé)", `update livres.boites set photo_url = 'http://exemple.fr/a.jpg'`);
await db.exec(`reset role;`);

await db.exec(`set role anon;`);
await ok("anon voit la boîte active, pas la retirée", async () => {
  const r = await q(`select slug from livres.boites`);
  if (r.rows.length !== 1 || r.rows[0].slug !== "parc-saint-pierre") throw new Error(JSON.stringify(r.rows));
});
await refus("anon lit les signalements", `select * from livres.signalements`);
await refus("anon ajoute une boîte", `insert into livres.boites (slug, nom, lat, lng) values ('pirate','Pirate',49.9,2.3)`);
await refus("anon modifie l'état d'une boîte", `update livres.boites set etat = 'bon'`);
await refus("anon écrit un signalement directement", `insert into livres.signalements (boite_id, type) select id, 'depot' from livres.boites limit 1`);
await db.exec(`reset role;`);

console.log(`\n${pass} réussis, ${fail} échoués\n`);
process.exit(fail ? 1 : 0);
