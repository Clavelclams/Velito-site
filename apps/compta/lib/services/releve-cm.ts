/**
 * SERVICE RELEVÉ CRÉDIT MUTUEL — lecture d'un relevé PDF « Extrait de comptes »
 * (07/11/2026). Fonctions PURES : aucune base, aucune lecture de fichier.
 *
 * Le PDF est d'abord transformé en lignes de texte positionnées par
 * lib/pdf/lignes-pdf.ts (côté serveur). Ce service reçoit ces lignes et :
 *  1. repère l'en-tête du tableau (« Débit EUROS » / « Crédit EUROS ») ;
 *  2. lit le solde d'ouverture et le solde de clôture (« SOLDE CREDITEUR AU … ») ;
 *  3. lit chaque opération (date, date de valeur, libellé, montant) et ses
 *     lignes de détail (nom du payeur, « DONT TVA », carte…) ;
 *  4. range chaque montant dans la colonne la plus proche (débit ou crédit),
 *     d'après le bord DROIT du nombre, car les montants sont alignés à droite ;
 *  5. vérifie : ouverture + crédits − débits = clôture. Si ça ne tombe pas
 *     juste, le relevé est mal lu et l'import est refusé (jamais d'à-peu-près).
 *
 * Pourquoi par positions et pas par regex sur le texte brut : un montant seul
 * ne dit pas s'il est au débit ou au crédit. Seule sa colonne le dit.
 *
 * Tests : node scripts/test.mjs lib/services/releve-cm.test.ts
 */
import type { NouvelleTransaction } from "@/types/database";

export interface ElementTexte {
  /** Abscisse du bord gauche (points PDF). */
  x: number;
  largeur: number;
  texte: string;
}

export interface LigneTexte {
  page: number;
  /** Ordonnée (points PDF, plus grand = plus haut sur la page). */
  y: number;
  /** Triés de gauche à droite. */
  elements: ElementTexte[];
}

export interface OperationReleve {
  /** Date d'opération telle qu'imprimée, AAAA-MM-JJ. */
  date: string;
  dateValeur: string;
  /** Première ligne du libellé, telle qu'imprimée. */
  libelle: string;
  /** Lignes de détail sous l'opération (payeur, motif, TVA…). */
  details: string[];
  montantCentimes: number;
  sens: "debit" | "credit";
}

export interface ReleveCm {
  ouverture: { date: string; soldeCentimes: number };
  cloture: { date: string; soldeCentimes: number };
  operations: OperationReleve[];
  totalDebitsCentimes: number;
  totalCreditsCentimes: number;
  /** clôture lue − (ouverture + crédits − débits). 0 = relevé lu sans erreur. */
  ecartCentimes: number;
}

export type ResultatLecture = { ok: true; releve: ReleveCm } | { ok: false; erreur: string };

const RE_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const RE_MONTANT = /^\d{1,3}(?:\.\d{3})*,\d{2}$/;
const RE_SOLDE = /SOLDE (CREDITEUR|DEBITEUR|NUL) AU (\d{2}\/\d{2}\/\d{4})/;

