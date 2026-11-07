/**
 * Tests unitaires du SERVICE NOTES DE FRAIS (fonctions pures, sans base).
 * Lancer depuis apps/compta :   node scripts/test.mjs lib/services/notes-de-frais.test.ts
 */
import {
  candidatesLigne,
  candidatesRemboursement,
  categorieDeplacement,
  cleSourceLigne,
  controlerTransition,
  estModifiable,
  exercicesDesNotes,
  filtrerNotes,
  idsPris,
  ligneDepuisOperation,
  ligneDepuisTrajet,
  peutPreparerCorrection,
  preparerAbandon,
  preparerCorrection,
  preparerLigne,
  preparerNote,
  preparerRemboursement,
  preparerValidation,
  totalNote,
  totauxParNote,
  transitionPermise,
  TRANSITIONS,
} from "./notes-de-frais.ts";
import { horsVirements, soldeAu } from "./tresorerie.ts";
import type { CompteTresorerie, Transaction } from "@/types/database";
import type { LigneNoteFrais, NoteFrais, StatutNoteFrais } from "@/types/notes-de-frais";

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

const AVANCES = "cpt-avances";
const COURANT = "cpt-courant";

function note(over: Partial<NoteFrais> = {}): NoteFrais {
  return {
    id: "n1",
    entite_id: "e1",
    numero: "NDF-2026-001",
    annee_numero: 2026,
    rang: 1,
    beneficiaire: "Anthony",
    objet: "Tournoi de février",
    date_note: "2026-02-15",
    statut: "a_verifier",
    motif_refus: null,
    date_renonciation: null,
    contribution_id: null,
    transaction_remboursement_id: null,
    virement_id: null,
    correction_de: null,
    commentaire: null,
    cree_le: "",
    modifie_le: "",
    ...over,
  };
}
function ligne(over: Partial<LigneNoteFrais> = {}): LigneNoteFrais {
  return {
    id: "l1",
    entite_id: "e1",
    note_id: "n1",
    origine: "saisie",
    date_depense: "2026-02-12",
    libelle: "Péage A16",
    categorie_id: "c-depl",
    montant_ttc_centimes: 870,
    transaction_id: null,
    trajet_id: null,
    cree_le: "",
    modifie_le: "",
    ...over,
  };
}
function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    entite_id: "e1",
    categorie_id: null,
    type: "depense",
    statut: "a_classer",
    date_transaction: "2026-02-10",
    libelle: "CB LEROY MERLIN",
    montant_ttc_centimes: 4590,
    montant_tva_centimes: 0,
    montant_ht_centimes: 4590,
    compte_tresorerie_id: null,
    virement_id: null,
    source_fichier: null,
    source_ref: null,
    source_cle: "releve-cm:x",
    commentaire: null,
    subvention_id: null,
    pointe_le: null,
    pointe_ref: null,
    exception_justificatif: null,
    cree_le: "",
    modifie_le: "",
    ...over,
  };
}
const cats = [
  { id: "c-depl", nom: "Frais de déplacement", type: "depense" as const, active: true },
  { id: "c-fourn", nom: "Fournitures", type: "depense" as const, active: true },
  { id: "c-rec", nom: "Cotisations", type: "recette" as const, active: true },
];

// --- totaux ----------------------------------------------------------------
ok("total = somme des lignes", totalNote([ligne(), ligne({ montant_ttc_centimes: 4590 }), ligne({ montant_ttc_centimes: 785 })]) === 6245);
ok("total d'une note vide = 0", totalNote([]) === 0);
{
  const m = totauxParNote([ligne(), ligne({ montant_ttc_centimes: 100 }), ligne({ note_id: "n2", montant_ttc_centimes: 5 })]);
  ok("totaux par note en une passe", m.get("n1") === 970 && m.get("n2") === 5 && !m.has("n3"));
}

