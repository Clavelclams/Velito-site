/**
 * Tests de la migration 11 (budgets) sur un vrai moteur Postgres (PGlite).
 *
 * Lancer depuis apps/compta :   node sql/test_budgets.mjs
 *
 * Mise en place copiée de test_schema.mjs : stub du schéma auth de Supabase,
 * migrations 01 et 02, rôles, puis 06, 07, 08, 09 et 11 chargées APRÈS le
 * « grant all », comme en production (les nouvelles tables n'ont aucun droit
 * par défaut : un GRANT oublié dans la 11 ferait échouer ces tests).
 *
 * Ce que ça prouve :
 *  1. une seule enveloppe par (entité, exercice, catégorie), l'upsert met à jour ;
 *  2. un montant négatif est refusé ;
 *  3. une catégorie d'une autre entité est refusée (FK composite) ;
 *  4. RLS : un lecteur lit sans écrire, un trésorier écrit, un inconnu et un
 *     non-connecté ne voient rien ; anon n'a aucun droit sur la table.
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
const charger = (fichier) => db.exec(readFileSync(join(SQL_DIR, fichier), "utf8"));
const comme = (uid) => db.exec(`select set_config('app.uid','${uid}', false);`);

// ---------- 0. Stub du schéma auth de Supabase ----------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
`);

// ---------- 1. Migrations ----------
console.log("\n== Migrations ==");
await ok("01_schema_noyau.sql", () => charger("01_schema_noyau.sql"));
await ok("02_rls_noyau.sql", () => charger("02_rls_noyau.sql"));
await db.exec(`
  create role authenticated;
  create role anon;
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
`);
for (const f of ["06_tresorerie_associative.sql", "07_droits_tresorerie.sql", "08_subventions_benevolat.sql", "09_membres_roles.sql"]) {
  await ok(f, () => charger(f));
}
await ok("11_budgets.sql s'exécute sans erreur", () => charger("11_budgets.sql"));

console.log("\n== Droits et règles ==");
await ok("authenticated : select, insert, update, delete sur budget", async () => {
  const r = await q(`select bool_and(has_table_privilege('authenticated','public.budget', p)) as tous
                     from unnest(array['select','insert','update','delete']) as p`);
  if (r.rows[0].tous !== true) throw new Error("droit manquant");
});
await ok("anon : aucun droit sur budget", async () => {
  const r = await q(`select bool_or(has_table_privilege('anon','public.budget', p)) as un
                     from unnest(array['select','insert','update','delete']) as p`);
  if (r.rows[0].un !== false) throw new Error("anon a un droit");
});
await ok("RLS activée, 4 règles (lecture, ajout, modification, suppression)", async () => {
  const r = await q(`select (select relrowsecurity from pg_class where oid = 'public.budget'::regclass) as rls,
                            (select count(*)::int from pg_policies where tablename = 'budget') as n`);
  if (r.rows[0].rls !== true || r.rows[0].n !== 4) throw new Error(JSON.stringify(r.rows[0]));
});

// ---------- 2. Jeu de données ----------
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // propriétaire
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // inconnu
const T = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // trésorier
const L = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // lecteur
await q(
  `insert into auth.users values ($1,'clavel@velito.fr'),($2,'autre@test.fr'),($3,'tresorier@test.fr'),($4,'lecteur@test.fr')`,
  [A, B, T, L],
);
await db.exec(`set role authenticated;`);
await comme(A);

let VEA, VENA, catCotis, catLoyer, catVena;
await ok("A crée VEA, VENA et leurs catégories", async () => {
  const e = await q(
    `insert into public.entite (proprietaire_id, nom, type_juridique)
     values ($1,'VEA','association'),($1,'VENA','societe') returning id, nom`,
    [A],
  );
  VEA = e.rows.find((x) => x.nom === "VEA").id;
  VENA = e.rows.find((x) => x.nom === "VENA").id;
  const c = await q(
    `insert into public.categorie (entite_id, nom, type)
     values ($1,'Cotisations','recette'),($1,'Loyer','depense'),($2,'Prestations','recette') returning id, nom`,
    [VEA, VENA],
  );
  catCotis = c.rows.find((x) => x.nom === "Cotisations").id;
  catLoyer = c.rows.find((x) => x.nom === "Loyer").id;
  catVena = c.rows.find((x) => x.nom === "Prestations").id;
});

// ---------- 3. Contraintes ----------
console.log("\n== Enveloppes ==");
await ok("enveloppe 2026 Cotisations 1 500,00 € créée", () =>
  q(`insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 150000)`, [VEA, catCotis]),
);
await ok("enveloppe à 0 € acceptée (prévu nul assumé, différent d'absent)", () =>
  q(`insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 0)`, [VEA, catLoyer]),
);
await mustFail(
  "même enveloppe (VEA, 2026, Cotisations) insérée deux fois",
  `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 999)`,
  [VEA, catCotis],
);
await ok("réenregistrer (upsert) met à jour l'enveloppe existante, sans doublon", async () => {
  await q(
    `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 180000)
     on conflict (entite_id, exercice, categorie_id) do update set montant_centimes = excluded.montant_centimes`,
    [VEA, catCotis],
  );
  const r = await q(`select count(*)::int as n, max(montant_centimes)::int as m from public.budget where categorie_id = $1`, [catCotis]);
  if (r.rows[0].n !== 1 || r.rows[0].m !== 180000) throw new Error(JSON.stringify(r.rows[0]));
});
await ok("même catégorie sur un autre exercice : acceptée", () =>
  q(`insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2025, $2, 120000)`, [VEA, catCotis]),
);
await ok("trigger : modifie_le avance à la modification", async () => {
  const avant = await q(`select modifie_le from public.budget where exercice = 2025 and categorie_id = $1`, [catCotis]);
  await new Promise((r) => setTimeout(r, 5));
  // now() est figé dans une transaction ; chaque requête PGlite en ouvre une.
  await q(`update public.budget set commentaire = 'Hausse prévue' where exercice = 2025 and categorie_id = $1`, [catCotis]);
  const apres = await q(`select modifie_le from public.budget where exercice = 2025 and categorie_id = $1`, [catCotis]);
  if (!(apres.rows[0].modifie_le > avant.rows[0].modifie_le)) throw new Error("modifie_le inchangé");
});
await mustFail(
  "montant négatif",
  `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2024, $2, -1)`,
  [VEA, catCotis],
);
await mustFail(
  "exercice hors bornes (1999)",
  `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 1999, $2, 100)`,
  [VEA, catCotis],
);
await mustFail(
  "enveloppe VEA sur une catégorie de VENA (FK composite)",
  `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 100)`,
  [VEA, catVena],
);
await mustFail(
  "déplacer une enveloppe vers une catégorie d'une autre entité (update)",
  `update public.budget set categorie_id = $1 where categorie_id = $2`,
  [catVena, catLoyer],
);
await ok("archiver une catégorie garde ses enveloppes", async () => {
  await q(`update public.categorie set active = false where id = $1`, [catLoyer]);
  const r = await q(`select count(*)::int as n from public.budget where categorie_id = $1`, [catLoyer]);
  await q(`update public.categorie set active = true where id = $1`, [catLoyer]);
  if (r.rows[0].n !== 1) throw new Error(`${r.rows[0].n} enveloppe(s)`);
});

// ---------- 4. RLS ----------
console.log("\n== Rôles (RLS) ==");
await ok("le propriétaire ajoute un trésorier et un lecteur", async () => {
  const r1 = await q(`select public.ajouter_membre_entite($1,'tresorier@test.fr','tresorier') as r`, [VEA]);
  const r2 = await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','lecteur') as r`, [VEA]);
  if (r1.rows[0].r !== "ok" || r2.rows[0].r !== "ok") throw new Error(JSON.stringify([r1.rows, r2.rows]));
});
await ok("lecteur : lit les 3 enveloppes de VEA", async () => {
  await comme(L);
  const r = await q(`select count(*)::int as n from public.budget`);
  await comme(A);
  if (r.rows[0].n !== 3) throw new Error(`${r.rows[0].n} enveloppe(s)`);
});
await ok("lecteur : ajout refusé, modification et suppression sans effet", async () => {
  await comme(L);
  let ajout = false;
  try {
    await q(`insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2027, $2, 1)`, [VEA, catCotis]);
    ajout = true;
  } catch {
    /* refusé */
  }
  const m = await q(`update public.budget set montant_centimes = 1 returning id`);
  const s = await q(`delete from public.budget returning id`);
  await comme(A);
  if (ajout || m.rows.length || s.rows.length) throw new Error("écriture acceptée !");
});
await ok("lecteur : upsert refusé lui aussi", async () => {
  await comme(L);
  let accepte = false;
  try {
    await q(
      `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2026, $2, 1)
       on conflict (entite_id, exercice, categorie_id) do update set montant_centimes = excluded.montant_centimes`,
      [VEA, catCotis],
    );
    accepte = true;
  } catch {
    /* refusé */
  }
  await comme(A);
  const r = await q(`select montant_centimes::int as m from public.budget where exercice = 2026 and categorie_id = $1`, [catCotis]);
  if (accepte || r.rows[0].m !== 180000) throw new Error("upsert du lecteur accepté");
});
await ok("trésorier : crée, modifie et supprime une enveloppe", async () => {
  await comme(T);
  const r = await q(
    `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2027, $2, 5000) returning id`,
    [VEA, catLoyer],
  );
  const m = await q(`update public.budget set montant_centimes = 6000 where id = $1 returning id`, [r.rows[0].id]);
  const d = await q(`delete from public.budget where id = $1 returning id`, [r.rows[0].id]);
  await comme(A);
  if (m.rows.length !== 1 || d.rows.length !== 1) throw new Error("écriture du trésorier refusée");
});
await ok("inconnu : ne voit aucune enveloppe", async () => {
  await comme(B);
  const r = await q(`select count(*)::int as n from public.budget`);
  await comme(A);
  if (r.rows[0].n !== 0) throw new Error(`voit ${r.rows[0].n} enveloppe(s)`);
});
await comme(B);
await mustFail(
  "inconnu : crée une enveloppe dans VEA",
  `insert into public.budget (entite_id, exercice, categorie_id, montant_centimes) values ($1, 2028, $2, 1)`,
  [VEA, catCotis],
);
await ok("inconnu : modification et suppression sans effet", async () => {
  const m = await q(`update public.budget set montant_centimes = 1 returning id`);
  const s = await q(`delete from public.budget returning id`);
  if (m.rows.length || s.rows.length) throw new Error("écriture acceptée !");
});
await ok("non connecté (auth.uid() null) : zéro enveloppe visible", async () => {
  await comme("");
  const r = await q(`select count(*)::int as n from public.budget`);
  if (r.rows[0].n !== 0) throw new Error("des lignes fuient sans authentification");
});
await comme(A);
await ok("rôle anon : lecture refusée par le GRANT, avant la RLS", async () => {
  await db.exec(`reset role; set role anon;`);
  let refuse = false;
  try {
    await q(`select count(*) from public.budget`);
  } catch {
    refuse = true;
  }
  await db.exec(`reset role; set role authenticated;`);
  if (!refuse) throw new Error("anon lit la table");
});

console.log(`\n========= RÉSULTAT : ${pass} PASS / ${fail} FAIL =========`);
process.exit(fail === 0 ? 0 : 1);