function dateIso(jjmmaaaa: string): string | null {
  const m = RE_DATE.exec(jjmmaaaa.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** « 1.234,56 » → 123456 centimes, par analyse de texte (jamais de flottant). */
export function montantReleveVersCentimes(texte: string): number | null {
  const t = texte.trim();
  if (!RE_MONTANT.test(t)) return null;
  const [entiers, decimales] = t.replace(/\./g, "").split(",");
  return Number(entiers) * 100 + Number(decimales);
}

const bordDroit = (e: ElementTexte) => e.x + e.largeur;

export function lireReleveCm(lignes: LigneTexte[]): ResultatLecture {
  // 1. En-tête : bord droit des colonnes Débit et Crédit, et bord gauche de la
  //    colonne Date (tout ce qui est plus à gauche est de la marge : lettres
  //    verticales, numéros techniques).
  let colDebit: number | null = null;
  let colCredit: number | null = null;
  let margeGauche = 0;
  for (const l of lignes) {
    const debit = l.elements.find((e) => /^Débit/.test(e.texte));
    const credit = l.elements.find((e) => /^Crédit/.test(e.texte));
    const date = l.elements.find((e) => e.texte === "Date");
    if (debit && credit) {
      colDebit = bordDroit(debit);
      colCredit = bordDroit(credit);
      if (date) margeGauche = date.x - 15;
      break;
    }
  }
  if (colDebit === null || colCredit === null) {
    return { ok: false, erreur: "Ce PDF ne ressemble pas à un relevé Crédit Mutuel (colonnes Débit / Crédit introuvables)." };
  }
  const milieu = (colDebit + colCredit) / 2;

  const soldes: { date: string; soldeCentimes: number }[] = [];
  const operations: OperationReleve[] = [];
  let courante: OperationReleve | null = null;

  for (const ligne of lignes) {
    const elements = ligne.elements.filter((e) => e.x >= margeGauche && e.texte.trim() !== "");
    if (elements.length === 0) continue;
    const texteLigne = elements.map((e) => e.texte.trim()).join(" ");

    // 2. Soldes.
    const s = RE_SOLDE.exec(texteLigne);
    if (s) {
      const montant = [...elements].reverse().find((e) => RE_MONTANT.test(e.texte.trim()));
      let c = montant ? montantReleveVersCentimes(montant.texte)! : 0;
      if (s[1] === "NUL") c = 0;
      if (s[1] === "DEBITEUR") c = -c;
      soldes.push({ date: dateIso(s[2]!)!, soldeCentimes: c });
      courante = null;
      continue;
    }

    // Fin d'un bloc d'opérations : totaux, référence de relevé, en-tête répété.
    if (/Total des mouvements|^Réf :|Date valeur/.test(texteLigne)) {
      courante = null;
      continue;
    }

    // 3. Opération : deux dates en tête, un montant en dernier.
    const d1 = dateIso(elements[0]?.texte ?? "");
    const d2 = dateIso(elements[1]?.texte ?? "");
    const dernier = elements[elements.length - 1]!;
    const centimes = montantReleveVersCentimes(dernier.texte);
    if (d1 && d2 && centimes !== null && elements.length >= 4) {
      const libelle = elements
        .slice(2, -1)
        .map((e) => e.texte.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      courante = {
        date: d1,
        dateValeur: d2,
        libelle,
        details: [],
        montantCentimes: centimes,
        // 4. Colonne la plus proche, d'après le bord droit du montant.
        sens: bordDroit(dernier) < milieu ? "debit" : "credit",
      };
      operations.push(courante);
      continue;
    }

    // Ligne de détail d'une opération (sans date ni montant).
    if (courante && !d1 && centimes === null && texteLigne.length <= 80) {
      courante.details.push(texteLigne.replace(/\s+/g, " "));
    } else {
      courante = null;
    }
  }

  if (soldes.length < 2) {
    return { ok: false, erreur: "Soldes d'ouverture et de clôture introuvables sur ce relevé." };
  }
  if (operations.length === 0) {
    // Un relevé sans mouvement existe (mois calme) : on le garde pour son solde.
  }

  const ouverture = soldes[0]!;
  const cloture = soldes[soldes.length - 1]!;
  let debits = 0;
  let credits = 0;
  for (const o of operations) {
    if (o.sens === "debit") debits += o.montantCentimes;
    else credits += o.montantCentimes;
  }
  const ecart = cloture.soldeCentimes - (ouverture.soldeCentimes + credits - debits);

  return {
    ok: true,
    releve: {
      ouverture,
      cloture,
      operations,
      totalDebitsCentimes: debits,
      totalCreditsCentimes: credits,
      ecartCentimes: ecart,
    },
  };
}

// ---------------------------------------------------------------------------
// Préparation de l'import (toujours pur)
// ---------------------------------------------------------------------------

/** Détails qui n'apprennent rien (références techniques, identifiants). */
const DETAIL_INUTILE =
  /^(NOT PROVIDED|DEFAULT|ICS :.*|DONT TVA.*|RMS\w+|\d+|[A-Z0-9]{15,}|SCT\w+|\+REPRESENTATION\+.*)$/;

/** Libellé lisible : première ligne + détails utiles (payeur, motif). */
export function libelleLisible(o: Pick<OperationReleve, "libelle" | "details">): string {
  const utiles: string[] = [];
  for (const brut of o.details) {
    const d = brut.replace(/\s*CARTE \d+$/, "").trim();
    if (!d || DETAIL_INUTILE.test(d) || o.libelle.includes(d)) continue;
    utiles.push(d);
  }
  return [o.libelle, ...utiles].join(" · ").slice(0, 255);
}

/** « DONT TVA 0,43EUR » dans les détails → 43 centimes. 0 sinon. */
export function tvaDepuisDetails(details: string[]): number {
  for (const d of details) {
    const m = /DONT TVA (\d{1,3}(?:\.\d{3})*,\d{2}) ?EUR/.exec(d);
    if (m) return montantReleveVersCentimes(m[1]!) ?? 0;
  }
  return 0;
}

/**
 * Catégorie certaine d'après le libellé, ou null. Volontairement court :
 * seuls les cas sans ambiguïté. Tout le reste reste « à classer » par un humain.
 * Le nom renvoyé n'est appliqué que si l'entité a une catégorie de ce nom.
 */
export function categorieCertaine(o: Pick<OperationReleve, "libelle" | "details" | "sens">): string | null {
  const tout = [o.libelle, ...o.details].join(" ");
  if (o.sens === "debit" && /^(FACTURE|FACT) SGT|FRAIS PRLV IMP|FRAIS PAIE CB/.test(o.libelle)) return "Frais bancaires";
  if (o.sens === "debit" && /SANEF|APRR|AUTOROUTE/.test(tout)) return "Frais de déplacement";
  return null;
}

function lendemain(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * [07/11/2026] sql/10 : une ligne lue sur le relevé arrive POINTÉE sur ce
 * relevé. Les colonnes de pointage ne sont pas encore dans types/database :
 * on les ajoute ici, le type reste compatible avec NouvelleTransaction.
 */
export type NouvelleTransactionPointee = NouvelleTransaction & {
  pointe_le: string;
  pointe_ref: string;
};

export interface LigneAImporter {
  transaction: NouvelleTransactionPointee;
  /** Nom de catégorie proposé (résolu en id par l'action), ou null. */
  categorie: string | null;
  /** true si la date a été décalée au jour de passage en banque. */
  dateDecalee: boolean;
}

/**
 * Transforme un relevé lu en transactions prêtes à insérer.
 *
 * Règle de date : une opération datée au plus tard du jour d'ouverture du
 * relevé (paiement carte du dernier jour du mois précédent, passé en banque
 * APRÈS l'arrêté) est datée du lendemain de l'ouverture, la vraie date est
 * écrite en commentaire. Sinon le contrôle mensuel afficherait un faux écart.
 *
 * Clé anti-doublon : « releve-cm:date imprimée|±montant|LIBELLÉ|#rang ». Même
 * format que l'import SQL du 07/11/2026 : réimporter un relevé déjà chargé
 * par ce script n'ajoute rien.
 *
 * Pointage : la ligne est vue sur ce relevé, elle est pointée à sa date de
 * clôture (« Relevé Crédit Mutuel au JJ/MM/AAAA »). Pointée ne veut pas dire
 * validée : elle reste « à classer » ou « à valider ».
 */
export function preparerImportReleve(
  releve: ReleveCm,
  contexte: { entiteId: string; compteId: string; nomFichier: string },
): LigneAImporter[] {
  const vus = new Map<string, number>();
  const nomFichier = contexte.nomFichier.trim().slice(0, 255) || "relevé Crédit Mutuel";
  return releve.operations.map((o) => {
    const signe = o.sens === "credit" ? "+" : "-";
    const base = `releve-cm:${o.date}|${signe}${o.montantCentimes}|${o.libelle.toUpperCase()}`.slice(0, 245);
    const rang = (vus.get(base) ?? 0) + 1;
    vus.set(base, rang);

    const decalee = o.date <= releve.ouverture.date;
    const date = decalee ? lendemain(releve.ouverture.date) : o.date;
    let commentaire = `Relevé bancaire Crédit Mutuel au ${dateFr(releve.cloture.date)}.`;
    if (decalee) {
      commentaire += ` Opération du ${dateFr(o.date)}, passée en banque après l'arrêté du relevé précédent : datée du ${dateFr(date)}, jour de son passage sur ce relevé.`;
    }

    return {
      categorie: categorieCertaine(o),
      dateDecalee: decalee,
      transaction: {
        entite_id: contexte.entiteId,
        categorie_id: null,
        type: o.sens === "credit" ? "recette" : "depense",
        date_transaction: date,
        libelle: libelleLisible(o),
        montant_ttc_centimes: o.montantCentimes,
        montant_tva_centimes: Math.min(tvaDepuisDetails(o.details), o.montantCentimes),
        compte_tresorerie_id: contexte.compteId,
        commentaire,
        source_fichier: nomFichier,
        source_ref: `relevé au ${releve.cloture.date}`,
        source_cle: `${base}|#${rang}`,
        pointe_le: releve.cloture.date,
        pointe_ref: `Relevé Crédit Mutuel au ${dateFr(releve.cloture.date)}`,
      },
    };
  });
}
