/**
 * Server actions de l'écran Transactions.
 * Orchestration : service (valider + convertir) → repository (écrire) →
 * synchronisation de l'écriture comptable → revalidatePath.
 *
 * La (re)génération d'écriture vit dans lib/comptabilite-sync (module serveur,
 * pas une action) : à chaque création/modification, la compta reste le miroir
 * des transactions. Best-effort : PCG absent = transaction valide sans écriture.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  creerTransaction,
  modifierTransaction,
  supprimerTransaction,
} from "@/lib/repositories/transactions";
import { supprimerEcrituresParTransaction } from "@/lib/repositories/ecritures";
import {
  preparerNouvelleTransaction,
  type SaisieTransaction,
} from "@/lib/services/transactions";
import { synchroniserEcriture } from "@/lib/comptabilite-sync";
import { createClient } from "@/lib/supabase/server";

interface ResultatAction {
  success: boolean;
  error?: string;
}

export async function creerTransactionAction(
  saisie: SaisieTransaction,
): Promise<ResultatAction> {
  const prepare = preparerNouvelleTransaction(saisie);
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };

  try {
    const supabase = await createClient();
    const tx = await creerTransaction(supabase, prepare.valeur);
    try {
      await synchroniserEcriture(supabase, tx);
    } catch {
      // Écriture non générée (PCG incomplet…) : la transaction reste valide.
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${saisie.entiteId}/transactions`);
  revalidatePath(`/${saisie.entiteId}/comptabilite`);
  return { success: true };
}

export async function modifierTransactionAction(
  id: string,
  saisie: SaisieTransaction,
): Promise<ResultatAction> {
  const prepare = preparerNouvelleTransaction(saisie);
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };

  try {
    const supabase = await createClient();
    const { entite_id: _ignore, ...champs } = prepare.valeur;
    void _ignore;
    const tx = await modifierTransaction(supabase, id, champs);
    // Régénère l'écriture pour refléter montants/catégorie modifiés.
    try {
      await synchroniserEcriture(supabase, tx);
    } catch {
      // best-effort
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${saisie.entiteId}/transactions`);
  revalidatePath(`/${saisie.entiteId}/comptabilite`);
  return { success: true };
}

export async function supprimerTransactionAction(
  entiteId: string,
  id: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    // Retire l'écriture liée AVANT (sinon orpheline → FEC/états faussés).
    try {
      await supprimerEcrituresParTransaction(supabase, id);
    } catch {
      // best-effort
    }
    await supprimerTransaction(supabase, id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${entiteId}/transactions`);
  revalidatePath(`/${entiteId}/comptabilite`);
  return { success: true };
}
