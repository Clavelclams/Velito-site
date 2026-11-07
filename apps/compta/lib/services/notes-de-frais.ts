/**
 * SERVICE NOTES DE FRAIS (07/11/2026) — fonctions PURES, aucune base.
 *
 * Règles (cahier des charges « Gestion Compta Nova » d'un trésorier, plus le
 * cas réel de VEA) :
 *  1. une note = un bénéficiaire (la personne qui a avancé l'argent), un
 *     objet, une date, un numéro NDF-AAAA-NNN attribué par la BASE, des
 *     lignes ; total = somme des lignes ;
 *  2. une ligne peut être liée à une opération déjà en compta (ticket importé
 *     sans compte, payé avec la carte d'un membre) ; aucune ligne n'est un
 *     calcul kilométrique : les IK viennent du module séparé (services/ik) ;
 *  3. PAS DE DOUBLE COMPTAGE. La dépense réelle, c'est le ticket. À la
 *     validation, chaque ligne devient une dépense sur le compte « Avances
 *     des membres » (compte réel de nature « autre », un seul par structure).
 *     Le remboursement n'est PAS une seconde dépense : l'opération bancaire
 *     réelle (« VIR REMBOURSEMENT ») devient un virement interne courant →
 *     Avances, exclu des totaux (même mécanique que preparerConversionVirement).
 *     Après remboursement, le compte Avances revient à zéro pour cette note ;
 *  4. jamais de paiement fictif : « remboursée » exige l'opération bancaire
 *     réelle, d'un montant ÉGAL au total ;
 *  5. abandon : le membre renonce par écrit au remboursement. Sa créance est
 *     éteinte par son don : fiche contribution_nature « frais_abandonnes »,
 *     aucun encaissement fictif ;
 *  6. une note remboursée ou abandonnée ne se modifie plus : on prépare une
 *     correction (nouveau brouillon copié), l'original reste.
 *
 * Tests : node scripts/test.mjs lib/services/notes-de-frais.test.ts
 */
import type {
  Categorie,
  CompteTresorerie,
  NouvelleContribution,
  NouvelleTransaction,
  StatutTransaction,
  Transaction,
} from "@/types/database";
import type {
  LigneNoteFrais,
  NoteFrais,
  NouvelleLigneNoteFrais,
  NouvelleNoteFrais,
  StatutNoteFrais,
  TrajetIk,
} from "@/types/notes-de-frais";
import { eurosVersCentimes, formaterCentimes } from "@/lib/services/montants";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";
import { preparerConversionVirement, type ConversionVirement } from "@/lib/services/traitement";
import { libelleTrajet, normaliser } from "@/lib/services/ik";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

/** Nom du compte réel qui porte les avances des membres (créé à la demande). */
export const NOM_COMPTE_AVANCES = "Avances des membres";

/** Catégorie proposée pour une ligne IK (plan associatif, services/tresorerie). */
export const NOM_CATEGORIE_DEPLACEMENT = "Frais de déplacement";

export const LIBELLES_STATUT_NOTE: Record<StatutNoteFrais, string> = {
  brouillon: "Brouillon",
  a_verifier: "À vérifier",
  validee: "Validée",
  remboursee: "Remboursée",
  refusee: "Refusée",
  abandonnee: "Abandonnée (don)",
};

export function estStatutNote(v: string): v is StatutNoteFrais {
  return v in LIBELLES_STATUT_NOTE;
}

function estDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const propre = (v: string) => (v ?? "").trim().replace(/\s+/g, " ");

// ============================================================================
// Cycle de vie
// ============================================================================

/**
 * [07/11/2026] Transitions permises, miroir EXACT du trigger
 * controle_note_frais (sql/12) : la base refuse le reste même si l'écran se
 * trompe. Remboursée, abandonnée et refusée sont des états finaux.
 */
export const TRANSITIONS: Record<StatutNoteFrais, StatutNoteFrais[]> = {
  brouillon: ["a_verifier"],
  a_verifier: ["brouillon", "validee", "refusee"],
  validee: ["remboursee", "abandonnee"],
  remboursee: [],
  refusee: [],
  abandonnee: [],
};

