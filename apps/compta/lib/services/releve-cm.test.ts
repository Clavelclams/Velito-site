/**
 * Tests unitaires du SERVICE RELEVÉ CRÉDIT MUTUEL (fonctions pures, sans PDF).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/releve-cm.test.ts
 *
 * Les relevés sont FICTIFS : on reproduit la mise en page (positions des
 * colonnes mesurées sur un vrai relevé), jamais de donnée bancaire réelle.
 * Vérifié à part, hors dépôt, sur 12 vrais relevés : écart 0 sur chacun.
 */
import {
  categorieCertaine,
  libelleLisible,
  lireReleveCm,
  montantReleveVersCentimes,
  preparerImportReleve,
  tvaDepuisDetails,
  type LigneTexte,
} from "./releve-cm.ts";

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

// Positions réelles d'un relevé Crédit Mutuel (bord gauche, largeur).
let y = 800;
const L = (...el: [number, number, string][]): LigneTexte => ({
  page: 1,
  y: (y -= 11),
  elements: el.map(([x, largeur, texte]) => ({ x, largeur, texte })),
});
const ENTETE = () => L([63, 17, "Date"], [98, 43, "Date valeur"], [161, 38, "Opération"], [409, 51, "Débit EUROS"], [480, 54, "Crédit EUROS"]);
const SOLDE = (sens: string, date: string, montant: string) => L([158, 132, `SOLDE ${sens} AU ${date}`], [534 - 6 * montant.length, 6 * montant.length, montant]);
const DEBIT = (date: string, lib: string, montant: string) => L([52, 40, date], [100, 40, date], [148, 120, lib], [460 - 5 * montant.length, 5 * montant.length, montant]);
const CREDIT = (date: string, lib: string, montant: string) => L([52, 40, date], [100, 40, date], [148, 120, lib], [534 - 5 * montant.length, 5 * montant.length, montant]);
const DETAIL = (t: string) => L([148, 100, t]);
const MARGE = (t: string) => L([14, 6, t]);

function releveType(): LigneTexte[] {
  y = 800;
  return [
    ENTETE(),
    SOLDE("CREDITEUR", "31/07/2025", "211,13"),
    DEBIT("31/07/2025", "PAIEMENT CB 2807 PARIS", "24,00"),
    DETAIL("PLATEFORME ASSO CARTE 1234"),
    DEBIT("31/07/2025", "PAIEMENT CB 2807 PARIS", "24,00"),
    DETAIL("PLATEFORME ASSO CARTE 1234"),
    DEBIT("10/08/2025", "FACT SGT25026050009853", "5,37"),
    DETAIL("DONT TVA 0,43EUR"),
    CREDIT("12/08/2025", "VIR INST MME TEST", "1.040,00"),
    DETAIL("MME TEST"),
    MARGE("R"),
    DETAIL("COTISATION SAISON"),
    DETAIL("NOT PROVIDED"),
    DEBIT("20/08/2025", "3 PAIEMENTS 1808 SENLIS", "14,30"),
    DETAIL("SANEF AUTOROUTE CARTE 1234"),
    L([304, 81, "Total des mouvements"], [435, 25, "67,67"], [500, 34, "1.040,00"]),
    L([53, 32, "Réf : 008"], [158, 132, "SOLDE CREDITEUR AU 31/08/2025"], [500, 34, "1.183,46"]),
    L([371, 162, "IBAN : FR76 0000 0000 0000 0000 0000 000"]),
  ];
}

// --- montants -------------------------------------------------------------
ok("montant « 5,37 » → 537", montantReleveVersCentimes("5,37") === 537);
ok("montant « 1.234,56 » → 123456", montantReleveVersCentimes("1.234,56") === 123456);
ok("montant invalide « 12.5 » → null", montantReleveVersCentimes("12.5") === null);

// --- lecture d'un relevé type ---------------------------------------------
const r = lireReleveCm(releveType());
ok("relevé lu", r.ok);
if (r.ok) {
  const rel = r.releve;
  ok("ouverture 211,13 au 31/07", rel.ouverture.date === "2025-07-31" && rel.ouverture.soldeCentimes === 21113);
  ok("clôture 1 183,46 au 31/08", rel.cloture.date === "2025-08-31" && rel.cloture.soldeCentimes === 118346);
  ok("5 opérations (la ligne Total n'en est pas une)", rel.operations.length === 5);
  ok("débit reconnu par sa colonne", rel.operations[0]!.sens === "debit");
  ok("crédit reconnu par sa colonne", rel.operations[3]!.sens === "credit" && rel.operations[3]!.montantCentimes === 104000);
  ok("détails rattachés à leur opération", rel.operations[3]!.details.join("|") === "MME TEST|COTISATION SAISON|NOT PROVIDED");
  ok("lettre de marge ignorée", !rel.operations[3]!.details.includes("R"));
  ok("totaux débits / crédits", rel.totalDebitsCentimes === 6767 && rel.totalCreditsCentimes === 104000);
  ok("contrôle : écart 0", rel.ecartCentimes === 0);
}

