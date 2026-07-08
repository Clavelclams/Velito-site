/**
 * Tests unitaires du SERVICE TRANSACTIONS (fonction pure, sans base).
 * Lancer depuis apps/compta :   node lib/services/transactions.test.ts
 *
 * On prouve que la préparation d'une transaction refuse ce qui violerait les
 * contraintes SQL (montant > 0, TVA ≤ TTC, libellé, date réelle) AVANT tout
 * accès base, et convertit bien les euros saisis en centimes exacts.
 */
import { preparerNouvelleTransaction, LIBELLE_MAX } from "./transactions.ts";
import type { SaisieTransaction } from "./transactions.ts";

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

/** Base valide, qu'on altère champ par champ. */
function saisie(over: Partial<SaisieTransaction> = {}): SaisieTransaction {
  return {
    entiteId: "e1",
    categorieId: null,
    type: "depense",
    dateTransaction: "2026-07-07",
    libelle: "Achat matériel",
    montantTtc: "12,50",
    montantTva: "",
    ...over,
  };
}

// --- cas valide + conversion centimes ---
const r = preparerNouvelleTransaction(saisie());
ok("saisie valide acceptée", r.ok === true);
ok("TTC '12,50' → 1250 centimes", r.ok === true && r.valeur.montant_ttc_centimes === 1250);
ok("TVA vide → 0 centimes", r.ok === true && r.valeur.montant_tva_centimes === 0);
ok("entite_id repris du contexte", r.ok === true && r.valeur.entite_id === "e1");
ok("categorie_id null accepté (non catégorisée)", r.ok === true && r.valeur.categorie_id === null);

// --- montants ---
ok("TTC vide refusé", preparerNouvelleTransaction(saisie({ montantTtc: "" })).ok === false);
ok("TTC = 0 refusé", preparerNouvelleTransaction(saisie({ montantTtc: "0" })).ok === false);
ok("TTC non numérique refusé", preparerNouvelleTransaction(saisie({ montantTtc: "abc" })).ok === false);
ok(
  "TVA > TTC refusée",
  preparerNouvelleTransaction(saisie({ montantTtc: "10", montantTva: "12" })).ok === false,
);
ok("TVA = TTC acceptée (HT = 0 interdit ? non, TVA≤TTC ok)", (() => {
  const x = preparerNouvelleTransaction(saisie({ montantTtc: "10", montantTva: "10" }));
  return x.ok === true && x.valeur.montant_tva_centimes === 1000;
})());
ok("TVA '2,50' → 250 centimes", (() => {
  const x = preparerNouvelleTransaction(saisie({ montantTtc: "12,50", montantTva: "2,50" }));
  return x.ok === true && x.valeur.montant_tva_centimes === 250;
})());

// --- date ---
ok("date vide refusée", preparerNouvelleTransaction(saisie({ dateTransaction: "" })).ok === false);
ok("date inexistante (31 février) refusée", preparerNouvelleTransaction(saisie({ dateTransaction: "2026-02-31" })).ok === false);
ok("date mal formée refusée", preparerNouvelleTransaction(saisie({ dateTransaction: "07/07/2026" })).ok === false);

// --- libellé ---
ok("libellé vide refusé", preparerNouvelleTransaction(saisie({ libelle: "  " })).ok === false);
ok("libellé trop long refusé", preparerNouvelleTransaction(saisie({ libelle: "x".repeat(LIBELLE_MAX + 1) })).ok === false);
ok("libellé nettoyé (trim)", (() => {
  const x = preparerNouvelleTransaction(saisie({ libelle: "  Loyer  " }));
  return x.ok === true && x.valeur.libelle === "Loyer";
})());

// --- type ---
ok("type invalide refusé", preparerNouvelleTransaction(saisie({ type: "virement" })).ok === false);
ok("type recette accepté", preparerNouvelleTransaction(saisie({ type: "recette" })).ok === true);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
