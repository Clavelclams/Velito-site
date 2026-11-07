/**
 * SERVICE TRÉSORERIE — couche logique métier (Lot 6, 07/11/2026).
 *
 * Comptes réels (courant, livret, caisse), virements internes, soldes
 * observés et contrôle mensuel. Fonctions 100 % PURES : aucune base, aucune
 * date « maintenant » cachée (on la passe en paramètre) → testables
 * (voir tresorerie.test.ts).
 *
 * Règles reprises des cahiers des charges « Compta Nova » du MABB :
 *   - un virement interne déplace de l'argent entre deux comptes, il n'est
 *     ni une recette ni une dépense de l'association ;
 *   - contrôle d'un mois : ouverture + recettes − dépenses = clôture, et la
 *     clôture calculée se compare au solde OBSERVÉ sur le relevé ;
 *   - inconnu ≠ zéro : un solde initial non connu donne des soldes « null »,
 *     jamais un 0 inventé.
 * Tous les montants sont en CENTIMES entiers.
 */
import type {
  CompteTresorerie,
  NatureCompte,
  NouveauCompteTresorerie,
  NouvelleTransaction,
  SoldeObserve,
  StatutTransaction,
  Transaction,
} from "@/types/database";
import { eurosVersCentimes, estMontantValide } from "@/lib/services/montants";

export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreurs: string[] };

/** Libellés affichés des statuts (règle Nova : trois états distincts). */
export const LIBELLES_STATUT: Record<StatutTransaction, string> = {
  a_classer: "À classer",
  a_verifier: "À valider",
  validee: "Validé",
};

export const LIBELLES_NATURE: Record<NatureCompte, string> = {
  courant: "Compte courant",
  livret: "Livret",
  caisse: "Caisse (espèces)",
  autre: "Autre",
};

export const NOM_COMPTE_MAX = 60;

export function estStatutValide(v: string): v is StatutTransaction {
  return v === "a_classer" || v === "a_verifier" || v === "validee";
}

function estNatureValide(v: string): v is NatureCompte {
  return v === "courant" || v === "livret" || v === "caisse" || v === "autre";
}

/** Même contrôle de date réelle que le service transactions (round-trip). */
export function estDateValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return new Date(iso + "T00:00:00Z").toISOString().slice(0, 10) === iso;
}

/**
 * Montant SIGNÉ saisi par un humain ("-12,50", "1 200") → centimes, ou null.
 * Un solde peut être négatif (découvert) ; un montant d'opération, lui, ne
 * l'est jamais (c'est le type recette/dépense qui porte le sens).
 */
export function saisieSigneeVersCentimes(saisie: string): number | null {
  const s = (saisie ?? "").trim();
  if (s === "") return null;
  const negatif = s.startsWith("-");
  const centimes = eurosVersCentimes(negatif ? s.slice(1) : s);
  if (centimes === null) return null;
  return negatif ? -centimes : centimes;
}

// ============================================================================
// Comptes et soldes observés : validation des saisies
// ============================================================================

export interface SaisieCompte {
  entiteId: string;
  nom: string;
  nature: string;
  soldeInitial: string; // "" = inconnu
  dateSoldeInitial: string; // "" = inconnu
}

