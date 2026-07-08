/**
 * Tests du schéma Velito Compta sur un vrai moteur Postgres (PGlite = Postgres
 * compilé en WASM, tourne dans Node sans rien installer d'autre).
 *
 * Lancer depuis apps/compta :   node sql/test_schema.mjs
 * (dépendance dev : @electric-sql/pglite, déjà dans package.json)
 *
 * Ce que ça vérifie (matériau direct pour le plan de tests CDA, Bloc 3) :
 *  1. les migrations 01 et 02 s'exécutent sans erreur ;
 *  2. le trigger crée bien le profil à l'inscription ;
 *  3. la colonne générée calcule HT = TTC - TVA ;
 *  4. les contraintes CHECK et la FK composite refusent les données invalides ;
 *  5. la RLS cloisonne : un utilisateur B ne lit NI n'écrit chez A, et
 *     un non-connecté ne voit rien.
 *
 * Le schéma auth de Supabase est simulé : auth.users (table) + auth.uid()
 * (fonction qui lit un réglage de session, comme Supabase lit le JWT).
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
// attend qu'une requête ÉCHOUE (test de sécurité / contrainte)
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

// ---------- 0. Stub du schéma auth de Supabase ----------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
`);

// ---------- 1. Exécution des migrations ----------
console.log("\n== Migrations ==");
await ok("01_schema_noyau.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "01_schema_noyau.sql"), "utf8")),
);
await ok("02_rls_noyau.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "02_rls_noyau.sql"), "utf8")),
);

// ---------- 2. Rôle "authenticated" comme sur Supabase ----------
await db.exec(`
  create role authenticated;
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
`);

// ---------- 3. Deux comptes -> trigger de profil ----------
console.log("\n== Trigger profil ==");
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await q(`insert into auth.users values ($1,'clavel@velito.fr'),($2,'autre@test.fr')`, [A, B]);
await ok("les profils utilisateur sont créés automatiquement", async () => {
  const r = await q(`select count(*)::int as n from public.utilisateur`);
  if (r.rows[0].n !== 2) throw new Error(`${r.rows[0].n} profils au lieu de 2`);
});

// ---------- 4. Connexion en tant que A ----------
console.log("\n== Utilisateur A (Clavel) ==");
await db.exec(`set role authenticated; select set_config('app.uid','${A}', false);`);
let VEA, VENA, catVEA;
await ok("A crée ses entités VEA et VENA", async () => {
  const r = await q(
    `insert into public.entite (proprietaire_id, nom, type_juridique)
     values ($1,'VEA','association'),($1,'VENA','societe') returning id, nom`,
    [A],
  );
  VEA = r.rows.find((x) => x.nom === "VEA").id;
  VENA = r.rows.find((x) => x.nom === "VENA").id;
});
await ok("A crée une catégorie 'Subventions' sous VEA", async () => {
  const r = await q(
    `insert into public.categorie (entite_id, nom, type)
     values ($1,'Subventions','recette') returning id`,
    [VEA],
  );
  catVEA = r.rows[0].id;
});
await ok("A saisit une recette 1200,00 € TTC dont 200,00 € TVA", () =>
  q(
    `insert into public.transaction (entite_id, categorie_id, type, date_transaction, libelle, montant_ttc_centimes, montant_tva_centimes)
     values ($1,$2,'recette','2026-07-01','Subvention ville', 120000, 20000)`,
    [VEA, catVEA],
  ),
);
await ok("colonne générée : HT = 1000,00 € exactement", async () => {
  const r = await q(`select montant_ht_centimes from public.transaction limit 1`);
  if (Number(r.rows[0].montant_ht_centimes) !== 100000)
    throw new Error("HT=" + r.rows[0].montant_ht_centimes);
});

// ---------- 5. Intégrité structurelle ----------
console.log("\n== Contraintes ==");
await mustFail(
  "transaction VENA avec une catégorie VEA (FK composite)",
  `insert into public.transaction (entite_id, categorie_id, type, date_transaction, libelle, montant_ttc_centimes)
   values ($1,$2,'depense','2026-07-02','Mélange interdit', 5000)`,
  [VENA, catVEA],
);
await mustFail(
  "montant à 0 centime",
  `insert into public.transaction (entite_id, type, date_transaction, libelle, montant_ttc_centimes)
   values ($1,'depense','2026-07-02','Zéro', 0)`,
  [VEA],
);
await mustFail(
  "TVA supérieure au TTC",
  `insert into public.transaction (entite_id, type, date_transaction, libelle, montant_ttc_centimes, montant_tva_centimes)
   values ($1,'depense','2026-07-02','TVA folle', 1000, 2000)`,
  [VEA],
);
await mustFail(
  "type libre non prévu ('virement')",
  `insert into public.transaction (entite_id, type, date_transaction, libelle, montant_ttc_centimes)
   values ($1,'virement','2026-07-02','Type invalide', 1000)`,
  [VEA],
);

// ---------- 6. Cloisonnement : B ne voit RIEN de A ----------
console.log("\n== Cloisonnement RLS (utilisateur B) ==");
await db.exec(`select set_config('app.uid','${B}', false);`);
await ok("B ne voit AUCUNE entité de A", async () => {
  const r = await q(`select count(*)::int as n from public.entite`);
  if (r.rows[0].n !== 0) throw new Error(`B voit ${r.rows[0].n} entités !`);
});
await ok("B ne voit AUCUNE transaction de A", async () => {
  const r = await q(`select count(*)::int as n from public.transaction`);
  if (r.rows[0].n !== 0) throw new Error(`B voit ${r.rows[0].n} transactions !`);
});
await mustFail(
  "B tente d'insérer une transaction dans l'entité VEA de A",
  `insert into public.transaction (entite_id, type, date_transaction, libelle, montant_ttc_centimes)
   values ($1,'depense','2026-07-02','Intrusion', 1000)`,
  [VEA],
);
await mustFail(
  "B tente de créer une entité au nom de A (usurpation)",
  `insert into public.entite (proprietaire_id, nom, type_juridique)
   values ('${A}','Fausse entité','societe')`,
);
await ok("B peut créer SA propre entité (multi-utilisateurs OK)", () =>
  q(
    `insert into public.entite (proprietaire_id, nom, type_juridique)
     values ($1,'Ma boîte','societe')`,
    [B],
  ),
);
await ok("A ne voit pas l'entité de B (cloisonnement dans les 2 sens)", async () => {
  await db.exec(`select set_config('app.uid','${A}', false);`);
  const r = await q(`select count(*)::int as n from public.entite`);
  if (r.rows[0].n !== 2) throw new Error(`A voit ${r.rows[0].n} entités au lieu de 2`);
});

// ---------- 7. Anonyme = zéro accès ----------
console.log("\n== Non connecté ==");
await ok("sans session (auth.uid() null) : zéro ligne visible", async () => {
  await db.exec(`select set_config('app.uid','', false);`);
  const r = await q(`select count(*)::int as n from public.transaction`);
  if (r.rows[0].n !== 0) throw new Error("des lignes fuient sans authentification");
});

console.log(`\n========= RÉSULTAT : ${pass} PASS / ${fail} FAIL =========`);
process.exit(fail === 0 ? 0 : 1);
