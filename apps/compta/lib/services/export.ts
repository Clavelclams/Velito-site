/**
 * SERVICE EXPORT — couche logique métier.
 *
 * Transforme des transactions en un fichier CSV prêt à transmettre à
 * l'expert-comptable (ou à ouvrir dans Excel/LibreOffice). Fonctions PURES
 * (aucun accès base, aucune réponse HTTP) → testables unitairement.
 *
 * Choix de format, à défendre :
 *  - séparateur « ; » : c'est le séparateur CSV par défaut d'Excel en locale
 *    française (Excel FR lit « , » comme séparateur décimal, pas de colonne) ;
 *  - décimales à la virgule (via centimesVersSaisie) : nombres reconnus comme
 *    tels par Excel FR ;
 *  - échappement RFC 4180 : tout champ contenant « ; », un guillemet ou un
 *    saut de ligne est entouré de guillemets, les guillemets internes doublés.
 *    Sans ça, un libellé « Achat, matériel; urgent » casserait les colonnes.
 * Le BOM UTF-8 est ajouté par la couche qui sert le fichier (route), pas ici :
 * ce service produit une CHAÎNE pure, indépendante du transport.
 */
import type { Transaction } from "@/types/database";
import { centimesVersSaisie } from "@/lib/services/montants";

/** Séparateur de colonnes et fin de ligne (CRLF = attendu par Excel). */
const SEP = ";";
const EOL = "\r\n";

/** En-têtes des colonnes exportées, dans l'ordre. */
export const EN_TETES_EXPORT = [
  "Date",
  "Type",
  "Catégorie",
  "Libellé",
  "Montant TTC",
  "TVA",
  "Montant HT",
  "Statut",
] as const;

/** "2026-07-07" → "07/07/2026" (sans dépendance ni fuseau). */
function dateFr(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

/**
 * Ne garde que les transactions dont la date est dans [debut, fin] (bornes
 * incluses). Bornes optionnelles : absente = pas de limite de ce côté.
 * Comparaison de chaînes "AAAA-MM-JJ" : l'ordre lexicographique == ordre
 * chronologique pour ce format, donc aucune conversion de date nécessaire.
 */
export function filtrerParPeriode(
  transactions: Transaction[],
  debut?: string,
  fin?: string,
): Transaction[] {
  return transactions.filter((t) => {
    if (debut && t.date_transaction < debut) return false;
    if (fin && t.date_transaction > fin) return false;
    return true;
  });
}

/** Une transaction → un tableau de champs (dans l'ordre des en-têtes). */
export function transactionVersLigne(
  t: Transaction,
  nomsCategories: Record<string, string>,
): string[] {
  return [
    dateFr(t.date_transaction),
    t.type === "recette" ? "Recette" : "Dépense",
    t.categorie_id ? (nomsCategories[t.categorie_id] ?? "") : "",
    t.libelle,
    centimesVersSaisie(t.montant_ttc_centimes),
    centimesVersSaisie(t.montant_tva_centimes),
    centimesVersSaisie(t.montant_ht_centimes),
    t.statut === "a_verifier" ? "À vérifier" : "Validée",
  ];
}

/** Échappe un champ CSV (RFC 4180) si nécessaire. */
export function echapperChampCsv(champ: string): string {
  if (champ.includes(SEP) || champ.includes('"') || /[\r\n]/.test(champ)) {
    return `"${champ.replace(/"/g, '""')}"`;
  }
  return champ;
}

/** Assemble une ligne CSV à partir de champs déjà calculés. */
function ligneCsv(champs: readonly string[]): string {
  return champs.map(echapperChampCsv).join(SEP);
}

/**
 * Génère le contenu CSV complet (en-tête + lignes). Chaîne pure : la route se
 * charge d'ajouter le BOM et les en-têtes HTTP de téléchargement.
 */
export function genererCsv(
  transactions: Transaction[],
  nomsCategories: Record<string, string>,
): string {
  const lignes = [
    ligneCsv(EN_TETES_EXPORT),
    ...transactions.map((t) => ligneCsv(transactionVersLigne(t, nomsCategories))),
  ];
  return lignes.join(EOL) + EOL;
}

/** Nom de fichier proposé : "compta_VEA_2026-07-07.csv" (nom entité assaini). */
export function nomFichierExport(nomEntite: string): string {
  const slug = nomEntite
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const jour = new Date().toISOString().slice(0, 10);
  return `compta_${slug || "export"}_${jour}.csv`;
}