// --- transitions -----------------------------------------------------------
const tous: StatutNoteFrais[] = ["brouillon", "a_verifier", "validee", "remboursee", "refusee", "abandonnee"];
ok("brouillon → à vérifier permis", transitionPermise("brouillon", "a_verifier"));
ok("à vérifier → brouillon, validée, refusée permis", ["brouillon", "validee", "refusee"].every((s) => transitionPermise("a_verifier", s as StatutNoteFrais)));
ok("validée → remboursée, abandonnée permis", transitionPermise("validee", "remboursee") && transitionPermise("validee", "abandonnee"));
ok("brouillon → validée refusé (il faut soumettre)", !transitionPermise("brouillon", "validee"));
ok("brouillon → remboursée refusé", !transitionPermise("brouillon", "remboursee"));
ok("à vérifier → remboursée refusé (valider d'abord)", !transitionPermise("a_verifier", "remboursee"));
ok("validée → brouillon refusé", !transitionPermise("validee", "brouillon"));
ok("remboursée, abandonnée, refusée : états finaux", ["remboursee", "abandonnee", "refusee"].every((de) => tous.every((v) => !transitionPermise(de as StatutNoteFrais, v))));
ok("graphe complet : 6 transitions en tout", Object.values(TRANSITIONS).flat().length === 6);
ok("modifiable : brouillon et à vérifier seulement", estModifiable({ statut: "brouillon" }) && estModifiable({ statut: "a_verifier" }) && !estModifiable({ statut: "validee" }) && !estModifiable({ statut: "remboursee" }));
ok("correction : depuis remboursée, abandonnée, refusée", ["remboursee", "abandonnee", "refusee"].every((s) => peutPreparerCorrection({ statut: s as StatutNoteFrais })) && !peutPreparerCorrection({ statut: "validee" }));
ok("soumettre une note vide : refusé", controlerTransition(note({ statut: "brouillon" }), "a_verifier", [], cats) !== null);
ok("soumettre avec une ligne : permis", controlerTransition(note({ statut: "brouillon" }), "a_verifier", [ligne()], cats) === null);
ok("valider avec une ligne sans catégorie : refusé", controlerTransition(note(), "validee", [ligne({ categorie_id: null })], cats)?.includes("sans catégorie") === true);
ok("valider avec une catégorie de recette : refusé", controlerTransition(note(), "validee", [ligne({ categorie_id: "c-rec" })], cats) !== null);
ok("valider une note complète : permis", controlerTransition(note(), "validee", [ligne()], cats) === null);
ok("refuser sans motif : refusé", controlerTransition(note(), "refusee", [ligne()], cats, " ") !== null);
ok("refuser avec motif : permis", controlerTransition(note(), "refusee", [ligne()], cats, "Ticket illisible") === null);
ok("message lisible pour une transition interdite", controlerTransition(note({ statut: "brouillon" }), "remboursee", [], cats)?.includes("« Brouillon »") === true);

