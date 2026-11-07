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
 *  6. [07/11/2026] migration 06 (trésorerie) : comptes réels, statuts,
 *     virements, clé anti-doublon, soldes observés, cloisonnement.
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
  create role anon;
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
`);

// [07/11/2026] 06 et 07 sont chargées APRÈS le « grant all » ci-dessus, comme
// en production où Supabase n'accorde plus de droits aux nouvelles tables.
// Avant, le test accordait tout à tout et n'a pas vu l'oubli de GRANT de la 06
// (pages Trésorerie en erreur 500 en prod). Désormais, sans la 07, les tests
// de trésorerie échouent ici aussi.
await ok("06_tresorerie_associative.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "06_tresorerie_associative.sql"), "utf8")),
);
await ok("07_droits_tresorerie.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "07_droits_tresorerie.sql"), "utf8")),
);
await ok("droits réels : authenticated peut lire compte_tresorerie, anon non", async () => {
  const r = await q(`select has_table_privilege('authenticated','public.compte_tresorerie','select') as a,
                            has_table_privilege('anon','public.compte_tresorerie','select') as b`);
  if (r.rows[0].a !== true || r.rows[0].b !== false) throw new Error(JSON.stringify(r.rows[0]));
});

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

// ---------- 6 bis. Trésorerie (sql/06), en tant que A ----------
console.log("\n== Trésorerie (migration 06) ==");
await db.exec(`select set_config('app.uid','${A}', false);`);
let courant, livret;
await ok("A crée un compte courant au solde initial INCONNU (null)", async () => {
  const r = await q(
    `insert into public.compte_tresorerie (entite_id, nom, nature) values ($1,'Courant','courant') returning id`,
    [VEA],
  );
  courant = r.rows[0].id;
});
await ok("A crée un livret avec solde initial daté", async () => {
  const r = await q(
    `insert into public.compte_tresorerie (entite_id, nom, nature, solde_initial_centimes, date_solde_initial)
     values ($1,'Livret','livret', 350000, '2025-01-01') returning id`,
    [VEA],
  );
  livret = r.rows[0].id;
});
await mustFail(
  "solde initial sans sa date",
  `insert into public.compte_tresorerie (entite_id, nom, nature, solde_initial_centimes) values ($1,'Caisse','caisse', 100)`,
  [VEA],
);
await mustFail(
  "nature de compte libre ('coffre')",
  `insert into public.compte_tresorerie (entite_id, nom, nature) values ($1,'Coffre','coffre')`,
  [VEA],
);
await mustFail(
  "opération VENA rattachée à un compte de VEA (FK composite)",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id)
   values ($1,'depense','a_classer','2026-07-02','Mélange', 1000, $2)`,
  [VENA, courant],
);
await ok("opération 'à classer' sans catégorie acceptée", () =>
  q(
    `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id)
     values ($1,'depense','a_classer','2026-07-02','Ticket', 1000, $2)`,
    [VEA, courant],
  ),
);
await mustFail(
  "opération 'validée' sans catégorie",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
   values ($1,'depense','validee','2026-07-02','Validée à tort', 1000)`,
  [VEA],
);
await mustFail(
  "statut libre ('payee')",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
   values ($1,'depense','payee','2026-07-02','Statut inventé', 1000)`,
  [VEA],
);
await ok("virement interne : deux jambes validées sans catégorie", () =>
  q(
    `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, virement_id)
     values ($1,'depense','validee','2026-07-03','Virement', 50000, $2, '11111111-1111-4111-8111-111111111111'),
            ($1,'recette','validee','2026-07-03','Virement', 50000, $3, '11111111-1111-4111-8111-111111111111')`,
    [VEA, courant, livret],
  ),
);
await mustFail(
  "jambe de virement sans compte",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, virement_id)
   values ($1,'depense','validee','2026-07-03','Virement orphelin', 100, '22222222-2222-4222-8222-222222222222')`,
  [VEA],
);
await ok("import : clé source posée une première fois", () =>
  q(
    `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, source_cle)
     values ($1,'depense','a_classer','2026-07-04','CB CAFE', 250, 'csv:2026-07-04|-250|CB CAFE|#1')`,
    [VEA],
  ),
);
await ok("réimport : ON CONFLICT DO NOTHING n'ajoute rien", async () => {
  await q(
    `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, source_cle)
     values ($1,'depense','a_classer','2026-07-04','CB CAFE', 250, 'csv:2026-07-04|-250|CB CAFE|#1')
     on conflict (entite_id, source_cle) do nothing`,
    [VEA],
  );
  const r = await q(`select count(*)::int as n from public.transaction where source_cle like 'csv:2026-07-04%'`);
  if (r.rows[0].n !== 1) throw new Error(`${r.rows[0].n} lignes au lieu de 1`);
});
await ok("deux saisies manuelles sans clé (NULL) coexistent", async () => {
  const r = await q(`select count(*)::int as n from public.transaction where source_cle is null and entite_id = $1`, [VEA]);
  if (r.rows[0].n < 2) throw new Error(`${r.rows[0].n} ligne(s)`);
});
await ok("solde observé enregistré", () =>
  q(
    `insert into public.solde_observe (entite_id, compte_id, date_releve, solde_centimes, reference)
     values ($1,$2,'2025-01-31', 352000, 'Relevé 01')`,
    [VEA, livret],
  ),
);
await mustFail(
  "deux soldes observés le même jour sur le même compte",
  `insert into public.solde_observe (entite_id, compte_id, date_releve, solde_centimes) values ($1,$2,'2025-01-31', 1)`,
  [VEA, livret],
);
await ok("B ne voit ni les comptes ni les relevés de A", async () => {
  await db.exec(`select set_config('app.uid','${B}', false);`);
  const c = await q(`select count(*)::int as n from public.compte_tresorerie`);
  const o = await q(`select count(*)::int as n from public.solde_observe`);
  await db.exec(`select set_config('app.uid','${A}', false);`);
  if (c.rows[0].n !== 0 || o.rows[0].n !== 0) throw new Error("fuite inter-utilisateurs");
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