export function preparerCompte(s: SaisieCompte): Resultat<NouveauCompteTresorerie> {
  const erreurs: string[] = [];
  const nom = (s.nom ?? "").trim().replace(/\s+/g, " ");
  if (nom.length === 0) erreurs.push("Le nom du compte est obligatoire.");
  else if (nom.length > NOM_COMPTE_MAX) {
    erreurs.push(`Le nom ne peut pas dépasser ${NOM_COMPTE_MAX} caractères.`);
  }
  if (!estNatureValide(s.nature)) erreurs.push("Nature de compte inconnue.");

  const soldeVide = (s.soldeInitial ?? "").trim() === "";
  const dateVide = (s.dateSoldeInitial ?? "").trim() === "";
  let solde: number | null = null;
  let date: string | null = null;

  if (soldeVide !== dateVide) {
    // Un solde sans date (ou l'inverse) ne permet aucun contrôle : on refuse
    // plutôt que de deviner l'élément manquant.
    erreurs.push("Le solde initial et sa date vont ensemble : remplis les deux, ou aucun.");
  } else if (!soldeVide) {
    solde = saisieSigneeVersCentimes(s.soldeInitial);
    if (solde === null) erreurs.push("Le solde initial doit être un montant (ex. 1 250,00 ou -35,10).");
    if (!estDateValide(s.dateSoldeInitial)) erreurs.push("La date du solde initial doit être une date réelle.");
    else date = s.dateSoldeInitial;
  }

  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      nom,
      nature: s.nature as NatureCompte,
      solde_initial_centimes: solde,
      date_solde_initial: date,
    },
  };
}

export interface SaisieSoldeObserve {
  entiteId: string;
  compteId: string;
  dateReleve: string;
  solde: string;
  reference: string;
}

export type NouveauSoldeObserve = Omit<SoldeObserve, "id" | "cree_le">;

export function preparerSoldeObserve(s: SaisieSoldeObserve): Resultat<NouveauSoldeObserve> {
  const erreurs: string[] = [];
  if (!s.compteId) erreurs.push("Choisis le compte.");
  if (!estDateValide(s.dateReleve)) erreurs.push("La date du relevé doit être une date réelle.");
  const solde = saisieSigneeVersCentimes(s.solde);
  if (solde === null) erreurs.push("Le solde lu sur le relevé est obligatoire.");
  const reference = (s.reference ?? "").trim();
  if (reference.length > 120) erreurs.push("La référence ne peut pas dépasser 120 caractères.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      compte_id: s.compteId,
      date_releve: s.dateReleve,
      solde_centimes: solde as number,
      reference: reference || null,
    },
  };
}

// ============================================================================
// Virements internes
// ============================================================================

export interface SaisieVirement {
  entiteId: string;
  compteSourceId: string;
  compteDestinationId: string;
  date: string;
  montant: string;
  libelle: string;
}

/**
 * Prépare les DEUX jambes d'un virement : une sortie sur le compte source,
 * une entrée sur le compte destination, même montant, même date, liées par
 * `virementId`. L'identifiant est fourni par l'appelant (crypto.randomUUID()
 * côté serveur) pour que cette fonction reste pure et testable.
 */
export function preparerVirement(
  s: SaisieVirement,
  virementId: string,
): Resultat<[NouvelleTransaction, NouvelleTransaction]> {
  const erreurs: string[] = [];
  if (!s.compteSourceId || !s.compteDestinationId) {
    erreurs.push("Choisis le compte de départ et le compte d'arrivée.");
  } else if (s.compteSourceId === s.compteDestinationId) {
    erreurs.push("Un virement interne relie deux comptes différents.");
  }
  if (!estDateValide(s.date)) erreurs.push("La date du virement doit être une date réelle.");
  const montant = eurosVersCentimes(s.montant ?? "");
  if (montant === null || !estMontantValide(montant)) {
    erreurs.push("Le montant du virement doit être supérieur à 0.");
  }
  const libelle = ((s.libelle ?? "").trim() || "Virement interne").slice(0, 255);
  if (erreurs.length > 0) return { ok: false, erreurs };

  const commun = {
    entite_id: s.entiteId,
    categorie_id: null,
    date_transaction: s.date,
    libelle,
    montant_ttc_centimes: montant as number,
    montant_tva_centimes: 0,
    // Un virement est un fait bancaire, pas une recette/dépense à classer.
    statut: "validee" as const,
    virement_id: virementId,
  };
  return {
    ok: true,
    valeur: [
      { ...commun, type: "depense", compte_tresorerie_id: s.compteSourceId },
      { ...commun, type: "recette", compte_tresorerie_id: s.compteDestinationId },
    ],
  };
}