// --- saisie ----------------------------------------------------------------
const pn = preparerNote({ entiteId: "e1", beneficiaire: "  Anthony ", objet: "Tournoi", date: "2026-02-15", commentaire: "" });
ok("note : bénéficiaire nettoyé, commentaire vide = null", pn.ok && pn.valeur.beneficiaire === "Anthony" && pn.valeur.commentaire === null);
ok("note sans bénéficiaire ou date fausse : refusée", !preparerNote({ entiteId: "e1", beneficiaire: "", objet: "x", date: "2026-13-01", commentaire: "" }).ok);
const pl = preparerLigne({ date: "2026-02-12", libelle: "Péage", categorieId: "c-depl", montant: "8,70" }, note(), cats);
ok("ligne libre : 8,70 € → 870 centimes, origine saisie", pl.ok && pl.valeur.montant_ttc_centimes === 870 && pl.valeur.origine === "saisie");
ok("ligne : catégorie de recette refusée", !preparerLigne({ date: "2026-02-12", libelle: "x", categorieId: "c-rec", montant: "1" }, note(), cats).ok);
ok("ligne : montant 0 refusé", !preparerLigne({ date: "2026-02-12", libelle: "x", categorieId: "", montant: "0" }, note(), cats).ok);
ok("ligne : sans catégorie acceptée en brouillon (null)", (() => {
  const r = preparerLigne({ date: "2026-02-12", libelle: "x", categorieId: "", montant: "1" }, note(), cats);
  return r.ok && r.valeur.categorie_id === null;
})());
const lo = ligneDepuisOperation(tx(), note());
ok("ligne depuis une opération sans compte : montant et date de l'opération", lo.ok && lo.valeur.montant_ttc_centimes === 4590 && lo.valeur.date_depense === "2026-02-10" && lo.valeur.transaction_id === "t1");
ok("opération déjà sur un compte de l'association : refusée", !ligneDepuisOperation(tx({ compte_tresorerie_id: COURANT }), note()).ok);
ok("recette : refusée", !ligneDepuisOperation(tx({ type: "recette" }), note()).ok);
ok("virement : refusé", !ligneDepuisOperation(tx({ virement_id: "v" }), note()).ok);
ok("opération d'une autre structure : refusée", !ligneDepuisOperation(tx({ entite_id: "e2" }), note()).ok);
ok("catégorie « Frais de déplacement » trouvée", categorieDeplacement(cats) === "c-depl");
ok("pas de catégorie déplacement : null (aucune invention)", categorieDeplacement([cats[1]]) === null);
const trajet = { id: "tr1", entite_id: "e1", beneficiaire: "anthony", date_trajet: "2026-02-14", depart: "Amiens", arrivee: "Lille", motif: "Tournoi", montant_centimes: 785 };
const lt = ligneDepuisTrajet(trajet, note(), "c-depl");
ok("trajet rattaché : ligne « ik », catégorie déplacement, montant du trajet", lt.ok && lt.valeur.origine === "ik" && lt.valeur.categorie_id === "c-depl" && lt.valeur.montant_ttc_centimes === 785 && lt.valeur.trajet_id === "tr1");
ok("trajet d'une autre personne : refusé", !ligneDepuisTrajet({ ...trajet, beneficiaire: "Inès" }, note(), null).ok);

