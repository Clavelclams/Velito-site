/**
 * Tests unitaires du SERVICE IS (fonction pure).
 * Lancer :  node scripts/test.mjs lib/services/impot-societe.test.ts
 */
import {
  calculerIS,
  acompteTrimestrielIS,
  BAREME_IS_2026,
} from "./impot-societe.ts";

let pass = 0;
let fail = 0;
function ok(label: string, condition: boolean) {
  if (condition) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label); }
}

const EUR = 100; // 1 € = 100 centimes

// --- seuil du barème ---
ok("barème 2026 : seuil 42 500 €", BAREME_IS_2026.seuilTauxReduitCentimes === 4_250_000);
ok("barème 2026 : 15 % / 25 %", BAREME_IS_2026.tauxReduit === 0.15 && BAREME_IS_2026.tauxNormal === 0.25);

// --- perte / zéro ---
ok("perte → IS nul, base 0", (() => { const r = calculerIS(-500000, true); return r.isTotalCentimes === 0 && r.baseCentimes === 0; })());
ok("résultat nul → IS nul", calculerIS(0, true).isTotalCentimes === 0);

// --- bénéfice sous le seuil (éligible) : tout à 15 % ---
const r30k = calculerIS(30000 * EUR, true);
ok("30 000 € éligible → 4 500 € (15 %)", r30k.isTotalCentimes === 4500 * EUR);
ok("30 000 € : rien en tranche normale", r30k.trancheNormaleCentimes === 0);

// --- bénéfice au-dessus du seuil (éligible) : 15 % puis 25 % ---
const r50k = calculerIS(50000 * EUR, true);
// 42 500 * 15% = 6 375 € ; 7 500 * 25% = 1 875 € ; total 8 250 €
ok("50 000 € éligible → 8 250 €", r50k.isTotalCentimes === 8250 * EUR);
ok("50 000 € : tranche réduite = 42 500 €", r50k.trancheReduiteCentimes === 4_250_000);
ok("50 000 € : IS réduit = 6 375 €", r50k.isReduitCentimes === 6375 * EUR);
ok("50 000 € : IS normal = 1 875 €", r50k.isNormalCentimes === 1875 * EUR);

// --- non éligible : tout à 25 % ---
const r50kNon = calculerIS(50000 * EUR, false);
ok("50 000 € NON éligible → 12 500 € (25 %)", r50kNon.isTotalCentimes === 12500 * EUR);

// --- acomptes ---
ok("acompte = IS / 4", acompteTrimestrielIS(8250 * EUR) === Math.round(8250 * EUR / 4));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
