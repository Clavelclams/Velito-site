/**
 * Server action : paramètres de facturation du vendeur (09/11/2026).
 * Le service valide, le repository écrit (une ligne par structure), la RLS
 * réserve l'écriture au propriétaire et au trésorier.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enregistrerParametres } from "@/lib/repositories/facturation";
import { preparerParametres, type SaisieParametres } from "@/lib/services/facturation";

interface ResultatAction {
  success: boolean;
  error?: string;
}

export async function enregistrerParametresAction(entiteId: string, saisie: SaisieParametres): Promise<ResultatAction> {
  const prepare = preparerParametres(entiteId, saisie);
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    await enregistrerParametres(supabase, prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  revalidatePath(`/${entiteId}/facturation/parametres`);
  revalidatePath(`/${entiteId}/factures`, "layout");
  revalidatePath(`/${entiteId}/devis`, "layout");
  return { success: true };
}
