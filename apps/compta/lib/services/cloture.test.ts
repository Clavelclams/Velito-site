/**
 * Tests unitaires du SERVICE CLÔTURE (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/cloture.test.ts
 *
 * On prouve : les quatre dimensions sont indépendantes (« validé » ne vaut ni
 * pointage ni justification), virement et caisse dispensés à bon escient,
 * mois sans mouvement jamais terminé d'office, checklist et liens, signature
 * à la microseconde, instantané hors virements.
 */
import {
  checklistCloture,
  compterBlocages,
  construireInstantane,
  controleSoldesDecembre,
  estExerciceTermine,
  etatLigne,
  exercicesProposes,
  horodatageEnMicrosecondes,
  lignesAPointerDuMois,
  lignesSansJustification,
  moisTermines,
  preparerException,
  preparerPointage,
  referenceReleve,
  signatureExercice,
  validerMotifCloture,
  validerMotifReouverture,
  type DonneesExercice,
  type LigneControlee,
} from "./cloture.ts";
import type { CompteTresorerie } from "@/types/database";

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

function compte(over: Partial<CompteTresorerie> = {}): CompteTresorerie {
  return {
    id: "banque",
    entite_id: "e1",
    nom: "Courant",
    nature: "courant",
    solde_initial_centimes: 100000,
    date_solde_initial: "2025-01-01",
    active: true,
    cree_le: "",
    ...over,
  };
}

let n = 0;
function ligne(date: string, type: "recette" | "depense", centimes: number, over: Partial<LigneControlee> = {}): LigneControlee {
  n++;
  return {
    id: `t${n}`,
    entite_id: "e1",
    categorie_id: "cat",
    type,
    statut: "validee",
    date_transaction: date,
    libelle: "x",
    montant_ttc_centimes: centimes,
    montant_tva_centimes: 0,
    montant_ht_centimes: centimes,
    compte_tresorerie_id: "banque",
    virement_id: null,
    source_fichier: null,
    source_ref: null,
    source_cle: null,
    commentaire: null,
    subvention_id: null,
    cree_le: "",
    modifie_le: "2026-01-05T10:00:00.000001+00:00",
    pointe_le: "2025-12-31",
    pointe_ref: "Relevé 12",
    exception_justificatif: "Frais visibles sur le relevé",
    ...over,
  };
}

// --- quatre dimensions indépendantes -------------------------------------
const parfaite = ligne("2025-03-10", "depense", 500);
const e0 = etatLigne(parfaite, "courant", false);
ok("ligne complète : rien ne bloque", !e0.bloquante && e0.pointage === "ok" && e0.justification === "ok");
const validee = etatLigne(ligne("2025-03-10", "depense", 500, { pointe_le: null, pointe_ref: null, exception_justificatif: null }), "courant", false);
ok("validée ne vaut ni pointage ni justification", validee.validation === "ok" && validee.pointage === "manquant" && validee.justification === "manquant" && validee.bloquante);
ok("pièce jointe = justifiée sans exception", etatLigne(ligne("2025-03-10", "depense", 1, { exception_justificatif: null }), "courant", true).justification === "ok");
ok("exception de 9 caractères : pas une justification", etatLigne(ligne("2025-03-10", "depense", 1, { exception_justificatif: "123456789" }), "courant", false).justification === "manquant");
ok("référence de pointage de 2 caractères : pas pointée", etatLigne(ligne("2025-03-10", "depense", 1, { pointe_ref: "AB" }), "courant", false).pointage === "manquant");
ok("caisse : pointage dispensé", etatLigne(ligne("2025-03-10", "depense", 1, { pointe_le: null, pointe_ref: null }), "caisse", false).pointage === "dispense");
ok("livret : pointage exigé", etatLigne(ligne("2025-03-10", "depense", 1, { pointe_le: null, pointe_ref: null }), "livret", false).pointage === "manquant");
const jambe = etatLigne(ligne("2025-03-10", "depense", 1, { virement_id: "v", categorie_id: null, exception_justificatif: null, pointe_le: null, pointe_ref: null }), "courant", false);
ok("virement : catégorie et pièce dispensées, pointage exigé sur la banque", jambe.classement === "dispense" && jambe.justification === "dispense" && jambe.pointage === "manquant");
const sansCompte = etatLigne(ligne("2025-03-10", "depense", 1, { compte_tresorerie_id: null }), null, false);
ok("sans compte : bloque", sansCompte.sansCompte && sansCompte.bloquante);
ok("à classer : classement et validation manquants", (() => {
  const e = etatLigne(ligne("2025-03-10", "depense", 1, { statut: "a_classer", categorie_id: null }), "courant", false);
  return e.classement === "manquant" && e.validation === "manquant";
})());