// --- solde débiteur et solde nul ------------------------------------------
y = 800;
const debiteur = lireReleveCm([
  ENTETE(),
  SOLDE("NUL", "17/11/2024", ""),
  DEBIT("20/11/2024", "FACT SGT1", "5,37"),
  SOLDE("DEBITEUR", "30/11/2024", "5,37"),
]);
ok("solde nul = 0, solde débiteur négatif, écart 0", debiteur.ok && debiteur.releve.ouverture.soldeCentimes === 0 && debiteur.releve.cloture.soldeCentimes === -537 && debiteur.releve.ecartCentimes === 0);

// --- relevé mal lu : l'écart le dit ---------------------------------------
y = 800;
const faux = lireReleveCm([ENTETE(), SOLDE("CREDITEUR", "31/01/2025", "10,00"), DEBIT("05/02/2025", "X", "1,00"), SOLDE("CREDITEUR", "28/02/2025", "10,00")]);
ok("écart non nul détecté (−1,00 manquant)", faux.ok && faux.releve.ecartCentimes === 100);

// --- refus ---------------------------------------------------------------
y = 800;
ok("PDF sans colonnes Débit/Crédit refusé", !lireReleveCm([L([50, 100, "Facture n° 12"])]).ok);
y = 800;
ok("relevé sans soldes refusé", !lireReleveCm([ENTETE(), DEBIT("05/02/2025", "X", "1,00")]).ok);

// --- multi-pages : l'en-tête répété ne casse rien ------------------------
y = 800;
const p1 = [ENTETE(), SOLDE("CREDITEUR", "31/01/2025", "100,00"), DEBIT("03/02/2025", "A", "10,00")];
y = 800;
const p2 = [ENTETE(), CREDIT("04/02/2025", "B", "5,00"), SOLDE("CREDITEUR", "28/02/2025", "95,00")].map((l) => ({ ...l, page: 2 }));
const multi = lireReleveCm([...p1, ...p2]);
ok("relevé sur deux pages : 2 opérations, écart 0", multi.ok && multi.releve.operations.length === 2 && multi.releve.ecartCentimes === 0);

// --- préparation de l'import ---------------------------------------------
if (r.ok) {
  const lignes = preparerImportReleve(r.releve, { entiteId: "e1", compteId: "c1", nomFichier: "releve.pdf" });
  const [a, b, c, d, e] = lignes.map((l) => l.transaction);
  ok("paiement du 31/07 (jour d'ouverture) daté du 01/08", a!.date_transaction === "2025-08-01" && lignes[0]!.dateDecalee);
  ok("vraie date écrite en commentaire", (a!.commentaire ?? "").includes("Opération du 31/07/2025"));
  ok("clé garde la date imprimée", a!.source_cle === "releve-cm:2025-07-31|-2400|PAIEMENT CB 2807 PARIS|#1");
  ok("deux paiements identiques : rangs #1 et #2", b!.source_cle!.endsWith("|#2"));
  ok("opération du mois non décalée", c!.date_transaction === "2025-08-10" && !lignes[2]!.dateDecalee);
  ok("TVA lue dans « DONT TVA »", c!.montant_tva_centimes === 43);
  ok("crédit → recette, débit → dépense", d!.type === "recette" && a!.type === "depense");
  ok("compte et entité forcés", a!.compte_tresorerie_id === "c1" && a!.entite_id === "e1");
  ok("frais bancaires reconnus", lignes[2]!.categorie === "Frais bancaires");
  ok("péage reconnu", lignes[4]!.categorie === "Frais de déplacement" && e!.type === "depense");
  ok("virement de personne : pas de catégorie devinée", lignes[3]!.categorie === null);
  ok("aucune ligne n'arrive validée", lignes.every((l) => l.transaction.statut === undefined && l.transaction.categorie_id === null));
}

// --- libellé et détails ---------------------------------------------------
ok(
  "libellé lisible : détails utiles gardés, carte et bruit retirés",
  libelleLisible({ libelle: "VIR INST MME TEST", details: ["MME TEST", "COTISATION SAISON", "NOT PROVIDED", "ABCDEFGHIJKLMNOPQRST"] }) ===
    "VIR INST MME TEST · COTISATION SAISON",
);
ok("libellé : numéro de carte retiré", libelleLisible({ libelle: "PAIEMENT CB", details: ["MAGASIN CARTE 1234"] }) === "PAIEMENT CB · MAGASIN");
ok("TVA absente → 0", tvaDepuisDetails(["MME TEST"]) === 0);
ok("un crédit n'est jamais classé en frais", categorieCertaine({ libelle: "FACT SGT1", details: [], sens: "credit" }) === null);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
