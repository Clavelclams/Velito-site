/**
 * Tests unitaires du SERVICE MONTANTS (fonctions pures).
 * Lancer :  node scripts/test.mjs lib/services/montants.test.ts
 *
 * On couvre surtout l'aller-retour euros ↔ centimes, qui est la garantie de
 * fiabilité des montants (aucun flottant ne transporte jamais un montant).
 */
import {
  eurosVersCentimes,
  formaterCentimes,
  centimesVersSaisie,
  estMontantValide,
  estTvaCoherente,
} from "./montants.ts";

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

// --- eurosVersCentimes ---
ok("'12,50' → 1250", eurosVersCentimes("12,50") === 1250);
ok("'12.50' → 1250 (point accepté)", eurosVersCentimes("12.50") === 1250);
ok("'1 234,56' → 123456 (espaces milliers)", eurosVersCentimes("1 234,56") === 123456);
ok("'12' → 1200 (sans décimale)", eurosVersCentimes("12") === 1200);
ok("'12,5' → 1250 (une décimale)", eurosVersCentimes("12,5") === 1250);
ok("'abc' → null", eurosVersCentimes("abc") === null);
ok("'12,555' → null (3 décimales)", eurosVersCentimes("12,555") === null);
ok("'-5' → null (pas de signe)", eurosVersCentimes("-5") === null);

// --- centimesVersSaisie (nouveau) ---
ok("1250 → '12,50'", centimesVersSaisie(1250) === "12,50");
ok("1200 → '12,00'", centimesVersSaisie(1200) === "12,00");
ok("5 → '0,05'", centimesVersSaisie(5) === "0,05");
ok("123456 → '1234,56'", centimesVersSaisie(123456) === "1234,56");
ok("0 → '0,00'", centimesVersSaisie(0) === "0,00");

// --- aller-retour (invariant clé) ---
for (const s of ["0,01", "9,99", "1000", "1234,56"]) {
  const c = eurosVersCentimes(s)!;
  ok(`aller-retour ${s} conserve la valeur`, eurosVersCentimes(centimesVersSaisie(c)) === c);
}

// --- validations ---
ok("estMontantValide(0) = false", estMontantValide(0) === false);
ok("estMontantValide(1) = true", estMontantValide(1) === true);
ok("estTvaCoherente(200, 1000) = true", estTvaCoherente(200, 1000) === true);
ok("estTvaCoherente(1200, 1000) = false", estTvaCoherente(1200, 1000) === false);

// --- formaterCentimes (affichage) ---
ok("formaterCentimes(123456) contient '1' et '234' et '56'", (() => {
  const s = formaterCentimes(123456);
  return s.includes("234") && s.includes("56") && s.includes("€");
})());

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