export function transitionPermise(de: StatutNoteFrais, vers: StatutNoteFrais): boolean {
  return TRANSITIONS[de].includes(vers);
}

/** Lignes, en-tête et trajets modifiables : brouillon ou à vérifier seulement. */
export function estModifiable(note: Pick<NoteFrais, "statut">): boolean {
  return note.statut === "brouillon" || note.statut === "a_verifier";
}

/** Une correction se prépare depuis une note réglée (ou refusée), jamais depuis une note en cours. */
export function peutPreparerCorrection(note: Pick<NoteFrais, "statut">): boolean {
  return note.statut === "remboursee" || note.statut === "abandonnee" || note.statut === "refusee";
}

type LigneTotal = Pick<LigneNoteFrais, "montant_ttc_centimes">;

/** Total d'une note = somme des lignes (centimes entiers ; jamais stocké). */
export function totalNote(lignes: LigneTotal[]): number {
  return lignes.reduce((s, l) => s + Number(l.montant_ttc_centimes), 0);
}

/**
 * Contrôles métier d'un changement de statut (en plus du graphe). Renvoie le
 * message à afficher, ou null si c'est permis. Remboursement et abandon ont
 * leurs propres préparations (ci-dessous) : ici, seulement « peut-on y aller ».
 */
export function controlerTransition(
  note: Pick<NoteFrais, "statut">,
  vers: StatutNoteFrais,
  lignes: Pick<LigneNoteFrais, "montant_ttc_centimes" | "categorie_id">[],
  categories: Pick<Categorie, "id" | "type">[],
  motifRefus?: string,
): string | null {
  if (!transitionPermise(note.statut, vers)) {
    return `Passage de « ${LIBELLES_STATUT_NOTE[note.statut]} » à « ${LIBELLES_STATUT_NOTE[vers]} » impossible.`;
  }
  if (vers === "a_verifier" && lignes.length === 0) return "Ajoute au moins une ligne avant de soumettre la note.";
  if (vers === "validee") {
    if (lignes.length === 0) return "Une note sans ligne ne se valide pas.";
    const types = new Map(categories.map((c) => [c.id, c.type]));
    const sans = lignes.filter((l) => !l.categorie_id).length;
    if (sans > 0) return `${sans} ligne(s) sans catégorie : choisis la catégorie de chaque dépense avant de valider.`;
    if (lignes.some((l) => types.get(l.categorie_id as string) !== "depense")) {
      return "Chaque ligne doit être classée dans une catégorie de dépense.";
    }
  }
  if (vers === "refusee") {
    const motif = (motifRefus ?? "").trim();
    if (motif.length < 3 || motif.length > 500) return "Indique le motif du refus (3 à 500 caractères).";
  }
  return null;
}

// ============================================================================
// Saisie : note et lignes
// ============================================================================

export interface SaisieNote {
  entiteId: string;
  beneficiaire: string;
  objet: string;
  date: string;
  commentaire: string;
}

export function preparerNote(s: SaisieNote): Resultat<NouvelleNoteFrais> {
  const erreurs: string[] = [];
  const beneficiaire = propre(s.beneficiaire);
  const objet = propre(s.objet);
  const commentaire = (s.commentaire ?? "").trim();
  if (beneficiaire.length < 1 || beneficiaire.length > 120) {
    erreurs.push("Indique la personne qui a avancé l'argent (120 caractères au plus).");
  }
  if (objet.length < 1 || objet.length > 200) erreurs.push("Indique l'objet de la note (200 caractères au plus).");
  if (!estDate(s.date)) erreurs.push("La date de la note doit être une date réelle.");
  if (commentaire.length > COMMENTAIRE_MAX) erreurs.push("Commentaire trop long.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: { entite_id: s.entiteId, beneficiaire, objet, date_note: s.date, commentaire: commentaire || null },
  };
}

export interface SaisieLigne {
  date: string;
  libelle: string;
  categorieId: string; // "" = pas encore classée
  montant: string; // euros TTC
}

