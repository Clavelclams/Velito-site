/**
 * SERVICE DOSSIER D'AG (07/11/2026) : fonctions PURES, sans base.
 *
 * Construit TOUTES les données du dossier de fin d'exercice (assemblée
 * générale, financeurs) à partir des listes brutes chargées par la page :
 * transactions, catégories, comptes réels, soldes observés, subventions,
 * contributions en nature et nombre de justificatifs par transaction.
 * La page et le composant ne font qu'afficher ; l'export CSV de l'index des
 * pièces repart du même objet (une seule source de calcul).
 *
 * Règles (cahier des charges « Compta Nova », reprises sans leur code) :
 *  - un exercice = une année civile (du 1er janvier au 31 décembre) ;
 *  - les virements internes ne sont ni des recettes ni des dépenses : ils
 *    sortent du résultat et sont listés à part dans la trésorerie ;
 *  - une ligne sans catégorie compte dans les totaux sous « Non classé » :
 *    rien ne disparaît, rien ne compte deux fois ;
 *  - le regroupement se fait par IDENTIFIANT de catégorie : renommer une
 *    catégorie change un libellé, jamais un total ;
 *  - inconnu ≠ zéro : un solde ou un notifié inconnu reste null, l'affichage
 *    écrit « à compléter » ;
 *  - seules les contributions « Vérifié » comptent, et elles restent à part
 *    du résultat (ce ne sont pas des encaissements).
 *
 * Tests : node scripts/test.mjs lib/services/dossier-ag.test.ts
 */
import type {
  Categorie,
  CompteTresorerie,
  ContributionNature,
  Entite,
  SoldeObserve,
  StatutSubvention,
  StatutTransaction,
  Subvention,
  Transaction,
  TypeContribution,
  TypeFlux,
} from "@/types/database";
import {
  controleMensuel,
  estVirement,
  horsVirements,
  LIBELLES_NATURE,
  LIBELLES_STATUT,
  soldeRepris,
  type EtatMois,
} from "@/lib/services/tresorerie";
import { LIBELLES_STATUT_SUBVENTION, suiviSubvention, totauxSubventions } from "@/lib/services/subventions";
import { syntheseContributions } from "@/lib/services/benevolat";
import { transactionsSansJustificatif } from "@/lib/services/justificatifs";
import { echapperChampCsv } from "@/lib/services/export";
import { centimesVersSaisie } from "@/lib/services/montants";

/** Mention imposée en page de garde (texte exact du cahier des charges). */
export const MENTION_REVUE =
  "Document préparé pour revue. Il ne vaut ni certification, ni approbation des comptes : celle-ci relève du vote de l'assemblée générale.";

/** Libellé de la ligne qui regroupe les opérations sans catégorie. */
export const LIBELLE_NON_CLASSE = "Non classé";

export const LIBELLES_FORME: Record<Entite["type_juridique"], string> = {
  association: "Association loi 1901",
  societe: "Société (SASU)",
};

/** Libellés des états du contrôle mensuel (mêmes mots que l'écran du compte). */
export const LIBELLES_ETAT_MOIS: Record<EtatMois, string> = {
  concorde: "Concorde",
  ecart: "Écart",
  non_observe: "Relevé à saisir",
  a_venir: "En cours",
  avant_ouverture: "Avant ouverture",
  solde_initial_inconnu: "Solde initial inconnu",
};

// ============================================================================
// Entrées et sorties
// ============================================================================

export interface EntreesDossierAg {
  entite: Pick<Entite, "nom" | "type_juridique">;
  /** Année civile de l'exercice (ex. 2026). */
  exercice: number;
  /** "AAAA-MM-JJ", passé en paramètre (pureté, tests). */
  aujourdHui: string;
  /** TOUTES les transactions de l'entité : les soldes ont besoin du passé. */
  transactions: Transaction[];
  /** Toutes les catégories, archivées comprises (une ligne ancienne peut y pointer). */
  categories: Pick<Categorie, "id" | "nom">[];
  comptes: CompteTresorerie[];
  observations: SoldeObserve[];
  subventions: Subvention[];
  contributions: Pick<
    ContributionNature,
    "type" | "statut" | "valeur_centimes" | "minutes" | "date_contribution" | "taux_horaire_centimes"
  >[];
  /** Nombre de justificatifs par transaction_id (absent = 0). */
  nbJustificatifs: Record<string, number>;
}

