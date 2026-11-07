/**
 * SERVICE SUBVENTIONS (07/11/2026) — fonctions PURES, sans base.
 *
 * Règles (cahiers des charges Compta Nova, reprises sans leur code) :
 *  - demandé, notifié et encaissé sont trois montants distincts ;
 *  - saisir une demande ne crée aucun encaissement ;
 *  - notifié inconnu = vide (null), jamais 0 ;
 *  - encaissé = somme des RECETTES rattachées au dossier (financement lié),
 *    jamais saisi à la main ; les DÉPENSES rattachées montrent l'emploi des
 *    fonds (compte rendu financier au financeur) ;
 *  - les virements internes ne comptent jamais.
 *
 * Tests : node scripts/test.mjs lib/services/subventions.test.ts
 */
import type { NouvelleSubvention, StatutSubvention, Subvention, Transaction } from "@/types/database";
import { eurosVersCentimes } from "@/lib/services/montants";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

export const LIBELLES_STATUT_SUBVENTION: Record<StatutSubvention, string> = {
  a_preparer: "À préparer",
  deposee: "Déposée",
  notifiee: "Notifiée",
  soldee: "Soldée",
  refusee: "Refusée",
};

export interface SaisieSubvention {
  entiteId: string;
  financeur: string;
  action: string;
  exercice: string;
  statut: string;
  montantDemande: string; // "" = inconnu
  montantNotifie: string; // "" = inconnu
  dateDepot: string;
  dateNotification: string;
  echeance: string;
  commentaire: string;
}

function dateOuNull(v: string): string | null | false {
  const t = v.trim();
  if (t === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : false;
}

/** "" → null (inconnu) ; sinon centimes ≥ 0 ; false si invalide. */
function montantOuNull(v: string): number | null | false {
  if (v.trim() === "") return null;
  const c = eurosVersCentimes(v);
  return c === null || c < 0 ? false : c;
}

export function preparerSubvention(s: SaisieSubvention): Resultat<NouvelleSubvention> {
  const erreurs: string[] = [];
  const financeur = s.financeur.trim();
  const action = s.action.trim();
  if (financeur.length < 1 || financeur.length > 120) erreurs.push("Indique le financeur (120 caractères au plus).");
  if (action.length < 1 || action.length > 200) erreurs.push("Indique l'action financée (200 caractères au plus).");
  const exercice = Number(s.exercice);
  if (!Number.isInteger(exercice) || exercice < 2000 || exercice > 2100) erreurs.push("L'exercice doit être une année.");
  const statut = s.statut || "a_preparer";
  if (!(statut in LIBELLES_STATUT_SUBVENTION)) erreurs.push("Statut inconnu.");
  const demande = montantOuNull(s.montantDemande);
  const notifie = montantOuNull(s.montantNotifie);
  if (demande === false) erreurs.push("Montant demandé invalide.");
  if (notifie === false) erreurs.push("Montant notifié invalide.");
  const dateDepot = dateOuNull(s.dateDepot);
  const dateNotification = dateOuNull(s.dateNotification);
  const echeance = dateOuNull(s.echeance);
  if (dateDepot === false || dateNotification === false || echeance === false) erreurs.push("Une des dates n'est pas une date réelle.");
  // Notifiée ou soldée sans montant notifié : on le signale plutôt que d'écrire 0.
  if ((statut === "notifiee" || statut === "soldee") && notifie === null) {
    erreurs.push("Dossier notifié : indique le montant notifié (lu sur la notification).");
  }
  const commentaire = s.commentaire.trim();
  if (commentaire.length > COMMENTAIRE_MAX) erreurs.push("Commentaire trop long.");
  if (erreurs.length > 0) return { ok: false, erreurs };

  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      financeur,
      action,
      exercice,
      statut: statut as StatutSubvention,
      montant_demande_centimes: demande as number | null,
      montant_notifie_centimes: notifie as number | null,
      date_depot: dateDepot as string | null,
      date_notification: dateNotification as string | null,
      echeance: echeance as string | null,
      commentaire: commentaire || null,
    },
  };
}

export interface SuiviSubvention {
  demande: number | null;
  notifie: number | null;
  /** Somme des recettes liées (hors virements). */
  encaisse: number;
  /** Somme des dépenses liées : emploi des fonds. */
  employe: number;
  /** notifié − encaissé, null si notifié inconnu. */
  resteAEncaisser: number | null;
  nbOperations: number;
  /** Échéance passée et dossier pas soldé ni refusé. */
  echeanceDepassee: boolean;
}

export function suiviSubvention(
  sub: Pick<Subvention, "id" | "montant_demande_centimes" | "montant_notifie_centimes" | "echeance" | "statut">,
  transactions: Pick<Transaction, "subvention_id" | "type" | "montant_ttc_centimes" | "virement_id">[],
  aujourdHui: string,
): SuiviSubvention {
  let encaisse = 0;
  let employe = 0;
  let nb = 0;
  for (const t of transactions) {
    if (t.subvention_id !== sub.id || t.virement_id) continue;
    nb++;
    if (t.type === "recette") encaisse += t.montant_ttc_centimes;
    else employe += t.montant_ttc_centimes;
  }
  return {
    demande: sub.montant_demande_centimes,
    notifie: sub.montant_notifie_centimes,
    encaisse,
    employe,
    resteAEncaisser: sub.montant_notifie_centimes === null ? null : sub.montant_notifie_centimes - encaisse,
    nbOperations: nb,
    echeanceDepassee:
      sub.echeance !== null && sub.echeance < aujourdHui && sub.statut !== "soldee" && sub.statut !== "refusee",
  };
}

/**
 * Totaux d'un exercice. Les dossiers refusés ne comptent ni dans le demandé
 * ni dans le notifié. Un notifié inconnu n'est pas compté comme 0 : on
 * renvoie aussi le nombre de dossiers dont le notifié manque.
 */
export function totauxSubventions(
  subs: Pick<Subvention, "id" | "statut" | "montant_demande_centimes" | "montant_notifie_centimes" | "echeance">[],
  transactions: Pick<Transaction, "subvention_id" | "type" | "montant_ttc_centimes" | "virement_id">[],
  aujourdHui: string,
) {
  let demande = 0;
  let notifie = 0;
  let encaisse = 0;
  let notifieInconnu = 0;
  for (const s of subs) {
    const suivi = suiviSubvention(s, transactions, aujourdHui);
    encaisse += suivi.encaisse;
    if (s.statut === "refusee") continue;
    demande += s.montant_demande_centimes ?? 0;
    if (s.statut === "notifiee" || s.statut === "soldee") {
      if (s.montant_notifie_centimes === null) notifieInconnu++;
      else notifie += s.montant_notifie_centimes;
    }
  }
  return { demande, notifie, encaisse, notifieInconnu };
}
