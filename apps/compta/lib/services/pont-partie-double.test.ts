/**
 * Tests unitaires du PONT partie simple → partie double (fonction pure).
 * Lancer :  node scripts/test.mjs lib/services/pont-partie-double.test.ts
 *
 * On prouve que toute transaction produit une écriture ÉQUILIBRÉE et correcte
 * (bons comptes, bons montants), quel que soit le cas (avec/sans TVA).
 */
import { genererLignesEcriture, type ComptesResolus } from "./pont-partie-double.ts";
import { totalDebit, totalCredit, type LigneSaisie } from "./comptabilite.ts";
import type { Transaction } from "../../types/database.ts";

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

const comptes: ComptesResolus = {
  banqueId: "512",
  contrepartieId: "6xx",
  tvaDeductibleId: "44566",
  tvaCollecteeId: "44571",
};

function tx(over: Partial<Transaction>): Pick<Transaction, "type" | "montant_ttc_centimes" | "montant_tva_centimes"> {
  return { type: "depense", montant_ttc_centimes: 12000, montant_tva_centimes: 2000, ...over };
}

/** Somme des débits/crédits sur un compte donné. */
function surCompte(lignes: LigneSaisie[], id: string) {
  const l = lignes.filter((x) => x.compteId === id);
  return { debit: l.reduce((s, x) => s + x.debitCentimes, 0), credit: l.reduce((s, x) => s + x.creditCentimes, 0) };
}

// --- dépense avec TVA (120 / 20) ---
const rDep = genererLignesEcriture(tx({ type: "depense", montant_ttc_centimes: 12000, montant_tva_centimes: 2000 }), comptes);
ok("dépense avec TVA : écriture valide", rDep.ok === true);
if (rDep.ok) {
  ok("dépense : 3 lignes", rDep.valeur.length === 3);
  ok("dépense : équilibrée (débit=crédit=12000)", totalDebit(rDep.valeur) === 12000 && totalCredit(rDep.valeur) === 12000);
  ok("dépense : charge au débit 100", surCompte(rDep.valeur, "6xx").debit === 10000);
  ok("dépense : TVA déductible au débit 20", surCompte(rDep.valeur, "44566").debit === 2000);
  ok("dépense : banque au crédit 120", surCompte(rDep.valeur, "512").credit === 12000);
}

// --- dépense sans TVA (100 / 0) ---
const rDep0 = genererLignesEcriture(tx({ type: "depense", montant_ttc_centimes: 10000, montant_tva_centimes: 0 }), comptes);
ok("dépense sans TVA : 2 lignes équilibrées", rDep0.ok === true && rDep0.valeur.length === 2 && totalDebit(rDep0.valeur) === 10000);

// --- recette avec TVA (240 / 40) ---
const rRec = genererLignesEcriture(tx({ type: "recette", montant_ttc_centimes: 24000, montant_tva_centimes: 4000 }), comptes);
ok("recette avec TVA : valide et équilibrée", rRec.ok === true && rRec.ok && totalDebit(rRec.valeur) === 24000 && totalCredit(rRec.valeur) === 24000);
if (rRec.ok) {
  ok("recette : banque au débit 240", surCompte(rRec.valeur, "512").debit === 24000);
  ok("recette : produit au crédit 200", surCompte(rRec.valeur, "6xx").credit === 20000);
  ok("recette : TVA collectée au crédit 40", surCompte(rRec.valeur, "44571").credit === 4000);
}

// --- recette sans TVA ---
const rRec0 = genererLignesEcriture(tx({ type: "recette", montant_ttc_centimes: 5000, montant_tva_centimes: 0 }), comptes);
ok("recette sans TVA : 2 lignes équilibrées", rRec0.ok === true && rRec0.valeur.length === 2 && totalCredit(rRec0.valeur) === 5000);

// --- compte de TVA manquant → refus ---
const rManque = genererLignesEcriture(
  tx({ type: "depense", montant_ttc_centimes: 12000, montant_tva_centimes: 2000 }),
  { banqueId: "512", contrepartieId: "6xx" }, // pas de tvaDeductibleId
);
ok("TVA sans compte dédié → refus explicite", rManque.ok === false);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