// --- validation vers « Avances des membres » --------------------------------
const lignesNote = [
  ligne({ id: "l1" }),
  ligne({ id: "l2", origine: "operation", transaction_id: "t1", libelle: "CB LEROY MERLIN", montant_ttc_centimes: 4590, categorie_id: "c-fourn" }),
  ligne({ id: "l3", origine: "ik", trajet_id: "tr1", montant_ttc_centimes: 785 }),
];
const pv = preparerValidation(note(), lignesNote, [tx()], cats, AVANCES);
ok("validation : 2 dépenses à créer (libre + IK), 1 opération à rattacher", pv.ok && pv.valeur.aCreer.length === 2 && pv.valeur.aRattacher.length === 1);
if (pv.ok) {
  const [c1, c2] = pv.valeur.aCreer;
  ok("dépense créée : compte Avances, type dépense, statut « à valider »", c1.transaction.compte_tresorerie_id === AVANCES && c1.transaction.type === "depense" && c1.transaction.statut === "a_verifier");
  ok("dépense créée : clé source par ligne (relance sans doublon)", c1.transaction.source_cle === cleSourceLigne("l1") && c2.transaction.source_cle === "ndf-ligne:l3");
  ok("dépense créée : libellé préfixé du numéro", c1.transaction.libelle === "NDF-2026-001 Péage A16");
  ok("IK créée comme dépense", c2.transaction.montant_ttc_centimes === 785 && c2.transaction.type === "depense");
  const r = pv.valeur.aRattacher[0];
  ok("opération liée : PAS recréée, rattachée au compte Avances", r.transactionId === "t1" && r.champs.compte_tresorerie_id === AVANCES);
  ok("opération « à classer » : reçoit la catégorie de la ligne, passe « à valider »", r.champs.categorie_id === "c-fourn" && r.champs.statut === "a_verifier");
  ok("opération liée : commentaire mentionne la note", r.champs.commentaire.includes("NDF-2026-001"));
  // Pas de double comptage : dépenses sur Avances = total de la note.
  const depensesAvances = pv.valeur.aCreer.reduce((s, c) => s + c.transaction.montant_ttc_centimes, 0) + 4590;
  ok("dépenses portées par le compte Avances = total de la note (6 245)", depensesAvances === totalNote(lignesNote));
}
ok("opération déjà validée dans la même catégorie : reste validée", (() => {
  const r = preparerValidation(note(), [lignesNote[1]], [tx({ statut: "validee", categorie_id: "c-fourn" })], cats, AVANCES);
  return r.ok && r.valeur.aRattacher[0].champs.statut === "validee" && r.valeur.aRattacher[0].champs.categorie_id === "c-fourn";
})());
ok("opération validée dans une autre catégorie : catégorie de la note, repasse « à valider »", (() => {
  const r = preparerValidation(note(), [lignesNote[1]], [tx({ statut: "validee", categorie_id: "c-depl" })], cats, AVANCES);
  return r.ok && r.valeur.aRattacher[0].champs.statut === "a_verifier" && r.valeur.aRattacher[0].champs.categorie_id === "c-fourn";
})());
ok("relance : opération déjà sur Avances acceptée", preparerValidation(note(), [lignesNote[1]], [tx({ compte_tresorerie_id: AVANCES })], cats, AVANCES).ok);
ok("opération passée entre-temps sur le compte courant : refus", !preparerValidation(note(), [lignesNote[1]], [tx({ compte_tresorerie_id: COURANT })], cats, AVANCES).ok);
ok("montant de l'opération modifié entre-temps : refus", !preparerValidation(note(), [lignesNote[1]], [tx({ montant_ttc_centimes: 4500 })], cats, AVANCES).ok);
ok("opération liée disparue : refus", !preparerValidation(note(), [lignesNote[1]], [], cats, AVANCES).ok);
ok("note en brouillon : validation refusée", !preparerValidation(note({ statut: "brouillon" }), lignesNote, [tx()], cats, AVANCES).ok);

// --- remboursement ----------------------------------------------------------
const virRemb = tx({ id: "t-vir", libelle: "VIR REMBOURSEMENT ANTHONY", montant_ttc_centimes: 6245, compte_tresorerie_id: COURANT, statut: "a_classer", date_transaction: "2026-03-05" });
const pr = preparerRemboursement(note({ statut: "validee" }), 6245, virRemb, AVANCES, "v-1");
ok("montant égal : l'opération du relevé devient la jambe courant → Avances", pr.ok && pr.valeur.majOriginale.virement_id === "v-1" && pr.valeur.majOriginale.statut === "validee" && pr.valeur.majOriginale.categorie_id === null);
ok("contrepartie : recette sur le compte Avances, même montant, même date", pr.ok && pr.valeur.contrepartie.type === "recette" && pr.valeur.contrepartie.compte_tresorerie_id === AVANCES && pr.valeur.contrepartie.montant_ttc_centimes === 6245 && pr.valeur.contrepartie.date_transaction === "2026-03-05");
{
  const ecart = preparerRemboursement(note({ statut: "validee" }), 6245, { ...virRemb, montant_ttc_centimes: 6200 }, AVANCES, "v-1");
  ok("montant différent : refusé avec l'écart affiché", !ecart.ok && ecart.erreurs[0].includes("écart") && ecart.erreurs[0].includes("0,45"));
}
ok("note pas validée : remboursement refusé", !preparerRemboursement(note({ statut: "a_verifier" }), 6245, virRemb, AVANCES, "v").ok);
ok("recette choisie : refusée", !preparerRemboursement(note({ statut: "validee" }), 6245, { ...virRemb, type: "recette" }, AVANCES, "v").ok);
ok("opération sans compte : refusée (pas de paiement fictif)", !preparerRemboursement(note({ statut: "validee" }), 6245, { ...virRemb, compte_tresorerie_id: null }, AVANCES, "v").ok);
ok("déjà un virement : refusé", !preparerRemboursement(note({ statut: "validee" }), 6245, { ...virRemb, virement_id: "v0" }, AVANCES, "v").ok);
ok("ligne du compte Avances choisie : refusée", !preparerRemboursement(note({ statut: "validee" }), 6245, { ...virRemb, compte_tresorerie_id: AVANCES }, AVANCES, "v").ok);