// --- exercice terminé ----------------------------------------------------
ok("2025 terminé le 01/01/2026", estExerciceTermine(2025, "2026-01-01"));
ok("2025 pas terminé le 31/12/2025", !estExerciceTermine(2025, "2025-12-31"));

// --- signature -----------------------------------------------------------
ok("horodatage Supabase à la microseconde", horodatageEnMicrosecondes("1970-01-01T00:00:01.000002+00:00") === 1000002);
ok("horodatage avec fuseau +01:00", horodatageEnMicrosecondes("1970-01-01T01:00:00+01:00") === 0);
ok("horodatage format texte Postgres (« +00 »)", horodatageEnMicrosecondes("1970-01-01 00:00:00.5+00") === 500000);
ok("horodatage illisible → null", horodatageEnMicrosecondes("hier") === null);
const sig = signatureExercice(
  [
    ligne("2025-01-02", "recette", 1000, { modifie_le: "2026-01-05T10:00:00.000002+00:00" }),
    ligne("2025-06-02", "depense", 300, { modifie_le: "2026-01-05T10:00:00.000009+00:00" }),
    ligne("2026-01-02", "depense", 99999, { modifie_le: "2027-01-01T00:00:00+00:00" }),
  ],
  2025,
);
ok("signature : nombre | somme signée | max(modifie_le) de l'exercice seul", sig === `2|700|${horodatageEnMicrosecondes("2026-01-05T10:00:00.000009+00:00")}`);
ok("signature d'un exercice vide : 0|0|0", signatureExercice([], 2024) === "0|0|0");
ok("une microseconde de plus change la signature",
  signatureExercice([ligne("2025-01-02", "recette", 1, { modifie_le: "2026-01-05T10:00:00.000001+00:00" })], 2025) !==
  signatureExercice([ligne("2025-01-02", "recette", 1, { modifie_le: "2026-01-05T10:00:00.000002+00:00" })], 2025));

// --- jeu d'exercice complet ---------------------------------------------
// Courant : 1 000,00 au 01/01/2025, une recette de 50,00 en mars, frais
// 5,37 en décembre, un virement de 20,00 vers la caisse en juin. Relevé au
// 31/12 : 1 000 + 50 − 5,37 − 20 = 1 024,63.
const banque = compte();
const caisse = compte({ id: "caisse", nom: "Caisse", nature: "caisse", solde_initial_centimes: 0 });
function jeu(): LigneControlee[] {
  return [
    ligne("2025-03-10", "recette", 5000, { categorie_id: "cotis" }),
    ligne("2025-12-05", "depense", 537, { categorie_id: "frais" }),
    ligne("2025-06-01", "depense", 2000, { virement_id: "v1", categorie_id: null, exception_justificatif: null }),
    ligne("2025-06-01", "recette", 2000, { virement_id: "v1", categorie_id: null, exception_justificatif: null, compte_tresorerie_id: "caisse", pointe_le: null, pointe_ref: null }),
    ligne("2026-02-01", "depense", 100, { pointe_le: null, pointe_ref: null }),
  ];
}
function donnees(over: Partial<DonneesExercice> = {}): DonneesExercice {
  return {
    entiteId: "e1",
    annee: 2025,
    aujourdHui: "2026-11-07",
    comptes: [banque, caisse],
    lignes: jeu(),
    idsAvecPiece: new Set(),
    observations: [{ compte_id: "banque", date_releve: "2025-12-31", solde_centimes: 102463, reference: "Relevé décembre" }],
    ...over,
  };
}

const cl = checklistCloture(donnees());
ok("checklist verte quand tout est en ordre", cl.toutVert && cl.nbBlocages === 0);
ok("checklist : 4 lignes 2025 comptées (2026 exclue)", cl.nbLignes === 4);
ok("checklist : la signature est celle de l'exercice", cl.signature === signatureExercice(jeu(), 2025));

const pasFini = checklistCloture(donnees({ aujourdHui: "2025-12-31" }));
ok("exercice pas terminé : 1 blocage", !pasFini.toutVert && pasFini.points.find((p) => p.code === "exercice_termine")!.nombre === 1);