export interface CompteDossier {
  id: string;
  nom: string;
  nature: string;
  /** Date à laquelle se lit le solde d'ouverture (1er janvier, ou ouverture du compte en cours d'année). */
  dateSoldeDebut: string;
  soldeDebut: number | null;
  soldeFin: number | null;
  recettes: number;
  depenses: number;
  virementsRecus: number;
  virementsEmis: number;
  dernierReleve: { date: string; solde: number; reference: string | null; ecart: number | null } | null;
}

export interface VirementDossier {
  virementId: string;
  date: string;
  libelle: string;
  montant: number;
  /** null : la jambe correspondante manque (à compléter). */
  compteSource: string | null;
  compteDestination: string | null;
}

export interface LigneCategorie {
  /** null pour la ligne « Non classé ». */
  categorieId: string | null;
  libelle: string;
  montant: number;
  nbLignes: number;
}

export interface SectionResultat {
  lignes: LigneCategorie[];
  /** Lignes sans catégorie (« Non classé »), comptées dans le total. */
  nonClasse: LigneCategorie;
  total: number;
}

export interface LigneSubvention {
  id: string;
  financeur: string;
  action: string;
  statut: StatutSubvention;
  libelleStatut: string;
  demande: number | null;
  notifie: number | null;
  encaisse: number;
  resteAEncaisser: number | null;
}

export type EtatPiece =
  | { type: "pieces"; nb: number }
  | { type: "exception"; motif: string | null }
  | { type: "manquante" }
  | { type: "virement" };

export interface LignePiece {
  id: string;
  date: string;
  type: TypeFlux;
  libelle: string;
  montant: number;
  categorie: string;
  compte: string | null;
  statut: StatutTransaction;
  nbJustificatifs: number;
  piece: EtatPiece;
}

export interface DossierAg {
  garde: {
    nomStructure: string;
    formeJuridique: string;
    exercice: number;
    debut: string;
    fin: string;
    dateEdition: string;
    mention: string;
  };
  tresorerie: {
    comptes: CompteDossier[];
    virements: VirementDossier[];
    /** Opérations de l'exercice dont le compte réel n'est pas renseigné (hors virements). */
    sansCompte: { nb: number; recettes: number; depenses: number };
  };
  resultat: {
    recettes: SectionResultat;
    depenses: SectionResultat;
    /** recettes − dépenses, virements exclus. */
    resultat: number;
    nbVirementsExclus: number;
  };
  subventions: {
    lignes: LigneSubvention[];
    totaux: { demande: number; notifie: number; encaisse: number; notifieInconnu: number };
    /** Somme des restes connus (dossiers non refusés) et nombre de restes inconnus. */
    resteAEncaisser: number;
    resteInconnu: number;
  };
  contributions: {
    heures: { valeur: number; minutes: number; nbFiches: number };
    dons: { valeur: number; nbFiches: number };
    fraisAbandonnes: { valeur: number; nbFiches: number };
    total: number;
    /** Taux horaires distincts utilisés par les fiches d'heures vérifiées, du plus bas au plus haut. */
    tauxHoraires: number[];
    /** Fiches de l'exercice encore en brouillon ou à vérifier (non comptées). */
    nonVerifiees: number;
  };
  controles: {
    comptes: { id: string; nom: string; mois: { mois: number; etat: EtatMois; ecart: number | null }[] }[];
    statuts: Record<StatutTransaction, number>;
    depensesSansJustificatif: number;
    depensesEnException: number;
    /** La colonne exception_justificatif existe-t-elle sur les lignes lues ? */
    colonneExceptionPresente: boolean;
  };
  index: LignePiece[];
}

// ============================================================================
// Outils internes
// ============================================================================

function bornesExercice(exercice: number): { debut: string; fin: string } {
  return { debut: `${exercice}-01-01`, fin: `${exercice}-12-31` };
}

function dansExercice(date: string, exercice: number): boolean {
  return date.startsWith(`${exercice}-`);
}