/** Ligne libre (ticket non importé). La catégorie doit être une dépense de la structure. */
export function preparerLigne(
  s: SaisieLigne,
  note: Pick<NoteFrais, "id" | "entite_id">,
  categories: Pick<Categorie, "id" | "type">[],
): Resultat<NouvelleLigneNoteFrais> {
  const erreurs: string[] = [];
  if (!estDate(s.date)) erreurs.push("La date de la dépense doit être une date réelle.");
  const libelle = propre(s.libelle);
  if (libelle.length < 1 || libelle.length > 255) erreurs.push("Décris la dépense (255 caractères au plus).");
  const montant = eurosVersCentimes(s.montant ?? "");
  if (montant === null || montant <= 0) erreurs.push("Le montant TTC doit être supérieur à 0 (ex. 12,50).");
  let categorieId: string | null = null;
  if (s.categorieId) {
    const c = categories.find((x) => x.id === s.categorieId);
    if (!c) erreurs.push("Catégorie introuvable.");
    else if (c.type !== "depense") erreurs.push("Choisis une catégorie de dépense.");
    else categorieId = c.id;
  }
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: note.entite_id,
      note_id: note.id,
      origine: "saisie",
      date_depense: s.date,
      libelle,
      categorie_id: categorieId,
      montant_ttc_centimes: montant as number,
      transaction_id: null,
      trajet_id: null,
    },
  };
}

type TxLiable = Pick<
  Transaction,
  "id" | "entite_id" | "type" | "virement_id" | "compte_tresorerie_id" | "date_transaction" | "libelle" | "montant_ttc_centimes" | "categorie_id"
>;

/**
 * Une opération peut-elle devenir une ligne de note ? Il faut une DÉPENSE,
 * hors virement, dont le compte est encore inconnu : si elle est passée sur
 * un compte de l'association, ce n'est pas une avance d'un membre.
 */
export function refusLiaisonOperation(tx: TxLiable, entiteId: string): string | null {
  if (tx.entite_id !== entiteId) return "Opération introuvable.";
  if (tx.type !== "depense") return "Seule une dépense peut figurer dans une note de frais.";
  if (tx.virement_id) return "Un virement interne ne figure pas dans une note de frais.";
  if (tx.compte_tresorerie_id) {
    return "Cette opération est déjà passée sur un compte de l'association : ce n'est pas une avance d'un membre.";
  }
  return null;
}

/** Ligne liée à une opération existante : date, libellé et montant viennent de l'opération. */
export function ligneDepuisOperation(
  tx: TxLiable,
  note: Pick<NoteFrais, "id" | "entite_id">,
): Resultat<NouvelleLigneNoteFrais> {
  const refus = refusLiaisonOperation(tx, note.entite_id);
  if (refus) return { ok: false, erreurs: [refus] };
  return {
    ok: true,
    valeur: {
      entite_id: note.entite_id,
      note_id: note.id,
      origine: "operation",
      date_depense: tx.date_transaction,
      libelle: tx.libelle.slice(0, 255),
      categorie_id: tx.categorie_id,
      montant_ttc_centimes: tx.montant_ttc_centimes,
      transaction_id: tx.id,
      trajet_id: null,
    },
  };
}

/** Catégorie « Frais de déplacement » de la structure (dépense, active), si elle existe. */
export function categorieDeplacement(categories: Pick<Categorie, "id" | "nom" | "type" | "active">[]): string | null {
  const cible = normaliser(NOM_CATEGORIE_DEPLACEMENT);
  return categories.find((c) => c.type === "depense" && c.active && normaliser(c.nom) === cible)?.id ?? null;
}

/** Trajet IK rattaché à une note : il en devient une ligne d'origine « ik ». */
export function ligneDepuisTrajet(
  trajet: Pick<TrajetIk, "id" | "entite_id" | "beneficiaire" | "date_trajet" | "depart" | "arrivee" | "motif" | "montant_centimes">,
  note: Pick<NoteFrais, "id" | "entite_id" | "beneficiaire">,
  categorieId: string | null,
): Resultat<NouvelleLigneNoteFrais> {
  if (trajet.entite_id !== note.entite_id) return { ok: false, erreurs: ["Trajet introuvable."] };
  if (normaliser(trajet.beneficiaire) !== normaliser(note.beneficiaire)) {
    return { ok: false, erreurs: [`Ce trajet est au nom de ${trajet.beneficiaire}, la note au nom de ${note.beneficiaire}.`] };
  }
  return {
    ok: true,
    valeur: {
      entite_id: note.entite_id,
      note_id: note.id,
      origine: "ik",
      date_depense: trajet.date_trajet,
      libelle: libelleTrajet(trajet),
      categorie_id: categorieId,
      montant_ttc_centimes: Number(trajet.montant_centimes),
      transaction_id: null,
      trajet_id: trajet.id,
    },
  };
}