const sale = donnees({
  lignes: [
    ...jeu(),
    ligne("2025-04-01", "depense", 100, { statut: "a_classer", categorie_id: null }),
    ligne("2025-04-02", "depense", 100, { compte_tresorerie_id: null }),
    ligne("2025-04-03", "depense", 100, { pointe_le: null, pointe_ref: null, exception_justificatif: null }),
  ],
});
const clSale = checklistCloture(sale);
const pt = (code: string) => clSale.points.find((p) => p.code === code)!;
ok("compteurs : 1 non validée, 1 non classée, 1 sans compte", pt("non_validees").nombre === 1 && pt("non_classees").nombre === 1 && pt("sans_compte").nombre === 1);
ok("compteurs : 1 non justifiée, 1 non pointée", pt("non_justifiees").nombre === 1 && pt("non_pointees").nombre === 1);
ok("lien de pointage vers le bon compte et le premier mois", pt("non_pointees").lien === "/e1/tresorerie/banque/pointage?mois=2025-04");
ok("lien des lignes sans compte", pt("sans_compte").lien === "/e1/transactions?compte=sans");
ok("lien des justificatifs filtré sur l'exercice", pt("non_justifiees").lien === "/e1/transactions/sans-justificatif?exercice=2025");
ok("les lignes ajoutées faussent aussi le solde de décembre", pt("soldes_decembre").nombre === 1 && pt("soldes_decembre").sousPoints[0]!.lien === "/e1/tresorerie/banque?annee=2025");
ok("un point vert n'a pas de lien", cl.points.every((p) => p.lien === null));
const cpt = compterBlocages(sale.lignes, sale.comptes, sale.idsAvecPiece);
ok("compterBlocages compte toutes les années fournies (dont 2026 non pointée)", cpt.nonPointees === 2);

// --- concordance de décembre ---------------------------------------------
ok("relevé de décembre absent → releve_manquant", controleSoldesDecembre([banque], jeu(), [], 2025)[0]!.etat === "releve_manquant");
ok("écart de 1 centime → ecart", controleSoldesDecembre([banque], jeu(), [{ compte_id: "banque", date_releve: "2025-12-31", solde_centimes: 102464, reference: null }], 2025)[0]!.etat === "ecart");
ok("solde initial inconnu sans relevé antérieur → solde_initial_inconnu",
  controleSoldesDecembre([compte({ solde_initial_centimes: null, date_solde_initial: null })], jeu(), [{ compte_id: "banque", date_releve: "2025-12-31", solde_centimes: 1, reference: null }], 2025)[0]!.etat === "solde_initial_inconnu");
ok("repart du relevé précédent (solde initial inconnu)",
  controleSoldesDecembre([compte({ solde_initial_centimes: null, date_solde_initial: null })], jeu(),
    [{ compte_id: "banque", date_releve: "2025-11-30", solde_centimes: 1000, reference: null },
     { compte_id: "banque", date_releve: "2025-12-31", solde_centimes: 463, reference: null }], 2025)[0]!.etat === "concorde");
ok("caisse non concernée", controleSoldesDecembre([caisse], jeu(), [], 2025).length === 0);
ok("livret ouvert après l'exercice : non concerné", controleSoldesDecembre([compte({ id: "l", nature: "livret", date_solde_initial: "2026-03-01" })], [], [], 2025).length === 0);
ok("compte archivé sans ligne dans l'exercice : non concerné", controleSoldesDecembre([compte({ active: false })], [], [], 2025).length === 0);

// --- mois terminés -------------------------------------------------------
const releves = [
  { compte_id: "banque", date_releve: "2025-03-31", solde_centimes: 105000, reference: null },
  { compte_id: "banque", date_releve: "2025-12-31", solde_centimes: 102463, reference: null },
];
const mois = moisTermines(donnees({ observations: releves }));
ok("mars : relevé concordant, lignes en ordre → terminé", mois[2]!.termine);
ok("avril : sans mouvement et sans relevé → PAS terminé", !mois[3]!.termine && mois[3]!.raisons.some((r) => r.includes("relevé du mois à saisir")));
ok("décembre : terminé", mois[11]!.termine);
const moisEnCours = moisTermines(donnees({ annee: 2026, observations: releves }));
ok("mois en cours : pas terminé", !moisEnCours[10]!.termine && moisEnCours[10]!.raisons[0] === "Mois pas encore terminé.");
const moisSale = moisTermines(donnees({ observations: releves, lignes: [...jeu(), ligne("2025-03-15", "depense", 1, { statut: "a_verifier" })] }));
ok("mars avec une ligne à valider : pas terminé, raison donnée", !moisSale[2]!.termine && moisSale[2]!.raisons.includes("1 ligne non validée"));
const sansBanque = moisTermines(donnees({ comptes: [caisse], observations: [] }));
ok("aucun compte bancaire : aucun mois terminé d'office", sansBanque.every((m) => !m.termine));

