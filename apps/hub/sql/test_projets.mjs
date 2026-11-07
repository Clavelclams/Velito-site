/**
 * Test du schéma « Projets » sur un vrai Postgres en mémoire (PGlite).
 * Lancer depuis apps/hub :   node sql/test_projets.mjs
 *
 * Vérifie : les scripts s'exécutent, les données initiales ne se doublent pas
 * au 2e passage, et les droits réels (GRANT + RLS) : admin voit tout, dev
 * écrit sur SON projet en son nom, lecteur lit seulement, inconnu ne voit
 * rien, anon n'a que la vitrine. (Leçon du 07/11 : tester les GRANT réels.)
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const H = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();
let pass = 0, fail = 0;
const ok = async (l, fn) => { try { await fn(); pass++; console.log("  PASS " + l); } catch (e) { fail++; console.log("  FAIL " + l + " -> " + e.message.split("\n")[0]); } };
const must = async (l, sql, p) => { try { await db.query(sql, p); fail++; console.log("  FAIL " + l + " (aurait dû échouer)"); } catch { pass++; console.log("  PASS " + l + " (refusé)"); } };
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc", D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

// Bouchons du schéma Supabase : auth.users, auth.uid(), rôles, tables de droits.
await db.exec(`create schema auth; create table auth.users (id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
 create role authenticated; create role anon;
 create schema shared; grant usage on schema shared to authenticated, anon;
 create table shared.organizations (id uuid primary key default gen_random_uuid(), slug text unique);
 create table shared.user_permissions (user_id uuid, organization_id uuid, scope text);
 insert into auth.users values ('${A}','admin@x.fr'),('${B}','dev@x.fr'),('${C}','lecteur@x.fr'),('${D}','inconnu@x.fr');
 insert into shared.organizations (slug) values ('hub_velito');
 insert into shared.user_permissions select '${A}', id, 'owner' from shared.organizations;`);

await ok("projets-v1.sql", () => db.exec(readFileSync(join(H, "projets-v1.sql"), "utf8")));
await ok("données initiales (1er passage)", () => db.exec(readFileSync(join(H, "projets-donnees-initiales-2026-11-07.sql"), "utf8")));
await ok("données initiales (2e passage, sans doublon)", () => db.exec(readFileSync(join(H, "projets-donnees-initiales-2026-11-07.sql"), "utf8")));
await ok("11 projets, étapes non doublées", async () => { const x = (await db.query(`select (select count(*)::int from shared.projets) p, (select count(*)::int from shared.projet_etapes) e`)).rows[0]; if (x.p !== 11 || x.e !== 84) throw new Error(JSON.stringify(x)); });

const as = (u) => db.exec(`set role authenticated; select set_config('app.uid','${u}', false);`);
const venaball = async () => (await db.query(`select id from shared.projets where slug='venaball'`)).rows[0].id;

await as(A);
await ok("admin voit les 11 projets", async () => { const r = await db.query(`select count(*)::int n from shared.projets`); if (r.rows[0].n !== 11) throw new Error(r.rows[0].n); });
await ok("admin ajoute un dev et un lecteur (email insensible à la casse)", async () => {
  const p = await venaball();
  const r = [
    (await db.query(`select shared.ajouter_membre_projet($1,'dev@x.fr','dev') r`, [p])).rows[0].r,
    (await db.query(`select shared.ajouter_membre_projet($1,'LECTEUR@x.fr','lecteur') r`, [p])).rows[0].r,
    (await db.query(`select shared.ajouter_membre_projet($1,'personne@x.fr','dev') r`, [p])).rows[0].r,
  ];
  if (r.join() !== "ok,ok,compte_inconnu") throw new Error(r.join());
});
await as(B);
await ok("dev ne voit QUE son projet", async () => { const r = await db.query(`select slug from shared.projets`); if (r.rows.length !== 1 || r.rows[0].slug !== "venaball") throw new Error(JSON.stringify(r.rows)); });
await ok("dev ajoute une étape", () => db.query(`insert into shared.projet_etapes (projet_id, titre) select id, 'Test dev' from shared.projets where slug='venaball'`));
await ok("dev écrit au journal en son nom", () => db.query(`insert into shared.projet_journal (projet_id, titre, auteur) select id, 'Note', '${B}' from shared.projets where slug='venaball'`));
await must("dev écrit au journal au nom d'un autre", `insert into shared.projet_journal (projet_id, titre, auteur) select id, 'Usurpation', '${A}' from shared.projets where slug='venaball'`);
await ok("dev ne peut pas ajouter de membre", async () => { const r = (await db.query(`select shared.ajouter_membre_projet($1,'inconnu@x.fr','dev') r`, [await venaball()])).rows[0].r; if (r !== "interdit") throw new Error(r); });
await must("dev ne crée pas de projet", `insert into shared.projets (slug, nom) values ('pirate','Pirate')`);
await as(C);
await must("lecteur n'ajoute pas d'étape", `insert into shared.projet_etapes (projet_id, titre) select id, 'Non' from shared.projets where slug='venaball'`);
await ok("lecteur voit les membres", async () => { const r = await db.query(`select * from shared.membres_projet($1)`, [await venaball()]); if (r.rows.length !== 2) throw new Error(r.rows.length); });
await as(D);
await ok("inconnu ne voit aucun projet", async () => { const r = await db.query(`select count(*)::int n from shared.projets`); if (r.rows[0].n !== 0) throw new Error(r.rows[0].n); });
await db.exec(`reset role; update shared.projets set public = true, resume_public = 'Vitrine' where slug = 'arena';`);
await db.exec(`set role anon; select set_config('app.uid','', false);`);
await ok("anon : la vitrine ne montre que les projets publics", async () => { const r = await db.query(`select * from shared.projets_publics()`); if (r.rows.length !== 1 || r.rows[0].slug !== "arena") throw new Error(JSON.stringify(r.rows)); });
await must("anon ne lit pas la table projets", `select * from shared.projets`);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
