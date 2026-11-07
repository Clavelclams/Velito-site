/**
 * Tests unitaires du service DOSSIER D'AG (fonctions pures, 07/11/2026).
 * Lancer depuis apps/compta :
 *   node scripts/test.mjs lib/services/dossier-ag.test.ts
 */
import {
  construireDossierAg,
  genererCsvIndexPieces,
  libellePiece,
  lireExercice,
  MENTION_REVUE,
  nomFichierIndexPieces,
  type EntreesDossierAg,
} from "./dossier-ag.ts";
import type { CompteTresorerie, SoldeObserve, Subvention, Transaction } from "@/types/database";

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

// ---------------------------------------------------------------------------
// Fabriques de données
// ---------------------------------------------------------------------------
let n = 0;
function tx(p: Partial<Transaction> & Pick<Transaction, "type" | "date_transaction" | "montant_ttc_centimes">): Transaction {
  n++;
  return {
    id: `t${n}`,
    entite_id: "e1",
    categorie_id: null,
    statut: "validee",
    libelle: `Ligne ${n}`,
    montant_tva_centimes: 0,
    montant_ht_centimes: p.montant_ttc_centimes,
    compte_tresorerie_id: "cc",
    virement_id: null,
    source_fichier: null,
    source_ref: null,
    source_cle: null,
    commentaire: null,
    subvention_id: null,
    cree_le: "2026-01-01T00:00:00Z",
    modifie_le: "2026-01-01T00:00:00Z",
    ...p,
  };
}

function compte(p: Partial<CompteTresorerie> & Pick<CompteTresorerie, "id" | "nom">): CompteTresorerie {
  return {
    entite_id: "e1",
    nature: "courant",
    solde_initial_centimes: 100000,
    date_solde_initial: "2025-01-01",
    active: true,
    cree_le: "2025-01-01T00:00:00Z",
    ...p,
  };
}

function sub(p: Partial<Subvention> & Pick<Subvention, "id">): Subvention {
  return {
    entite_id: "e1",
    financeur: "FDVA",
    action: "Fonctionnement",
    exercice: 2026,
    statut: "notifiee",
    montant_demande_centimes: 300000,
    montant_notifie_centimes: 250000,
    date_depot: null,
    date_notification: null,
    echeance: null,
    commentaire: null,
    cree_le: "2026-01-01T00:00:00Z",
    modifie_le: "2026-01-01T00:00:00Z",
    ...p,
  };
}

const categories = [
  { id: "cot", nom: "Cotisations" },
  { id: "sub", nom: "Subventions publiques" },
  { id: "dep", nom: "Déplacements" },
  { id: "fou", nom: "Fournitures" },
];

const transactions: Transaction[] = [
  // Exercice précédent : compte dans le solde au 1er janvier, pas dans le résultat.
  tx({ type: "recette", date_transaction: "2025-06-01", montant_ttc_centimes: 20000, categorie_id: "cot" }),
  // Exercice 2026
  tx({ id: "r1", type: "recette", date_transaction: "2026-02-10", montant_ttc_centimes: 50000, categorie_id: "cot" }),
  tx({ id: "r2", type: "recette", date_transaction: "2026-03-05", montant_ttc_centimes: 150000, categorie_id: "sub", subvention_id: "s1" }),
  tx({ id: "r3", type: "recette", date_transaction: "2026-04-01", montant_ttc_centimes: 3000, categorie_id: null, statut: "a_classer" }),
  tx({ id: "d1", type: "depense", date_transaction: "2026-02-15", montant_ttc_centimes: 12000, categorie_id: "dep", statut: "a_verifier" }),
  tx({ id: "d2", type: "depense", date_transaction: "2026-05-20", montant_ttc_centimes: 8000, categorie_id: "fou" }),
  tx({ id: "d3", type: "depense", date_transaction: "2026-06-01", montant_ttc_centimes: 2500, categorie_id: null, statut: "a_classer" }),
  tx({ id: "d4", type: "depense", date_transaction: "2026-06-02", montant_ttc_centimes: 1500, categorie_id: "dep", compte_tresorerie_id: null }),
  // Virement interne courant → livret de 1 000 € (deux jambes)
  tx({ id: "v1a", type: "depense", date_transaction: "2026-07-01", montant_ttc_centimes: 100000, virement_id: "v1", libelle: "Épargne" }),
  tx({ id: "v1b", type: "recette", date_transaction: "2026-07-01", montant_ttc_centimes: 100000, virement_id: "v1", libelle: "Épargne", compte_tresorerie_id: "liv" }),
  // Exercice suivant : ignoré
  tx({ type: "depense", date_transaction: "2027-01-03", montant_ttc_centimes: 999, categorie_id: "dep" }),
];

