/**
 * Tests de la migration 13 (devis, factures, avoirs, clients, encaissements)
 * sur un vrai moteur Postgres (PGlite, Postgres compilé en WASM).
 *
 * Lancer depuis apps/compta :   node sql/test_devis_factures.mjs
 *
 * Mise en place copiée de test_notes_de_frais.mjs : schéma auth simulé, 01 et
 * 02, rôles et « grant all », puis 06, 07, 08, 09, 10, 12 et 13 chargées APRÈS
 * ce « grant all », comme en production (un GRANT oublié dans la 13 ferait
 * échouer les tests de droits).
 *
 * Ce que ça prouve :
 *   1. numérotation : DEV-AAAA-NNN à la création ; FAC-AAAA-NNNN et
 *      AV-AAAA-NNNN seulement à l'ÉMISSION ; aucun numéro pour un brouillon ;
 *      série continue sans trou (brouillon supprimé, émission refusée) ;
 *      chronologie ; valeur envoyée par le client ignorée ;
 *   2. verrou d'une facture émise : en-tête, lignes, client, dates, statut,
 *      suppression ; instantané de l'acheteur ;
 *   3. l'avoir : référence obligatoire, même client, plafond, série à part ;
 *   4. les encaissements : partiel, complet, refus du dépassement, recette
 *      réelle seulement, opération protégée ;
 *   5. le cloisonnement entre structures ;
 *   6. qu'un lecteur n'écrit rien ;
 *   7. le verrou de clôture, avec l'exception de l'encaissement daté de
 *      l'opération bancaire.
 *
 * Limite assumée (comme la 12) : PGlite n'a qu'une connexion, on ne lance pas
 * deux transactions en parallèle. La sûreté face à deux émissions simultanées
 * vient du verrou de ligne pris sur le compteur ; on prouve ici l'unicité, la
 * suite sans trou et les contraintes uniques de dernier rempart.
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
const un = async (sql, params) => (await q(sql, params)).rows[0];
const comme = (uid) => db.exec(`select set_config('app.uid','${uid}', false);`);
const egal = (a, b) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
};

// ---------- 0. Schéma auth simulé ----------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
`);

// ---------- 1. Migrations ----------
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
for (const f of [
  "06_tresorerie_associative.sql",
  "07_droits_tresorerie.sql",
  "08_subventions_benevolat.sql",
  "09_membres_roles.sql",
  "10_cloture.sql",
  "12_notes_de_frais.sql",
  "13_devis_factures.sql",
]) {
  await charger(f);
}

// ---------- 2. Jeu de données ----------
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // propriétaire de VENA
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // propriétaire de VEA, inconnu de VENA
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // trésorier de VENA
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // lecteur de VENA
await q(`insert into auth.users values ($1,'clavel@velito.fr'),($2,'autre@test.fr'),($3,'tresorier@test.fr'),($4,'lecteur@test.fr')`, [A, B, C, D]);
await db.exec(`set role authenticated;`);

const TABLES = ["facturation_parametres", "client_facturation", "facture", "facture_ligne", "devis", "devis_ligne", "facture_paiement"];
const insParam = `insert into public.facturation_parametres (entite_id, denomination, forme_juridique, capital_social_centimes, adresse, siren, siret, ville_rcs, regime_tva, mention_tva, conditions_paiement, penalites_retard, indemnite_recouvrement)
                  values ($1,$2,'SASU',50000,'1 rue de Test, 80000 Amiens','123456789','12345678900012','Amiens','franchise_base','Mention saisie par la structure','30 jours','Texte saisi','Texte saisi')`;
const insClient = `insert into public.client_facturation (entite_id, type_client, nom, siren, adresse_facturation) values ($1,$2,$3,$4,'2 avenue Client, 75000 Paris') returning id`;
const insFacture = `insert into public.facture (entite_id, client_id, date_emission, objet) values ($1,$2,$3,'Prestation') returning id, numero, statut`;
const insLigneF = `insert into public.facture_ligne (entite_id, facture_id, designation, quantite, prix_unitaire_ht_centimes, taux_tva_centiemes, montant_ht_centimes)
                   values ($1,$2,$3,$4,$5,$6,$7) returning id`;
const insDevis = `insert into public.devis (entite_id, client_id, date_devis, date_fin_validite, numero, annee_numero, rang) values ($1,$2,$3,$4,'x',0,1) returning id, numero, statut`;
const insLigneD = `insert into public.devis_ligne (entite_id, devis_id, designation, quantite, prix_unitaire_ht_centimes, taux_tva_centiemes, montant_ht_centimes)
                   values ($1,$2,$3,$4,$5,$6,$7) returning id`;
const insRecette = (date, montant, type = "recette", virement = null) =>
  un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, virement_id)
      values ($1,$2,'a_classer',$3,'VIR CLIENT',$4,$5) returning id`, [VENA, type, date, montant, virement]);
const emettre = (id, extra = "") => q(`update public.facture set statut = 'emise'${extra} where id = $1 returning numero`, [id]);
const lire = async (id) => un(`select * from public.facture where id = $1`, [id]);

// Structure étrangère VEA (B), sans paramètres de facturation au départ.
await comme(B);
const VEA = (await un(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'VEA','association') returning id`, [B])).id;
const clientVea = (await un(insClient, [VEA, "professionnel", "Client VEA", null])).id;
const factureVea = (await un(insFacture, [VEA, clientVea, "2026-02-01"])).id;
await q(insLigneF, [VEA, factureVea, "Animation", "1", 10000, 0, 10000]);
const txVea = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
                         values ($1,'recette','a_classer','2026-03-01','VIR VEA', 10000) returning id`, [VEA])).id;

await comme(A);
const VENA = (await un(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'VENA','societe') returning id`, [A])).id;
await q(`select public.ajouter_membre_entite($1,'tresorier@test.fr','tresorier')`, [VENA]);
await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','lecteur')`, [VENA]);

// ---------- 3. Droits ----------
console.log("\n== Droits ==");
await ok("authenticated : select, insert, update, delete sur les sept tables", async () => {
  const r = await un(`select bool_and(has_table_privilege('authenticated', 'public.' || t, p)) as tous
                      from unnest($1::text[]) as t, unnest(array['select','insert','update','delete']) as p`, [TABLES]);
  egal(r.tous, true);
});
await ok("anon : aucun droit ; compteur : aucun droit pour personne", async () => {
  const r = await un(`select bool_or(has_table_privilege('anon', 'public.' || t, p)) as anon,
                             bool_or(has_table_privilege('authenticated', 'public.facturation_compteur', p)) as compteur
                      from unnest($1::text[]) as t, unnest(array['select','insert','update','delete']) as p`, [[...TABLES, "facturation_compteur"]]);
  egal([r.anon, r.compteur], [false, false]);
});
await ok("4 règles RLS par table", async () => {
  const r = (await q(`select tablename, count(*)::int as n from pg_policies where tablename = any($1::text[]) group by tablename`, [TABLES])).rows;
  egal([r.length, r.every((x) => x.n === 4)], [7, true]);
});

// ---------- 4. Paramètres et clients ----------
console.log("\n== Paramètres vendeur et clients ==");
await mustFail("SIREN vendeur mal formé", `insert into public.facturation_parametres (entite_id, siren) values ($1,'12345')`, [VENA], "check");
await mustFail("SIRET qui ne commence pas par le SIREN", `insert into public.facturation_parametres (entite_id, siren, siret) values ($1,'123456789','99999999900012')`, [VENA], "facturation_parametres_siret_siren");
await ok("paramètres vendeur enregistrés (mentions saisies, aucune inventée)", () => q(insParam, [VENA, "VENA"]));
let CLI, CLI2, CLI_LIBRE;
await ok("clients professionnel et particulier", async () => {
  CLI = (await un(insClient, [VENA, "professionnel", "Client Pro", "987654321"])).id;
  CLI2 = (await un(insClient, [VENA, "particulier", "Mme Martin", null])).id;
  CLI_LIBRE = (await un(insClient, [VENA, "particulier", "Client sans document", null])).id;
});
await mustFail("SIREN client mal formé", insClient, [VENA, "professionnel", "X", "12A456789"], "check");
await mustFail("type de client inconnu", insClient, [VENA, "entreprise", "X", null], "check");

// Une facture de 2025, émise AVANT celles de 2026 (chronologie), pour la clôture.
let F25;
await ok("facture de 2025 émise : FAC-2025-0001", async () => {
  F25 = (await un(insFacture, [VENA, CLI, "2025-12-15"])).id;
  await q(insLigneF, [VENA, F25, "Site vitrine", "1", 50000, 0, 50000]);
  egal((await emettre(F25)).rows[0].numero, "FAC-2025-0001");
});
const tx25 = (await insRecette("2025-12-20", 20000)).id;

// ---------- 5. Devis ----------
console.log("\n== Devis ==");
let D1, D2;
await ok("premier devis de 2026 : DEV-2026-001 (numéro envoyé ignoré), statut brouillon", async () => {
  D1 = await un(insDevis, [VENA, CLI, "2026-03-01", "2026-03-31"]);
  egal([D1.numero, D1.statut], ["DEV-2026-001", "brouillon"]);
});
await ok("second devis : DEV-2026-002 ; autre structure : sa propre suite", async () => {
  D2 = await un(insDevis, [VENA, CLI2, "2026-03-02", "2026-04-01"]);
  egal(D2.numero, "DEV-2026-002");
  await comme(B);
  const d = await un(insDevis, [VEA, clientVea, "2026-03-02", "2026-04-01"]);
  await comme(A);
  egal(d.numero, "DEV-2026-001");
});
await mustFail("fin de validité avant la date du devis", insDevis, [VENA, CLI, "2026-03-10", "2026-03-01"], "devis_validite_apres_date");
await mustFail("devis créé directement « accepté »",
  `insert into public.devis (entite_id, client_id, date_devis, date_fin_validite, numero, annee_numero, rang, statut, date_acceptation) values ($1,$2,'2026-03-01','2026-03-31','x',0,1,'accepte','2026-03-02')`, [VENA, CLI], "naît en brouillon");
await ok("lignes : 1,5 × 100,00 € = 150,00 € ; 0,333 × 1,00 € = 0,33 €", async () => {
  await q(insLigneD, [VENA, D1.id, "Développement", "1.5", 10000, 0, 15000]);
  await q(insLigneD, [VENA, D1.id, "Hébergement", "0.333", 100, 0, 33]);
});
await mustFail("ligne de devis au montant faux", insLigneD, [VENA, D1.id, "x", "2", 1000, 0, 2001], "devis_ligne_montant_calcule");
await mustFail("quantité nulle", insLigneD, [VENA, D1.id, "x", "0", 1000, 0, 0], "check");
await mustFail("taux de TVA au-delà de 100 %", insLigneD, [VENA, D1.id, "x", "1", 1000, 10001, 1000], "check");
await mustFail("brouillon → accepté directement", `update public.devis set statut = 'accepte', date_acceptation = '2026-03-05' where id = $1`, [D1.id], "Changement de statut refusé");
await ok("brouillon → envoyé", () => q(`update public.devis set statut = 'envoye' where id = $1`, [D1.id]));
await mustFail("envoyé → accepté SANS date d'acceptation", `update public.devis set statut = 'accepte' where id = $1`, [D1.id], "devis_acceptation_datee");
await mustFail("acceptation qui modifie aussi le contenu", `update public.devis set statut = 'accepte', date_acceptation = '2026-03-05', objet = 'autre' where id = $1`, [D1.id], "ne modifie pas le contenu");
await ok("envoyé → accepté avec la date et le signataire (« Bon pour accord »)", () =>
  q(`update public.devis set statut = 'accepte', date_acceptation = '2026-03-05', signataire_accord = 'M. Client' where id = $1`, [D1.id]));
await mustFail("devis accepté : l'en-tête ne se modifie plus", `update public.devis set objet = 'x' where id = $1`, [D1.id], "ne se modifie plus");
await mustFail("devis accepté : pas de nouvelle ligne", insLigneD, [VENA, D1.id, "x", "1", 100, 0, 100], "ne se modifient plus");
await mustFail("devis accepté : ne se supprime pas", `delete from public.devis where id = $1`, [D1.id], "seul un brouillon");
await ok("devis refusé : figé", async () => {
  await q(`update public.devis set statut = 'envoye' where id = $1`, [D2.id]);
  await q(`update public.devis set statut = 'refuse' where id = $1`, [D2.id]);
});
await mustFail("devis refusé : ne revient pas en brouillon", `update public.devis set statut = 'brouillon' where id = $1`, [D2.id], "ne se modifie plus");

// Transformation : nouveau brouillon de facture, lignes copiées, lien facture_id.
let FD;
await ok("devis accepté → facture BROUILLON sans numéro, lignes copiées, devis lié", async () => {
  FD = (await un(insFacture, [VENA, CLI, null])).id;
  await q(`insert into public.facture_ligne (entite_id, facture_id, position, designation, quantite, unite, prix_unitaire_ht_centimes, taux_tva_centiemes, montant_ht_centimes)
           select entite_id, $2, position, designation, quantite, unite, prix_unitaire_ht_centimes, taux_tva_centiemes, montant_ht_centimes
           from public.devis_ligne where devis_id = $1`, [D1.id, FD]);
  await q(`update public.devis set facture_id = $2 where id = $1`, [D1.id, FD]);
  const f = await lire(FD);
  const d = await un(`select statut, facture_id, objet from public.devis where id = $1`, [D1.id]);
  egal([f.numero, f.statut, d.statut, d.facture_id, Number((await un(`select count(*) from public.facture_ligne where facture_id = $1`, [FD])).count)],
    [null, "brouillon", "accepte", FD, 2]);
});
await mustFail("devis déjà transformé : pas une seconde fois", `update public.devis set facture_id = $2 where id = $1`, [D1.id, factureVea]);
await mustFail("devis refusé : ne se transforme pas", `update public.devis set facture_id = $2 where id = $1`, [D2.id, FD], "seul un devis accepté");
await ok("facture brouillon supprimée : le lien du devis redevient vide, le devis reste accepté", async () => {
  const tmp = (await un(insFacture, [VENA, CLI, null])).id;
  const D3 = await un(insDevis, [VENA, CLI, "2026-03-03", "2026-04-03"]);
  await q(`update public.devis set statut = 'envoye' where id = $1`, [D3.id]);
  await q(`update public.devis set statut = 'accepte', date_acceptation = '2026-03-04' where id = $1`, [D3.id]);
  await q(`update public.devis set facture_id = $2 where id = $1`, [D3.id, tmp]);
  await q(`delete from public.facture where id = $1`, [tmp]);
  const d = await un(`select statut, facture_id from public.devis where id = $1`, [D3.id]);
  egal([d.statut, d.facture_id], ["accepte", null]);
});

// ---------- 6. Facture : numérotation à l'émission ----------
console.log("\n== Facture : numérotation à l'émission ==");
let F1, F2;
await ok("brouillon : aucun numéro, même si le client en envoie un", async () => {
  const r = await un(`insert into public.facture (entite_id, client_id, numero, annee_numero, rang) values ($1,$2,'FAC-2026-0099',2026,99) returning id, numero, rang`, [VENA, CLI]);
  egal([r.numero, r.rang], [null, null]);
  await q(`delete from public.facture where id = $1`, [r.id]);
});
await mustFail("facture créée directement « émise »", `insert into public.facture (entite_id, client_id, statut, date_emission) values ($1,$2,'emise','2026-03-10')`, [VENA, CLI], "naît en brouillon");
await ok("brouillon modifié : il reste sans numéro", async () => {
  F1 = (await un(insFacture, [VENA, CLI, "2026-03-10"])).id;
  await q(`update public.facture set numero = 'FAC-2026-0050', objet = 'Refonte' where id = $1`, [F1]);
  egal((await lire(F1)).numero, null);
});
await mustFail("émission sans ligne refusée", `update public.facture set statut = 'emise' where id = $1`, [F1], "au moins une ligne");
await mustFail("émission sans date refusée", `update public.facture set statut = 'emise' where id = $1`, [FD], "date d'émission");
await ok("totaux : HT arrondi par ligne, TVA arrondie une fois PAR TAUX (3 × 3,33 € à 20 % : TVA 2,00 €, pas 2,01 €)", async () => {
  for (let i = 0; i < 3; i++) await q(insLigneF, [VENA, F1, `Ligne ${i}`, "1", 333, 2000, 333]);
  await q(insLigneF, [VENA, F1, "Livre", "2", 1000, 550, 2000]);
  // Fonction interne (aucun droit pour authenticated) : lue en superutilisateur.
  await db.exec(`reset role;`);
  const t = await un(`select * from public.totaux_facture($1)`, [F1]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  // HT 999 + 2000 = 2999 ; TVA round(999 × 0,20) = 200 + round(2000 × 0,055) = 110.
  egal([Number(t.total_ht), Number(t.total_tva)], [2999, 310]);
});
await ok("émission : FAC-2026-0001, totaux figés", async () => {
  egal((await emettre(F1)).rows[0].numero, "FAC-2026-0001");
  const f = await lire(F1);
  egal([f.statut, Number(f.total_ht_centimes), Number(f.total_tva_centimes), Number(f.total_ttc_centimes)], ["emise", 2999, 310, 3309]);
});
await ok("instantanés vendeur et acheteur pris à l'émission", async () => {
  const f = await lire(F1);
  egal([f.vendeur.siren, f.vendeur.mention_tva, f.acheteur.nom, f.acheteur.siren], ["123456789", "Mention saisie par la structure", "Client Pro", "987654321"]);
});
await ok("brouillon supprimé : il ne laisse aucun trou (FAC-2026-0002 ensuite)", async () => {
  const jetable = (await un(insFacture, [VENA, CLI, "2026-03-11"])).id;
  await q(insLigneF, [VENA, jetable, "x", "1", 100, 0, 100]);
  await q(`delete from public.facture where id = $1`, [jetable]);
  F2 = (await un(insFacture, [VENA, CLI, "2026-03-12"])).id;
  await q(insLigneF, [VENA, F2, "Maintenance", "1", 100000, 0, 100000]);
  egal((await emettre(F2)).rows[0].numero, "FAC-2026-0002");
});
await ok("date d'émission antérieure : refus explicite, et le compteur n'a pas avancé", async () => {
  await q(`update public.facture set date_emission = '2026-03-01' where id = $1`, [FD]);
  let refus = "";
  try {
    await emettre(FD);
  } catch (e) {
    refus = e.message;
  }
  if (!refus.includes("ordre des dates")) throw new Error("refus attendu, obtenu : " + refus);
  await q(`update public.facture set date_emission = '2026-03-15' where id = $1`, [FD]);
  egal((await emettre(FD)).rows[0].numero, "FAC-2026-0003");
});
await ok("structure sans paramètres de facturation : émission refusée, aucun numéro consommé", async () => {
  await comme(B);
  let refus = "";
  try {
    await emettre(factureVea);
  } catch (e) {
    refus = e.message;
  }
  const c = await un(`select count(*)::int as n from public.facture where entite_id = $1 and numero is not null`, [VEA]);
  await comme(A);
  if (!refus.includes("paramètres de facturation")) throw new Error(refus || "émission acceptée");
  egal(c.n, 0);
});
await ok("contraintes uniques (structure, numéro) et (structure, sens, année, rang) en dernier rempart", async () => {
  const r = await un(`select count(*)::int as n from pg_constraint where conname in ('facture_numero_unique','facture_rang_unique') and contype = 'u'`);
  egal(r.n, 2);
});
await ok("au-delà de 9999 : FAC-2030-10000 (lpad ne tronque pas)", async () => {
  await db.exec(`reset role;`);
  await q(`insert into public.facturation_compteur values ($1, 'FAC', 2030, 9999)`, [VENA]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  const f = (await un(insFacture, [VENA, CLI, "2030-01-05"])).id;
  await q(insLigneF, [VENA, f, "x", "1", 100, 0, 100]);
  egal((await emettre(f)).rows[0].numero, "FAC-2030-10000");
  // Remet la chronologie de 2026 en état : on supprime le compteur et la facture en superutilisateur.
  await db.exec(`reset role;`);
  await q(`set session_replication_role = replica`);
  try {
    await q(`delete from public.facture_ligne where facture_id = $1`, [f]);
    await q(`delete from public.facture where id = $1`, [f]);
  } finally {
    await q(`set session_replication_role = origin`);
  }
  await db.exec(`set role authenticated;`);
  await comme(A);
});

// ---------- 7. Verrou d'une facture émise ----------
console.log("\n== Verrou d'une facture émise ==");
let LF1;
LF1 = (await un(`select id from public.facture_ligne where facture_id = $1 limit 1`, [F1])).id;
await mustFail("objet modifié", `update public.facture set objet = 'x' where id = $1`, [F1], "ne se modifie plus");
await mustFail("client changé", `update public.facture set client_id = $2 where id = $1`, [F1, CLI2], "ne se modifie plus");
await mustFail("date d'émission changée", `update public.facture set date_emission = '2026-03-20' where id = $1`, [F1], "ne se modifie plus");
await mustFail("échéance changée", `update public.facture set date_echeance = '2026-05-01' where id = $1`, [F1], "ne se modifie plus");
await mustFail("totaux changés", `update public.facture set total_ttc_centimes = 1 where id = $1`, [F1], "ne se modifie plus");
await mustFail("retour en brouillon", `update public.facture set statut = 'brouillon' where id = $1`, [F1], "ne se modifie plus");
await mustFail("numéro changé", `update public.facture set numero = 'FAC-2026-0009' where id = $1`, [F1], "ne se modifie plus");
await mustFail("ligne modifiée", `update public.facture_ligne set designation = 'x' where id = $1`, [LF1], "ne se modifient plus");
await mustFail("ligne ajoutée", insLigneF, [VENA, F1, "x", "1", 100, 0, 100], "ne se modifient plus");
await mustFail("ligne supprimée", `delete from public.facture_ligne where id = $1`, [LF1], "ne se modifient plus");
await mustFail("facture émise supprimée", `delete from public.facture where id = $1`, [F1], "ne se supprime pas");
await ok("fiche client modifiée après émission : la facture garde l'ancienne adresse", async () => {
  await q(`update public.client_facturation set adresse_facturation = 'Nouvelle adresse' where id = $1`, [CLI]);
  egal((await lire(F1)).acheteur.adresse_facturation, "2 avenue Client, 75000 Paris");
});
await mustFail("client d'une facture émise : ne se supprime pas", `delete from public.client_facturation where id = $1`, [CLI], "facture émise");
await mustFail("client d'un devis seulement : ne se supprime pas non plus", `delete from public.client_facturation where id = $1`, [CLI2], "devis ou des brouillons");
await ok("client jamais utilisé : se supprime", () => q(`delete from public.client_facturation where id = $1`, [CLI_LIBRE]));

// ---------- 8. Avoir ----------
console.log("\n== Avoir ==");
const insAvoir = `insert into public.facture (entite_id, sens, client_id, facture_origine_id, date_emission, objet) values ($1,'avoir',$2,$3,$4,'Avoir') returning id, numero`;
await mustFail("avoir sans facture d'origine", `insert into public.facture (entite_id, sens, client_id) values ($1,'avoir',$2)`, [VENA, CLI], "facture_avoir_origine");
await mustFail("facture « normale » avec une origine", `insert into public.facture (entite_id, client_id, facture_origine_id) values ($1,$2,$3)`, [VENA, CLI, F1], "facture_avoir_origine");
let AV1;
await ok("avoir partiel de F1 en brouillon : sans numéro", async () => {
  AV1 = await un(insAvoir, [VENA, CLI, F1, "2026-03-20"]);
  await q(insLigneF, [VENA, AV1.id, "Remise sur ligne 0", "1", 333, 2000, 333]);
  egal(AV1.numero, null);
});
await ok("avoir émis : AV-2026-0001 (série à part), montants positifs, sens « avoir »", async () => {
  egal((await emettre(AV1.id)).rows[0].numero, "AV-2026-0001");
  const a = await lire(AV1.id);
  egal([a.sens, Number(a.total_ht_centimes), Number(a.total_tva_centimes), Number(a.total_ttc_centimes), a.facture_origine_id], ["avoir", 333, 67, 400, F1]);
});
let F4;
await ok("la série des factures continue sans être touchée par l'avoir (FAC-2026-0004)", async () => {
  F4 = (await un(insFacture, [VENA, CLI, "2026-03-21"])).id;
  await q(insLigneF, [VENA, F4, "Formation", "1", 30000, 0, 30000]);
  egal((await emettre(F4)).rows[0].numero, "FAC-2026-0004");
});
await ok("avoir dépassant le reste : émission refusée, numéro AV non consommé", async () => {
  const a = (await un(insAvoir, [VENA, CLI, F1, "2026-03-22"])).id;
  await q(insLigneF, [VENA, a, "Trop", "1", 3000, 0, 3000]);
  let refus = "";
  try {
    await emettre(a);
  } catch (e) {
    refus = e.message;
  }
  if (!refus.includes("dépasseraient")) throw new Error(refus || "accepté");
  await q(`update public.facture_ligne set prix_unitaire_ht_centimes = 2909, montant_ht_centimes = 2909 where facture_id = $1`, [a]);
  // Reste exact : 3 309 − 400 = 2 909 → avoir total du solde accepté, AV-2026-0002.
  egal((await emettre(a)).rows[0].numero, "AV-2026-0002");
});
await ok("un avoir qui référence un brouillon : refusé à l'émission", async () => {
  const brouillon = (await un(insFacture, [VENA, CLI, "2026-03-25"])).id;
  const a = (await un(insAvoir, [VENA, CLI, brouillon, "2026-03-25"])).id;
  await q(insLigneF, [VENA, a, "x", "1", 100, 0, 100]);
  let refus = "";
  try {
    await emettre(a);
  } catch (e) {
    refus = e.message;
  }
  await q(`delete from public.facture where id = $1`, [a]);
  await q(`delete from public.facture where id = $1`, [brouillon]);
  if (!refus.includes("référence une facture émise")) throw new Error(refus || "accepté");
});
await ok("un avoir pour un autre client que la facture : refusé à l'émission", async () => {
  const a = (await un(insAvoir, [VENA, CLI2, F2, "2026-03-25"])).id;
  await q(insLigneF, [VENA, a, "x", "1", 100, 0, 100]);
  let refus = "";
  try {
    await emettre(a);
  } catch (e) {
    refus = e.message;
  }
  await q(`delete from public.facture where id = $1`, [a]);
  if (!refus.includes("client de la facture")) throw new Error(refus || "accepté");
});
await mustFail("avoir émis : figé comme une facture", `update public.facture set objet = 'x' where id = $1`, [AV1.id], "ne se modifie plus");

// ---------- 9. Encaissements ----------
console.log("\n== Encaissements ==");
const insPaiement = `insert into public.facture_paiement (entite_id, facture_id, transaction_id, montant_centimes) values ($1,$2,$3,$4) returning id`;
// F2 : 1 000,00 € TTC (franchise, TVA 0).
const tx1 = (await insRecette("2026-04-01", 40000)).id;
const tx2 = (await insRecette("2026-04-15", 80000)).id;
let P1;
await ok("encaissement partiel : 400 € sur 1 000 €", async () => {
  P1 = (await un(insPaiement, [VENA, F2, tx1, 40000])).id;
});
await mustFail("dépassement du TTC : 400 + 700 > 1 000 refusé", insPaiement, [VENA, F2, tx2, 70000], "dépasserait le TTC");
await ok("complément : 600 € → somme affectée = TTC", async () => {
  await q(insPaiement, [VENA, F2, tx2, 60000]);
  const r = await un(`select sum(montant_centimes)::int as s from public.facture_paiement where facture_id = $1`, [F2]);
  egal(r.s, 100000);
});
await mustFail("le reste de l'opération (200 €) ne peut pas encaisser 300 € ailleurs", insPaiement, [VENA, F4, tx2, 30000], "reste de l'opération");
await ok("le reste de l'opération encaisse une autre facture (150,33 € sur FAC-2026-0003)", () => q(insPaiement, [VENA, FD, tx2, 15033]));
await ok("une dépense est refusée", async () => {
  const dep = (await insRecette("2026-04-02", 5000, "depense")).id;
  let refus = "";
  try {
    await q(insPaiement, [VENA, FD, dep, 100]);
  } catch (e) {
    refus = e.message;
  }
  if (!refus.includes("recette réelle")) throw new Error(refus || "acceptée");
});
await ok("une jambe de virement interne est refusée", async () => {
  const compte = (await un(`insert into public.compte_tresorerie (entite_id, nom, nature) values ($1,'Courant','courant') returning id`, [VENA])).id;
  const vir = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, virement_id)
                         values ($1,'recette','validee','2026-04-02','VIR INTERNE', 5000, $2, '44444444-4444-4444-8444-444444444444') returning id`, [VENA, compte])).id;
  let refus = "";
  try {
    await q(insPaiement, [VENA, FD, vir, 100]);
  } catch (e) {
    refus = e.message;
  }
  if (!refus.includes("recette réelle")) throw new Error(refus || "acceptée");
});
await ok("un brouillon n'est pas encaissé", async () => {
  const b = (await un(insFacture, [VENA, CLI, null])).id;
  const t = (await insRecette("2026-04-03", 100)).id;
  let refus = "";
  try {
    await q(insPaiement, [VENA, b, t, 100]);
  } catch (e) {
    refus = e.message;
  }
  await q(`delete from public.facture where id = $1`, [b]);
  if (!refus.includes("facture émise")) throw new Error(refus || "accepté");
});
await mustFail("un avoir n'est pas encaissé", insPaiement, [VENA, AV1.id, tx1, 1], "facture émise");
await mustFail("un rattachement ne se modifie pas", `update public.facture_paiement set montant_centimes = 1 where id = $1`, [P1], "ne se modifie pas");
await mustFail("l'opération qui encaisse ne baisse pas sous le montant affecté", `update public.transaction set montant_ttc_centimes = 100 where id = $1`, [tx1], "encaisse une ou plusieurs factures");
await mustFail("l'opération qui encaisse ne devient pas une dépense", `update public.transaction set type = 'depense' where id = $1`, [tx1], "encaisse une ou plusieurs factures");
await mustFail("l'opération qui encaisse ne se supprime pas", `delete from public.transaction where id = $1`, [tx1], "facture_paiement_transaction_meme_entite");
await ok("l'opération qui encaisse reste modifiable ailleurs (libellé)", () => q(`update public.transaction set libelle = 'VIR CLIENT PRO' where id = $1`, [tx1]));
await ok("retirer un rattachement puis le refaire", async () => {
  await q(`delete from public.facture_paiement where id = $1`, [P1]);
  P1 = (await un(insPaiement, [VENA, F2, tx1, 40000])).id;
});
await ok("la facture n'est PAS une recette : aucune opération créée par l'émission ni par l'encaissement", async () => {
  const r = await un(`select count(*)::int as n from public.transaction where entite_id = $1 and type = 'recette'`, [VENA]);
  egal(r.n, 5); // tx25, tx1, tx2, le virement et la recette du test « brouillon », toutes saisies ici
});

// ---------- 10. Cloisonnement ----------
console.log("\n== Cloisonnement ==");
await mustFail("facture VENA pour un client VEA", insFacture, [VENA, clientVea, "2026-03-01"], "facture_client_meme_entite");
await mustFail("devis VENA pour un client VEA", insDevis, [VENA, clientVea, "2026-03-01", "2026-03-31"], "devis_client_meme_entite");
await mustFail("ligne VENA vers une facture VEA", insLigneF, [VENA, factureVea, "x", "1", 100, 0, 100], "facture_ligne_meme_entite");
await mustFail("avoir VENA d'une facture VEA", insAvoir, [VENA, CLI, factureVea, "2026-03-01"], "facture_origine_meme_entite");
await mustFail("encaissement VENA par une opération VEA", insPaiement, [VENA, F4, txVea, 100], "introuvable");
await mustFail("encaissement VEA d'une facture VENA", insPaiement, [VEA, F4, txVea, 100], "introuvable");
await ok("inconnu (B) : ne voit ni clients, ni devis, ni factures, ni lignes, ni encaissements, ni paramètres de VENA", async () => {
  await comme(B);
  const r = await un(`select (select count(*)::int from public.client_facturation where entite_id = $1)
                           + (select count(*)::int from public.devis where entite_id = $1)
                           + (select count(*)::int from public.devis_ligne where entite_id = $1)
                           + (select count(*)::int from public.facture where entite_id = $1)
                           + (select count(*)::int from public.facture_ligne where entite_id = $1)
                           + (select count(*)::int from public.facture_paiement where entite_id = $1)
                           + (select count(*)::int from public.facturation_parametres where entite_id = $1) as n`, [VENA]);
  await comme(A);
  egal(r.n, 0);
});
await ok("inconnu (B) : sa modification d'un brouillon VENA ne touche aucune ligne", async () => {
  const b = (await un(insFacture, [VENA, CLI, null])).id;
  await comme(B);
  const r = await q(`update public.facture set objet = 'piraté' where id = $1`, [b]);
  await comme(A);
  egal(r.affectedRows ?? 0, 0);
  await q(`delete from public.facture where id = $1`, [b]);
});

// ---------- 11. Lecteur ----------
console.log("\n== Lecteur : lit, n'écrit rien ==");
await ok("le lecteur voit les clients, devis et factures", async () => {
  await comme(D);
  const r = await un(`select (select count(*)::int from public.facture where entite_id = $1) as f,
                             (select count(*)::int from public.devis where entite_id = $1) as d,
                             (select count(*)::int from public.client_facturation where entite_id = $1) as c`, [VENA]);
  await comme(A);
  if (!(r.f > 0 && r.d > 0 && r.c > 0)) throw new Error(JSON.stringify(r));
});
async function lecteurRefuse(label, sql, params) {
  await comme(D);
  try {
    const r = await q(sql, params);
    // Un UPDATE ou DELETE filtré par la RLS ne lève pas d'erreur : 0 ligne touchée.
    if ((r.affectedRows ?? 0) === 0 && !/^\s*insert/i.test(sql)) {
      pass++;
      console.log("  PASS  " + label + " (0 ligne touchée)");
      return;
    }
    fail++;
    console.log("  FAIL  " + label + " -> le lecteur a pu écrire");
  } catch (e) {
    pass++;
    console.log("  PASS  " + label + " (refusée : " + e.message.split("\n")[0] + ")");
  } finally {
    await comme(A);
  }
}
const brouillonLecteur = (await un(insFacture, [VENA, CLI, "2026-04-20"])).id;
await q(insLigneF, [VENA, brouillonLecteur, "Prestation", "1", 1000, 0, 1000]);
const ligneLecteur = (await un(`select id from public.facture_ligne where facture_id = $1`, [brouillonLecteur])).id;
const t3 = (await insRecette("2026-04-21", 1000)).id;
await lecteurRefuse("lecteur : modifier les paramètres vendeur", `update public.facturation_parametres set denomination = 'x' where entite_id = $1`, [VENA]);
await lecteurRefuse("lecteur : créer un client", insClient, [VENA, "particulier", "x", null]);
await lecteurRefuse("lecteur : modifier un client", `update public.client_facturation set nom = 'x' where id = $1`, [CLI]);
await lecteurRefuse("lecteur : créer un devis", insDevis, [VENA, CLI, "2026-05-01", "2026-05-31"]);
await lecteurRefuse("lecteur : ajouter une ligne de devis", insLigneD, [VENA, D1.id, "x", "1", 100, 0, 100]);
await lecteurRefuse("lecteur : créer une facture", insFacture, [VENA, CLI, null]);
await lecteurRefuse("lecteur : modifier un brouillon", `update public.facture set objet = 'x' where id = $1`, [brouillonLecteur]);
await lecteurRefuse("lecteur : ÉMETTRE un brouillon", `update public.facture set statut = 'emise' where id = $1`, [brouillonLecteur]);
await lecteurRefuse("lecteur : supprimer un brouillon", `delete from public.facture where id = $1`, [brouillonLecteur]);
await lecteurRefuse("lecteur : ajouter une ligne de facture", insLigneF, [VENA, brouillonLecteur, "x", "1", 100, 0, 100]);
await lecteurRefuse("lecteur : modifier une ligne", `update public.facture_ligne set designation = 'x' where id = $1`, [ligneLecteur]);
await lecteurRefuse("lecteur : rattacher un encaissement", insPaiement, [VENA, FD, t3, 100]);
await lecteurRefuse("lecteur : retirer un encaissement", `delete from public.facture_paiement where id = $1`, [P1]);
await lecteurRefuse("lecteur : écrire dans le compteur", `update public.facturation_compteur set dernier = 1`, []);
await ok("le refus du lecteur n'a consommé aucun numéro : le brouillon s'émet en FAC-2026-0005", async () => {
  egal((await emettre(brouillonLecteur)).rows[0].numero, "FAC-2026-0005");
});
await ok("le trésorier, lui, écrit et émet", async () => {
  await comme(C);
  const f = (await un(insFacture, [VENA, CLI, "2026-04-22"])).id;
  await q(insLigneF, [VENA, f, "Audit", "1", 5000, 0, 5000]);
  const n = (await emettre(f)).rows[0].numero;
  await comme(A);
  egal(n, "FAC-2026-0006");
});
await ok("série FAC de 2026 continue : 0001 à 0006, sans trou", async () => {
  const r = (await q(`select rang from public.facture where entite_id = $1 and sens = 'facture' and annee_numero = 2026 order by rang`, [VENA])).rows;
  egal(r.map((x) => x.rang), [1, 2, 3, 4, 5, 6]);
});

// ---------- 12. Verrou de clôture ----------
console.log("\n== Clôture ==");
const D25 = await un(insDevis, [VENA, CLI, "2025-12-01", "2025-12-31"]);
const F25b = (await un(insFacture, [VENA, CLI, "2025-12-20"])).id;
await db.exec(`reset role;`);
await q(`insert into public.cloture_exercice (entite_id, exercice, motif, instantane, signature) values ($1, 2025, 'Essai', '{}', '0|0|0')`, [VENA]);
await db.exec(`set role authenticated;`);
await comme(A);
const MSG = "Exercice 2025 clôturé";
await mustFail("créer un devis daté de 2025", insDevis, [VENA, CLI, "2025-06-01", "2025-06-30"], MSG);
await mustFail("modifier un devis de 2025", `update public.devis set objet = 'x' where id = $1`, [D25.id], MSG);
await mustFail("ajouter une ligne à un devis de 2025", insLigneD, [VENA, D25.id, "x", "1", 100, 0, 100], MSG);
await mustFail("supprimer un devis de 2025", `delete from public.devis where id = $1`, [D25.id], MSG);
const D26 = await un(insDevis, [VENA, CLI, "2026-06-01", "2026-06-30"]);
await mustFail("déplacer un devis de 2026 vers 2025", `update public.devis set date_devis = '2025-12-01', date_fin_validite = '2025-12-31' where id = $1`, [D26.id], MSG);
await mustFail("créer une facture datée de 2025", insFacture, [VENA, CLI, "2025-12-30"], MSG);
await mustFail("modifier un brouillon daté de 2025", `update public.facture set objet = 'x' where id = $1`, [F25b], MSG);
await mustFail("ajouter une ligne à un brouillon daté de 2025", insLigneF, [VENA, F25b, "x", "1", 100, 0, 100], MSG);
await ok("redater un brouillon de 2026 en 2025 : refusé", async () => {
  const b = (await un(insFacture, [VENA, CLI, "2026-05-01"])).id;
  let refus = "";
  try {
    await q(`update public.facture set date_emission = '2025-12-31' where id = $1`, [b]);
  } catch (e) {
    refus = e.message;
  }
  await q(`delete from public.facture where id = $1`, [b]);
  if (!refus.includes(MSG)) throw new Error(refus || "accepté");
});
await mustFail("rattacher une recette datée de 2025", insPaiement, [VENA, F25, tx25, 10000], MSG);
await ok("facture de 2025 encaissée par une recette de 2026 : acceptée (datée de l'opération)", async () => {
  const t = (await insRecette("2026-01-10", 50000)).id;
  await q(insPaiement, [VENA, F25, t, 50000]);
});
await ok("réouverture de 2025 : le devis redevient modifiable", async () => {
  await q(`select public.rouvrir_exercice($1, 2025, 'Correction d''un devis')`, [VENA]);
  await q(`update public.devis set objet = 'Corrigé' where id = $1`, [D25.id]);
});

// ---------- 13. Suppression d'une structure ----------
console.log("\n== Suppression d'une structure ==");
await ok("supprimer VENA emporte paramètres, clients, devis, factures émises, avoirs, encaissements et compteur", async () => {
  await q(`delete from public.entite where id = $1`, [VENA]);
  await db.exec(`reset role;`);
  const r = await un(`select (select count(*)::int from public.facture where entite_id = $1)
                           + (select count(*)::int from public.facture_ligne where entite_id = $1)
                           + (select count(*)::int from public.devis where entite_id = $1)
                           + (select count(*)::int from public.client_facturation where entite_id = $1)
                           + (select count(*)::int from public.facture_paiement where entite_id = $1)
                           + (select count(*)::int from public.facturation_parametres where entite_id = $1)
                           + (select count(*)::int from public.facturation_compteur where entite_id = $1) as n`, [VENA]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  egal(r.n, 0);
});

console.log(`\n========= RÉSULTAT : ${pass} PASS / ${fail} FAIL =========`);
process.exit(fail === 0 ? 0 : 1);