/**
 * [07/11/2026] Lecture tolérante de la colonne exception_justificatif, qui
 * n'existe peut-être pas encore en base : on teste sa PRÉSENCE à l'exécution
 * (`in`), sans l'ajouter au type Transaction (types/database.ts reste le
 * miroir exact du schéma). Valeur texte non vide = motif ; `true` = exception
 * sans motif saisi (affichée « à compléter ») ; null, false ou "" = aucune.
 */
export function lireException(t: object): { presente: boolean; exception: boolean; motif: string | null } {
  if (!("exception_justificatif" in t)) return { presente: false, exception: false, motif: null };
  const v = (t as { exception_justificatif: unknown }).exception_justificatif;
  if (typeof v === "string" && v.trim() !== "") return { presente: true, exception: true, motif: v.trim() };
  if (v === true) return { presente: true, exception: true, motif: null };
  return { presente: true, exception: false, motif: null };
}

/**
 * [07/11/2026] Solde à la fin d'une journée, ou null si le compte n'existait
 * pas encore ce jour-là (date antérieure au solde initial, sans relevé qui la
 * couvre). Sans ce garde-fou, soldeAu renverrait le solde initial pour une
 * date d'avant l'ouverture : un chiffre faux présenté comme sûr.
 */
function soldeFinJournee(
  compte: CompteTresorerie,
  transactions: Transaction[],
  observations: SoldeObserve[],
  date: string,
): number | null {
  const releveCouvrant = observations.some((o) => o.compte_id === compte.id && o.date_releve <= date);
  if (!releveCouvrant && compte.date_solde_initial !== null && date < compte.date_solde_initial) return null;
  return soldeRepris(compte, transactions, observations, date);
}

// ============================================================================
// Sections du dossier
// ============================================================================

function construireTresorerie(e: EntreesDossierAg, duEx: Transaction[]): DossierAg["tresorerie"] {
  const { debut, fin } = bornesExercice(e.exercice);
  const veille = `${e.exercice - 1}-12-31`;
  const nomsComptes = new Map(e.comptes.map((c) => [c.id, c.nom]));

  const comptes: CompteDossier[] = [];
  for (const c of e.comptes) {
    const mouvements = duEx.filter((t) => t.compte_tresorerie_id === c.id);
    // Compte ouvert après l'exercice et sans mouvement dedans : hors sujet.
    if (c.date_solde_initial !== null && c.date_solde_initial > fin && mouvements.length === 0) continue;

    // [07/11/2026] Ouverture au 1er janvier = solde de fin de journée du
    // 31/12 précédent. Si le compte a été ouvert pendant l'exercice, on lit
    // son solde initial, à sa date (indiquée dans le dossier).
    let dateSoldeDebut = debut;
    let soldeDebut = soldeFinJournee(c, e.transactions, e.observations, veille);
    if (
      soldeDebut === null &&
      c.solde_initial_centimes !== null &&
      c.date_solde_initial !== null &&
      c.date_solde_initial > debut &&
      c.date_solde_initial <= fin
    ) {
      soldeDebut = c.solde_initial_centimes;
      dateSoldeDebut = c.date_solde_initial;
    }
    const soldeFin = soldeFinJournee(c, e.transactions, e.observations, fin);

    let recettes = 0;
    let depenses = 0;
    let virementsRecus = 0;
    let virementsEmis = 0;
    for (const t of mouvements) {
      const v = estVirement(t);
      if (t.type === "recette") {
        if (v) virementsRecus += t.montant_ttc_centimes;
        else recettes += t.montant_ttc_centimes;
      } else if (v) virementsEmis += t.montant_ttc_centimes;
      else depenses += t.montant_ttc_centimes;
    }

    // Dernier relevé DE L'EXERCICE, comparé au solde reconstruit depuis le
    // relevé précédent (même calcul que l'écran Trésorerie).
    const obs = e.observations
      .filter((o) => o.compte_id === c.id && o.date_releve >= debut && o.date_releve <= fin)
      .sort((a, b) => b.date_releve.localeCompare(a.date_releve))[0];
    let dernierReleve: CompteDossier["dernierReleve"] = null;
    if (obs) {
      const attendu = soldeRepris(c, e.transactions, e.observations, obs.date_releve, true);
      dernierReleve = {
        date: obs.date_releve,
        solde: obs.solde_centimes,
        reference: obs.reference,
        ecart: attendu === null ? null : obs.solde_centimes - attendu,
      };
    }

    comptes.push({
      id: c.id,
      nom: c.nom,
      nature: LIBELLES_NATURE[c.nature] ?? c.nature,
      dateSoldeDebut,
      soldeDebut,
      soldeFin,
      recettes,
      depenses,
      virementsRecus,
      virementsEmis,
      dernierReleve,
    });
  }

  // [07/11/2026] Un virement = deux jambes liées par virement_id : on en fait
  // UNE ligne (sortie → entrée). Une jambe absente laisse le compte à null.
  const parVirement = new Map<string, { sortie?: Transaction; entree?: Transaction }>();
  for (const t of duEx) {
    if (!estVirement(t)) continue;
    const g = parVirement.get(t.virement_id as string) ?? {};
    if (t.type === "depense") g.sortie = t;
    else g.entree = t;
    parVirement.set(t.virement_id as string, g);
  }
  const virements: VirementDossier[] = [...parVirement.entries()].map(([id, g]) => {
    const ref = (g.sortie ?? g.entree) as Transaction;
    const nomDe = (t?: Transaction) =>
      t && t.compte_tresorerie_id ? (nomsComptes.get(t.compte_tresorerie_id) ?? null) : null;
    return {
      virementId: id,
      date: ref.date_transaction,
      libelle: ref.libelle,
      montant: ref.montant_ttc_centimes,
      compteSource: nomDe(g.sortie),
      compteDestination: nomDe(g.entree),
    };
  });
  virements.sort((a, b) => a.date.localeCompare(b.date) || a.libelle.localeCompare(b.libelle, "fr"));

  const sansCompteListe = horsVirements(duEx).filter((t) => t.compte_tresorerie_id === null);
  const sansCompte = { nb: sansCompteListe.length, recettes: 0, depenses: 0 };
  for (const t of sansCompteListe) {
    if (t.type === "recette") sansCompte.recettes += t.montant_ttc_centimes;
    else sansCompte.depenses += t.montant_ttc_centimes;
  }

  return { comptes, virements, sansCompte };
}

