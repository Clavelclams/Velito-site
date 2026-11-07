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
await ok("08_subventions_benevolat.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "08_subventions_benevolat.sql"), "utf8")),
);
await ok("09_membres_roles.sql s'exécute sans erreur", () =>
  db.exec(readFileSync(join(SQL_DIR, "09_membres_roles.sql"), "utf8")),
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

// ---------- 6 bis. Subventions et contributions (migration 08) ----------
console.log("\n== Subventions et bénévolat (migration 08) ==");
let subVEA;
await ok("droits réels : authenticated sur subvention, anon non", async () => {
  const r = await q(`select has_table_privilege('authenticated','public.subvention','insert') as a,
                            has_table_privilege('anon','public.contribution_nature','select') as b`);
  if (r.rows[0].a !== true || r.rows[0].b !== false) throw new Error(JSON.stringify(r.rows[0]));
});
await ok("créer un dossier : notifié inconnu reste NULL", async () => {
  const r = await q(`insert into public.subvention (entite_id, financeur, action, exercice, montant_demande_centimes)
                     values ($1, 'FDVA', 'Fonctionnement', 2026, 300000) returning id, montant_notifie_centimes, statut`, [VEA]);
  subVEA = r.rows[0].id;
  if (r.rows[0].montant_notifie_centimes !== null || r.rows[0].statut !== "a_preparer") throw new Error(JSON.stringify(r.rows[0]));
});
await mustFail("statut de dossier inconnu refusé",
  `insert into public.subvention (entite_id, financeur, action, exercice, statut) values ($1,'X','Y',2026,'payee')`, [VEA]);
await ok("une recette se rattache au dossier (financement lié)", async () => {
  await q(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, subvention_id)
           values ($1,'recette','a_classer','2026-06-01','Versement FDVA', 150000, $2)`, [VEA, subVEA]);
});
await mustFail("rattacher une ligne VENA à un dossier VEA : refusé (FK composite)",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, subvention_id)
   values ($1,'recette','a_classer','2026-06-01','x', 100, $2)`, [VENA, subVEA]);
await ok("supprimer le dossier garde la transaction, sans lien", async () => {
  await q(`delete from public.subvention where id = $1`, [subVEA]);
  const r = await q(`select count(*)::int as n, count(subvention_id)::int as liees from public.transaction where libelle = 'Versement FDVA'`);
  if (r.rows[0].n !== 1 || r.rows[0].liees !== 0) throw new Error(JSON.stringify(r.rows[0]));
});
await ok("heures de bénévolat complètes acceptées", async () => {
  await q(`insert into public.contribution_nature (entite_id, type, date_contribution, libelle, minutes, taux_horaire_centimes, valeur_centimes, source_cle)
           values ($1,'heures_benevoles','2026-03-10','Tournoi', 600, 1200, 12000, 'vea-presences:tournoi')`, [VEA]);
});
await mustFail("heures sans taux refusées",
  `insert into public.contribution_nature (entite_id, type, date_contribution, libelle, minutes, valeur_centimes) values ($1,'heures_benevoles','2026-03-10','x', 60, 0)`, [VEA]);
await mustFail("même clé source deux fois : refusée (pas de doublon à la reprise)",
  `insert into public.contribution_nature (entite_id, type, date_contribution, libelle, minutes, taux_horaire_centimes, valeur_centimes, source_cle)
   values ($1,'heures_benevoles','2026-03-10','Tournoi', 600, 1200, 12000, 'vea-presences:tournoi')`, [VEA]);
await mustFail("frais abandonnés vérifiés sans date de renonciation : refusés",
  `insert into public.contribution_nature (entite_id, type, date_contribution, libelle, valeur_centimes, statut) values ($1,'frais_abandonnes','2026-03-10','Essence', 4000, 'verifie')`, [VEA]);
await ok("B ne voit ni les dossiers ni les contributions de A", async () => {
  await db.exec(`select set_config('app.uid','${B}', false);`);
  const s1 = await q(`select count(*)::int as n from public.subvention`);
  const c1 = await q(`select count(*)::int as n from public.contribution_nature`);
  await db.exec(`select set_config('app.uid','${A}', false);`);
  if (s1.rows[0].n !== 0 || c1.rows[0].n !== 0) throw new Error("fuite inter-utilisateurs");
});

// ---------- 6 ter. Membres et rôles (migration 09) ----------
console.log("\n== Membres et rôles (migration 09) ==");
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // futur trésorier
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // futur lecteur
await db.exec(`reset role; insert into auth.users values ('${C}','tresorier@test.fr'),('${D}','lecteur@test.fr');
  set role authenticated; select set_config('app.uid','${A}', false);`);
const comme = (uid) => db.exec(`select set_config('app.uid','${uid}', false);`);
await ok("le propriétaire ajoute un trésorier et un lecteur par e-mail", async () => {
  const r1 = await q(`select public.ajouter_membre_entite($1,'TRESORIER@test.fr','tresorier') as r`, [VEA]);
  const r2 = await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','lecteur') as r`, [VEA]);
  if (r1.rows[0].r !== "ok" || r2.rows[0].r !== "ok") throw new Error(JSON.stringify([r1.rows, r2.rows]));
});
await ok("e-mail sans compte : signalé, rien ajouté", async () => {
  const r = await q(`select public.ajouter_membre_entite($1,'personne@test.fr','lecteur') as r`, [VEA]);
  if (r.rows[0].r !== "compte_inconnu") throw new Error(r.rows[0].r);
});
await ok("trésorier : voit VEA mais pas VENA", async () => {
  await comme(C);
  const r = await q(`select nom from public.entite order by nom`);
  await comme(A);
  if (r.rows.map((x) => x.nom).join() !== "VEA") throw new Error(JSON.stringify(r.rows));
});
await ok("trésorier : saisit, modifie et supprime une opération VEA", async () => {
  await comme(C);
  const r = await q(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
                     values ($1,'depense','a_classer','2026-02-01','Saisie tresorier', 500) returning id`, [VEA]);
  await q(`update public.transaction set libelle = 'Corrigee' where id = $1`, [r.rows[0].id]);
  const d = await q(`delete from public.transaction where id = $1 returning id`, [r.rows[0].id]);
  await comme(A);
  if (d.rows.length !== 1) throw new Error("suppression refusée");
});
await ok("trésorier : ne peut pas renommer la structure", async () => {
  await comme(C);
  const r = await q(`update public.entite set nom = 'Pirate' where id = $1 returning id`, [VEA]);
  await comme(A);
  if (r.rows.length !== 0) throw new Error("renommage accepté !");
});
await ok("trésorier : ne peut pas gérer les membres", async () => {
  await comme(C);
  let refuse = false;
  try { await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','tresorier')`, [VEA]); } catch { refuse = true; }
  await comme(A);
  if (!refuse) throw new Error("promotion acceptée !");
});
await ok("lecteur : lit les opérations de VEA", async () => {
  await comme(D);
  const r = await q(`select count(*)::int as n from public.transaction`);
  await comme(A);
  if (r.rows[0].n === 0) throw new Error("ne voit rien");
});
await ok("lecteur : aucune écriture (ajout, modification, suppression)", async () => {
  await comme(D);
  let ajout = false;
  try {
    await q(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
             values ($1,'depense','a_classer','2026-02-01','x', 1)`, [VEA]);
    ajout = true;
  } catch { /* refusé */ }
  const m = await q(`update public.transaction set libelle = 'x' returning id`);
  const s = await q(`delete from public.categorie returning id`);
  await comme(A);
  if (ajout || m.rows.length || s.rows.length) throw new Error("écriture acceptée !");
});
await ok("role_entite : proprietaire / tresorier / lecteur / null", async () => {
  const roles = [];
  for (const u of [A, C, D, B]) { await comme(u); roles.push((await q(`select public.role_entite($1) as r`, [VEA])).rows[0].r); }
  await comme(A);
  if (roles.join() !== "proprietaire,tresorier,lecteur,") throw new Error(roles.join());
});
await ok("membres_entite : visible du lecteur, vide pour un inconnu", async () => {
  await comme(D);
  const vu = await q(`select count(*)::int as n from public.membres_entite($1)`, [VEA]);
  await comme(B);
  const inconnu = await q(`select count(*)::int as n from public.membres_entite($1)`, [VEA]);
  await comme(A);
  if (vu.rows[0].n !== 2 || inconnu.rows[0].n !== 0) throw new Error(JSON.stringify([vu.rows, inconnu.rows]));
});
await ok("retirer le trésorier : il ne voit plus rien", async () => {
  await q(`select public.retirer_membre_entite($1,$2)`, [VEA, C]);
  await comme(C);
  const r = await q(`select count(*)::int as n from public.transaction`);
  await comme(A);
  if (r.rows[0].n !== 0) throw new Error("voit encore");
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