// [07/11/2026] Scénario complet de non double comptage, avec les vraies
// fonctions de trésorerie : dépenses de l'association = le ticket, une fois ;
// le compte Avances revient à zéro après remboursement.
if (pv.ok && pr.ok) {
  const creees = pv.valeur.aCreer.map((c, i) => ({ ...tx({ id: `c${i}` }), ...c.transaction }) as Transaction);
  const rattachee = { ...tx(), ...pv.valeur.aRattacher[0].champs } as Transaction;
  const vir = { ...virRemb, ...pr.valeur.majOriginale } as Transaction;
  const contre = { ...tx({ id: "t-contre" }), ...pr.valeur.contrepartie } as Transaction;
  const toutes = [...creees, rattachee, vir, contre];
  const depenses = horsVirements(toutes).filter((t) => t.type === "depense").reduce((s, t) => s + t.montant_ttc_centimes, 0);
  const recettes = horsVirements(toutes).filter((t) => t.type === "recette").reduce((s, t) => s + t.montant_ttc_centimes, 0);
  ok("dépenses de l'association = total de la note (une seule fois), recettes = 0", depenses === 6245 && recettes === 0);
  const compteAvances: CompteTresorerie = { id: AVANCES, entite_id: "e1", nom: "Avances des membres", nature: "autre", solde_initial_centimes: 0, date_solde_initial: "2026-01-01", active: true, cree_le: "" };
  ok("compte Avances : solde 0 après remboursement", soldeAu(compteAvances, toutes, "2026-12-31") === 0);
  ok("compte Avances : solde −62,45 € avant remboursement (dette envers le membre)", soldeAu(compteAvances, toutes, "2026-03-04") === -6245);
}

// --- candidates ---------------------------------------------------------------
const comptes = [
  { id: COURANT, nature: "courant" as const },
  { id: AVANCES, nature: "autre" as const },
];
const cands = candidatesRemboursement(
  [
    tx({ id: "x1", compte_tresorerie_id: COURANT, montant_ttc_centimes: 100, date_transaction: "2026-03-10" }),
    tx({ id: "x2", compte_tresorerie_id: COURANT, montant_ttc_centimes: 6245, date_transaction: "2026-03-01" }),
    tx({ id: "x3", compte_tresorerie_id: AVANCES, montant_ttc_centimes: 6245 }),
    tx({ id: "x4", compte_tresorerie_id: null, montant_ttc_centimes: 6245 }),
    tx({ id: "x5", compte_tresorerie_id: COURANT, type: "recette" }),
    tx({ id: "x6", compte_tresorerie_id: COURANT, virement_id: "v" }),
  ],
  comptes,
  AVANCES,
  6245,
);
ok("remboursement : dépenses bancaires seulement, bon montant d'abord", cands.map((c) => c.id).join(",") === "x2,x1");
const cl = candidatesLigne([tx({ id: "y1" }), tx({ id: "y2" }), tx({ id: "y3", compte_tresorerie_id: COURANT }), tx({ id: "y4", type: "recette" })], new Set(["y2"]));
ok("ligne : dépenses sans compte, pas déjà prises", cl.map((c) => c.id).join(",") === "y1");
{
  const pris = idsPris(
    [ligne({ note_id: "n1", transaction_id: "a" }), ligne({ note_id: "n2", transaction_id: "b" }), ligne({ note_id: "n1", trajet_id: "tr" })],
    [note({ id: "n1" }), note({ id: "n2", statut: "refusee" })],
    "transaction_id",
  );
  ok("opérations d'une note refusée : de nouveau disponibles", pris.has("a") && !pris.has("b") && pris.size === 1);
}

