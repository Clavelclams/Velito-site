/**
 * Tests de la balance générale (fonction pure).
 * Lancer :  node scripts/test.mjs lib/services/balance.test.ts
 */
import { balanceGenerale } from "./etats-financiers.ts";
import type { LigneEcriture, Compte } from "../../types/database.ts";

let pass = 0, fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label); }
}

const compte = (id: string, numero: string, libelle: string): Compte => ({
  id, entite_id: "e1", numero, libelle, classe: Number(numero[0]), active: true, cree_le: "2026-01-01T00:00:00Z",
});
const comptes = [compte("512", "512", "Banque"), compte("706", "706", "Prestations"), compte("606", "606", "Achats")];
let i = 0;
const L = (compteId: string, d: number, c: number): LigneEcriture => ({
  id: `l${i++}`, ecriture_id: "x", entite_id: "e1", compte_id: compteId, debit_centimes: d, credit_centimes: c,
});

// Vente 200 encaissée, achat 50 payé.
const lignes = [L("512", 20000, 0), L("706", 0, 20000), L("606", 5000, 0), L("512", 0, 5000)];
const b = balanceGenerale(lignes, comptes);

ok("total débit = total crédit (équilibre)", b.equilibre === true);
ok("total débit = 25000", b.totalDebit === 25000);
ok("512 : débit 20000 / crédit 5000 / solde 15000", (() => {
  const l = b.lignes.find((x) => x.numero === "512")!;
  return l.totalDebit === 20000 && l.totalCredit === 5000 && l.solde === 15000;
})());
ok("triée par numéro (512 avant 606 avant 706)", b.lignes.map((l) => l.numero).join(",") === "512,606,706");
ok("comptes sans mouvement exclus", b.lignes.length === 3);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
