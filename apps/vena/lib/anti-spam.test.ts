/**
 * Tests de l'anti-spam (fonctions pures).
 * Lancer depuis apps/vena :  node --experimental-strip-types lib/anti-spam.test.ts
 * Les exemples « robot » sont les vrais motifs trouvés en base le 13/11/2026.
 */
import { detecterRobot, ressembleACharabia, DELAI_MINIMUM_MS } from "./anti-spam.ts";

let pass = 0;
let fail = 0;
function ok(label: string, c: boolean) {
  if (c) pass++;
  else fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${label}`);
}

ok("charabia réel : budget du 06/2026", ressembleACharabia("NOzXXluQVXWMITYXGgTQZNTb"));
ok("charabia réel : budget du 08/2026", ressembleACharabia("bZJOtWPaQBwyAhnaz"));
ok("phrase normale", !ressembleACharabia("Site vitrine pour mon restaurant à Amiens"));
ok("budget normal", !ressembleACharabia("1 500€, à discuter"));
ok("nom propre long en majuscules", !ressembleACharabia("ANTICONSTITUTIONNELLEMENT"));
ok("mot composé long", !ressembleACharabia("Saint-Valery-sur-Somme"));
ok("CamelCase court", !ressembleACharabia("WordPress"));
ok("vide", !ressembleACharabia(""));

const base = { potDeMiel: "", afficheA: 1_000, recuA: 1_000 + DELAI_MINIMUM_MS + 5_000, champs: ["Bonjour, un devis svp"] };
ok("humain normal", detecterRobot(base).robot === false);
ok("pot de miel rempli", JSON.stringify(detecterRobot({ ...base, potDeMiel: "http://spam" })) === '{"robot":true,"raison":"pot_de_miel"}');
ok("envoyé en 1 seconde", detecterRobot({ ...base, recuA: base.afficheA + 1_000 }).robot === true);
ok("sans horodatage (envoi forgé)", detecterRobot({ ...base, afficheA: undefined }).robot === true);
ok("horodatage dans le futur", detecterRobot({ ...base, afficheA: base.recuA + 10 }).robot === true);
ok("charabia dans un champ", detecterRobot({ ...base, champs: ["ok", "apkapLbKnxAtukuOkjsHF"] }).robot === true);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
