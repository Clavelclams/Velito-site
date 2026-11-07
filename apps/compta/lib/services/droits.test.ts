/**
 * Tests unitaires du service DROITS (fonctions pures).
 * Lancer depuis apps/compta :
 *   node scripts/test.mjs lib/services/droits.test.ts
 */
import { estProprietaireRole, MESSAGE_LECTURE_SEULE, peutEcrireRole } from "./droits.ts";

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

ok("propriétaire : peut écrire", peutEcrireRole("proprietaire") === true);
ok("trésorier : peut écrire", peutEcrireRole("tresorier") === true);
ok("lecteur : ne peut pas écrire", peutEcrireRole("lecteur") === false);
ok("aucun rôle (null) : ne peut pas écrire", peutEcrireRole(null) === false);
ok("rôle absent (undefined) : ne peut pas écrire", peutEcrireRole(undefined) === false);
ok("propriétaire : est propriétaire", estProprietaireRole("proprietaire") === true);
ok("trésorier : n'est pas propriétaire", estProprietaireRole("tresorier") === false);
ok("lecteur : n'est pas propriétaire", estProprietaireRole("lecteur") === false);
ok("null : n'est pas propriétaire", estProprietaireRole(null) === false);
ok("message : tutoiement, sans tiret cadratin", MESSAGE_LECTURE_SEULE.includes("tu ne peux pas") && !MESSAGE_LECTURE_SEULE.includes("—"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
