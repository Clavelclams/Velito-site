/**
 * Tests du calcul d'avancement des projets (fonctions pures).
 * Lancer depuis apps/hub :  node --experimental-strip-types src/lib/projets/avancement.test.ts
 */
import { avancement, parLot, prochaineEtape, slugifier } from "./avancement.ts";

let pass = 0;
let fail = 0;
function ok(label: string, c: boolean) {
  if (c) pass++;
  else fail++;
  console.log(`  ${c ? "PASS" : "FAIL"}  ${label}`);
}

const e = (statut: "a_faire" | "en_cours" | "fait" | "abandonne", poids = 1, lot: string | null = null, ordre = 0, titre = "x") =>
  ({ statut, poids, lot, ordre, titre });

ok("aucune étape → 0 %", avancement([]).pourcentage === 0);
ok("1 faite sur 2 → 50 %", avancement([e("fait"), e("a_faire")]).pourcentage === 50);
ok("pondéré : fait(3) + à faire(1) → 75 %", avancement([e("fait", 3), e("a_faire", 1)]).pourcentage === 75);
ok("abandonnée hors calcul", avancement([e("fait"), e("abandonne", 5)]).pourcentage === 100);
ok("en cours ne compte pas comme fait", avancement([e("en_cours"), e("fait")]).pourcentage === 50);
ok("poids hors bornes ramené à 1..5", avancement([e("fait", 99), e("a_faire", 0)]).pourcentage === 83);
const a = avancement([e("fait"), e("en_cours"), e("a_faire"), e("abandonne")]);
ok("compteurs fait/en cours/à faire/total", a.fait === 1 && a.enCours === 1 && a.aFaire === 1 && a.total === 3);

const lots = parLot([e("fait", 1, "Stores", 2), e("a_faire", 1, null, 3), e("fait", 1, "Serveur", 1), e("a_faire", 1, "Stores", 4)]);
ok("lots dans l'ordre du premier élément", lots.map((l) => l.lot).join(",") === "Serveur,Stores,Général");
ok("étapes regroupées", lots[1]!.etapes.length === 2);

ok("prochaine étape : l'en cours d'abord", prochaineEtape([e("a_faire", 1, null, 1, "A"), e("en_cours", 1, null, 2, "B")])!.titre === "B");
ok("prochaine étape : sinon la première à faire", prochaineEtape([e("fait", 1, null, 1), e("a_faire", 1, null, 3, "C"), e("a_faire", 1, null, 2, "D")])!.titre === "D");
ok("prochaine étape : null si tout est fait", prochaineEtape([e("fait")]) === null);

ok("slug sans accents", slugifier("Venaball Club (app staff)") === "venaball-club-app-staff");
ok("slug : Compta Nova éè", slugifier("  Compta Nova éè ") === "compta-nova-ee");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