// ============================================================================
// Validation : les lignes deviennent des dépenses sur « Avances des membres »
// ============================================================================

/** Champs écrits sur une opération existante rattachée au compte Avances. */
export interface RattachementAvances {
  ligneId: string;
  transactionId: string;
  champs: {
    compte_tresorerie_id: string;
    categorie_id: string | null;
    statut: StatutTransaction;
    commentaire: string;
  };
}

export interface PlanValidation {
  /** Lignes libres et IK : une dépense à créer chacune (clé source = ligne). */
  aCreer: { ligneId: string; transaction: NouvelleTransaction }[];
  /** Lignes liées : l'opération existante passe sur le compte Avances. */
  aRattacher: RattachementAvances[];
}

/** Clé source de la dépense créée pour une ligne : relancer la validation ne la duplique pas. */
export function cleSourceLigne(ligneId: string): string {
  return `ndf-ligne:${ligneId}`;
}

/**
 * [07/11/2026] Prépare le passage « à vérifier » → « validée ». Aucune
 * écriture ici : l'action exécute ce plan, dans cet ordre, de façon
 * relançable (dépenses créées par clé source, opérations déjà sur le compte
 * Avances acceptées telles quelles), puis change le statut en DERNIER.
 *
 * Une ligne liée n'est PAS recréée : l'opération importée EST la dépense, on
 * lui donne seulement son compte (Avances). Créer une nouvelle dépense
 * compterait le ticket deux fois.
 */
export function preparerValidation(
  note: Pick<NoteFrais, "id" | "entite_id" | "numero" | "beneficiaire" | "statut">,
  lignes: LigneNoteFrais[],
  operationsLiees: (TxLiable & Pick<Transaction, "statut" | "commentaire">)[],
  categories: Pick<Categorie, "id" | "type">[],
  compteAvancesId: string,
): Resultat<PlanValidation> {
  const refus = controlerTransition(note, "validee", lignes, categories);
  if (refus) return { ok: false, erreurs: [refus] };
  if (!compteAvancesId) return { ok: false, erreurs: ["Compte « Avances des membres » introuvable."] };

  const ops = new Map(operationsLiees.map((t) => [t.id, t]));
  const erreurs: string[] = [];
  const plan: PlanValidation = { aCreer: [], aRattacher: [] };
  const mention = `Note de frais ${note.numero}, avance de ${note.beneficiaire}.`;

  for (const l of lignes) {
    if (l.origine === "operation") {
      const tx = l.transaction_id ? ops.get(l.transaction_id) : undefined;
      if (!tx) {
        erreurs.push(`Ligne « ${l.libelle} » : opération liée introuvable.`);
        continue;
      }
      // Relance après une validation interrompue : déjà sur le compte Avances.
      const dejaRattachee = tx.compte_tresorerie_id === compteAvancesId;
      const refusOp = dejaRattachee ? null : refusLiaisonOperation(tx, note.entite_id);
      if (refusOp) {
        erreurs.push(`Ligne « ${l.libelle} » : ${refusOp}`);
        continue;
      }
      if (tx.montant_ttc_centimes !== l.montant_ttc_centimes) {
        erreurs.push(`Ligne « ${l.libelle} » : le montant ne correspond plus à l'opération liée.`);
        continue;
      }
      // [07/11/2026] La catégorie choisie dans la note fait foi (exigée pour
      // valider). Une opération déjà validée dans CETTE catégorie le reste ;
      // sinon elle repasse « à valider » : sa nature vient de changer.
      const categorie = l.categorie_id;
      const statutTx: StatutTransaction = tx.statut === "validee" && tx.categorie_id === categorie ? "validee" : "a_verifier";
      plan.aRattacher.push({
        ligneId: l.id,
        transactionId: tx.id,
        champs: {
          compte_tresorerie_id: compteAvancesId,
          categorie_id: categorie,
          statut: statutTx,
          commentaire: [tx.commentaire, dejaRattachee ? null : mention]
            .filter(Boolean)
            .join(" ")
            .slice(0, COMMENTAIRE_MAX),
        },
      });
    } else {
      plan.aCreer.push({
        ligneId: l.id,
        transaction: {
          entite_id: note.entite_id,
          categorie_id: l.categorie_id,
          type: "depense",
          // « À valider » : le trésorier contrôle la pièce dans « À traiter ».
          statut: "a_verifier",
          date_transaction: l.date_depense,
          libelle: `${note.numero} ${l.libelle}`.slice(0, 255),
          montant_ttc_centimes: l.montant_ttc_centimes,
          montant_tva_centimes: 0,
          compte_tresorerie_id: compteAvancesId,
          virement_id: null,
          source_fichier: null,
          source_ref: note.numero,
          source_cle: cleSourceLigne(l.id),
          commentaire: l.origine === "ik" ? `${mention} Indemnité kilométrique.` : mention,
        },
      });
    }
  }
  if (erreurs.length > 0) return { ok: false, erreurs };
  return { ok: true, valeur: plan };
}