export function estVirement(t: Pick<Transaction, "virement_id">): boolean {
  return t.virement_id !== null && t.virement_id !== undefined;
}

/**
 * Retire les virements internes : à utiliser pour tout total de recettes ou
 * de dépenses de l'ASSOCIATION (tableau de bord, bilans). Sans ce filtre, un
 * transfert courant → livret de 1 000 € gonflerait recettes ET dépenses.
 */
export function horsVirements<T extends Pick<Transaction, "virement_id">>(transactions: T[]): T[] {
  return transactions.filter((t) => !estVirement(t));
}

// ============================================================================
// Soldes et contrôle mensuel
// ============================================================================

type TxSolde = Pick<
  Transaction,
  "compte_tresorerie_id" | "type" | "montant_ttc_centimes" | "date_transaction" | "statut"
>;

/** +montant pour une recette, −montant pour une dépense. */
function signe(t: TxSolde): number {
  return t.type === "recette" ? t.montant_ttc_centimes : -t.montant_ttc_centimes;
}

/** Les mouvements d'un compte pris en compte dans son solde (à partir du solde initial). */
function mouvementsDuCompte(compte: CompteTresorerie, transactions: TxSolde[]): TxSolde[] {
  return transactions.filter(
    (t) =>
      t.compte_tresorerie_id === compte.id &&
      (compte.date_solde_initial === null || t.date_transaction >= compte.date_solde_initial),
  );
}

/**
 * Solde calculé d'un compte à la fin d'une journée (incluse).
 * null si le solde initial est inconnu : on refuse d'afficher un faux solde.
 */
export function soldeAu(
  compte: CompteTresorerie,
  transactions: TxSolde[],
  dateIncluse: string,
): number | null {
  if (compte.solde_initial_centimes === null) return null;
  let s = compte.solde_initial_centimes;
  for (const t of mouvementsDuCompte(compte, transactions)) {
    if (t.date_transaction <= dateIncluse) s += signe(t);
  }
  return s;
}

type ObservationSolde = Pick<SoldeObserve, "compte_id" | "date_releve" | "solde_centimes">;

/**
 * [07/11/2026] Solde à la fin d'une journée, en repartant du DERNIER SOLDE LU
 * sur un relevé (au plus tard ce jour-là, ou strictement avant si `strict`),
 * plus les mouvements qui suivent. Sans relevé antérieur : soldeAu (depuis le
 * solde initial).
 *
 * Pourquoi : c'est la règle du rapprochement bancaire, période par période.
 * Si des relevés manquent (deux ans perdus), un calcul depuis l'ouverture du
 * compte serait faux pour toujours ; en repartant du solde imprimé sur chaque
 * relevé (l'import enregistre le solde d'ouverture ET de clôture), chaque
 * période complète se contrôle seule, et un trou ne contamine pas la suite.
 */
export function soldeRepris(
  compte: CompteTresorerie,
  transactions: TxSolde[],
  observations: ObservationSolde[],
  dateIncluse: string,
  strict = false,
): number | null {
  const base = observations
    .filter((o) => o.compte_id === compte.id && (strict ? o.date_releve < dateIncluse : o.date_releve <= dateIncluse))
    .sort((a, b) => b.date_releve.localeCompare(a.date_releve))[0];
  if (!base) return soldeAu(compte, transactions, dateIncluse);
  let s = base.solde_centimes;
  for (const t of transactions) {
    if (t.compte_tresorerie_id !== compte.id) continue;
    if (t.date_transaction > base.date_releve && t.date_transaction <= dateIncluse) s += signe(t);
  }
  return s;
}

