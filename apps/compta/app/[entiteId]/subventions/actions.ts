/**
 * Server actions — Subventions (07/11/2026).
 * Service (valider) → repository (écrire) → RLS (cloisonner). L'entité vient
 * de l'URL ; dossier et opérations sont revérifiés avant d'écrire.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  creerSubvention,
  getSubvention,
  lierOperations,
  modifierSubvention,
  supprimerSubvention,
} from "@/lib/repositories/subventions";
import { preparerSubvention, type SaisieSubvention } from "@/lib/services/subventions";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/subventions`, "layout");
  revalidatePath(`/${entiteId}/transactions`);
}

export async function enregistrerSubventionAction(
  entiteId: string,
  id: string | null,
  saisie: Omit<SaisieSubvention, "entiteId">,
): Promise<ResultatAction & { id?: string }> {
  const prepare = preparerSubvention({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  let nouvelId = id;
  try {
    const supabase = await createClient();
    if (id) {
      const existant = await getSubvention(supabase, id);
      if (!existant || existant.entite_id !== entiteId) return { success: false, error: "Dossier introuvable." };
      const { entite_id: _e, ...champs } = prepare.valeur;
      void _e;
      await modifierSubvention(supabase, id, champs);
    } else {
      nouvelId = (await creerSubvention(supabase, prepare.valeur)).id;
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id: nouvelId ?? undefined };
}

export async function supprimerSubventionAction(entiteId: string, id: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const existant = await getSubvention(supabase, id);
    if (!existant || existant.entite_id !== entiteId) return { success: false, error: "Dossier introuvable." };
    await supprimerSubvention(supabase, id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  redirect(`/${entiteId}/subventions`);
}

/** Rattache (subventionId) ou détache (null) des opérations. */
export async function lierOperationsAction(
  entiteId: string,
  subventionId: string,
  transactionIds: string[],
  lier: boolean,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const sub = await getSubvention(supabase, subventionId);
    if (!sub || sub.entite_id !== entiteId) return { success: false, error: "Dossier introuvable." };
    await lierOperations(supabase, entiteId, transactionIds.slice(0, 500), lier ? subventionId : null);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}