// ============================================================================
// Remboursement : l'opération bancaire réelle devient un virement interne
// ============================================================================

/** Écart entre l'opération choisie et le total : null si égal. */
export function ecartRemboursement(totalCentimes: number, op: Pick<Transaction, "montant_ttc_centimes">): number | null {
  const e = op.montant_ttc_centimes - totalCentimes;
  return e === 0 ? null : e;
}

/**
 * [07/11/2026] Prépare le remboursement. L'opération est celle du relevé
 * (« VIR REMBOURSEMENT »), DÉJÀ importée : on ne crée aucun paiement, on la
 * transforme en virement interne courant → Avances (preparerConversionVirement).
 * Résultat : la dépense reste le ticket ; le virement est exclu des totaux ;
 * le compte Avances revient à zéro pour cette note.
 * Montant différent du total : refus (un remboursement partiel ou groupé se
 * traite en corrigeant la note, pas en forçant l'écart).
 */
export function preparerRemboursement(
  note: Pick<NoteFrais, "statut" | "numero" | "entite_id">,
  totalCentimes: number,
  op: Parameters<typeof preparerConversionVirement>[0] & Pick<Transaction, "id">,
  compteAvancesId: string,
  virementId: string,
): Resultat<ConversionVirement> {
  if (note.statut !== "validee") return { ok: false, erreurs: ["Seule une note validée se rembourse."] };
  if (op.entite_id !== note.entite_id) return { ok: false, erreurs: ["Opération introuvable."] };
  if (op.type !== "depense") return { ok: false, erreurs: ["Le remboursement est une sortie d'argent : choisis une dépense du relevé."] };
  if (op.compte_tresorerie_id === compteAvancesId) {
    return { ok: false, erreurs: ["Choisis l'opération du compte bancaire qui a payé le membre, pas une ligne du compte Avances."] };
  }
  const ecart = ecartRemboursement(totalCentimes, op);
  if (ecart !== null) {
    return {
      ok: false,
      erreurs: [
        `L'opération fait ${formaterCentimes(op.montant_ttc_centimes)}, la note ${formaterCentimes(totalCentimes)} : ` +
          `écart de ${formaterCentimes(Math.abs(ecart))}. Remboursement refusé.`,
      ],
    };
  }
  const conv = preparerConversionVirement(op, compteAvancesId, virementId);
  if (!conv.ok) return { ok: false, erreurs: [conv.erreur] };
  const note2 = `Remboursement de la note de frais ${note.numero} (virement interne vers « ${NOM_COMPTE_AVANCES} », pas une seconde dépense).`;
  return {
    ok: true,
    valeur: {
      majOriginale: { ...conv.valeur.majOriginale, commentaire: [op.commentaire, note2].filter(Boolean).join(" ").slice(0, COMMENTAIRE_MAX) },
      contrepartie: { ...conv.valeur.contrepartie, commentaire: note2, source_ref: note.numero },
    },
  };
}

