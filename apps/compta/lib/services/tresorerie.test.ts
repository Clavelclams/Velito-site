/**
 * Tests unitaires du SERVICE TRÉSORERIE (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/tresorerie.test.ts
 *
 * On prouve : solde initial inconnu ≠ 0, virement interne neutre pour
 * l'association, contrôle mensuel (ouverture, clôture, écart à la date du
 * relevé), plan de catégories idempotent.
 */
import {
  categoriesManquantes,
  filtrerOperations,
  controleMensuel,
  finDeMois,
  horsVirements,
  PLAN_ASSOCIATIF,
  preparerCompte,
  preparerSoldeObserve,
  preparerVirement,
  saisieSigneeVersCentimes,
  soldeAu,
} from "./tresorerie.ts";
import type { CompteTresorerie, Transaction } from "@/types/database";

let pass = 0;
let fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log("  PASS  " + label);
  } else {
    fail++;
    console.log("  FAIL  " + label);
  }
}

function compte(over: Partial<CompteTresorerie> = {}): CompteTresorerie {
  return {
    id: "c1",
    entite_id: "e1",
    nom: "Courant",
    nature: "courant",
    solde_initial_centimes: 100000, // 1 000,00 €
    date_solde_initial: "2025-01-01",
    active: true,
    cree_le: "",
    ...over,
  };
}

function tx(
  date: string,
  type: "recette" | "depense",
  centimes: number,
  over: Partial<Transaction> = {},
): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    entite_id: "e1",
    categorie_id: "cat",
    type,
    statut: "validee",
    date_transaction: date,
    libelle: "x",
    montant_ttc_centimes: centimes,
    montant_tva_centimes: 0,
    montant_ht_centimes: centimes,
    compte_tresorerie_id: "c1",
    virement_id: null,
    source_fichier: null,
    source_ref: null,
    source_cle: null,
    commentaire: null,
    cree_le: "",
    modifie_le: "",
    ...over,
  };
}

// --- montants signés ---
ok("'-35,10' → -3510", saisieSigneeVersCentimes("-35,10") === -3510);
ok("'1 250' → 125000", saisieSigneeVersCentimes("1 250") === 125000);
ok("'' → null (inconnu, pas 0)", saisieSigneeVersCentimes("") === null);
ok("'abc' → null", saisieSigneeVersCentimes("abc") === null);

// --- préparation d'un compte ---
const c1 = preparerCompte({ entiteId: "e1", nom: "  Compte  courant ", nature: "courant", soldeInitial: "", dateSoldeInitial: "" });
ok("compte sans solde initial accepté, solde = null", c1.ok && c1.valeur.solde_initial_centimes === null);
ok("nom nettoyé (espaces)", c1.ok && c1.valeur.nom === "Compte courant");
ok("solde sans date refusé", !preparerCompte({ entiteId: "e1", nom: "A", nature: "caisse", soldeInitial: "10", dateSoldeInitial: "" }).ok);
ok("nature inconnue refusée", !preparerCompte({ entiteId: "e1", nom: "A", nature: "coffre", soldeInitial: "", dateSoldeInitial: "" }).ok);
const c2 = preparerCompte({ entiteId: "e1", nom: "Livret", nature: "livret", soldeInitial: "-12,5", dateSoldeInitial: "2025-01-01" });
ok("solde initial négatif accepté", c2.ok && c2.valeur.solde_initial_centimes === -1250);
ok("date impossible refusée", !preparerCompte({ entiteId: "e1", nom: "A", nature: "livret", soldeInitial: "1", dateSoldeInitial: "2025-02-30" }).ok);

// --- solde observé ---
ok("solde observé vide refusé", !preparerSoldeObserve({ entiteId: "e1", compteId: "c1", dateReleve: "2025-01-31", solde: "", reference: "" }).ok);
const so = preparerSoldeObserve({ entiteId: "e1", compteId: "c1", dateReleve: "2025-01-31", solde: "0", reference: "" });
ok("solde observé à 0 accepté (0 saisi ≠ vide)", so.ok && so.valeur.solde_centimes === 0 && so.valeur.reference === null);

// --- virement interne ---
const v = preparerVirement({ entiteId: "e1", compteSourceId: "c1", compteDestinationId: "c2", date: "2025-03-01", montant: "500", libelle: "" }, "v1");
ok("virement : deux jambes", v.ok && v.valeur.length === 2);
ok("virement : sortie sur la source, entrée sur la destination",
  v.ok && v.valeur[0].type === "depense" && v.valeur[0].compte_tresorerie_id === "c1" &&
  v.valeur[1].type === "recette" && v.valeur[1].compte_tresorerie_id === "c2");
ok("virement : même id, même montant", v.ok && v.valeur[0].virement_id === "v1" && v.valeur[1].virement_id === "v1" && v.valeur[0].montant_ttc_centimes === 50000);
ok("virement : libellé par défaut", v.ok && v.valeur[0].libelle === "Virement interne");
ok("virement vers le même compte refusé", !preparerVirement({ entiteId: "e1", compteSourceId: "c1", compteDestinationId: "c1", date: "2025-03-01", montant: "5", libelle: "" }, "v").ok);
ok("virement à 0 refusé", !preparerVirement({ entiteId: "e1", compteSourceId: "c1", compteDestinationId: "c2", date: "2025-03-01", montant: "0", libelle: "" }, "v").ok);

