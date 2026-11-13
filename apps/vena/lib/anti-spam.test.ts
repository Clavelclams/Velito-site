/**
 * Tests de l'anti-spam (fonctions pures).
 * Lancer depuis apps/vena :  node --experimental-strip-types lib/anti-spam.test.ts
 * Les exemples « robot » sont les vrais motifs trouvés en base le 13/11/2026.
 */
import { detecterRobot, ressembleACharabia, DELAI_MINIMUM_MS, indicesHameconnage, SEUIL_HAMECONNAGE } from "./anti-spam.ts";

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

// [13/11/2026] Hameçonnage : les deux vrais envois reçus (domaines différents).
const arnaque = (lien: string) => ({
  email: "alexis.felten4569@probox.my.id",
  budget: "15 000 – 30 000 $",
  message: `La location de caméras, son et lumière pour les captations d'événements à Amiens. Le catalogue est accessible ici : ${lien}`,
});
ok("arnaque reçue le 10/11 (gopartage)", indicesHameconnage(arnaque("https://gopartage.online/fr/mkt/velito")).length >= SEUIL_HAMECONNAGE);
ok("arnaque reçue le 12/11 (unpartage)", indicesHameconnage(arnaque("https://unpartage.online/fr/mkt/velito")).length >= SEUIL_HAMECONNAGE);
ok("même arnaque avec un autre domaine et une adresse gmail", indicesHameconnage({ ...arnaque("https://autrechose.site/x/velito"), email: "a@gmail.com" }).length >= SEUIL_HAMECONNAGE);
ok("même réseau, faux « Otelium » du 29/10 (prodmail.online, monpartage)",
  indicesHameconnage({ email: "nicolas.hocquet2003@prodmail.online", budget: "15 000 – 30 000 $", message: "Le catalogue est accessible ici : https://monpartage.online/fr/mkt/velito" }).length >= 3);
ok("vrai client qui colle le lien de son site : un seul indice, accepté",
  indicesHameconnage({ email: "gerant@boulangerie-amiens.fr", budget: "1 500 €", message: "Notre site actuel : https://boulangerie-amiens.fr, on veut le refaire." }).length < SEUIL_HAMECONNAGE);
ok("client étranger qui parle en dollars sans lien : accepté",
  indicesHameconnage({ email: "x@company.com", budget: "2000 $", message: "We need a website." }).length < SEUIL_HAMECONNAGE);
ok("lien vers velito.fr : pas externe", !indicesHameconnage({ email: "a@b.fr", budget: "", message: "vu sur https://velito.fr/realisations" }).includes("lien_externe"));
ok("detecterRobot renvoie hameconnage",
  JSON.stringify(detecterRobot({ ...base, ...arnaque("https://gopartage.online/fr/mkt/velito") })) === '{"robot":true,"raison":"hameconnage"}');

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
