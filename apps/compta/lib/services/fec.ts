/**
 * SERVICE FEC — génération du Fichier des Écritures Comptables (Lot 5, Bloc 5.3).
 *
 * Le FEC est le format OFFICIEL exigé par l'administration (article A47 A-1 du
 * LPF) : 18 champs normalisés, une ligne par ligne d'écriture, séparateur
 * tabulation, dates au format AAAAMMJJ, montants à la virgule décimale.
 *
 * Fonction PURE : elle prend des écritures + leurs lignes + le plan comptable
 * et rend une CHAÎNE. Aucun accès base, aucun HTTP → testable, et l'export est
 * strictement DÉTERMINISTE (mêmes écritures ⇒ même fichier). La route se
 * charge du transport (en-têtes, nom de fichier).
 *
 * Périmètre assumé : c'est un FEC de PRÉ-COMPTABILITÉ, destiné à alimenter
 * l'expert-comptable / un contrôle. On ne prétend pas remplacer un logiciel
 * certifié (voir README).
 */
import type { Ecriture, LigneEcriture, Compte } from "@/types/database";
import { centimesVersSaisie } from "@/lib/services/montants";

const SEP = "\t"; // tabulation : séparateur FEC le plus courant
const EOL = "\r\n";

/** Les 18 colonnes officielles, dans l'ordre imposé. */
export const EN_TETES_FEC = [
  "JournalCode",
  "JournalLib",
  "EcritureNum",
  "EcritureDate",
  "CompteNum",
  "CompteLib",
  "CompAuxNum",
  "CompAuxLib",
  "PieceRef",
  "PieceDate",
  "EcritureLib",
  "Debit",
  "Credit",
  "EcritureLet",
  "DateLet",
  "ValidDate",
  "Montantdevise",
  "Idevise",
] as const;

/** "2026-07-07" ou ISO → "20260707". Chaîne vide si absente. */
function dateFec(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10).replace(/-/g, "");
}

/** Montant FEC : centimes → "100,00" (2 décimales, virgule). */
function montantFec(centimes: number): string {
  return centimesVersSaisie(centimes);
}

/** Libellés courants de journaux (code → libellé lisible). */
const LIBELLES_JOURNAUX: Record<string, string> = {
  ACH: "Achats",
  VEN: "Ventes",
  BQ: "Banque",
  CA: "Caisse",
  OD: "Opérations diverses",
};
function libelleJournal(code: string): string {
  return LIBELLES_JOURNAUX[code] ?? code;
}

/**
 * Neutralise un champ texte : le séparateur (tab) et les sauts de ligne
 * casseraient la structure du fichier → on les remplace par une espace.
 */
function champ(texte: string): string {
  return (texte ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

/**
 * Génère le contenu FEC.
 * @param ecritures  écritures de l'entité (ordre d'export = date puis création).
 * @param lignesParEcriture  map ecritureId → ses lignes.
 * @param comptesParId  map compteId → compte (pour numéro + libellé).
 *
 * EcritureNum : numéro séquentiel attribué à l'export (1, 2, 3…) dans l'ordre
 * chronologique — stable pour un même jeu d'écritures.
 */
export function genererFec(
  ecritures: Ecriture[],
  lignesParEcriture: Map<string, LigneEcriture[]>,
  comptesParId: Map<string, Compte>,
): string {
  // Ordre déterministe : date d'écriture croissante, puis création.
  const triees = [...ecritures].sort((a, b) => {
    if (a.date_ecriture !== b.date_ecriture) {
      return a.date_ecriture < b.date_ecriture ? -1 : 1;
    }
    return a.cree_le < b.cree_le ? -1 : a.cree_le > b.cree_le ? 1 : 0;
  });

  const lignesFichier: string[] = [EN_TETES_FEC.join(SEP)];

  triees.forEach((ecriture, index) => {
    const ecritureNum = String(index + 1);
    const lignes = lignesParEcriture.get(ecriture.id) ?? [];

    for (const ligne of lignes) {
      const compte = comptesParId.get(ligne.compte_id);
      const colonnes = [
        champ(ecriture.journal), // JournalCode
        champ(libelleJournal(ecriture.journal)), // JournalLib
        ecritureNum, // EcritureNum
        dateFec(ecriture.date_ecriture), // EcritureDate
        champ(compte?.numero ?? ""), // CompteNum
        champ(compte?.libelle ?? ""), // CompteLib
        "", // CompAuxNum (pas de comptes auxiliaires)
        "", // CompAuxLib
        champ(ecriture.piece ?? ""), // PieceRef
        dateFec(ecriture.date_ecriture), // PieceDate
        champ(ecriture.libelle), // EcritureLib
        montantFec(ligne.debit_centimes), // Debit
        montantFec(ligne.credit_centimes), // Credit
        "", // EcritureLet (pas de lettrage)
        "", // DateLet
        dateFec(ecriture.cree_le), // ValidDate
        "", // Montantdevise
        "", // Idevise
      ];
      lignesFichier.push(colonnes.join(SEP));
    }
  });

  return lignesFichier.join(EOL) + EOL;
}

/** Nom de fichier FEC réglementaire : SIREN + FEC + date de clôture. */
export function nomFichierFec(siren: string, dateCloture: string): string {
  const s = (siren || "000000000").replace(/\D/g, "").padEnd(9, "0").slice(0, 9);
  return `${s}FEC${dateFec(dateCloture)}.txt`;
}
