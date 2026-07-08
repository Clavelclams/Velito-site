/**
 * Tests unitaires du SERVICE COMPTABILITÉ (partie double, fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/comptabilite.test.ts
 *
 * On prouve la règle centrale : une écriture n'est acceptée QUE si elle est
 * équilibrée (Σdébits = Σcrédits) — l'invariant de la partie double.
 */
import {
  classeDeCompte,
  estCompteDeResultat,
  totalDebit,
  totalCredit,
  ecritureEstEquilibree,
  validerEcriture,
  PCG_BASE,
  type LigneSaisie,
} from "./comptabilite.ts";

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

const d = (compteId: string, debitCentimes: number): LigneSaisie => ({ compteId, debitCentimes, creditCentimes: 0 });
const c = (compteId: string, creditCentimes: number): LigneSaisie => ({ compteId, debitCentimes: 0, creditCentimes });

// --- classes ---
ok("classe de 512 = 5", classeDeCompte("512") === 5);
ok("classe de 44566 = 4", classeDeCompte("44566") === 4);
ok("606 est compte de résultat", estCompteDeResultat("606"));
ok("706 est compte de résultat", estCompteDeResultat("706"));
ok("512 n'est pas compte de résultat (bilan)", !estCompteDeResultat("512"));

// --- totaux / équilibre ---
// Dépense TTC 120 (dont TVA 20) réglée par banque :
//   débit 606 = 100, débit 44566 = 20, crédit 512 = 120.
const depense = [d("606", 10000), d("44566", 2000), c("512", 12000)];
ok("total débit = 12000", totalDebit(depense) === 12000);
ok("total crédit = 12000", totalCredit(depense) === 12000);
ok("écriture équilibrée détectée", ecritureEstEquilibree(depense));

const desequilibree = [d("606", 10000), c("512", 9000)];
ok("écriture déséquilibrée détectée", !ecritureEstEquilibree(desequilibree));
ok("total nul non équilibré", !ecritureEstEquilibree([]));

// --- validerEcriture ---
ok("écriture valide acceptée", validerEcriture(depense).ok === true);
ok("déséquilibre refusé", validerEcriture(desequilibree).ok === false);
ok("une seule ligne refusée", validerEcriture([d("606", 100)]).ok === false);
ok(
  "ligne débit ET crédit refusée",
  validerEcriture([{ compteId: "x", debitCentimes: 100, creditCentimes: 100 }, c("512", 100)]).ok === false,
);
ok(
  "ligne 0/0 refusée",
  validerEcriture([{ compteId: "x", debitCentimes: 0, creditCentimes: 0 }, c("512", 100)]).ok === false,
);
ok(
  "montant non entier refusé",
  validerEcriture([d("606", 100.5), c("512", 100.5)]).ok === false,
);

// --- PCG_BASE ---
ok("PCG contient un compte banque 512", PCG_BASE.some((x) => x.numero === "512"));
ok("classe cohérente avec le numéro pour tout le PCG", PCG_BASE.every((x) => x.classe === classeDeCompte(x.numero)));
ok("PCG a des charges (6) et des produits (7)", PCG_BASE.some((x) => x.classe === 6) && PCG_BASE.some((x) => x.classe === 7));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
