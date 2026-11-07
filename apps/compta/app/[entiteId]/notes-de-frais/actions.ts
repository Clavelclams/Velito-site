/**
 * Server actions — Notes de frais (07/11/2026).
 *
 * Le service (lib/services/notes-de-frais) décide, le repository écrit, la
 * RLS cloisonne, les triggers de sql/12 gardent le cycle de vie et la
 * clôture. L'entité vient de l'URL ; chaque note, ligne, opération ou
 * catégorie est revérifiée avant d'écrire.
 */
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { getTransaction, mettreAJourTransaction } from "@/lib/repositories/transactions";
import { supprimerEcrituresParTransaction } from "@/lib/repositories/ecritures";
import { synchroniserEcriture } from "@/lib/comptabilite-sync";
import {
  creerContributionAbandon,
  creerDepensesRelancables,
  creerLignes,
  creerNote,
  getLigne,
  getNote,
  listerLignesNote,
  listerTransactionsParIds,
  mettreAJourLigne,
  mettreAJourNote,
  obtenirCompteAvances,
  supprimerLigne,
  supprimerNote,
} from "@/lib/repositories/notes-de-frais";
import {
  controlerTransition,
  estModifiable,
  ligneDepuisOperation,
  preparerAbandon,
  preparerCorrection,
  preparerLigne,
  preparerNote,
  preparerRemboursement,
  preparerValidation,
  totalNote,
  type SaisieLigne,
  type SaisieNote,
} from "@/lib/services/notes-de-frais";
import type { Transaction } from "@/types/database";
import type { StatutNoteFrais } from "@/types/notes-de-frais";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/notes-de-frais`, "layout");
  revalidatePath(`/${entiteId}/ik`);
  revalidatePath(`/${entiteId}/transactions`);
  revalidatePath(`/${entiteId}/a-traiter`);
  revalidatePath(`/${entiteId}/tresorerie`, "layout");
  revalidatePath(`/${entiteId}/benevolat`);
  revalidatePath(`/${entiteId}`);
}

const aujourdHui = () => new Date().toISOString().slice(0, 10);

/** Note de CETTE structure, sinon null (un id d'une autre structure ne révèle rien). */
async function noteDeLEntite(supabase: Awaited<ReturnType<typeof createClient>>, entiteId: string, noteId: string) {
  const note = await getNote(supabase, noteId);
  return note && note.entite_id === entiteId ? note : null;
}

// ============================================================================
// Note : création, en-tête, suppression
// ============================================================================

export async function creerNoteAction(
  entiteId: string,
  saisie: Omit<SaisieNote, "entiteId">,
): Promise<ResultatAction & { id?: string }> {
  const prepare = preparerNote({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  let id: string;
  try {
    const supabase = await createClient();
    id = (await creerNote(supabase, prepare.valeur)).id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

export async function modifierNoteAction(
  entiteId: string,
  noteId: string,
  saisie: Omit<SaisieNote, "entiteId">,
): Promise<ResultatAction> {
  const prepare = preparerNote({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    if (!estModifiable(note)) return { success: false, error: "Cette note ne se modifie plus." };
    const { beneficiaire, objet, date_note, commentaire } = prepare.valeur;
    await mettreAJourNote(supabase, noteId, { beneficiaire, objet, date_note, commentaire });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerNoteAction(entiteId: string, noteId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    if (!estModifiable(note)) return { success: false, error: "Seule une note en brouillon ou à vérifier se supprime." };
    await supprimerNote(supabase, noteId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  redirect(`/${entiteId}/notes-de-frais`);
}

// ============================================================================
// Lignes
// ============================================================================

export async function ajouterLigneAction(entiteId: string, noteId: string, saisie: SaisieLigne): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    if (!estModifiable(note)) return { success: false, error: "Cette note ne se modifie plus." };
    const categories = await listerCategories(supabase, entiteId);
    const prepare = preparerLigne(saisie, note, categories);
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await creerLignes(supabase, [prepare.valeur]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/** Ajoute une opération déjà en compta (ticket importé sans compte). Le trigger refuse un doublon entre notes. */
export async function ajouterLigneOperationAction(entiteId: string, noteId: string, transactionId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    if (!estModifiable(note)) return { success: false, error: "Cette note ne se modifie plus." };
    const tx = await getTransaction(supabase, transactionId);
    if (!tx || tx.entite_id !== entiteId) return { success: false, error: "Opération introuvable." };
    const prepare = ligneDepuisOperation(tx, note);
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await creerLignes(supabase, [prepare.valeur]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function classerLigneAction(entiteId: string, ligneId: string, categorieId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const ligne = await getLigne(supabase, ligneId);
    if (!ligne || ligne.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    let categorie: string | null = null;
    if (categorieId) {
      const c = (await listerCategories(supabase, entiteId)).find((x) => x.id === categorieId);
      if (!c) return { success: false, error: "Catégorie introuvable." };
      if (c.type !== "depense") return { success: false, error: "Choisis une catégorie de dépense." };
      categorie = c.id;
    }
    await mettreAJourLigne(supabase, ligneId, { categorie_id: categorie });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/** Retire une ligne. Une ligne liée : l'opération reste en compta, seul le lien disparaît. */
export async function supprimerLigneAction(entiteId: string, ligneId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const ligne = await getLigne(supabase, ligneId);
    if (!ligne || ligne.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    await supprimerLigne(supabase, ligneId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Statuts simples : soumettre, renvoyer en brouillon, refuser
// ============================================================================

export async function changerStatutAction(
  entiteId: string,
  noteId: string,
  vers: Extract<StatutNoteFrais, "a_verifier" | "brouillon" | "refusee">,
  motifRefus?: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    const [lignes, categories] = await Promise.all([listerLignesNote(supabase, noteId), listerCategories(supabase, entiteId, false)]);
    const refus = controlerTransition(note, vers, lignes, categories, motifRefus);
    if (refus) return { success: false, error: refus };
    await mettreAJourNote(supabase, noteId, vers === "refusee" ? { statut: vers, motif_refus: (motifRefus ?? "").trim() } : { statut: vers });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Validation : les lignes deviennent des dépenses sur « Avances des membres »
// ============================================================================

/**
 * [07/11/2026] Ordre voulu, chaque étape relançable :
 *  1. compte « Avances des membres » (créé une seule fois) ;
 *  2. dépenses des lignes libres et IK (clé source par ligne : pas de doublon
 *     si on relance), puis lien ligne → dépense ;
 *  3. opérations liées rattachées au compte Avances (aucune création) ;
 *  4. statut « validée » EN DERNIER : si une étape échoue, la note reste « à
 *     vérifier » et un nouveau clic reprend là où on s'était arrêté.
 */
export async function validerNoteAction(entiteId: string, noteId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    const [lignes, categories] = await Promise.all([listerLignesNote(supabase, noteId), listerCategories(supabase, entiteId, false)]);
    const refus = controlerTransition(note, "validee", lignes, categories);
    if (refus) return { success: false, error: refus };

    const avances = await obtenirCompteAvances(supabase, entiteId);
    const idsLies = lignes.filter((l) => l.origine === "operation" && l.transaction_id).map((l) => l.transaction_id as string);
    const ops = await listerTransactionsParIds(supabase, entiteId, idsLies);
    const plan = preparerValidation(note, lignes, ops, categories, avances.id);
    if (!plan.ok) return { success: false, error: plan.erreurs[0] };

    const creees = await creerDepensesRelancables(supabase, entiteId, plan.valeur.aCreer.map((c) => c.transaction));
    const touchees: Transaction[] = [];
    for (const c of plan.valeur.aCreer) {
      const tx = creees.get(c.transaction.source_cle as string);
      if (!tx) return { success: false, error: "Une dépense n'a pas pu être créée : relance la validation." };
      await mettreAJourLigne(supabase, c.ligneId, { transaction_id: tx.id });
      touchees.push(tx);
    }
    for (const r of plan.valeur.aRattacher) {
      touchees.push(await mettreAJourTransaction(supabase, r.transactionId, r.champs));
    }
    // Écritures en partie double : best-effort, comme le reste de l'app.
    for (const t of touchees) {
      try {
        await synchroniserEcriture(supabase, t);
      } catch {
        // l'opération reste valide en partie simple
      }
    }
    await mettreAJourNote(supabase, noteId, { statut: "validee" });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Remboursement : l'opération bancaire réelle devient un virement interne
// ============================================================================

export async function rembourserNoteAction(entiteId: string, noteId: string, transactionId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    const op = await getTransaction(supabase, transactionId);
    if (!op || op.entite_id !== entiteId) return { success: false, error: "Opération introuvable." };
    const lignes = await listerLignesNote(supabase, noteId);
    const avances = await obtenirCompteAvances(supabase, entiteId);

    const prepare = preparerRemboursement(note, totalNote(lignes), op, avances.id, randomUUID());
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const { majOriginale, contrepartie } = prepare.valeur;

    // 1. L'opération du relevé devient la jambe « sortie du compte courant ».
    const avant = {
      categorie_id: op.categorie_id,
      statut: op.statut,
      virement_id: null,
      montant_tva_centimes: op.montant_tva_centimes,
      commentaire: op.commentaire,
    };
    await mettreAJourTransaction(supabase, op.id, majOriginale);

    // 2. Jambe « entrée sur le compte Avances ». Échec : on remet tout comme avant.
    const { data: jambe, error } = await supabase.from("transaction").insert(contrepartie).select("id").single();
    if (error || !jambe) {
      await mettreAJourTransaction(supabase, op.id, avant);
      return { success: false, error: `Remboursement impossible : ${error?.message ?? "jambe non créée"}` };
    }

    // 3. La note devient « remboursée », liée à l'opération RÉELLE. Échec
    //    (clôture, statut changé entre-temps) : le virement est défait.
    try {
      await mettreAJourNote(supabase, noteId, {
        statut: "remboursee",
        transaction_remboursement_id: op.id,
        virement_id: majOriginale.virement_id,
      });
    } catch (e) {
      await supabase.from("transaction").delete().eq("id", (jambe as { id: string }).id);
      await mettreAJourTransaction(supabase, op.id, avant);
      return { success: false, error: (e as Error).message };
    }

    // 4. Un virement n'est ni charge ni produit : l'ancienne écriture disparaît.
    try {
      await supprimerEcrituresParTransaction(supabase, op.id);
    } catch {
      // best-effort
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Abandon : fiche « frais abandonnés », aucun encaissement
// ============================================================================

/**
 * [07/11/2026] Le membre renonce par écrit au remboursement : sa créance est
 * éteinte par son don. On crée la fiche de contribution (à vérifier dans
 * Bénévolat), puis la note passe « abandonnée ». Rien n'est encaissé.
 */
export async function abandonnerNoteAction(entiteId: string, noteId: string, dateRenonciation: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    const lignes = await listerLignesNote(supabase, noteId);
    const prepare = preparerAbandon(note, totalNote(lignes), dateRenonciation, aujourdHui());
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const contributionId = await creerContributionAbandon(supabase, prepare.valeur);
    await mettreAJourNote(supabase, noteId, {
      statut: "abandonnee",
      date_renonciation: dateRenonciation,
      contribution_id: contributionId,
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Correction : nouveau brouillon copié
// ============================================================================

export async function preparerCorrectionAction(entiteId: string, noteId: string): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const note = await noteDeLEntite(supabase, entiteId, noteId);
    if (!note) return { success: false, error: "Note introuvable." };
    const lignes = await listerLignesNote(supabase, noteId);
    const prepare = preparerCorrection(note, lignes);
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const copie = await creerNote(supabase, prepare.valeur.note);
    try {
      await creerLignes(supabase, prepare.valeur.lignes.map((l) => ({ ...l, note_id: copie.id })));
    } catch (e) {
      // Pas de brouillon à moitié copié.
      await supprimerNote(supabase, copie.id);
      throw e;
    }
    id = copie.id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}