/** Dernier jour d'un mois au format AAAA-MM-JJ (gère février et les bissextiles). */
export function finDeMois(annee: number, mois: number): string {
  const jour = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

export type EtatMois =
  | "a_venir" // le mois n'est pas terminé
  | "avant_ouverture" // avant la date du solde initial
  | "solde_initial_inconnu" // impossible de calculer un solde
  | "concorde" // solde observé = solde calculé
  | "ecart" // solde observé ≠ solde calculé
  | "non_observe"; // aucun relevé saisi pour ce mois

export interface LigneControle {
  mois: number; // 1..12
  ouverture: number | null;
  recettes: number;
  depenses: number;
  cloture: number | null;
  nbOperations: number;
  /** Opérations du mois pas encore « Validé » (à classer ou à valider). */
  nbNonValidees: number;
  observe: { date: string; solde: number; reference: string | null } | null;
  /** observé − calculé, à la date du relevé. null si non calculable. */
  ecart: number | null;
  etat: EtatMois;
}

/**
 * Contrôle d'un compte mois par mois sur une année.
 * @param aujourdHui "AAAA-MM-JJ" — passé en paramètre (pureté, tests).
 *
 * Pour un mois : ouverture = solde au dernier jour du mois précédent ;
 * clôture = ouverture + recettes − dépenses. Le relevé retenu est le plus
 * récent du mois ; l'écart se calcule À SA DATE (un relevé du 15 se compare
 * au solde calculé du 15, pas à celui du 31).
 */
export function controleMensuel(
  compte: CompteTresorerie,
  transactions: TxSolde[],
  observations: Pick<SoldeObserve, "compte_id" | "date_releve" | "solde_centimes" | "reference">[],
  annee: number,
  aujourdHui: string,
): LigneControle[] {
  const mouvements = mouvementsDuCompte(compte, transactions);
  const obsCompte = observations
    .filter((o) => o.compte_id === compte.id)
    .sort((a, b) => a.date_releve.localeCompare(b.date_releve));

  const lignes: LigneControle[] = [];
  for (let mois = 1; mois <= 12; mois++) {
    const prefixe = `${annee}-${String(mois).padStart(2, "0")}`;
    const debut = `${prefixe}-01`;
    const fin = finDeMois(annee, mois);
    const veille = mois === 1 ? `${annee - 1}-12-31` : finDeMois(annee, mois - 1);

    const duMois = mouvements.filter((t) => t.date_transaction.startsWith(prefixe));
    let recettes = 0;
    let depenses = 0;
    for (const t of duMois) {
      if (t.type === "recette") recettes += t.montant_ttc_centimes;
      else depenses += t.montant_ttc_centimes;
    }
    const nbNonValidees = duMois.filter((t) => t.statut !== "validee").length;

    const obs = [...obsCompte].reverse().find((o) => o.date_releve.startsWith(prefixe)) ?? null;
    const observe = obs
      ? { date: obs.date_releve, solde: obs.solde_centimes, reference: obs.reference }
      : null;

    let ouverture: number | null = null;
    let cloture: number | null = null;
    let ecart: number | null = null;
    let etat: EtatMois;

    if (compte.date_solde_initial !== null && fin < compte.date_solde_initial) {
      etat = "avant_ouverture";
    } else if (
      compte.solde_initial_centimes === null &&
      !obsCompte.some((o) => o.date_releve <= veille)
    ) {
      etat = debut > aujourdHui ? "a_venir" : "solde_initial_inconnu";
    } else {
      // [07/11/2026] Ouverture et écart repartent du dernier solde LU sur un
      // relevé (soldeRepris) : un relevé manquant ne fausse plus les mois
      // suivants. Si le solde initial tombe dans ce mois, l'ouverture est lui.
      ouverture =
        compte.solde_initial_centimes !== null && compte.date_solde_initial !== null && compte.date_solde_initial >= debut
          ? compte.solde_initial_centimes
          : (soldeRepris(compte, transactions, obsCompte, veille) as number);
      cloture = ouverture + recettes - depenses;
      if (observe) {
        // Comparé au solde reconstruit depuis le relevé PRÉCÉDENT (strict).
        const attendu = soldeRepris(compte, transactions, obsCompte, observe.date, true);
        ecart = attendu === null ? null : observe.solde - attendu;
      }
      if (fin >= aujourdHui && !observe) etat = "a_venir";
      else if (!observe) etat = "non_observe";
      else if (ecart === null) etat = "solde_initial_inconnu";
      else etat = ecart === 0 ? "concorde" : "ecart";
    }

    lignes.push({
      mois,
      ouverture,
      recettes,
      depenses,
      cloture,
      nbOperations: duMois.length,
      nbNonValidees,
      observe,
      ecart,
      etat,
    });
  }
  return lignes;
}

// ============================================================================
// Plan de catégories associatif (modèle proposé, inspiré de la nomenclature
// Nova harmonisée). C'est un POINT DE DÉPART : chaque catégorie reste
// renommable ou archivable dans l'écran Catégories.
// ============================================================================

export const PLAN_ASSOCIATIF: { nom: string; type: "recette" | "depense" }[] = [
  { nom: "Cotisations et adhésions", type: "recette" },
  { nom: "Subventions publiques", type: "recette" },
  { nom: "Sponsoring, dons et mécénat", type: "recette" },
  { nom: "Ventes et prestations", type: "recette" },
  { nom: "Événementiel et actions", type: "recette" },
  { nom: "Produits financiers", type: "recette" },
  { nom: "Autres recettes", type: "recette" },
  { nom: "Frais de déplacement", type: "depense" },
  { nom: "Restauration et événements", type: "depense" },
  { nom: "Activités et sorties", type: "depense" },
  { nom: "Équipement et matériel", type: "depense" },
  { nom: "Jeux et consoles", type: "depense" },
  { nom: "Fournitures et fonctionnement", type: "depense" },
  { nom: "Affiliations et licences", type: "depense" },
  { nom: "Assurance", type: "depense" },
  { nom: "Frais bancaires", type: "depense" },
  { nom: "Télécoms et numérique", type: "depense" },
  { nom: "Communication", type: "depense" },
  { nom: "Formation", type: "depense" },
  { nom: "Emplois et rémunérations", type: "depense" },
  { nom: "Charges sociales", type: "depense" },
  { nom: "Volontaires (service civique)", type: "depense" },
  { nom: "Véhicule", type: "depense" },
  { nom: "Divers", type: "depense" },
];

/**
 * Catégories du plan qui n'existent pas encore pour l'entité (comparaison
 * nom + type, insensible à la casse) : l'initialisation est idempotente.
 */
export function categoriesManquantes(
  existantes: { nom: string; type: string }[],
): { nom: string; type: "recette" | "depense" }[] {
  const cle = (n: string, t: string) => `${t}|${n.trim().toLocaleLowerCase("fr")}`;
  const deja = new Set(existantes.map((c) => cle(c.nom, c.type)));
  return PLAN_ASSOCIATIF.filter((c) => !deja.has(cle(c.nom, c.type)));
}

// ============================================================================
// Filtres de la liste des opérations
// ============================================================================

/** "a_traiter" = tout ce qui n'est pas encore validé (hors virements). */
export type FiltreStatut = StatutTransaction | "a_traiter" | "";

export function filtrerOperations<
  T extends Pick<Transaction, "statut" | "virement_id" | "compte_tresorerie_id">,
>(transactions: T[], filtre: { statut?: string; compteId?: string }): T[] {
  const statut = filtre.statut ?? "";
  const compteId = filtre.compteId ?? "";
  return transactions.filter((t) => {
    if (statut === "a_traiter" && (t.statut === "validee" || estVirement(t))) return false;
    if (estStatutValide(statut) && t.statut !== statut) return false;
    // "sans" = opérations dont le compte n'est pas encore connu.
    if (compteId === "sans" && t.compte_tresorerie_id !== null) return false;
    if (compteId && compteId !== "sans" && t.compte_tresorerie_id !== compteId) return false;
    return true;
  });
}