const comptes = [
  compte({ id: "cc", nom: "Compte courant" }),
  compte({ id: "liv", nom: "Livret", nature: "livret", solde_initial_centimes: null, date_solde_initial: null }),
  // Ouvert en cours d'exercice
  compte({ id: "cai", nom: "Caisse", nature: "caisse", solde_initial_centimes: 5000, date_solde_initial: "2026-09-01" }),
];

const observations: SoldeObserve[] = [
  { id: "o1", entite_id: "e1", compte_id: "cc", date_releve: "2026-06-30", solde_centimes: 270000, reference: "Relevé 6", cree_le: "" },
];

const base: EntreesDossierAg = {
  entite: { nom: "VEA", type_juridique: "association" },
  exercice: 2026,
  aujourdHui: "2027-02-15",
  transactions,
  categories,
  comptes,
  observations,
  subventions: [
    sub({ id: "s1" }),
    sub({ id: "s2", financeur: "Ville", statut: "deposee", montant_notifie_centimes: null, montant_demande_centimes: 100000 }),
    sub({ id: "s3", exercice: 2025 }),
  ],
  contributions: [
    { type: "heures_benevoles", statut: "verifie", valeur_centimes: 12000, minutes: 600, date_contribution: "2026-03-01", taux_horaire_centimes: 1200 },
    { type: "heures_benevoles", statut: "verifie", valeur_centimes: 4500, minutes: 180, date_contribution: "2026-04-01", taux_horaire_centimes: 1500 },
    { type: "heures_benevoles", statut: "a_verifier", valeur_centimes: 9999, minutes: 500, date_contribution: "2026-05-01", taux_horaire_centimes: 2000 },
    { type: "don_nature", statut: "verifie", valeur_centimes: 8000, minutes: null, date_contribution: "2026-06-01", taux_horaire_centimes: null },
    { type: "frais_abandonnes", statut: "annule", valeur_centimes: 7000, minutes: null, date_contribution: "2026-06-01", taux_horaire_centimes: null },
    { type: "don_nature", statut: "verifie", valeur_centimes: 5555, minutes: null, date_contribution: "2025-06-01", taux_horaire_centimes: null },
  ],
  nbJustificatifs: { r1: 1, r2: 2, d1: 1 },
};

const d = construireDossierAg(base);

// ---------------------------------------------------------------------------
// Page de garde
// ---------------------------------------------------------------------------
ok("garde : structure, forme, exercice, date d'édition", d.garde.nomStructure === "VEA" && d.garde.formeJuridique === "Association loi 1901" && d.garde.exercice === 2026 && d.garde.dateEdition === "2027-02-15");
ok("garde : mention de revue exacte", d.garde.mention === MENTION_REVUE && MENTION_REVUE.includes("relève du vote de l'assemblée générale"));

