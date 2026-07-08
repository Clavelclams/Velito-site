/**
 * Tests du constructeur d'écriture depuis une transaction (câblage du pont).
 * Lancer :  node scripts/test.mjs lib/services/construire-ecriture.test.ts
 */
import {
  construireEcritureDepuisTransaction,
  NUMEROS_PONT,
} from "./pont-partie-double.ts";
import { totalDebit, totalCredit } from "./comptabilite.ts";
import type { Transaction } from "../../types/database.ts";

let pass = 0;
let fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label); }
}

const tx = (over: Partial<Transaction>): Pick<Transaction, "type" | "montant_ttc_centimes" | "montant_tva_centimes"> => ({
  type: "depense", montant_ttc_centimes: 12000, montant_tva_centimes: 2000, ...over,
});

// PCG complet (numéro → id fictif).
const pcg = new Map<string, string>([
  [NUMEROS_PONT.banque, "id512"],
  [NUMEROS_PONT.tvaDeductible, "id44566"],
  [NUMEROS_PONT.tvaCollectee, "id44571"],
  [NUMEROS_PONT.chargeDefaut, "id606"],
  [NUMEROS_PONT.produitDefaut, "id706"],
]);

// --- dépense ---
const rDep = construireEcritureDepuisTransaction(tx({ type: "depense" }), pcg);
ok("dépense : construite", rDep.ok === true);
if (rDep.ok) {
  ok("dépense : journal ACH", rDep.valeur.journal === "ACH");
  ok("dépense : écriture équilibrée", totalDebit(rDep.valeur.lignes) === totalCredit(rDep.valeur.lignes));
  ok("dépense : utilise 606 en contrepartie", rDep.valeur.lignes.some((l) => l.compteId === "id606"));
}

// --- recette ---
const rRec = construireEcritureDepuisTransaction(tx({ type: "recette", montant_ttc_centimes: 5000, montant_tva_centimes: 0 }), pcg);
ok("recette : journal VEN + 706", rRec.ok === true && rRec.valeur.journal === "VEN" && rRec.valeur.lignes.some((l) => l.compteId === "id706"));

// --- PCG incomplet ---
const rVide = construireEcritureDepuisTransaction(tx({}), new Map());
ok("PCG non initialisé → erreur (512 manquant)", rVide.ok === false);

const sansCharge = new Map([[NUMEROS_PONT.banque, "id512"]]);
ok("compte 606 manquant → erreur", construireEcritureDepuisTransaction(tx({ type: "depense" }), sansCharge).ok === false);

// --- mapping fin : contrepartie forcée (compte de la catégorie) ---
const rMap = construireEcritureDepuisTransaction(tx({ type: "depense" }), pcg, "id218");
ok("override : utilise le compte de la catégorie (218)", rMap.ok === true && rMap.valeur.lignes.some((l) => l.compteId === "id218"));
ok("override : n'utilise plus 606 par défaut", rMap.ok === true && !rMap.valeur.lignes.some((l) => l.compteId === "id606"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
