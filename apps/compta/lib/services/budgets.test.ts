/**
 * Tests unitaires du service BUDGETS (fonctions pures).
 * Lancer depuis apps/compta :
 *   node scripts/test.mjs lib/services/budgets.test.ts
 */
import {
  comparaisonAnnuelle,
  enveloppesACopier,
  genererCsvComparaison,
  lireAnnees,
  lireExercice,
  nomFichierComparaison,
  preparerEnveloppe,
  prevuRealise,
  tauxRealisation,
  type CategorieBudget,
  type OperationBudget,
} from "./budgets.ts";

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

// ============================ SAISIE =====================================
const cats = [
  { id: "cotis", entite_id: "e1", active: true },
  { id: "vieux", entite_id: "e1", active: false },
  { id: "autre", entite_id: "e2", active: true },
];
const saisie = { entiteId: "e1", exercice: 2026, categorieId: "cotis", montant: "1 250,50", commentaire: "  " };
const p1 = preparerEnveloppe(saisie, cats);
ok("enveloppe : 1 250,50 € = 125050 centimes, commentaire vide = null", p1.ok && p1.valeur !== null && p1.valeur.montant_centimes === 125050 && p1.valeur.commentaire === null);
ok("enveloppe : montant vide = retirer l'enveloppe (null), pas 0", (() => { const r = preparerEnveloppe({ ...saisie, montant: "" }, cats); return r.ok && r.valeur === null; })());
ok("enveloppe : 0 € accepté (prévu nul assumé)", (() => { const r = preparerEnveloppe({ ...saisie, montant: "0" }, cats); return r.ok && r.valeur?.montant_centimes === 0; })());
ok("enveloppe : montant négatif refusé", !preparerEnveloppe({ ...saisie, montant: "-10" }, cats).ok);
ok("enveloppe : montant illisible refusé", !preparerEnveloppe({ ...saisie, montant: "douze" }, cats).ok);
ok("enveloppe : catégorie d'une autre entité refusée", !preparerEnveloppe({ ...saisie, categorieId: "autre" }, cats).ok);
ok("enveloppe : exercice hors bornes refusé", !preparerEnveloppe({ ...saisie, exercice: 1999 }, cats).ok);

ok("lireExercice : « 2025 » lu", lireExercice("2025", 2026) === 2025);
ok("lireExercice : valeur invalide = défaut", lireExercice("20x5", 2026) === 2026 && lireExercice(undefined, 2026) === 2026 && lireExercice("1850", 2026) === 2026);
ok("lireAnnees : tri, doublons et intrus retirés", lireAnnees("2025,2023, 2024,2023,abc,1850", 2026).join() === "2023,2024,2025");
ok("lireAnnees : paramètres répétés (formulaire sans JS)", lireAnnees(["2024", "2022"], 2026).join() === "2022,2024");
ok("lireAnnees : rien = les trois dernières années", lireAnnees(undefined, 2026).join() === "2024,2025,2026");
ok("lireAnnees : au plus 10 années, les plus récentes", (() => { const a = lireAnnees(Array.from({ length: 15 }, (_, i) => String(2010 + i)).join(","), 2026); return a.length === 10 && a[0] === 2015 && a[9] === 2024; })());

const copie = enveloppesACopier(
  [
    { categorie_id: "cotis", montant_centimes: 100000, commentaire: "Hausse" },
    { categorie_id: "loyer", montant_centimes: 50000, commentaire: null },
    { categorie_id: "vieux", montant_centimes: 9999, commentaire: null },
  ],
  [{ categorie_id: "loyer" }],
  [{ id: "cotis", active: true }, { id: "loyer", active: true }, { id: "vieux", active: false }],
  "e1",
  2027,
);
ok("copie : seule l'enveloppe manquante est créée, rien n'est écrasé", copie.length === 1 && copie[0]!.categorie_id === "cotis" && copie[0]!.exercice === 2027 && copie[0]!.montant_centimes === 100000);
ok("copie : catégorie archivée ignorée", !copie.some((b) => b.categorie_id === "vieux"));

ok("taux : 750 / 1000 = 75 %", tauxRealisation(750, 1000) === 75);
ok("taux : une décimale (1 / 3 = 33,3 %)", tauxRealisation(1, 3) === 33.3);
ok("taux : prévu inconnu ou nul = null", tauxRealisation(10, null) === null && tauxRealisation(10, 0) === null);