/**
 * [07/11/2026] Une section (recettes OU dépenses) du compte de résultat.
 * Clé de regroupement : l'identifiant de catégorie (jamais le nom). Une
 * catégorie introuvable est traitée comme « Non classé » pour qu'aucune
 * ligne ne sorte du total. Le sens vient de la LIGNE (type de la
 * transaction), pas de la catégorie : chaque ligne tombe dans une seule
 * section, donc ne compte qu'une fois.
 */
function sectionResultat(lignes: Transaction[], type: TypeFlux, noms: Map<string, string>): SectionResultat {
  const parCategorie = new Map<string, LigneCategorie>();
  const nonClasse: LigneCategorie = { categorieId: null, libelle: LIBELLE_NON_CLASSE, montant: 0, nbLignes: 0 };
  for (const t of lignes) {
    if (t.type !== type) continue;
    const nom = t.categorie_id ? noms.get(t.categorie_id) : undefined;
    if (!t.categorie_id || nom === undefined) {
      nonClasse.montant += t.montant_ttc_centimes;
      nonClasse.nbLignes++;
      continue;
    }
    const l = parCategorie.get(t.categorie_id) ?? { categorieId: t.categorie_id, libelle: nom, montant: 0, nbLignes: 0 };
    l.montant += t.montant_ttc_centimes;
    l.nbLignes++;
    parCategorie.set(t.categorie_id, l);
  }
  const triees = [...parCategorie.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  const total = triees.reduce((s, l) => s + l.montant, 0) + nonClasse.montant;
  return { lignes: triees, nonClasse, total };
}

function construireSubventions(e: EntreesDossierAg): DossierAg["subventions"] {
  const duEx = e.subventions.filter((s) => s.exercice === e.exercice);
  const lignes: LigneSubvention[] = duEx
    .map((s) => {
      const suivi = suiviSubvention(s, e.transactions, e.aujourdHui);
      return {
        id: s.id,
        financeur: s.financeur,
        action: s.action,
        statut: s.statut,
        libelleStatut: LIBELLES_STATUT_SUBVENTION[s.statut] ?? s.statut,
        demande: suivi.demande,
        notifie: suivi.notifie,
        encaisse: suivi.encaisse,
        resteAEncaisser: suivi.resteAEncaisser,
      };
    })
    .sort((a, b) => a.financeur.localeCompare(b.financeur, "fr") || a.action.localeCompare(b.action, "fr"));

  let resteAEncaisser = 0;
  let resteInconnu = 0;
  for (const l of lignes) {
    if (l.statut === "refusee") continue;
    if (l.resteAEncaisser === null) resteInconnu++;
    else resteAEncaisser += l.resteAEncaisser;
  }
  return { lignes, totaux: totauxSubventions(duEx, e.transactions, e.aujourdHui), resteAEncaisser, resteInconnu };
}

function construireContributions(e: EntreesDossierAg): DossierAg["contributions"] {
  const synthese = syntheseContributions(e.contributions, e.exercice);
  const verifiees = e.contributions.filter((c) => c.statut === "verifie" && dansExercice(c.date_contribution, e.exercice));
  const nb = (type: TypeContribution) => verifiees.filter((c) => c.type === type).length;
  const heures = verifiees.filter((c) => c.type === "heures_benevoles");
  const minutes = heures.reduce((s, c) => s + (c.minutes ?? 0), 0);
  const tauxHoraires = [
    ...new Set(heures.map((c) => c.taux_horaire_centimes).filter((t): t is number => t !== null)),
  ].sort((a, b) => a - b);
  return {
    heures: { valeur: synthese.parType.heures_benevoles, minutes, nbFiches: nb("heures_benevoles") },
    dons: { valeur: synthese.parType.don_nature, nbFiches: nb("don_nature") },
    fraisAbandonnes: { valeur: synthese.parType.frais_abandonnes, nbFiches: nb("frais_abandonnes") },
    total: synthese.total,
    tauxHoraires,
    nonVerifiees: synthese.aVerifier,
  };
}

function etatPiece(t: Transaction, nbJustificatifs: number): EtatPiece {
  if (nbJustificatifs > 0) return { type: "pieces", nb: nbJustificatifs };
  const ex = lireException(t);
  if (ex.exception) return { type: "exception", motif: ex.motif };
  // Un virement interne se justifie par les deux relevés, pas par une pièce.
  if (estVirement(t)) return { type: "virement" };
  return { type: "manquante" };
}

// ============================================================================
// Point d'entrée
// ============================================================================

/** Construit le dossier complet. Aucune lecture de base, aucune date cachée. */
export function construireDossierAg(e: EntreesDossierAg): DossierAg {
  const { debut, fin } = bornesExercice(e.exercice);
  const duEx = e.transactions.filter((t) => dansExercice(t.date_transaction, e.exercice));
  const operations = horsVirements(duEx);
  const nomsCategories = new Map(e.categories.map((c) => [c.id, c.nom]));
  const nomsComptes = new Map(e.comptes.map((c) => [c.id, c.nom]));
  const nbPieces = (id: string) => e.nbJustificatifs[id] ?? 0;

  // ---- Compte de résultat (virements exclus) ----
  const recettes = sectionResultat(operations, "recette", nomsCategories);
  const depenses = sectionResultat(operations, "depense", nomsCategories);

  // ---- Contrôles ----
  const statuts: Record<StatutTransaction, number> = { a_classer: 0, a_verifier: 0, validee: 0 };
  for (const t of operations) statuts[t.statut] = (statuts[t.statut] ?? 0) + 1;

  // [07/11/2026] Dépenses sans pièce : on réutilise transactionsSansJustificatif
  // (ensemble des ids qui ont au moins une pièce), puis on sépare celles qui
  // portent une exception déclarée.
  const idsAvecPiece = new Set(Object.keys(e.nbJustificatifs).filter((id) => nbPieces(id) > 0));
  const sansPiece = transactionsSansJustificatif(
    operations.filter((t) => t.type === "depense"),
    idsAvecPiece,
  );
  const depensesEnException = sansPiece.filter((t) => lireException(t).exception).length;
  const colonneExceptionPresente = e.transactions.some((t) => lireException(t).presente);

  const controlesComptes = e.comptes.map((c) => ({
    id: c.id,
    nom: c.nom,
    mois: controleMensuel(c, e.transactions, e.observations, e.exercice, e.aujourdHui).map((l) => ({
      mois: l.mois,
      etat: l.etat,
      ecart: l.ecart,
    })),
  }));

  // ---- Index des pièces : toutes les opérations de l'exercice ----
  const index: LignePiece[] = duEx
    .map((t) => {
      const nom = t.categorie_id ? nomsCategories.get(t.categorie_id) : undefined;
      return {
        id: t.id,
        date: t.date_transaction,
        type: t.type,
        libelle: t.libelle,
        montant: t.montant_ttc_centimes,
        categorie: estVirement(t) ? "Virement interne" : (nom ?? LIBELLE_NON_CLASSE),
        compte: t.compte_tresorerie_id ? (nomsComptes.get(t.compte_tresorerie_id) ?? null) : null,
        statut: t.statut,
        nbJustificatifs: nbPieces(t.id),
        piece: etatPiece(t, nbPieces(t.id)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.libelle.localeCompare(b.libelle, "fr") || a.id.localeCompare(b.id));

  return {
    garde: {
      nomStructure: e.entite.nom,
      formeJuridique: LIBELLES_FORME[e.entite.type_juridique] ?? e.entite.type_juridique,
      exercice: e.exercice,
      debut,
      fin,
      dateEdition: e.aujourdHui,
      mention: MENTION_REVUE,
    },
    tresorerie: construireTresorerie(e, duEx),
    resultat: {
      recettes,
      depenses,
      resultat: recettes.total - depenses.total,
      nbVirementsExclus: duEx.length - operations.length,
    },
    subventions: construireSubventions(e),
    contributions: construireContributions(e),
    controles: {
      comptes: controlesComptes,
      statuts,
      depensesSansJustificatif: sansPiece.length - depensesEnException,
      depensesEnException,
      colonneExceptionPresente,
    },
    index,
  };
}

// ============================================================================
// Export CSV de l'index des pièces (format Excel français, comme export.ts)
// ============================================================================

/** Même séparateur et même fin de ligne que export.ts (Excel FR). */
const SEP = ";";
const EOL = "\r\n";

export const EN_TETES_INDEX_PIECES = [
  "Date",
  "Type",
  "Libellé",
  "Montant",
  "Catégorie",
  "Compte",
  "Statut",
  "Justificatifs",
  "Pièce",
] as const;

/** "2026-07-07" → "07/07/2026" (sans dépendance ni fuseau). */
export function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

/** Texte de l'état d'une pièce, identique dans le document et dans le CSV. */
export function libellePiece(p: EtatPiece): string {
  switch (p.type) {
    case "pieces":
      return p.nb === 1 ? "1 justificatif" : `${p.nb} justificatifs`;
    case "exception":
      return `exception : ${p.motif ?? "motif à compléter"}`;
    case "virement":
      return "virement interne (relevés)";
    case "manquante":
      return "pièce manquante";
  }
}

export function genererCsvIndexPieces(index: LignePiece[]): string {
  const ligne = (champs: readonly string[]) => champs.map(echapperChampCsv).join(SEP);
  const lignes = [
    ligne(EN_TETES_INDEX_PIECES),
    ...index.map((l) =>
      ligne([
        dateFr(l.date),
        l.type === "recette" ? "Recette" : "Dépense",
        l.libelle,
        centimesVersSaisie(l.montant),
        l.categorie,
        l.compte ?? "à compléter",
        LIBELLES_STATUT[l.statut] ?? l.statut,
        String(l.nbJustificatifs),
        libellePiece(l.piece),
      ]),
    ),
  ];
  return lignes.join(EOL) + EOL;
}

/** "index_pieces_VEA_2026.csv" (nom de l'entité assaini, comme nomFichierExport). */
export function nomFichierIndexPieces(nomEntite: string, exercice: number): string {
  const slug = nomEntite
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `index_pieces_${slug || "structure"}_${exercice}.csv`;
}

/**
 * Lit le paramètre ?exercice= : une année entre 2000 et 2100, sinon l'année
 * de `aujourdHui`. Jamais d'exception : un paramètre fantaisiste retombe sur
 * l'année en cours.
 */
export function lireExercice(valeur: string | null | undefined, aujourdHui: string): number {
  const n = Number(valeur);
  if (valeur && Number.isInteger(n) && n >= 2000 && n <= 2100) return n;
  return Number(aujourdHui.slice(0, 4));
}