type TxCandidate = Pick<Transaction, "id" | "type" | "virement_id" | "compte_tresorerie_id" | "date_transaction" | "montant_ttc_centimes">;

/**
 * Opérations bancaires qui peuvent porter le remboursement : dépenses hors
 * virement, sur un compte courant, livret ou caisse (pas le compte Avances).
 * Celles du bon montant d'abord, puis par date.
 */
export function candidatesRemboursement<T extends TxCandidate>(
  transactions: T[],
  comptes: Pick<CompteTresorerie, "id" | "nature">[],
  compteAvancesId: string | null,
  totalCentimes: number,
): T[] {
  const reels = new Set(comptes.filter((c) => c.nature !== "autre" && c.id !== compteAvancesId).map((c) => c.id));
  return transactions
    .filter((t) => t.type === "depense" && !t.virement_id && t.compte_tresorerie_id !== null && reels.has(t.compte_tresorerie_id))
    .sort(
      (a, b) =>
        Number(b.montant_ttc_centimes === totalCentimes) - Number(a.montant_ttc_centimes === totalCentimes) ||
        b.date_transaction.localeCompare(a.date_transaction),
    );
}

/**
 * Opérations qui peuvent devenir une ligne : dépenses sans compte, hors
 * virement, pas déjà dans une note non refusée.
 */
export function candidatesLigne<T extends TxCandidate>(transactions: T[], idsDejaPris: Set<string>): T[] {
  return transactions
    .filter((t) => t.type === "depense" && !t.virement_id && t.compte_tresorerie_id === null && !idsDejaPris.has(t.id))
    .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction));
}

// ============================================================================
// Abandon : la créance du membre est éteinte par son don
// ============================================================================

/**
 * [07/11/2026] Prépare l'abandon d'une note validée. Le membre a renoncé PAR
 * ÉCRIT au remboursement : sa créance envers l'association (le solde négatif
 * du compte Avances pour cette note) est éteinte par ce don. On l'enregistre
 * comme contribution en nature « frais abandonnés » (à vérifier, valeur =
 * total, clé ndf:<id>). AUCUN encaissement n'est créé : la dépense reste en
 * compta, le don est présenté à part (contributions volontaires).
 */
export function preparerAbandon(
  note: Pick<NoteFrais, "id" | "entite_id" | "numero" | "beneficiaire" | "objet" | "statut">,
  totalCentimes: number,
  dateRenonciation: string,
  aujourdHui: string,
): Resultat<NouvelleContribution> {
  const erreurs: string[] = [];
  if (note.statut !== "validee") {
    erreurs.push("Valide d'abord la note : les dépenses doivent être en compta avant l'abandon.");
  }
  if (!estDate(dateRenonciation)) erreurs.push("Indique la date de la renonciation écrite au remboursement.");
  else if (dateRenonciation > aujourdHui) erreurs.push("La date de renonciation ne peut pas être dans le futur.");
  if (totalCentimes <= 0) erreurs.push("Une note sans montant ne s'abandonne pas.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: note.entite_id,
      type: "frais_abandonnes",
      date_contribution: dateRenonciation,
      libelle: `Frais abandonnés : ${note.numero} ${note.beneficiaire} (${note.objet})`.slice(0, 255),
      statut: "a_verifier",
      minutes: null,
      taux_horaire_centimes: null,
      nb_personnes: null,
      valeur_centimes: totalCentimes,
      date_renonciation: dateRenonciation,
      commentaire:
        `Renonciation écrite au remboursement de la note ${note.numero}. ` +
        "La dette de l'association envers le membre est éteinte par son don : aucun encaissement.",
      source: "notes-de-frais",
      source_cle: cleSourceAbandon(note.id),
    },
  };
}

export function cleSourceAbandon(noteId: string): string {
  return `ndf:${noteId}`;
}

// ============================================================================
// Correction : nouveau brouillon copié, l'original reste
// ============================================================================