// ---------------------------------------------------------------------------
// Compte de résultat
// ---------------------------------------------------------------------------
ok("virements exclus du résultat : recettes = 500 + 1 500 + 30 €", d.resultat.recettes.total === 203000);
ok("virements exclus du résultat : dépenses = 120 + 80 + 25 + 15 €", d.resultat.depenses.total === 24000);
ok("virements exclus : deux jambes écartées, comptées à part", d.resultat.nbVirementsExclus === 2);
ok("résultat = recettes − dépenses", d.resultat.resultat === 203000 - 24000);
ok("lignes non classées isolées (recettes)", d.resultat.recettes.nonClasse.montant === 3000 && d.resultat.recettes.nonClasse.nbLignes === 1 && d.resultat.recettes.nonClasse.libelle === "Non classé");
ok("lignes non classées isolées (dépenses)", d.resultat.depenses.nonClasse.montant === 2500 && d.resultat.depenses.nonClasse.nbLignes === 1);
ok("aucune ligne « Non classé » dans le détail par catégorie", d.resultat.recettes.lignes.every((l) => l.categorieId !== null));
const sommeR = d.resultat.recettes.lignes.reduce((s, l) => s + l.montant, 0) + d.resultat.recettes.nonClasse.montant;
const sommeD = d.resultat.depenses.lignes.reduce((s, l) => s + l.montant, 0) + d.resultat.depenses.nonClasse.montant;
ok("totaux justes : somme des catégories + non classé = total (recettes)", sommeR === d.resultat.recettes.total);
ok("totaux justes : somme des catégories + non classé = total (dépenses)", sommeD === d.resultat.depenses.total);
const nbLignesResultat = [...d.resultat.recettes.lignes, d.resultat.recettes.nonClasse, ...d.resultat.depenses.lignes, d.resultat.depenses.nonClasse].reduce((s, l) => s + l.nbLignes, 0);
ok("une ligne ne compte jamais deux fois (7 opérations hors virements)", nbLignesResultat === 7);
ok("regroupement par catégorie : Déplacements = 120 + 15 €", d.resultat.depenses.lignes.find((l) => l.categorieId === "dep")?.montant === 13500);
ok("exercices voisins ignorés (2025 et 2027)", d.index.every((l) => l.date.startsWith("2026-")));

const renomme = construireDossierAg({ ...base, categories: categories.map((c) => (c.id === "dep" ? { ...c, nom: "Transports" } : c)) });
ok("un renommage ne change aucun total", renomme.resultat.depenses.total === d.resultat.depenses.total && renomme.resultat.resultat === d.resultat.resultat);
ok("un renommage change le libellé affiché", renomme.resultat.depenses.lignes.some((l) => l.categorieId === "dep" && l.libelle === "Transports"));

const categorieDisparue = construireDossierAg({ ...base, categories: categories.filter((c) => c.id !== "fou") });
ok("catégorie introuvable : la ligne passe en Non classé, total inchangé", categorieDisparue.resultat.depenses.total === 24000 && categorieDisparue.resultat.depenses.nonClasse.montant === 10500);

// ---------------------------------------------------------------------------
// Trésorerie
// ---------------------------------------------------------------------------
const cc = d.tresorerie.comptes.find((c) => c.id === "cc")!;
ok("solde au 1er janvier : initial 1 000 € + recette 2025 de 200 €", cc.soldeDebut === 120000 && cc.dateSoldeDebut === "2026-01-01");
ok("recettes du compte hors virements", cc.recettes === 203000);
ok("dépenses du compte hors virements (sans la ligne sans compte)", cc.depenses === 22500);
ok("virement émis compté à part sur le compte", cc.virementsEmis === 100000 && cc.virementsRecus === 0);
// Au 30/06, calcul : 1 200 + 2 030 − 225 = 3 005 € ; relevé lu 2 700 € → écart −305 €.
ok("dernier relevé et son écart (observé − calculé)", cc.dernierReleve?.solde === 270000 && cc.dernierReleve?.ecart === 270000 - 300500);
// Au 31/12 : repart du relevé du 30/06 (2 700 €) − virement 1 000 € = 1 700 €.
ok("solde au 31 décembre repris du dernier relevé lu", cc.soldeFin === 170000);

const liv = d.tresorerie.comptes.find((c) => c.id === "liv")!;
ok("solde initial inconnu restitué null (« à compléter »), jamais 0", liv.soldeDebut === null && liv.soldeFin === null);
ok("compte sans relevé : dernier relevé null", liv.dernierReleve === null);

const cai = d.tresorerie.comptes.find((c) => c.id === "cai")!;
ok("compte ouvert en cours d'année : solde initial à sa date", cai.soldeDebut === 5000 && cai.dateSoldeDebut === "2026-09-01" && cai.soldeFin === 5000);

