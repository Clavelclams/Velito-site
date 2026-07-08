/**
 * Server actions de l'écran Comptabilité.
 * seedPcgAction : initialise le plan comptable d'une entité à partir du PCG de
 * référence (PCG_BASE). Idempotent : ne réinsère pas les comptes déjà présents.
 */
"use server";

import { revalidatePath } from "next/cache";
import { listerComptes, creerComptesEnLot } from "@/lib/repositories/comptes";
import { listerTransactions } from "@/lib/repositories/transactions";
import { genererEcrituresLot } from "@/lib/comptabilite-sync";
import { PCG_BASE } from "@/lib/services/comptabilite";
import { createClient } from "@/lib/supabase/server";

export async function seedPcgAction(
  entiteId: string,
): Promise<{ success: boolean; crees?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const existants = await listerComptes(supabase, entiteId, false);
    const numerosExistants = new Set(existants.map((c) => c.numero));

    const aCreer = PCG_BASE.filter((c) => !numerosExistants.has(c.numero)).map((c) => ({
      entite_id: entiteId,
      numero: c.numero,
      libelle: c.libelle,
      classe: c.classe,
    }));

    const crees = await creerComptesEnLot(supabase, aCreer);
    revalidatePath(`/${entiteId}/comptabilite`);
    return { success: true, crees };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Régénère TOUTES les écritures de l'entité à partir de ses transactions.
 * Utile après avoir initialisé le plan comptable alors que des transactions
 * existaient déjà (elles n'avaient alors pas d'écriture). Idempotent :
 * chaque écriture est supprimée puis reconstruite (genererEcrituresLot).
 */
export async function resynchroniserToutAction(
  entiteId: string,
): Promise<{ success: boolean; traitees?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const transactions = await listerTransactions(supabase, entiteId);
    await genererEcrituresLot(supabase, transactions);
    revalidatePath(`/${entiteId}/comptabilite`);
    return { success: true, traitees: transactions.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