// --- instantané ----------------------------------------------------------
const inst = construireInstantane(donnees(), [
  { id: "cotis", nom: "Cotisations", type: "recette" },
  { id: "frais", nom: "Frais bancaires", type: "depense" },
]);
ok("instantané : recettes et dépenses hors virements", inst.recettesCentimes === 5000 && inst.depensesCentimes === 537 && inst.resultatCentimes === 4463);
ok("instantané : totaux par catégorie", inst.categories.length === 2 && inst.categories.find((c) => c.nom === "Cotisations")!.totalCentimes === 5000);
ok("instantané : solde de la banque au 31/12", inst.soldes.find((s) => s.compteId === "banque")!.soldeCentimes === 102463);
ok("instantané : solde de la caisse au 31/12 (virement reçu)", inst.soldes.find((s) => s.compteId === "caisse")!.soldeCentimes === 2000);
ok("instantané : nombre de lignes et signature", inst.nbLignes === 4 && inst.signature === cl.signature && inst.exercice === 2025);
ok("instantané : 12 contrôles mensuels par compte", inst.controles.length === 2 && inst.controles.every((c) => c.mois.length === 12));
ok("instantané : JSON sans perte", JSON.stringify(JSON.parse(JSON.stringify(inst))) === JSON.stringify(inst));
ok("instantané : solde inconnu reste null", construireInstantane(donnees({ comptes: [compte({ solde_initial_centimes: null, date_solde_initial: null })], observations: [] }), []).soldes[0]!.soldeCentimes === null);

// --- saisies -------------------------------------------------------------
ok("motif de clôture vide refusé", !validerMotifCloture("   ").ok);
ok("motif de clôture accepté et nettoyé", (() => { const r = validerMotifCloture("  Comptes revus "); return r.ok && r.valeur === "Comptes revus"; })());
ok("motif de réouverture de 9 caractères refusé", !validerMotifReouverture("123456789").ok);
ok("motif de réouverture de 10 caractères accepté", validerMotifReouverture("1234567890").ok);
ok("pointage : référence trop courte refusée", !preparerPointage({ date_transaction: "2025-03-10" }, { date: "2025-03-31", reference: "ab" }).ok);
ok("pointage : relevé antérieur à l'opération refusé", !preparerPointage({ date_transaction: "2025-03-10" }, { date: "2025-03-01", reference: "Relevé" }).ok);
ok("pointage : date impossible refusée", !preparerPointage({ date_transaction: "2025-02-10" }, { date: "2025-02-30", reference: "Relevé" }).ok);
ok("pointage valide", (() => { const r = preparerPointage({ date_transaction: "2025-03-10" }, { date: "2025-03-31", reference: " Relevé  03 " }); return r.ok && r.valeur.pointe_ref === "Relevé 03"; })());
ok("référence par défaut d'un relevé sans référence", referenceReleve("2025-03-31", null) === "Relevé au 31/03/2025");
ok("exception de 9 caractères refusée", !preparerException("123456789").ok);
ok("exception de 10 caractères acceptée", preparerException("1234567890").ok);
ok("exception vide = retrait (null)", (() => { const r = preparerException(""); return r.ok && r.valeur === null; })());

const aPointer = jeu().map((t) => ({ ...t, pointe_le: null, pointe_ref: null }));
const lot = lignesAPointerDuMois(aPointer, "banque", "2025-06", { etat: "concorde", observe: { date: "2025-06-15", solde: 0, reference: null } });
ok("pointer le mois : seulement le compte, le mois, jusqu'au relevé", lot.ok && lot.valeur.ids.length === 1 && lot.valeur.champs.pointe_le === "2025-06-15");
const avantRelevé = lignesAPointerDuMois(aPointer, "banque", "2025-12", { etat: "concorde", observe: { date: "2025-12-01", solde: 0, reference: null } });
ok("pointer le mois : une opération postérieure au relevé n'est pas pointée", avantRelevé.ok && avantRelevé.valeur.ids.length === 0);
ok("pointer le mois refusé si le relevé ne concorde pas", !lignesAPointerDuMois(aPointer, "banque", "2025-06", { etat: "ecart", observe: { date: "2025-06-30", solde: 0, reference: null } }).ok);

const sansPiece = lignesSansJustification(sale.lignes, new Set(), 2025);
ok("sans justification : exercice filtré, virements exclus", sansPiece.length === 1 && sansPiece[0]!.date_transaction === "2025-04-03");
ok("exercices proposés : de la plus ancienne ligne à l'année en cours", exercicesProposes([{ date_transaction: "2023-05-01" }], "2026-11-07").join() === "2026,2025,2024,2023");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