const avecVirement = [tx("2025-03-01", "recette", 100), tx("2025-03-01", "depense", 50000, { virement_id: "v1" })];
ok("horsVirements retire les jambes de virement", horsVirements(avecVirement).length === 1);

// --- soldes ---
const mouvements = [
  tx("2024-12-31", "depense", 999999), // avant le solde initial : ignorée
  tx("2025-01-10", "recette", 20000),
  tx("2025-01-20", "depense", 5000),
  tx("2025-02-05", "depense", 1000),
  tx("2025-02-05", "recette", 7777, { compte_tresorerie_id: "autre" }), // autre compte
];
ok("soldeAu fin janvier = 1000 + 200 - 50", soldeAu(compte(), mouvements, "2025-01-31") === 115000);
ok("soldeAu ignore l'antérieur au solde initial et les autres comptes", soldeAu(compte(), mouvements, "2025-02-28") === 114000);
ok("soldeAu = null si solde initial inconnu", soldeAu(compte({ solde_initial_centimes: null, date_solde_initial: null }), mouvements, "2025-12-31") === null);

ok("finDeMois février 2024 (bissextile)", finDeMois(2024, 2) === "2024-02-29");
ok("finDeMois février 2025", finDeMois(2025, 2) === "2025-02-28");

// --- contrôle mensuel ---
const obs = [
  { compte_id: "c1", date_releve: "2025-01-31", solde_centimes: 115000, reference: "Relevé 01" },
  { compte_id: "c1", date_releve: "2025-02-15", solde_centimes: 113000, reference: null }, // calculé 114000
];
const ctrl = controleMensuel(compte(), mouvements, obs, 2025, "2025-06-15");
ok("12 lignes", ctrl.length === 12);
ok("janvier : ouverture = solde initial", ctrl[0]!.ouverture === 100000);
ok("janvier : clôture = 1150 €", ctrl[0]!.cloture === 115000);
ok("janvier : concorde avec le relevé", ctrl[0]!.etat === "concorde" && ctrl[0]!.ecart === 0);
ok("février : ouverture = clôture de janvier", ctrl[1]!.ouverture === 115000);
ok("février : écart calculé à la date du relevé (-10 €)", ctrl[1]!.ecart === -1000 && ctrl[1]!.etat === "ecart");
ok("mars : non observé", ctrl[2]!.etat === "non_observe" && ctrl[2]!.nbOperations === 0);
ok("juin (en cours) : à venir", ctrl[5]!.etat === "a_venir");

const ctrlInconnu = controleMensuel(compte({ solde_initial_centimes: null, date_solde_initial: null }), mouvements, obs, 2025, "2025-06-15");
ok("solde initial inconnu : pas de faux solde", ctrlInconnu[0]!.ouverture === null && ctrlInconnu[0]!.etat === "solde_initial_inconnu");
ok("solde initial inconnu : recettes du mois quand même comptées", ctrlInconnu[0]!.recettes === 20000);

const ctrlAvant = controleMensuel(compte({ date_solde_initial: "2025-03-10" }), mouvements, [], 2025, "2025-12-31");
ok("mois antérieur au solde initial : avant_ouverture", ctrlAvant[0]!.etat === "avant_ouverture");
ok("mois du solde initial : ouverture = solde initial", ctrlAvant[2]!.ouverture === 100000);

const ctrlNonValide = controleMensuel(compte(), [tx("2025-01-05", "depense", 100, { statut: "a_classer" })], [], 2025, "2025-12-31");
ok("compte les opérations non validées", ctrlNonValide[0]!.nbNonValidees === 1);

// --- plan associatif ---
const manquantes = categoriesManquantes([{ nom: "assurance", type: "depense" }, { nom: "Assurance", type: "recette" }]);
ok("plan : 'Assurance' dépense déjà là (casse ignorée)", !manquantes.some((c) => c.nom === "Assurance"));
ok("plan : une catégorie homonyme d'un autre type ne compte pas", manquantes.length === PLAN_ASSOCIATIF.length - 1);
ok("plan : rien à ajouter une 2e fois", categoriesManquantes(PLAN_ASSOCIATIF).length === 0);

// --- filtres de liste ---
const liste = [
  tx("2025-01-01", "depense", 1, { statut: "a_classer", compte_tresorerie_id: null }),
  tx("2025-01-02", "depense", 1, { statut: "a_verifier" }),
  tx("2025-01-03", "depense", 1, { statut: "validee" }),
  tx("2025-01-04", "depense", 1, { statut: "validee", virement_id: "v" }),
];
ok("filtre a_traiter : non validées hors virements", filtrerOperations(liste, { statut: "a_traiter" }).length === 2);
ok("filtre statut exact", filtrerOperations(liste, { statut: "a_verifier" }).length === 1);
ok("filtre compte 'sans'", filtrerOperations(liste, { compteId: "sans" }).length === 1);
ok("filtre compte précis", filtrerOperations(liste, { compteId: "c1" }).length === 3);
ok("sans filtre : tout", filtrerOperations(liste, {}).length === 4);
ok("statut inconnu ignoré (pas de liste vide surprise)", filtrerOperations(liste, { statut: "nimporte" }).length === 4);

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