ok("virement listé une seule fois, source → destination", d.tresorerie.virements.length === 1 && d.tresorerie.virements[0]!.compteSource === "Compte courant" && d.tresorerie.virements[0]!.compteDestination === "Livret" && d.tresorerie.virements[0]!.montant === 100000);
ok("opérations sans compte comptées à part", d.tresorerie.sansCompte.nb === 1 && d.tresorerie.sansCompte.depenses === 1500);

const ouvertApres = construireDossierAg({ ...base, comptes: [...comptes, compte({ id: "fut", nom: "Futur", date_solde_initial: "2027-03-01" })] });
ok("compte ouvert après l'exercice, sans mouvement : absent", !ouvertApres.tresorerie.comptes.some((c) => c.id === "fut"));

// ---------------------------------------------------------------------------
// Subventions
// ---------------------------------------------------------------------------
ok("subventions : seuls les dossiers de l'exercice", d.subventions.lignes.length === 2);
const s1 = d.subventions.lignes.find((l) => l.id === "s1")!;
ok("subvention : demandé, notifié, encaissé, reste", s1.demande === 300000 && s1.notifie === 250000 && s1.encaisse === 150000 && s1.resteAEncaisser === 100000 && s1.libelleStatut === "Notifiée");
const s2 = d.subventions.lignes.find((l) => l.id === "s2")!;
ok("subvention au notifié inconnu : notifié et reste null", s2.notifie === null && s2.resteAEncaisser === null);
ok("totaux subventions : notifié inconnu non compté comme 0", d.subventions.totaux.demande === 400000 && d.subventions.totaux.notifie === 250000 && d.subventions.totaux.encaisse === 150000);
ok("reste total : connu 1 000 €, un reste inconnu", d.subventions.resteAEncaisser === 100000 && d.subventions.resteInconnu === 1);

// ---------------------------------------------------------------------------
// Contributions en nature
// ---------------------------------------------------------------------------
ok("seules les fiches vérifiées comptent : heures 120 + 45 €", d.contributions.heures.valeur === 16500 && d.contributions.heures.nbFiches === 2);
ok("heures vérifiées : 13 h (780 minutes)", d.contributions.heures.minutes === 780);
ok("dons vérifiés de l'exercice seulement", d.contributions.dons.valeur === 8000 && d.contributions.dons.nbFiches === 1);
ok("frais abandonnés annulés : non comptés", d.contributions.fraisAbandonnes.valeur === 0);
ok("total contributions = somme des types", d.contributions.total === 16500 + 8000);
ok("taux horaires distincts listés (fiches vérifiées)", JSON.stringify(d.contributions.tauxHoraires) === JSON.stringify([1200, 1500]));
ok("fiches non vérifiées signalées", d.contributions.nonVerifiees === 1);

// ---------------------------------------------------------------------------
// Contrôles
// ---------------------------------------------------------------------------
ok("grille de 12 mois par compte", d.controles.comptes.length === 3 && d.controles.comptes.every((c) => c.mois.length === 12));
ok("juin du compte courant : écart détecté", d.controles.comptes.find((c) => c.id === "cc")!.mois[5]!.etat === "ecart");
ok("statuts : 2 à classer, 1 à valider, 4 validées (hors virements)", d.controles.statuts.a_classer === 2 && d.controles.statuts.a_verifier === 1 && d.controles.statuts.validee === 4);
ok("dépenses sans justificatif : d2, d3, d4", d.controles.depensesSansJustificatif === 3 && d.controles.depensesEnException === 0);
ok("colonne exception absente : signalée", d.controles.colonneExceptionPresente === false);

const avecException = construireDossierAg({
  ...base,
  transactions: transactions.map((t) =>
    Object.assign({}, t, { exception_justificatif: t.id === "d3" ? "Frais bancaires prélevés" : null }),
  ),
});
ok("colonne exception présente : dépense en exception comptée à part", avecException.controles.colonneExceptionPresente && avecException.controles.depensesEnException === 1 && avecException.controles.depensesSansJustificatif === 2);
const ligneD3 = avecException.index.find((l) => l.id === "d3")!;
ok("index : « exception : motif »", libellePiece(ligneD3.piece) === "exception : Frais bancaires prélevés");