// ============================ PRÉVU / RÉALISÉ =============================
const categories: CategorieBudget[] = [
  { id: "cotis", nom: "Cotisations", type: "recette", active: true },
  { id: "subv", nom: "Subventions", type: "recette", active: true },
  { id: "loyer", nom: "Loyer", type: "depense", active: true },
  { id: "achats", nom: "Achats", type: "depense", active: true },
  { id: "vieux", nom: "Ancien poste", type: "depense", active: false },
  { id: "dormant", nom: "Dormant", type: "depense", active: false },
];
const op = (o: Partial<OperationBudget>): OperationBudget => ({
  categorie_id: null, type: "depense", statut: "validee", date_transaction: "2026-03-01", montant_ttc_centimes: 100, virement_id: null, ...o,
});
const operations: OperationBudget[] = [
  op({ categorie_id: "cotis", type: "recette", montant_ttc_centimes: 60000 }),
  op({ categorie_id: "cotis", type: "recette", montant_ttc_centimes: 15000, statut: "a_verifier" }),
  op({ categorie_id: "loyer", montant_ttc_centimes: 40000 }),
  op({ categorie_id: "loyer", montant_ttc_centimes: 2000, type: "recette" }), // remboursement : en déduction
  op({ categorie_id: "achats", montant_ttc_centimes: 30000, statut: "a_verifier" }),
  op({ categorie_id: "vieux", montant_ttc_centimes: 5000 }), // archivée mais utilisée en 2026
  op({ categorie_id: null, type: "depense", montant_ttc_centimes: 700, statut: "a_classer" }),
  op({ type: "depense", montant_ttc_centimes: 99999, virement_id: "v1" }), // virement : exclu
  op({ type: "recette", montant_ttc_centimes: 99999, virement_id: "v1" }), // virement : exclu
  op({ categorie_id: "cotis", type: "recette", montant_ttc_centimes: 11111, date_transaction: "2025-12-31" }), // autre exercice
];
const budgets = [
  { exercice: 2026, categorie_id: "cotis", montant_centimes: 100000, commentaire: null },
  { exercice: 2026, categorie_id: "loyer", montant_centimes: 48000, commentaire: "Bail" },
  { exercice: 2026, categorie_id: "subv", montant_centimes: 200000, commentaire: null },
  { exercice: 2025, categorie_id: "achats", montant_centimes: 1, commentaire: null }, // autre exercice
];
const pr = prevuRealise(categories, budgets, operations, 2026);
const L = (id: string | null, sens = "depense") => [...pr.recettes, ...pr.depenses].find((l) => l.categorieId === id && l.sens === sens)!;
const cotis = L("cotis", "recette");
ok("réalisé : toutes les opérations comptent, quel que soit le statut", cotis.realise === 75000);
ok("réalisé : lignes non validées comptées à part", cotis.nbNonValidees === 1 && cotis.nbOperations === 2);
ok("écart = réalisé − prévu, taux 75 %", cotis.ecart === -25000 && cotis.taux === 75);
ok("budget sans aucune opération : réalisé 0, pas « — »", L("subv", "recette").realise === 0 && L("subv", "recette").prevu === 200000);
ok("catégorie sans budget : prévu null, écart et taux null", L("achats").prevu === null && L("achats").ecart === null && L("achats").taux === null && L("achats").realise === 30000);
ok("opération de sens contraire : vient en déduction de sa catégorie", L("loyer").realise === 38000);
ok("virements internes exclus des deux sens", pr.totaux.recette.realise === 75000 && pr.totaux.depense.realise === 38000 + 30000 + 5000 + 700);
ok("catégorie archivée utilisée sur l'exercice : affichée", L("vieux").realise === 5000 && !L("vieux").active);
ok("catégorie archivée sans rien sur l'exercice : masquée", ![...pr.depenses].some((l) => l.categorieId === "dormant"));
ok("opérations sans catégorie : ligne dédiée, en dernier", L(null).realise === 700 && pr.depenses[pr.depenses.length - 1]!.categorieId === null);
ok("total prévu recettes = somme des enveloppes", pr.totaux.recette.prevu === 300000 && pr.totaux.depense.prevu === 48000);
ok("solde prévu = recettes − dépenses prévues", pr.soldePrevu === 252000);
ok("solde réalisé = recettes − dépenses réalisées", pr.soldeRealise === 75000 - 73700);
ok("non validées : total par sens", pr.totaux.depense.nbNonValidees === 2 && pr.totaux.recette.nbNonValidees === 1);
ok("une opération n'est comptée qu'une fois (somme des lignes = total)", [...pr.recettes, ...pr.depenses].reduce((s, l) => s + l.nbOperations, 0) === 7);
ok("renommer une catégorie ne change aucun montant", (() => {
  const renomme = prevuRealise(categories.map((c) => (c.id === "cotis" ? { ...c, nom: "Adhésions" } : c)), budgets, operations, 2026);
  const l = renomme.recettes.find((x) => x.categorieId === "cotis")!;
  return l.nom === "Adhésions" && l.realise === cotis.realise && l.prevu === cotis.prevu;
})());
const sansBudget = prevuRealise(categories, [], operations, 2026);
ok("exercice sans aucune enveloppe : prévus et solde prévu inconnus", sansBudget.soldePrevu === null && sansBudget.totaux.recette.prevu === null && sansBudget.nbEnveloppes === 0);

