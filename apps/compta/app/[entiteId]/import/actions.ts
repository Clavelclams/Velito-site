/**
 * Server action de l'import CSV.
 *
 * Le client a déjà parsé/prévisualisé, MAIS on ne lui fait pas confiance : on
 * repasse chaque ligne par le service de validation côté serveur, et on FORCE
 * l'entité à celle de l'URL (jamais celle envoyée par le client). Défense en
 * profondeur — le client accélère la saisie, le serveur reste l'autorité.
 */
"use server";

import { revalidatePath } from "next/cache";
import { creerTransactionsEnLot } from "@/lib/repositories/transactions";
import {
  preparerNouvelleTransaction,
  type SaisieTransaction,
} from "@/lib/services/transactions";
import { createClient } from "@/lib/supabase/server";
import { genererEcrituresLot } from "@/lib/comptabilite-sync";
import type { NouvelleTransaction } from "@/types/database";

interface ResultatImport {
  success: boolean;
  inserees?: number;
  ignorees?: number;
  error?: string;
}

export async function importerTransactionsAction(
  entiteId: string,
  saisies: SaisieTransaction[],
): Promise<ResultatImport> {
  const valides: NouvelleTransaction[] = [];
  let ignorees = 0;

  for (const s of saisies) {
    // entiteId forcé depuis le contexte serveur, pas depuis la charge client.
    const prepare = preparerNouvelleTransaction({ ...s, entiteId });
    if (prepare.ok) valides.push(prepare.valeur);
    else ignorees++;
  }

  try {
    const supabase = await createClient();
    const lignes = await creerTransactionsEnLot(supabase, valides);
    // Génère les écritures comptables du lot (best-effort).
    try {
      await genererEcrituresLot(supabase, lignes);
    } catch {
      // best-effort : l'import réussit même si des écritures échouent.
    }
    revalidatePath(`/${entiteId}/transactions`);
    revalidatePath(`/${entiteId}/comptabilite`);
    return { success: true, inserees: lignes.length, ignorees };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