// ---------------------------------------------------------------------------
// Index des pièces et CSV
// ---------------------------------------------------------------------------
ok("index : toutes les opérations de l'exercice, virements compris", d.index.length === 9);
ok("index trié par date", d.index.every((l, i) => i === 0 || d.index[i - 1]!.date <= l.date));
ok("index : nombre de justificatifs", d.index.find((l) => l.id === "r2")!.nbJustificatifs === 2 && libellePiece(d.index.find((l) => l.id === "r2")!.piece) === "2 justificatifs");
ok("index : pièce manquante", libellePiece(d.index.find((l) => l.id === "d2")!.piece) === "pièce manquante");
ok("index : catégorie « Non classé » et « Virement interne »", d.index.find((l) => l.id === "d3")!.categorie === "Non classé" && d.index.find((l) => l.id === "v1a")!.categorie === "Virement interne");

const csv = genererCsvIndexPieces(d.index);
const lignesCsv = csv.split("\r\n");
ok("CSV : en-tête au format Excel FR (séparateur ;)", lignesCsv[0] === "Date;Type;Libellé;Montant;Catégorie;Compte;Statut;Justificatifs;Pièce");
ok("CSV : une ligne par opération + fin de fichier", lignesCsv.length === d.index.length + 2 && lignesCsv[lignesCsv.length - 1] === "");
ok("CSV : date française et montant à la virgule", lignesCsv[1]!.startsWith("10/02/2026;Recette;") && lignesCsv[1]!.includes(";500,00;"));
ok("CSV : compte inconnu « à compléter »", csv.includes(";à compléter;"));
const csvEchappe = genererCsvIndexPieces([{ ...d.index[0]!, libelle: 'Achat "urgent"; matériel' }]);
ok("CSV : champ avec ; et guillemets échappé", csvEchappe.includes('"Achat ""urgent""; matériel"'));
ok("nom de fichier assaini", nomFichierIndexPieces("Vélito Esport", 2026) === "index_pieces_Velito_Esport_2026.csv");

// ---------------------------------------------------------------------------
// Année sans opération
// ---------------------------------------------------------------------------
const vide = construireDossierAg({ ...base, exercice: 2030, aujourdHui: "2031-01-10" });
ok("année sans opération : résultat 0, sections vides", vide.resultat.recettes.total === 0 && vide.resultat.depenses.total === 0 && vide.resultat.resultat === 0 && vide.resultat.recettes.lignes.length === 0);
ok("année sans opération : index, subventions et contributions vides", vide.index.length === 0 && vide.subventions.lignes.length === 0 && vide.contributions.total === 0);
ok("année sans opération : aucun virement, aucune dépense sans pièce", vide.tresorerie.virements.length === 0 && vide.controles.depensesSansJustificatif === 0);
ok("année sans opération : soldes reportés (1 700 € − 9,99 € de 2027)", vide.tresorerie.comptes.find((c) => c.id === "cc")!.soldeDebut === 169001);
ok("année sans opération : CSV réduit à l'en-tête", genererCsvIndexPieces(vide.index).split("\r\n").length === 2);

const rien = construireDossierAg({ ...base, transactions: [], comptes: [], observations: [], subventions: [], contributions: [], nbJustificatifs: {} });
ok("structure vide : dossier construit sans erreur", rien.tresorerie.comptes.length === 0 && rien.controles.comptes.length === 0 && rien.resultat.resultat === 0);

// ---------------------------------------------------------------------------
// Paramètre d'exercice
// ---------------------------------------------------------------------------
ok("exercice lu depuis ?exercice=2025", lireExercice("2025", "2026-11-07") === 2025);
ok("exercice absent ou invalide : année en cours", lireExercice(null, "2026-11-07") === 2026 && lireExercice("abc", "2026-11-07") === 2026 && lireExercice("1999", "2026-11-07") === 2026);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