// ============================ COMPARAISON ================================
const histo: OperationBudget[] = [
  op({ categorie_id: "cotis", type: "recette", montant_ttc_centimes: 50000, date_transaction: "2023-05-01" }),
  op({ categorie_id: "vieux", montant_ttc_centimes: 8000, date_transaction: "2023-06-01" }), // archivée, historique
  op({ categorie_id: "cotis", type: "recette", montant_ttc_centimes: 70000, date_transaction: "2025-05-01" }),
  op({ categorie_id: "loyer", montant_ttc_centimes: 40000, date_transaction: "2025-02-01", statut: "a_verifier" }),
  op({ type: "depense", montant_ttc_centimes: 1000, date_transaction: "2024-04-01", virement_id: "v2" }), // 2024 : virement seul
];
const comp = comparaisonAnnuelle(categories, histo, [2023, 2024, 2025]);
const C = (id: string) => [...comp.recettes, ...comp.depenses].find((l) => l.categorieId === id)!;
ok("année sans opération (virement seul) : colonne entière à null", comp.anneesAbsentes.join() === "2024" && [...comp.recettes, ...comp.depenses].every((l) => l.montants[1] === null));
ok("année absente : totaux et résultat null, jamais 0", comp.totaux.recette[1] === null && comp.totaux.depense[1] === null && comp.resultat[1] === null);
ok("année présente sans montant pour la catégorie : 0", C("loyer").montants[0] === 0 && C("subv").montants[2] === 0);
ok("cotisations : 500 € puis — puis 700 €", C("cotis").montants.join() === "50000,,70000");
ok("catégorie archivée : garde son historique", C("vieux").montants[0] === 8000 && C("vieux").active === false);
ok("catégorie archivée sans montant sur la période : masquée", ![...comp.depenses].some((l) => l.categorieId === "dormant"));
ok("résultat par année = recettes − dépenses", comp.resultat[0] === 50000 - 8000 && comp.resultat[2] === 70000 - 40000);
ok("année hors sélection ignorée", comparaisonAnnuelle(categories, histo, [2025]).totaux.recette[0] === 70000);

// ============================ CSV ========================================
const csv = genererCsvComparaison(comp);
const lignesCsv = csv.split("\r\n");
ok("CSV : en-tête au point-virgule", lignesCsv[0] === "Sens;Catégorie;Archivée;2023;2024;2025");
ok("CSV : décimales à virgule et année absente en tiret", lignesCsv.includes("Recette;Cotisations;;500,00;—;700,00"));
ok("CSV : catégorie archivée signalée", lignesCsv.includes("Dépense;Ancien poste;oui;80,00;—;0,00"));
ok("CSV : totaux et résultat", lignesCsv.includes("Recette;Total recettes;;500,00;—;700,00") && lignesCsv.includes(";Résultat (recettes moins dépenses);;420,00;—;300,00"));
ok("CSV : fin de ligne CRLF, pas de BOM (ajouté par la route)", csv.endsWith("\r\n") && !csv.startsWith("﻿"));
ok("CSV : nom contenant un point-virgule échappé", genererCsvComparaison(comparaisonAnnuelle([{ id: "x", nom: "Achat; matériel", type: "depense", active: true }], [], [2026])).includes('"Achat; matériel"'));
ok("CSV : résultat négatif lisible par Excel", (() => {
  const c = comparaisonAnnuelle(categories, [op({ categorie_id: "loyer", montant_ttc_centimes: 12345 })], [2026]);
  return genererCsvComparaison(c).includes(";Résultat (recettes moins dépenses);;-123,45");
})());
ok("nom de fichier : comparaison_VEA_2023-2025.csv", nomFichierComparaison("VEA", [2023, 2024, 2025]) === "comparaison_VEA_2023-2025.csv");
ok("nom de fichier : accents et espaces assainis", nomFichierComparaison("Vélito Esport", [2026]) === "comparaison_Velito_Esport_2026-2026.csv");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
