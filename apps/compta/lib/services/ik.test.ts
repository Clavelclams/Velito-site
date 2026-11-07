/**
 * Tests unitaires du SERVICE IK (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/ik.test.ts
 */
import {
  distanceVersCentikm,
  doublonsPossibles,
  formaterDistance,
  formaterTaux,
  libelleTrajet,
  montantTrajet,
  preparerTrajet,
  ressembleA,
  tauxVersDixmillimes,
  totalTrajets,
  type SaisieTrajet,
} from "./ik.ts";

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

// --- lecture des saisies -------------------------------------------------
ok("distance « 12,35 » → 1235 centièmes de km", distanceVersCentikm("12,35") === 1235);
ok("distance « 230 » → 23000", distanceVersCentikm("230") === 23000);
ok("distance « 1 250,5 » → 125050", distanceVersCentikm("1 250,5") === 125050);
ok("distance 0, négative, 3 décimales ou texte : refusée", [
  "0", "-5", "12,345", "douze", "",
].every((v) => distanceVersCentikm(v) === null));
ok("taux « 0,636 » → 6360 dix-millièmes", tauxVersDixmillimes("0,636") === 6360);
ok("taux « 0.3210 € » → 3210", tauxVersDixmillimes("0.3210 €") === 3210);
ok("taux vide, 0, 5 décimales ou > 10 €/km : refusé", ["", "0", "0,12345", "11"].every((v) => tauxVersDixmillimes(v) === null));
ok("formaterTaux(6360) = 0,636 ; formaterTaux(3000) = 0,30", formaterTaux(6360) === "0,636" && formaterTaux(3000) === "0,30");
ok("formaterDistance(1235) = 12,35 ; (23000) = 230", formaterDistance(1235) === "12,35" && formaterDistance(23000) === "230");

// --- montant et arrondi --------------------------------------------------
ok("12,35 km × 0,636 = 7,8546 € → 785 centimes", montantTrajet(1235, 6360) === 785);
ok("demi-centime arrondi vers le haut : 1 km × 0,005 = 0,5 c → 1 c", montantTrajet(100, 50) === 1);
ok("juste sous le demi : 1 km × 0,0049 → 0 c", montantTrajet(100, 49) === 0);
ok("230 km × 0,321 = 73,83 €", montantTrajet(23000, 3210) === 7383);
// [07/11/2026] Arrondi PAR trajet puis somme : 3 trajets de 1 km à 0,0055 €
// valent 1 c chacun (0,55 c arrondi), donc 3 c ; le calcul global sur 3 km
// donnerait 1,65 c → 2 c. On doit trouver 3.
{
  const t = [1, 2, 3].map(() => ({ montant_centimes: montantTrajet(100, 55) }));
  ok("arrondi par trajet PUIS addition (3 c, pas 2 c)", totalTrajets(t) === 3 && montantTrajet(300, 55) === 2);
}
ok("total d'une liste vide = 0", totalTrajets([]) === 0);

// --- préparation d'un trajet ---------------------------------------------
const base: SaisieTrajet = {
  entiteId: "e1",
  beneficiaire: "  Anthony   Dupont ",
  date: "2026-02-14",
  depart: "Amiens",
  arrivee: "Lille",
  motif: "Tournoi régional",
  distance: "230",
  allerRetour: true,
  taux: "0,321",
  commentaire: "",
};
const p1 = preparerTrajet(base);
ok("aller-retour coché : distance gardée telle quelle (230, pas 460)", p1.ok && p1.valeur.distance_km === "230.00");
ok("aller-retour coché : montant sur 230 km (73,83 €), pas doublé", p1.ok && p1.valeur.montant_centimes === 7383);
ok("la case est enregistrée (information)", p1.ok && p1.valeur.aller_retour === true);
const p2 = preparerTrajet({ ...base, allerRetour: false });
ok("même trajet sans la case : même montant", p2.ok && p1.ok && p2.valeur.montant_centimes === p1.valeur.montant_centimes);
ok("bénéficiaire nettoyé (espaces)", p1.ok && p1.valeur.beneficiaire === "Anthony Dupont");
ok("distance envoyée en texte exact « 12.35 »", (() => {
  const r = preparerTrajet({ ...base, distance: "12,35" });
  return r.ok && r.valeur.distance_km === "12.35";
})());
ok("taux absent : refusé (aucun taux par défaut)", !preparerTrajet({ ...base, taux: "" }).ok);
ok("distance absente : refusée", !preparerTrajet({ ...base, distance: "" }).ok);
ok("date impossible : refusée", !preparerTrajet({ ...base, date: "2026-02-30" }).ok);
ok("départ vide : refusé", !preparerTrajet({ ...base, depart: "  " }).ok);
ok("trajet qui vaut moins d'un centime : refusé", !preparerTrajet({ ...base, distance: "0,01", taux: "0,0001" }).ok);

// --- doublons ------------------------------------------------------------
const tr = (id: string, over: Partial<{ beneficiaire: string; date_trajet: string; depart: string; arrivee: string }> = {}) => ({
  id,
  beneficiaire: "Anthony",
  date_trajet: "2026-02-14",
  depart: "Amiens",
  arrivee: "Lille",
  ...over,
});
const d = doublonsPossibles([
  tr("a"),
  tr("b", { beneficiaire: "anthony ", depart: "AMIENS" }),
  tr("c", { date_trajet: "2026-02-15" }),
  tr("d", { arrivee: "Lille Grand Palais" }),
  tr("e", { beneficiaire: "Inès" }),
  tr("f", { depart: "Abbéville", arrivee: "Amiens" }),
  tr("g", { depart: "Abbeville", arrivee: "amiens" }),
]);
ok("même date, départ, arrivée, bénéficiaire (casse, espaces) : doublon", d.has("a") && d.has("b"));
ok("accents ignorés : Abbéville = Abbeville", d.has("f") && d.has("g"));
ok("autre date, autre arrivée, autre personne : pas doublon", !d.has("c") && !d.has("d") && !d.has("e"));
ok("exactement 4 trajets signalés", d.size === 4);
ok("ressembleA : signale le trajet existant, s'ignore lui-même", ressembleA(tr("x"), [tr("a"), tr("c", { date_trajet: "2026-02-15" })]).length === 1 && ressembleA(tr("a"), [tr("a")], "a").length === 0);
ok("libellé de ligne IK", libelleTrajet({ depart: "Amiens", arrivee: "Lille", motif: "Tournoi" }) === "Trajet Amiens → Lille (Tournoi)");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