/**
 * [07/11/2026] Copie d'une note réglée ou refusée en nouveau brouillon.
 *  - note refusée : rien n'est entré en compta, la copie reprend les liens
 *    (opérations, trajets), qui redeviennent disponibles ;
 *  - note remboursée ou abandonnée : ses dépenses SONT en compta. La copie
 *    ne reprend aucun lien (une opération ne compte qu'une fois) : les
 *    lignes liées et IK deviennent des lignes libres, à ajuster avant de
 *    soumettre. Le numéro est nouveau (attribué par la base).
 */
export function preparerCorrection(
  note: Pick<NoteFrais, "id" | "entite_id" | "numero" | "beneficiaire" | "objet" | "date_note" | "statut" | "commentaire">,
  lignes: LigneNoteFrais[],
): Resultat<{ note: NouvelleNoteFrais; lignes: Omit<NouvelleLigneNoteFrais, "note_id">[] }> {
  if (!peutPreparerCorrection(note)) {
    return { ok: false, erreurs: ["Une correction se prépare depuis une note remboursée, abandonnée ou refusée."] };
  }
  const garderLiens = note.statut === "refusee";
  return {
    ok: true,
    valeur: {
      note: {
        entite_id: note.entite_id,
        beneficiaire: note.beneficiaire,
        objet: note.objet,
        date_note: note.date_note,
        commentaire: `Correction de ${note.numero}.${note.commentaire ? ` ${note.commentaire}` : ""}`.slice(0, COMMENTAIRE_MAX),
        correction_de: note.id,
      },
      lignes: lignes.map((l) => ({
        entite_id: l.entite_id,
        origine: garderLiens ? l.origine : "saisie",
        date_depense: l.date_depense,
        libelle: l.libelle,
        categorie_id: l.categorie_id,
        montant_ttc_centimes: l.montant_ttc_centimes,
        transaction_id: garderLiens && l.origine === "operation" ? l.transaction_id : null,
        trajet_id: garderLiens && l.origine === "ik" ? l.trajet_id : null,
      })),
    },
  };
}

// ============================================================================
// Recherche et filtres de la liste
// ============================================================================

export interface FiltreNotes {
  recherche?: string;
  statut?: string;
  exercice?: string;
}

/** Recherche par numéro, bénéficiaire ou objet (accents et casse ignorés) ; filtres statut et exercice. */
export function filtrerNotes<T extends Pick<NoteFrais, "numero" | "beneficiaire" | "objet" | "statut" | "date_note">>(
  notes: T[],
  f: FiltreNotes,
): T[] {
  const r = normaliser(f.recherche ?? "");
  const statut = f.statut ?? "";
  const exercice = f.exercice ?? "";
  return notes.filter((n) => {
    if (statut && estStatutNote(statut) && n.statut !== statut) return false;
    if (/^\d{4}$/.test(exercice) && !n.date_note.startsWith(exercice)) return false;
    if (r && ![n.numero, n.beneficiaire, n.objet].some((v) => normaliser(v).includes(r))) return false;
    return true;
  });
}

/** Exercices présents (année de la note), du plus récent au plus ancien. */
export function exercicesDesNotes(notes: Pick<NoteFrais, "date_note">[]): number[] {
  return [...new Set(notes.map((n) => Number(n.date_note.slice(0, 4))))].sort((a, b) => b - a);
}

/** Totaux par note (une seule passe sur toutes les lignes de la structure). */
export function totauxParNote(lignes: Pick<LigneNoteFrais, "note_id" | "montant_ttc_centimes">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lignes) m.set(l.note_id, (m.get(l.note_id) ?? 0) + Number(l.montant_ttc_centimes));
  return m;
}

/**
 * Identifiants d'opérations (ou de trajets) déjà pris par une note NON
 * refusée : miroir du contrôle du trigger controle_note_frais_ligne.
 */
export function idsPris(
  lignes: Pick<LigneNoteFrais, "note_id" | "transaction_id" | "trajet_id">[],
  notes: Pick<NoteFrais, "id" | "statut">[],
  champ: "transaction_id" | "trajet_id",
): Set<string> {
  const refusees = new Set(notes.filter((n) => n.statut === "refusee").map((n) => n.id));
  const s = new Set<string>();
  for (const l of lignes) {
    const v = l[champ];
    if (v && !refusees.has(l.note_id)) s.add(v);
  }
  return s;
}
