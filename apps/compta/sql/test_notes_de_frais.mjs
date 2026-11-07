/**
 * Tests de la migration 12 (notes de frais et IK) sur un vrai moteur Postgres
 * (PGlite, Postgres compilé en WASM, rien d'autre à installer).
 *
 * Lancer depuis apps/compta :   node sql/test_notes_de_frais.mjs
 *
 * Mise en place copiée de test_cloture.mjs : schéma auth simulé, 01 et 02,
 * rôles et « grant all », puis 06, 07, 08, 09, 10 et 12 chargées APRÈS ce
 * « grant all », comme en production (un GRANT oublié dans la 12 ferait
 * échouer les tests de droits).
 *
 * Ce que ça prouve :
 *   1. numérotation : NDF-AAAA-NNN attribué par la base, unique, une suite
 *      par année et par structure, valeur envoyée par le client ignorée,
 *      plusieurs créations dans la même requête, numéro immuable ;
 *   2. cloisonnement : une ligne ne peut pointer ni la note, ni la catégorie,
 *      ni l'opération, ni le trajet d'une autre structure ; un inconnu ne voit
 *      rien ;
 *   3. un lecteur lit mais n'écrit rien (ni note, ni ligne, ni trajet, ni
 *      compteur) ; anon n'a aucun droit ;
 *   4. les CHECK : montants, montant IK = km × taux arrondi, retour jamais
 *      doublé, origine cohérente, remboursée sans opération réelle refusée,
 *      abandon sans renonciation refusé, transitions interdites, note réglée
 *      figée, lien unique vers une opération ;
 *   5. le verrou de clôture sur les trois tables, avec l'exception motivée du
 *      règlement daté d'un exercice ouvert.
 *
 * Limite assumée : PGlite n'a qu'une connexion, on ne peut pas lancer deux
 * transactions en parallèle. La sûreté face à deux créations simultanées
 * vient du verrou de ligne pris par « insert ... on conflict do update » sur
 * le compteur (la seconde transaction attend la première) ; ici on prouve
 * l'unicité, la suite sans trou et la contrainte unique de dernier rempart.
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
for (const f of ["06_tresorerie_associative.sql", "07_droits_tresorerie.sql", "08_subventions_benevolat.sql", "09_membres_roles.sql", "10_cloture.sql", "12_notes_de_frais.sql"]) {
  await charger(f);
}

// ---------- 2. Jeu de données ----------
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // propriétaire de VEA
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // propriétaire de VENA, inconnu de VEA
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // trésorier de VEA
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // lecteur de VEA
await q(`insert into auth.users values ($1,'clavel@velito.fr'),($2,'autre@test.fr'),($3,'tresorier@test.fr'),($4,'lecteur@test.fr')`, [A, B, C, D]);
await db.exec(`set role authenticated;`);

await comme(B);
const VENA = (await un(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'VENA','societe') returning id`, [B])).id;
const catVena = (await un(`insert into public.categorie (entite_id, nom, type) values ($1,'Divers','depense') returning id`, [VENA])).id;
const txVena = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes)
                          values ($1,'depense','a_classer','2026-03-01','CB VENA', 1000) returning id`, [VENA])).id;
const noteVena = (await un(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note) values ($1,'Bob','Salon','2026-03-01') returning id, numero`, [VENA]));
const trajetVena = (await un(`insert into public.trajet_ik (entite_id, beneficiaire, date_trajet, depart, arrivee, motif, distance_km, taux_km_dixmillimes, montant_centimes)
                              values ($1,'Bob','2026-03-01','Paris','Lille','Salon', 100, 5000, 5000) returning id`, [VENA])).id;

await comme(A);
const VEA = (await un(`insert into public.entite (proprietaire_id, nom, type_juridique) values ($1,'VEA','association') returning id`, [A])).id;
await q(`select public.ajouter_membre_entite($1,'tresorier@test.fr','tresorier')`, [VEA]);
await q(`select public.ajouter_membre_entite($1,'lecteur@test.fr','lecteur')`, [VEA]);
const catDepl = (await un(`insert into public.categorie (entite_id, nom, type) values ($1,'Frais de déplacement','depense') returning id`, [VEA])).id;
const courant = (await un(`insert into public.compte_tresorerie (entite_id, nom, nature) values ($1,'Courant','courant') returning id`, [VEA])).id;
const avances = (await un(`insert into public.compte_tresorerie (entite_id, nom, nature) values ($1,'Avances des membres','autre') returning id`, [VEA])).id;
// Ticket importé sans compte (payé par la carte d'un membre).
const ticket = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, source_cle)
                          values ($1,'depense','a_classer','2026-02-10','CB LEROY MERLIN', 4590, 'releve-cm:x1') returning id`, [VEA])).id;

const nouvelleNote = async (date = "2026-02-15", entite = VEA, extra = "") =>
  un(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note${extra ? ", numero" : ""})
      values ($1,'Anthony','Tournoi de février',$2${extra ? ", $3" : ""}) returning id, numero, statut`, extra ? [entite, date, extra] : [entite, date]);

// ---------- 3. Droits ----------
console.log("\n== Droits ==");
await ok("authenticated : select, insert, update, delete sur les trois tables", async () => {
  const r = await un(`select bool_and(has_table_privilege('authenticated', t, p)) as tous
                      from unnest(array['public.note_frais','public.note_frais_ligne','public.trajet_ik']) as t,
                           unnest(array['select','insert','update','delete']) as p`);
  egal(r.tous, true);
});
await ok("anon : aucun droit ; compteur : aucun droit pour personne", async () => {
  const r = await un(`select bool_or(has_table_privilege('anon', t, p)) as anon,
                             bool_or(has_table_privilege('authenticated', 'public.note_frais_compteur', p)) as compteur
                      from unnest(array['public.note_frais','public.note_frais_ligne','public.trajet_ik','public.note_frais_compteur']) as t,
                           unnest(array['select','insert','update','delete']) as p`);
  egal([r.anon, r.compteur], [false, false]);
});
await ok("4 règles RLS par table", async () => {
  const r = (await q(`select tablename, count(*)::int as n from pg_policies where tablename in ('note_frais','note_frais_ligne','trajet_ik') group by tablename order by tablename`)).rows;
  egal(r.map((x) => x.n), [4, 4, 4]);
});

// ---------- 4. Numérotation ----------
console.log("\n== Numérotation ==");
let N1, N2;
await ok("première note de 2026 : NDF-2026-001, statut brouillon", async () => {
  N1 = await nouvelleNote();
  egal([N1.numero, N1.statut], ["NDF-2026-001", "brouillon"]);
});
await ok("numéro envoyé par le client ignoré : la base attribue NDF-2026-002", async () => {
  N2 = await nouvelleNote("2026-02-20", VEA, "NDF-2026-999");
  egal(N2.numero, "NDF-2026-002");
});
await ok("cinq créations dans la MÊME requête : cinq numéros distincts qui se suivent", async () => {
  const r = (await q(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note)
                      select $1, 'Lot ' || g, 'Essai', '2026-04-01' from generate_series(1, 5) g returning numero`, [VEA])).rows;
  egal(r.map((x) => x.numero).sort(), ["NDF-2026-003", "NDF-2026-004", "NDF-2026-005", "NDF-2026-006", "NDF-2026-007"]);
});
await ok("autre année : nouvelle suite NDF-2025-001", async () => egal((await nouvelleNote("2025-12-01")).numero, "NDF-2025-001"));
await ok("autre structure : sa propre suite (VENA a NDF-2026-001 elle aussi)", () => egal(noteVena.numero, "NDF-2026-001"));
await ok("insertion refusée (CHECK) : le compteur n'avance pas, aucun trou", async () => {
  try {
    await q(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note) values ($1,'  ','x','2026-05-01')`, [VEA]);
  } catch {
    /* attendu */
  }
  egal((await nouvelleNote("2026-05-02")).numero, "NDF-2026-008");
});
await mustFail("numéro immuable", `update public.note_frais set numero = 'NDF-2026-050' where id = $1`, [N1.id], "ne se modifient pas");
await mustFail("rang immuable", `update public.note_frais set rang = 2 where id = $1`, [N1.id], "ne se modifient pas");
await ok("contrainte unique (entite_id, numero) présente en dernier rempart", async () => {
  const r = await un(`select count(*)::int as n from pg_constraint where conname = 'note_frais_numero_unique' and contype = 'u'`);
  egal(r.n, 1);
});
await ok("au-delà de 999 : NDF-2030-1000 (lpad ne tronque pas)", async () => {
  await db.exec(`reset role;`);
  await q(`insert into public.note_frais_compteur values ($1, 2030, 999)`, [VEA]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  egal((await nouvelleNote("2030-01-05")).numero, "NDF-2030-1000");
});

// ---------- 5. Lignes, CHECK et cloisonnement ----------
console.log("\n== Lignes et CHECK ==");
const insLigne = `insert into public.note_frais_ligne (entite_id, note_id, origine, date_depense, libelle, categorie_id, montant_ttc_centimes, transaction_id, trajet_id)
                  values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`;
let L1, LOP;
await ok("ligne libre acceptée", async () => {
  L1 = (await un(insLigne, [VEA, N1.id, "saisie", "2026-02-12", "Péage A16", catDepl, 870, null, null])).id;
});
await ok("ligne liée au ticket importé sans compte acceptée", async () => {
  LOP = (await un(insLigne, [VEA, N1.id, "operation", "2026-02-10", "CB LEROY MERLIN", null, 4590, ticket, null])).id;
});
await mustFail("montant nul", insLigne, [VEA, N1.id, "saisie", "2026-02-12", "x", null, 0, null, null], "check");
await mustFail("libellé vide", insLigne, [VEA, N1.id, "saisie", "2026-02-12", "   ", null, 100, null, null], "check");
await mustFail("origine « operation » sans opération", insLigne, [VEA, N1.id, "operation", "2026-02-12", "x", null, 100, null, null], "ligne_origine_coherente");
await mustFail("origine « ik » sans trajet", insLigne, [VEA, N1.id, "ik", "2026-02-12", "x", null, 100, null, null], "ligne_origine_coherente");
await mustFail("même opération dans une seconde note", insLigne, [VEA, N2.id, "operation", "2026-02-10", "x", null, 4590, ticket, null], "déjà dans une autre note");
await mustFail("cloisonnement : ligne VEA vers une note VENA", insLigne, [VEA, noteVena.id, "saisie", "2026-02-12", "x", null, 100, null, null], "ligne_note_meme_entite");
await mustFail("cloisonnement : catégorie VENA", insLigne, [VEA, N1.id, "saisie", "2026-02-12", "x", catVena, 100, null, null], "ligne_categorie_meme_entite");
await mustFail("cloisonnement : opération VENA", insLigne, [VEA, N1.id, "operation", "2026-02-12", "x", null, 1000, txVena, null], "ligne_transaction_meme_entite");
await mustFail("cloisonnement : trajet VENA", insLigne, [VEA, N1.id, "ik", "2026-02-12", "x", null, 5000, null, trajetVena], "ligne_trajet_meme_entite");
await mustFail("cloisonnement : note de remboursement liée à une opération VENA",
  `update public.note_frais set transaction_remboursement_id = $2 where id = $1`, [N1.id, txVena], "note_frais_remboursement_meme_entite");
await mustFail("cloisonnement : correction d'une note VENA",
  `update public.note_frais set correction_de = $2 where id = $1`, [N2.id, noteVena.id], "note_frais_correction_meme_entite");
await ok("inconnu (B) : ne voit ni les notes, ni les lignes, ni les trajets de VEA", async () => {
  await comme(B);
  const r = await un(`select (select count(*)::int from public.note_frais where entite_id = $1) as n,
                             (select count(*)::int from public.note_frais_ligne where entite_id = $1) as l,
                             (select count(*)::int from public.trajet_ik where entite_id = $1) as t`, [VEA]);
  await comme(A);
  egal([r.n, r.l, r.t], [0, 0, 0]);
});
await ok("inconnu (B) : sa modification d'une note VEA ne touche aucune ligne", async () => {
  await comme(B);
  const r = await q(`update public.note_frais set objet = 'piraté' where id = $1`, [N1.id]);
  await comme(A);
  egal(r.affectedRows ?? 0, 0);
  egal((await un(`select objet from public.note_frais where id = $1`, [N1.id])).objet, "Tournoi de février");
});

// ---------- 6. IK ----------
console.log("\n== Indemnités kilométriques ==");
const insTrajet = `insert into public.trajet_ik (entite_id, beneficiaire, date_trajet, depart, arrivee, motif, distance_km, aller_retour, taux_km_dixmillimes, montant_centimes)
                   values ($1,'Anthony',$2,'Amiens','Lille','Tournoi',$3,$4,$5,$6) returning id`;
let T1, T2;
await ok("12,35 km à 0,6360 €/km = 7,85 € (arrondi au centime)", async () => {
  T1 = (await un(insTrajet, [VEA, "2026-02-14", "12.35", false, 6360, 785])).id;
});
await ok("aller-retour coché, 230 km réels : 230 × 0,321 = 73,83 €, distance NON doublée", async () => {
  T2 = (await un(insTrajet, [VEA, "2026-02-14", "230", true, 3210, 7383])).id;
  egal(Number((await un(`select distance_km from public.trajet_ik where id = $1`, [T2])).distance_km), 230);
});
await mustFail("aller-retour : un montant calculé sur le double (460 km) est refusé", insTrajet, [VEA, "2026-02-14", "230", true, 3210, 14766], "trajet_ik_montant_calcule");
await mustFail("montant faux d'un centime", insTrajet, [VEA, "2026-02-14", "12.35", false, 6360, 786], "trajet_ik_montant_calcule");
await mustFail("taux absent (aucun défaut inventé)", `insert into public.trajet_ik (entite_id, beneficiaire, date_trajet, depart, arrivee, motif, distance_km, montant_centimes)
  values ($1,'Anthony','2026-02-14','Amiens','Lille','x', 10, 100)`, [VEA], "taux_km_dixmillimes");
await mustFail("distance nulle", insTrajet, [VEA, "2026-02-14", "0", false, 6360, 1], "check");
await mustFail("trajet arrondi à 0 centime refusé", insTrajet, [VEA, "2026-02-14", "0.01", false, 1, 0], "check");
let LIK;
await ok("trajet rattaché : ligne d'origine « ik »", async () => {
  LIK = (await un(insLigne, [VEA, N1.id, "ik", "2026-02-14", "Trajet Amiens → Lille (Tournoi)", catDepl, 785, null, T1])).id;
});
await mustFail("même trajet dans une seconde note", insLigne, [VEA, N2.id, "ik", "2026-02-14", "x", catDepl, 785, null, T1], "déjà rattaché");
await ok("trajet modifié : sa ligne IK suit (note en brouillon)", async () => {
  await q(`update public.trajet_ik set distance_km = 20, montant_centimes = 1272 where id = $1`, [T1]);
  egal(Number((await un(`select montant_ttc_centimes from public.note_frais_ligne where id = $1`, [LIK])).montant_ttc_centimes), 1272);
});

// ---------- 7. Lecteur ----------
console.log("\n== Lecteur : lit, n'écrit rien ==");
await ok("le lecteur voit les notes, les lignes et les trajets", async () => {
  await comme(D);
  const r = await un(`select (select count(*)::int from public.note_frais where entite_id = $1) as n,
                             (select count(*)::int from public.note_frais_ligne where entite_id = $1) as l,
                             (select count(*)::int from public.trajet_ik where entite_id = $1) as t`, [VEA]);
  await comme(A);
  if (!(r.n > 0 && r.l === 3 && r.t === 2)) throw new Error(JSON.stringify(r));
});
const commeLecteur = (sql, params) => async () => {
  await comme(D);
  try {
    return await q(sql, params);
  } finally {
    await comme(A);
  }
};
async function lecteurRefuse(label, sql, params) {
  try {
    const r = await commeLecteur(sql, params)();
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
  }
}
const avantLecteur = (await un(`select last_value from (select max(rang) as last_value from public.note_frais where entite_id = $1 and annee_numero = 2026) x`, [VEA])).last_value;
await lecteurRefuse("lecteur : créer une note", `insert into public.note_frais (entite_id, beneficiaire, objet, date_note) values ($1,'x','x','2026-06-01')`, [VEA]);
await lecteurRefuse("lecteur : modifier une note", `update public.note_frais set objet = 'x' where id = $1`, [N1.id]);
await lecteurRefuse("lecteur : supprimer une note", `delete from public.note_frais where id = $1`, [N2.id]);
await lecteurRefuse("lecteur : ajouter une ligne", insLigne, [VEA, N1.id, "saisie", "2026-02-12", "x", null, 100, null, null]);
await lecteurRefuse("lecteur : modifier une ligne", `update public.note_frais_ligne set montant_ttc_centimes = 1 where id = $1`, [L1]);
await lecteurRefuse("lecteur : supprimer une ligne", `delete from public.note_frais_ligne where id = $1`, [L1]);
await lecteurRefuse("lecteur : créer un trajet", insTrajet, [VEA, "2026-02-14", "10", false, 1000, 100]);
await lecteurRefuse("lecteur : modifier un trajet", `update public.trajet_ik set motif = 'x' where id = $1`, [T1]);
await lecteurRefuse("lecteur : écrire dans le compteur", `update public.note_frais_compteur set dernier = 1`, []);
await ok("le refus du lecteur n'a consommé aucun numéro", async () => {
  egal((await nouvelleNote("2026-06-02")).numero, `NDF-2026-${String(avantLecteur + 1).padStart(3, "0")}`);
});
await ok("le trésorier, lui, écrit", async () => {
  await comme(C);
  const r = await un(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note) values ($1,'Inès','Achat maillots','2026-06-03') returning numero`, [VEA]);
  await comme(A);
  if (!r.numero.startsWith("NDF-2026-")) throw new Error(r.numero);
});

// ---------- 8. Cycle de vie ----------
console.log("\n== Cycle de vie ==");
const statut = (id, s, extra = "") => q(`update public.note_frais set statut = '${s}'${extra} where id = $1`, [id]);
await mustFail("brouillon → validée directement", `update public.note_frais set statut = 'validee' where id = $1`, [N1.id], "Changement de statut refusé");
await mustFail("brouillon → remboursée", `update public.note_frais set statut = 'remboursee' where id = $1`, [N1.id]);
await ok("brouillon → à vérifier → validée", async () => {
  await statut(N1.id, "a_verifier");
  // La validation écrit d'abord ses liens de ligne (note encore « à vérifier »).
  await q(`update public.note_frais_ligne set categorie_id = $2 where id = $1`, [LOP, catDepl]);
  await statut(N1.id, "validee");
});
await mustFail("note validée : ses lignes ne se modifient plus", `update public.note_frais_ligne set montant_ttc_centimes = 1 where id = $1`, [LOP], "ne se modifient plus");
await mustFail("note validée : pas de nouvelle ligne", insLigne, [VEA, N1.id, "saisie", "2026-02-12", "x", null, 100, null, null], "ne se modifient plus");
await mustFail("note validée : l'en-tête ne se modifie plus", `update public.note_frais set objet = 'x' where id = $1`, [N1.id], "seuls le remboursement");
await mustFail("note validée : ne se supprime pas", `delete from public.note_frais where id = $1`, [N1.id], "ne se supprime pas");
await mustFail("note validée : son trajet ne se modifie plus", `update public.trajet_ik set motif = 'x' where id = $1`, [T1], "ne se modifie plus");
await mustFail("note validée : l'opération liée ne se supprime plus", `delete from public.transaction where id = $1`, [ticket], "ne se modifient plus");
await mustFail("remboursée SANS opération bancaire réelle : refusée", `update public.note_frais set statut = 'remboursee' where id = $1`, [N1.id], "note_frais_remboursement_reel");
await mustFail("abandonnée sans date de renonciation : refusée", `update public.note_frais set statut = 'abandonnee' where id = $1`, [N1.id], "note_frais_abandon_complet");

// Opération bancaire réelle (relevé) devenue virement interne courant → avances.
const VIR = "22222222-2222-4222-8222-222222222222";
const remb = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, virement_id)
                         values ($1,'depense','validee','2026-03-05','VIR REMBOURSEMENT ANTHONY', 6732, $2, $3) returning id`, [VEA, courant, VIR])).id;
await mustFail("règlement qui change aussi le contenu : refusé",
  `update public.note_frais set statut = 'remboursee', transaction_remboursement_id = $2, virement_id = $3, objet = 'autre' where id = $1`, [N1.id, remb, VIR], "ne modifie pas le contenu");
await ok("validée → remboursée avec l'opération bancaire réelle", () =>
  q(`update public.note_frais set statut = 'remboursee', transaction_remboursement_id = $2, virement_id = $3 where id = $1`, [N1.id, remb, VIR]));
await mustFail("note remboursée : figée", `update public.note_frais set commentaire = 'x' where id = $1`, [N1.id], "ne se modifie plus");
await mustFail("note remboursée : l'opération de remboursement ne se supprime pas", `delete from public.transaction where id = $1`, [remb], "note_frais_remboursement_meme_entite");
await ok("correction : nouveau brouillon lié à l'original, l'original reste", async () => {
  const c = await un(`insert into public.note_frais (entite_id, beneficiaire, objet, date_note, correction_de) values ($1,'Anthony','Tournoi de février (correction)','2026-02-15',$2) returning statut`, [VEA, N1.id]);
  egal(c.statut, "brouillon");
  egal((await un(`select statut from public.note_frais where id = $1`, [N1.id])).statut, "remboursee");
});

// Abandon : fiche frais abandonnés, aucune opération créée.
let NA;
await ok("abandon : validée → abandonnée avec renonciation datée et fiche de don", async () => {
  NA = await nouvelleNote("2026-03-10");
  await q(insLigne, [VEA, NA.id, "saisie", "2026-03-10", "Goûter", null, 1500, null, null]);
  await statut(NA.id, "a_verifier");
  await statut(NA.id, "validee");
  const cn = (await un(`insert into public.contribution_nature (entite_id, type, date_contribution, libelle, valeur_centimes, date_renonciation, source, source_cle)
                        values ($1,'frais_abandonnes','2026-03-20','Frais abandonnés NDF', 1500, '2026-03-20', 'notes-de-frais', $2) returning id`, [VEA, "ndf:" + NA.id])).id;
  await q(`update public.note_frais set statut = 'abandonnee', date_renonciation = '2026-03-20', contribution_id = $2 where id = $1`, [NA.id, cn]);
});
await mustFail("note abandonnée : figée", `update public.note_frais set statut = 'validee' where id = $1`, [NA.id], "ne se modifie plus");
await mustFail("note abandonnée : sa fiche de don ne se supprime pas", `delete from public.contribution_nature where source_cle = $1`, ["ndf:" + NA.id], "note_frais_contribution_meme_entite");

// Refus : motif obligatoire, l'opération redevient disponible.
await ok("refus motivé, puis l'opération d'une note refusée peut servir ailleurs", async () => {
  const NR = await nouvelleNote("2026-04-10");
  const op = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes) values ($1,'depense','a_classer','2026-04-09','CB X', 300) returning id`, [VEA])).id;
  await q(insLigne, [VEA, NR.id, "operation", "2026-04-09", "CB X", null, 300, op, null]);
  await statut(NR.id, "a_verifier");
  let sansMotif = false;
  try { await statut(NR.id, "refusee"); } catch { sansMotif = true; }
  if (!sansMotif) throw new Error("refus sans motif accepté");
  await statut(NR.id, "refusee", ", motif_refus = 'Ticket illisible'");
  const N3 = await nouvelleNote("2026-04-11");
  await q(insLigne, [VEA, N3.id, "operation", "2026-04-09", "CB X", null, 300, op, null]);
});
await mustFail("note refusée : figée", `update public.note_frais set statut = 'a_verifier' where id = $1`,
  [(await un(`select id from public.note_frais where statut = 'refusee' limit 1`)).id], "ne se modifie plus");

// ---------- 9. Verrou de clôture ----------
console.log("\n== Clôture ==");
// Note de 2025 validée avant la clôture, remboursée en 2026.
const N25 = await nouvelleNote("2025-12-20");
await q(insLigne, [VEA, N25.id, "saisie", "2025-12-20", "Péage", null, 500, null, null]);
const T25 = (await un(insTrajet, [VEA, "2025-12-21", "10", false, 1000, 100])).id;
await statut(N25.id, "a_verifier");
await statut(N25.id, "validee");
const N25b = await nouvelleNote("2025-12-22");
await db.exec(`reset role;`);
await q(`insert into public.cloture_exercice (entite_id, exercice, motif, instantane, signature) values ($1, 2025, 'Essai', '{}', '0|0|0')`, [VEA]);
await db.exec(`set role authenticated;`);
await comme(A);
const MSG = "Exercice 2025 clôturé";
await mustFail("créer une note datée de 2025", `insert into public.note_frais (entite_id, beneficiaire, objet, date_note) values ($1,'x','x','2025-06-01')`, [VEA], MSG);
await mustFail("modifier une note de 2025", `update public.note_frais set objet = 'x' where id = $1`, [N25b.id], MSG);
await mustFail("supprimer une note de 2025", `delete from public.note_frais where id = $1`, [N25b.id], MSG);
await mustFail("déplacer une note de 2026 vers 2025", `update public.note_frais set date_note = '2025-12-31' where id = $1`, [N2.id], MSG);
await mustFail("sortir une note de 2025 vers 2026", `update public.note_frais set date_note = '2026-01-02' where id = $1`, [N25b.id], MSG);
await mustFail("ajouter une ligne datée de 2025 (note de 2026)", insLigne, [VEA, N2.id, "saisie", "2025-11-30", "x", null, 100, null, null], MSG);
await mustFail("créer un trajet daté de 2025", insTrajet, [VEA, "2025-06-01", "10", false, 1000, 100], MSG);
await mustFail("modifier un trajet de 2025", `update public.trajet_ik set motif = 'x' where id = $1`, [T25], MSG);
await mustFail("déplacer un trajet de 2026 vers 2025", `update public.trajet_ik set date_trajet = '2025-12-01' where id = $1`, [T2], MSG);
const VIR2 = "33333333-3333-4333-8333-333333333333";
const remb25 = (await un(`insert into public.transaction (entite_id, type, statut, date_transaction, libelle, montant_ttc_centimes, compte_tresorerie_id, virement_id)
                           values ($1,'depense','validee','2026-01-08','VIR REMBOURSEMENT', 500, $2, $3) returning id`, [VEA, courant, VIR2])).id;
await ok("note de 2025 remboursée en janvier 2026 (règlement daté d'un exercice ouvert) : acceptée", () =>
  q(`update public.note_frais set statut = 'remboursee', transaction_remboursement_id = $2, virement_id = $3 where id = $1`, [N25.id, remb25, VIR2]));
await ok("réouverture de 2025 : la note redevient modifiable", async () => {
  await q(`select public.rouvrir_exercice($1, 2025, 'Correction d''une note de frais')`, [VEA]);
  await q(`update public.note_frais set objet = 'Corrigé' where id = $1`, [N25b.id]);
});

// ---------- 10. Suppression d'une structure ----------
console.log("\n== Suppression d'une structure ==");
await ok("supprimer VENA emporte notes, lignes, trajets et compteur", async () => {
  await comme(B);
  await q(`insert into public.note_frais_ligne (entite_id, note_id, date_depense, libelle, montant_ttc_centimes) values ($1,$2,'2026-03-01','x', 100)`, [VENA, noteVena.id]);
  await q(`delete from public.entite where id = $1`, [VENA]);
  await db.exec(`reset role;`);
  const r = await un(`select (select count(*)::int from public.note_frais where entite_id = $1) as n,
                             (select count(*)::int from public.note_frais_ligne where entite_id = $1) as l,
                             (select count(*)::int from public.trajet_ik where entite_id = $1) as t,
                             (select count(*)::int from public.note_frais_compteur where entite_id = $1) as c`, [VENA]);
  await db.exec(`set role authenticated;`);
  await comme(A);
  egal([r.n, r.l, r.t, r.c], [0, 0, 0, 0]);
});

console.log(`\n========= RÉSULTAT : ${pass} PASS / ${fail} FAIL =========`);
process.exit(fail === 0 ? 0 : 1);
