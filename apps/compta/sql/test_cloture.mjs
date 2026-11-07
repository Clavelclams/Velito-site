/**
 * Tests de la CLÔTURE D'EXERCICE (sql/10_cloture.sql) sur un vrai moteur
 * Postgres (PGlite, Postgres compilé en WASM, rien d'autre à installer).
 *
 * Lancer depuis apps/compta :   node sql/test_cloture.mjs
 *
 * Même mise en place que test_schema.mjs : schéma auth simulé, migrations 01,
 * 02, puis les droits de base, puis 06, 07, 08, 09 et 10 (chargées APRÈS le
 * « grant all », comme en production). Ce que ça prouve :
 *   1. reprise de l'existant : les lignes d'un relevé importé sont pointées ;
 *   2. le pointage et l'exception de justificatif et leurs CHECK ;
 *   3. la clôture est refusée tant qu'une ligne est non validée, non pointée,
 *      sans compte, non justifiée, qu'un compte ne concorde pas, que
 *      l'exercice n'est pas fini, que la signature diffère, ou pour un lecteur ;
 *   4. une clôture réussie, puis le verrou en base : insertion, modification,
 *      suppression et DÉPLACEMENT vers ou depuis l'exercice clôturé refusés,
 *      sur les lignes, les relevés, les justificatifs et le bénévolat ;
 *   5. la réouverture motivée, la modification de nouveau possible, et
 *      l'historique conservé (rien n'est effacé ni réécrit) ;
 *   6. la signature calculée par lib/services/cloture.ts = celle de Postgres.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SQL_DIR = dirname(fileURLToPath(import.meta.url));
// Résolveur « @/ » des tests de services : on importe le vrai service TS
// pour comparer sa signature à celle de Postgres.
register("../scripts/alias-loader.mjs", import.meta.url);
const service = await import("../lib/services/cloture.ts");

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
// Attend un REFUS ; si `fragment` est donné, le message doit le contenir.
async function mustFail(label, sql, params, fragment) {
  try {
    await db.query(sql, params);
    fail++;
    console.log("  FAIL  " + label + " -> la requête aurait dû être REFUSÉE");
  } catch (e) {
    if (fragment && !e.message.includes(fragment)) {
      fail++;
      console.log("  FAIL  " + label + " -> refusée, mais message inattendu : " + e.message.split("\n")[0]);
      return;
    }
    pass++;
    console.log("  PASS  " + label + " (refusée : " + e.message.split("\n")[0] + ")");
  }
}
const q = (sql, params) => db.query(sql, params);
const comme = (uid) => db.exec(`select set_config('app.uid','${uid}', false);`);

// ---------- 0. Schéma auth simulé ----------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
`);

// ---------- 1. Migrations jusqu'à la 09 ----------
console.log("\n== Migrations ==");
const charger = (f) => ok(`${f} s'exécute sans erreur`, () => db.exec(readFileSync(join(SQL_DIR, f), "utf8")));
await charger("01_schema_noyau.sql");
await charger("02_rls_noyau.sql");
await db.exec(`
  create role authenticated;
  create role anon;
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
  grant execute on all functions in schema public to authenticated;
`);
await charger("06_tresorerie_associative.sql");
await charger("07_droits_tresorerie.sql");
await charger("08_subventions_benevolat.sql");
await charger("09_membres_roles.sql");

// ---------- 2. Données existantes AVANT la 10 ----------
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // propriétaire
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // inconnu
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // trésorier
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // lecteur
await q(`insert into auth.users values ($1,'clavel@velito.fr'),($2,'autre@test.fr'),($3,'tresorier@test.fr'),($4,'lecteur@test.fr')`, [A, B, C, D]);
await db.exec(`set role authenticated;`);
await comme(A);

const VEA = (await q(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'VEA','association') returning id`, [A])).rows[0].id;
await q(`select public.ajouter_membre_entite($1,'tresorier@test.fr','tresorier')`, [VEA]);
await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','lecteur')`, [VEA]);
const catCotis = (await q(`insert into public.categorie (entite_id, nom, type) values ($1,'Cotisations','recette') returning id`, [VEA])).rows[0].id;
const catFrais = (await q(`insert into public.categorie (entite_id, nom, type) values ($1,'Frais bancaires','depense') returning id`, [VEA])).rows[0].id;
const courant = (await q(`insert into public.compte_tresorerie (entite_id, nom, nature, solde_initial_centimes, date_solde_initial)
                          values ($1,'Courant','courant', 100000, '2025-01-01') returning id`, [VEA])).rows[0].id;
const caisse = (await q(`insert into public.compte_tresorerie (entite_id, nom, nature, solde_initial_centimes, date_solde_initial)
                         values ($1,'Caisse','caisse', 0, '2025-01-01') returning id`, [VEA])).rows[0].id;

// Deux lignes importées d'un relevé : les deux formats de source_ref.
const ins = `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, source_cle, source_ref)
             values ($1,$2,'a_classer',$3,$4,$5,$6,$7,$8) returning id`;
const L1 = (await q(ins, [VEA, "recette", "2025-03-10", "VIR COTISATION", 5000, courant, "releve-cm:2025-03-10|+5000|VIR|#1", "relevé au 2025-03-31"])).rows[0].id;
const L2 = (await q(ins, [VEA, "depense", "2025-12-05", "FACT SGT", 537, courant, "releve-cm:2025-12-05|-537|FACT|#1", "2025-12-31"])).rows[0].id;
// Une ligne CSV : ne doit PAS être pointée par la reprise.
const LCSV = (await q(ins, [VEA, "depense", "2026-02-01", "CB CAFE", 250, courant, "csv:2026-02-01|-250|CB|#1", "ligne 3"])).rows[0].id;

// ---------- 3. Migration 10 ----------
await db.exec(`reset role;`);
await charger("10_cloture.sql");
await db.exec(`set role authenticated;`);
await comme(A);

console.log("\n== Reprise de l'existant ==");
await ok("ligne de relevé (« relevé au AAAA-MM-JJ ») pointée au 31/03/2025", async () => {
  const r = (await q(`select pointe_le::text as d, pointe_ref from public.transaction where id = $1`, [L1])).rows[0];
  if (r.d !== "2025-03-31" || r.pointe_ref !== "Relevé Crédit Mutuel au 31/03/2025") throw new Error(JSON.stringify(r));
});
await ok("ligne de relevé (« AAAA-MM-JJ ») pointée au 31/12/2025", async () => {
  const r = (await q(`select pointe_le::text as d, pointe_ref from public.transaction where id = $1`, [L2])).rows[0];
  if (r.d !== "2025-12-31" || r.pointe_ref !== "Relevé Crédit Mutuel au 31/12/2025") throw new Error(JSON.stringify(r));
});
await ok("ligne CSV : pas pointée", async () => {
  const r = (await q(`select pointe_le from public.transaction where id = $1`, [LCSV])).rows[0];
  if (r.pointe_le !== null) throw new Error("pointée à tort");
});

console.log("\n== Droits de la migration 10 ==");
await ok("cloture_exercice : lecture pour authenticated, aucune écriture, rien pour anon", async () => {
  const r = (await q(`select has_table_privilege('authenticated','public.cloture_exercice','select') as s,
                             has_table_privilege('authenticated','public.cloture_exercice','insert') as i,
                             has_table_privilege('authenticated','public.cloture_exercice','update') as u,
                             has_table_privilege('anon','public.cloture_exercice','select') as a`)).rows[0];
  if (!(r.s === true && r.i === false && r.u === false && r.a === false)) throw new Error(JSON.stringify(r));
});
await ok("fonctions : cloturer exécutable par authenticated, pas par anon ; contrôle interne caché", async () => {
  const r = (await q(`select has_function_privilege('authenticated','public.cloturer_exercice(uuid,integer,text,text,jsonb)','execute') as a,
                             has_function_privilege('anon','public.cloturer_exercice(uuid,integer,text,text,jsonb)','execute') as b,
                             has_function_privilege('authenticated','public.controle_soldes_decembre(uuid,integer)','execute') as c`)).rows[0];
  if (!(r.a === true && r.b === false && r.c === false)) throw new Error(JSON.stringify(r));
});

// ---------- 4. Pointage et exception : CHECK ----------
console.log("\n== Pointage et exception ==");
await mustFail("date de pointage sans référence", `update public.transaction set pointe_le = '2026-02-28' where id = $1`, [LCSV]);
await mustFail("référence sans date de pointage", `update public.transaction set pointe_ref = 'Relevé 02' where id = $1`, [LCSV]);
await mustFail("référence de 2 caractères", `update public.transaction set pointe_le = '2026-02-28', pointe_ref = 'ab' where id = $1`, [LCSV]);
await mustFail("exception de 9 caractères", `update public.transaction set exception_justificatif = '123456789' where id = $1`, [LCSV]);
await ok("pointage complet accepté, puis dépointage", async () => {
  await q(`update public.transaction set pointe_le = '2026-02-28', pointe_ref = 'Relevé 02/2026' where id = $1`, [LCSV]);
  await q(`update public.transaction set pointe_le = null, pointe_ref = null where id = $1`, [LCSV]);
});
await ok("exception de 10 caractères acceptée", () =>
  q(`update public.transaction set exception_justificatif = 'Ticket perdu' where id = $1`, [LCSV]));

// ---------- 5. Jeu 2025 et refus de clôture ----------
console.log("\n== Clôture refusée tant que tout n'est pas vert ==");
// Virement de 20,00 courant → caisse (jambe banque pointée, jambe caisse non).
await q(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, virement_id, pointe_le, pointe_ref)
         values ($1,'depense','validee','2025-06-01','Retrait caisse', 2000, $2, '11111111-1111-4111-8111-111111111111', '2025-06-30', 'Relevé 06/2025'),
                ($1,'recette','validee','2025-06-01','Retrait caisse', 2000, $3, '11111111-1111-4111-8111-111111111111', null, null)`, [VEA, courant, caisse]);
// Cotisation en espèces : caisse, exception motivée.
await q(`insert into public.transaction (entite_id, categorie_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, exception_justificatif)
         values ($1,$2,'recette','validee','2025-07-01','Cotisation espèces', 300, $3, 'Reçu remis au membre, double au classeur')`, [VEA, catCotis, caisse]);

const sigSql = async (annee = 2025) => (await q(`select public.signature_exercice($1,$2) as s`, [VEA, annee])).rows[0].s;
const instantane = (sig, annee = 2025) => JSON.stringify({ version: 1, exercice: annee, signature: sig, nbLignes: Number(sig.split("|")[0]) });
const cloturer = async (motif = "Comptes 2025 revus avec le bureau", annee = 2025) => {
  const s = await sigSql(annee);
  return q(`select public.cloturer_exercice($1,$2,$3,$4,$5::jsonb) as id`, [VEA, annee, motif, s, instantane(s, annee)]);
};
async function refus(label, fragment, fn = () => cloturer()) {
  try {
    await fn();
    fail++;
    console.log("  FAIL  " + label + " -> la clôture aurait dû être REFUSÉE");
  } catch (e) {
    if (!e.message.includes(fragment)) {
      fail++;
      console.log("  FAIL  " + label + " -> message inattendu : " + e.message.split("\n")[0]);
    } else {
      pass++;
      console.log("  PASS  " + label + " (" + e.message.split("\n")[0] + ")");
    }
  }
}

await refus("exercice pas terminé (2026)", "n'est pas terminé", () => cloturer("Essai", 2026));
await refus("lignes non validées (deux lignes « à classer »)", "2 ligne(s) non validée(s)");
await ok("on classe et valide les deux lignes de relevé", async () => {
  await q(`update public.transaction set categorie_id = $2, statut = 'validee' where id = $1`, [L1, catCotis]);
  await q(`update public.transaction set categorie_id = $2, statut = 'validee' where id = $1`, [L2, catFrais]);
});
await refus("lignes sans justificatif ni exception", "sans justificatif ni exception");
await ok("une pièce jointe pour les frais, une exception pour la cotisation", async () => {
  await q(`insert into public.justificatif (transaction_id, chemin_stockage, nom_fichier, type_mime) values ($1, 'vea/frais.pdf', 'frais.pdf', 'application/pdf')`, [L2]);
  await q(`update public.transaction set exception_justificatif = 'Virement de cotisation, visible sur le relevé' where id = $1`, [L1]);
});
const LSANS = (await q(`insert into public.transaction (entite_id, categorie_id, type, statut, date_transaction, libelle, montant_ttc_centimes, exception_justificatif)
                        values ($1,$2,'depense','validee','2025-08-01','Ticket compte inconnu', 100, 'Ticket perdu, payé en liquide') returning id`, [VEA, catFrais])).rows[0].id;
await refus("ligne sans compte", "1 ligne(s) sans compte");
await q(`delete from public.transaction where id = $1`, [LSANS]);
const LNP = (await q(`insert into public.transaction (entite_id, categorie_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, exception_justificatif)
                      values ($1,$2,'depense','validee','2025-09-01','Prélèvement non pointé', 100, $3, 'Prélèvement visible sur le relevé') returning id`, [VEA, catFrais, courant])).rows[0].id;
await refus("ligne bancaire non pointée", "1 ligne(s) bancaire(s) non pointée(s)");
await q(`delete from public.transaction where id = $1`, [LNP]);
await refus("aucun relevé de décembre pour le compte courant", "ne concorde pas");
await q(`insert into public.solde_observe (entite_id, compte_id, date_releve, solde_centimes, reference) values ($1,$2,'2025-12-31', 102464, 'Relevé 12/2025')`, [VEA, courant]);
await refus("relevé de décembre avec 1 centime d'écart", "ne concorde pas");
await q(`update public.solde_observe set solde_centimes = 102463 where compte_id = $1 and date_releve = '2025-12-31'`, [courant]);
await refus("motif vide", "motif", () => cloturer("   "));
await refus("signature différente (données modifiées après l'affichage)", "ont changé depuis ton affichage", async () => {
  const vue = await sigSql();
  await q(`update public.transaction set commentaire = 'modifiée entre la revue et la confirmation' where id = $1`, [L1]);
  if ((await sigSql()) === vue) throw new Error("la signature n'a pas bougé");
  return q(`select public.cloturer_exercice($1,2025,'Motif',$2,$3::jsonb)`, [VEA, vue, instantane(vue)]);
});
await refus("instantané d'un autre exercice", "Instantané incohérent", async () => {
  const s = await sigSql();
  return q(`select public.cloturer_exercice($1,2025,'Motif',$2,$3::jsonb)`, [VEA, s, instantane(s, 2024)]);
});
await refus("lecteur : clôture interdite", "Seuls le propriétaire et le trésorier", async () => {
  await comme(D);
  try {
    return await cloturer();
  } finally {
    await comme(A);
  }
});
await refus("inconnu : clôture interdite", "Structure introuvable", async () => {
  await comme(B);
  try {
    return await q(`select public.signature_exercice($1,2025)`, [VEA]);
  } finally {
    await comme(A);
  }
});
await mustFail("écriture directe dans cloture_exercice (sans passer par la fonction)",
  `insert into public.cloture_exercice (entite_id, exercice, motif, instantane, signature) values ($1, 2025, 'x', '{}', 'x')`, [VEA]);

// ---------- 6. Signature : service TS = Postgres ----------
console.log("\n== Signature identique en TypeScript et en SQL ==");
await ok("signatureExercice (lib/services/cloture.ts) = signature_exercice (SQL)", async () => {
  // to_json : même sérialisation que Supabase (PostgREST), à la microseconde.
  const lignes = (await q(`select date_transaction::text as date_transaction, type, montant_ttc_centimes::int as montant_ttc_centimes,
                                  to_json(modifie_le) #>> '{}' as modifie_le
                           from public.transaction where entite_id = $1`, [VEA])).rows;
  const ts = service.signatureExercice(lignes, 2025);
  const sql = await sigSql();
  if (ts !== sql) throw new Error(`TS ${ts} ≠ SQL ${sql}`);
});
await ok("même égalité sur un exercice vide (2019)", async () => {
  const sql = await sigSql(2019);
  if (service.signatureExercice([], 2019) !== sql) throw new Error(sql);
});

// ---------- 7. Clôture réussie ----------
console.log("\n== Clôture réussie ==");
let clotureId;
await ok("le propriétaire clôture 2025 (tout est vert)", async () => {
  clotureId = (await cloturer()).rows[0].id;
});
await ok("exercice_cloture(2025) = vrai, (2026) = faux", async () => {
  const r = (await q(`select public.exercice_cloture($1,2025) as a, public.exercice_cloture($1,2026) as b`, [VEA])).rows[0];
  if (r.a !== true || r.b !== false) throw new Error(JSON.stringify(r));
});
await ok("le lecteur voit la clôture (lecture membres)", async () => {
  await comme(D);
  const r = await q(`select count(*)::int as n from public.cloture_exercice`);
  await comme(A);
  if (r.rows[0].n !== 1) throw new Error(`${r.rows[0].n}`);
});
await ok("un inconnu ne voit pas la clôture", async () => {
  await comme(B);
  const r = await q(`select count(*)::int as n from public.cloture_exercice`);
  await comme(A);
  if (r.rows[0].n !== 0) throw new Error("fuite");
});
await refus("deuxième clôture du même exercice", "déjà clôturé");

// ---------- 8. Verrou en base ----------
console.log("\n== Verrou : exercice 2025 clôturé ==");
const MSG = "Exercice 2025 clôturé : rouvre-le d'abord.";
const L2026 = (await q(`insert into public.transaction (entite_id, categorie_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id)
                        values ($1,$2,'depense','a_verifier','2026-03-01','Ligne 2026', 400, $3) returning id`, [VEA, catFrais, courant])).rows[0].id;
await mustFail("insérer une ligne datée de 2025",
  `insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes) values ($1,'depense','a_classer','2025-05-05','Oubli', 100)`, [VEA], MSG);
await mustFail("modifier une ligne de 2025 (libellé)", `update public.transaction set libelle = 'Corrigé' where id = $1`, [L1], MSG);
await mustFail("dépointer une ligne de 2025", `update public.transaction set pointe_le = null, pointe_ref = null where id = $1`, [L2], MSG);
await mustFail("supprimer une ligne de 2025", `delete from public.transaction where id = $1`, [L1], MSG);
await mustFail("déplacer une ligne de 2025 VERS 2026", `update public.transaction set date_transaction = '2026-01-02' where id = $1`, [L1], MSG);
await mustFail("déplacer une ligne de 2026 VERS 2025", `update public.transaction set date_transaction = '2025-12-30' where id = $1`, [L2026], MSG);
await ok("une ligne de 2026 reste modifiable", () => q(`update public.transaction set libelle = 'Ligne 2026 corrigée' where id = $1`, [L2026]));
await comme(C);
await mustFail("le trésorier non plus ne modifie pas 2025", `update public.transaction set libelle = 'x' where id = $1`, [L1], MSG);
await comme(A);
await mustFail("ajouter un relevé daté de 2025", `insert into public.solde_observe (entite_id, compte_id, date_releve, solde_centimes) values ($1,$2,'2025-11-30', 1)`, [VEA, courant], MSG);
await mustFail("corriger le relevé du 31/12/2025", `update public.solde_observe set solde_centimes = 1 where compte_id = $1 and date_releve = '2025-12-31'`, [courant], MSG);
await mustFail("supprimer le relevé du 31/12/2025", `delete from public.solde_observe where compte_id = $1 and date_releve = '2025-12-31'`, [courant], MSG);
await mustFail("déplacer le relevé du 31/12/2025 en 2026", `update public.solde_observe set date_releve = '2026-01-31' where compte_id = $1 and date_releve = '2025-12-31'`, [courant], MSG);
await ok("un relevé de 2026 s'ajoute", () =>
  q(`insert into public.solde_observe (entite_id, compte_id, date_releve, solde_centimes) values ($1,$2,'2026-01-31', 102463)`, [VEA, courant]));
await mustFail("joindre une pièce à une ligne de 2025", `insert into public.justificatif (transaction_id, chemin_stockage, nom_fichier, type_mime) values ($1,'vea/x.pdf','x.pdf','application/pdf')`, [L1], MSG);
await mustFail("retirer la pièce d'une ligne de 2025", `delete from public.justificatif where transaction_id = $1`, [L2], MSG);
await mustFail("rattacher une pièce de 2025 à une ligne de 2026", `update public.justificatif set transaction_id = $1 where transaction_id = $2`, [L2026, L2], MSG);
await ok("joindre une pièce à une ligne de 2026", () =>
  q(`insert into public.justificatif (transaction_id, chemin_stockage, nom_fichier, type_mime) values ($1,'vea/2026.pdf','2026.pdf','application/pdf')`, [L2026]));
await mustFail("saisir des heures de bénévolat en 2025",
  `insert into public.contribution_nature (entite_id, type, date_contribution, libelle, minutes, taux_horaire_centimes, valeur_centimes) values ($1,'heures_benevoles','2025-10-10','Tournoi', 60, 1200, 1200)`, [VEA], MSG);
const CN = (await q(`insert into public.contribution_nature (entite_id, type, date_contribution, libelle, minutes, taux_horaire_centimes, valeur_centimes)
                     values ($1,'heures_benevoles','2026-10-10','Tournoi 2026', 60, 1200, 1200) returning id`, [VEA])).rows[0].id;
await mustFail("déplacer des heures de 2026 vers 2025", `update public.contribution_nature set date_contribution = '2025-10-10' where id = $1`, [CN], MSG);

console.log("\n== Historique immuable ==");
await mustFail("modifier une clôture en direct (pas de droit d'écriture)", `update public.cloture_exercice set motif = 'réécrit'`);
await ok("même le propriétaire de la base ne réécrit pas une clôture", async () => {
  await db.exec(`reset role;`);
  let refuse = false;
  try { await q(`update public.cloture_exercice set motif = 'réécrit' where id = $1`, [clotureId]); } catch { refuse = true; }
  let refuseSuppr = false;
  try { await q(`delete from public.cloture_exercice where id = $1`, [clotureId]); } catch { refuseSuppr = true; }
  await db.exec(`set role authenticated;`);
  await comme(A);
  if (!refuse || !refuseSuppr) throw new Error(`modification ${refuse}, suppression ${refuseSuppr}`);
});

// ---------- 9. Réouverture ----------
console.log("\n== Réouverture ==");
await refus("motif de réouverture de 9 caractères", "au moins 10 caractères",
  () => q(`select public.rouvrir_exercice($1,2025,'trop bref')`, [VEA]));
await refus("lecteur : réouverture interdite", "Seuls le propriétaire et le trésorier", async () => {
  await comme(D);
  try {
    return await q(`select public.rouvrir_exercice($1,2025,'Je veux corriger une ligne')`, [VEA]);
  } finally {
    await comme(A);
  }
});
await ok("le trésorier rouvre 2025 avec un motif", async () => {
  await comme(C);
  await q(`select public.rouvrir_exercice($1,2025,'Facture de décembre retrouvée, à corriger')`, [VEA]);
  await comme(A);
});
await refus("rouvrir un exercice déjà rouvert", "n'est pas clôturé",
  () => q(`select public.rouvrir_exercice($1,2025,'Encore une fois svp')`, [VEA]));
await ok("après réouverture : modifier une ligne de 2025 est de nouveau possible", () =>
  q(`update public.transaction set commentaire = 'Corrigée après réouverture' where id = $1`, [L1]));
await ok("historique : date, auteur, motif et instantané de la clôture conservés", async () => {
  const r = (await q(`select statut, cloture_par, motif, instantane, rouvert_par, motif_reouverture, rouvert_le from public.cloture_exercice where id = $1`, [clotureId])).rows[0];
  if (r.statut !== "rouvert" || r.cloture_par !== A || r.rouvert_par !== C || r.instantane.exercice !== 2025 ||
      r.motif !== "Comptes 2025 revus avec le bureau" || !r.motif_reouverture.startsWith("Facture") || !r.rouvert_le) {
    throw new Error(JSON.stringify(r));
  }
});
await ok("nouvelle clôture (par le trésorier) : une NOUVELLE ligne, l'ancienne reste", async () => {
  await comme(C);
  await cloturer("Clôture après correction de décembre");
  await comme(A);
  const r = (await q(`select statut, count(*)::int as n from public.cloture_exercice where entite_id = $1 and exercice = 2025 group by statut order by statut`, [VEA])).rows;
  if (JSON.stringify(r) !== JSON.stringify([{ statut: "cloture", n: 1 }, { statut: "rouvert", n: 1 }])) throw new Error(JSON.stringify(r));
});
await mustFail("et 2025 est de nouveau verrouillé", `update public.transaction set libelle = 'x' where id = $1`, [L1], MSG);

// ---------- 10. Suppression d'une structure entière ----------
console.log("\n== Suppression d'une structure ==");
await ok("supprimer une structure qui a un exercice clôturé : la cascade passe", async () => {
  const E2 = (await q(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'Essai','association') returning id`, [A])).rows[0].id;
  await q(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes) values ($1,'depense','a_classer','2024-02-02','x', 100)`, [E2]);
  await db.exec(`reset role;`);
  await q(`insert into public.cloture_exercice (entite_id, exercice, motif, instantane, signature) values ($1, 2024, 'Essai', '{}', '1|-100|0')`, [E2]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  let bloque = false;
  try { await q(`delete from public.transaction where entite_id = $1`, [E2]); } catch { bloque = true; }
  if (!bloque) throw new Error("la ligne seule aurait dû être protégée");
  await q(`delete from public.entite where id = $1`, [E2]);
  const r = (await q(`select (select count(*)::int from public.transaction where entite_id = $1) as t,
                             (select count(*)::int from public.cloture_exercice where entite_id = $1) as c`, [E2])).rows[0];
  if (r.t !== 0 || r.c !== 0) throw new Error(JSON.stringify(r));
});

console.log(`\n========= RÉSULTAT : ${pass} PASS / ${fail} FAIL =========`);
process.exit(fail === 0 ? 0 : 1);