// --- abandon -----------------------------------------------------------------
const pa = preparerAbandon(note({ statut: "validee" }), 6245, "2026-03-20", "2026-11-07");
ok("abandon : fiche frais abandonnés, valeur = total, à vérifier", pa.ok && pa.valeur.type === "frais_abandonnes" && pa.valeur.valeur_centimes === 6245 && pa.valeur.statut === "a_verifier");
ok("abandon : date de renonciation renseignée, clé ndf:<id>", pa.ok && pa.valeur.date_renonciation === "2026-03-20" && pa.valeur.source_cle === "ndf:n1");
ok("abandon : la fiche explique l'extinction de la dette, sans encaissement", pa.ok && (pa.valeur.commentaire ?? "").includes("éteinte"));
ok("abandon sans date de renonciation : refusé", !preparerAbandon(note({ statut: "validee" }), 6245, "", "2026-11-07").ok);
ok("abandon daté dans le futur : refusé", !preparerAbandon(note({ statut: "validee" }), 6245, "2026-12-01", "2026-11-07").ok);
ok("abandon d'une note non validée : refusé", !preparerAbandon(note({ statut: "a_verifier" }), 6245, "2026-03-20", "2026-11-07").ok);

// --- correction ----------------------------------------------------------------
const pc = preparerCorrection(note({ statut: "remboursee" }), lignesNote.map((l) => ({ ...l, transaction_id: l.transaction_id ?? "cree" })));
ok("correction d'une note remboursée : brouillon lié à l'original", pc.ok && pc.valeur.note.correction_de === "n1" && pc.valeur.lignes.length === 3);
ok("correction d'une note remboursée : aucun lien repris (pas de double comptage)", pc.ok && pc.valeur.lignes.every((l) => l.transaction_id === null && l.trajet_id === null && l.origine === "saisie"));
const pcr = preparerCorrection(note({ statut: "refusee" }), lignesNote);
ok("correction d'une note refusée : liens repris (rien n'était en compta)", pcr.ok && pcr.valeur.lignes[1].transaction_id === "t1" && pcr.valeur.lignes[2].trajet_id === "tr1");
ok("correction d'une note validée : refusée", !preparerCorrection(note({ statut: "validee" }), lignesNote).ok);

// --- recherche et filtres ---------------------------------------------------------
const notes = [
  note({ id: "a", numero: "NDF-2026-001", beneficiaire: "Anthony", objet: "Tournoi", statut: "brouillon" }),
  note({ id: "b", numero: "NDF-2026-002", beneficiaire: "Inès", objet: "Goûter des bénévoles", statut: "remboursee" }),
  note({ id: "c", numero: "NDF-2025-001", beneficiaire: "Bob", objet: "Matériel", date_note: "2025-12-01", statut: "remboursee" }),
];
ok("recherche par numéro", filtrerNotes(notes, { recherche: "2026-002" }).map((n) => n.id).join() === "b");
ok("recherche par bénéficiaire, accents ignorés", filtrerNotes(notes, { recherche: "ines" }).map((n) => n.id).join() === "b");
ok("recherche par objet", filtrerNotes(notes, { recherche: "MATÉRIEL" }).map((n) => n.id).join() === "c");
ok("filtre statut", filtrerNotes(notes, { statut: "remboursee" }).length === 2);
ok("filtre exercice", filtrerNotes(notes, { exercice: "2025" }).map((n) => n.id).join() === "c");
ok("filtres combinés", filtrerNotes(notes, { statut: "remboursee", exercice: "2026", recherche: "in" }).map((n) => n.id).join() === "b");
ok("statut inconnu ignoré", filtrerNotes(notes, { statut: "nimporte" }).length === 3);
ok("exercices présents, du plus récent", exercicesDesNotes(notes).join() === "2026,2025");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
