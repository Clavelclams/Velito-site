/**
 * Server action — exception de justificatif (07/11/2026, sql/10).
 *
 * Quand une pièce n'existe pas (frais bancaires lus sur le relevé, cotisation
 * en espèces sans reçu…), on l'écrit : au moins 10 caractères. La ligne est
 * alors justifiée pour la clôture. Texte vide = l'exception est retirée.
 * Si l'exercice est clôturé, la base refuse et son message s'affiche tel quel.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { definirExceptionJustificatif, getLigneControlee } from "@/lib/repositories/cloture";
import { preparerException } from "@/lib/services/cloture";

export async function definirExceptionAction(
  entiteId: string,
  transactionId: string,
  texte: string,
): Promise<{ success: boolean; error?: string }> {
  const prepare = preparerException(texte);
  if (!prepare.ok) return { success: false, error: prepare.erreur };
  try {
    const supabase = await createClient();
    const ligne = await getLigneControlee(supabase, transactionId);
    if (!ligne || ligne.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    if (ligne.virement_id) return { success: false, error: "Un virement interne n'a pas besoin de justificatif." };
    await definirExceptionJustificatif(supabase, ligne.id, prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  revalidatePath(`/${entiteId}/transactions`, "layout");
  revalidatePath(`/${entiteId}/cloture`);
  return { success: true };
}
