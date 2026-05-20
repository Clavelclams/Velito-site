/**
 * actions.ts — Server Actions pour /admin/compta
 *
 * createTransactionAction : INSERT une transaction (recette ou dépense)
 * updateTransactionAction : UPDATE (changer montant, statut, etc.)
 * deleteTransactionAction : DELETE (en pratique on préfère statut='annule' mais
 *                            on garde delete pour les saisies erronées)
 *
 * Permission : hasTreasurerAccess() (owner/editor OR treasurer).
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { hasTreasurerAccess } from "@/lib/supabase/permissions";
import { revalidatePath } from "next/cache";

export type TransactionType = "recette" | "depense";

export type TransactionCategorie =
  | "subvention"
  | "cotisation"
  | "prestation"
  | "don"
  | "animation"
  | "materiel"
  | "transport"
  | "restauration"
  | "communication"
  | "frais_bancaires"
  | "assurance"
  | "autre";

export type TransactionStatut = "planifie" | "effectue" | "annule";

interface CreateTransactionInput {
  date_transaction: string;
  type: TransactionType;
  categorie: TransactionCategorie;
  montant: number;
  description: string;
  document_id: string | null;
  statut: TransactionStatut;
  saison: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<ActionResult> {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants (trésorier requis)." };
  }

  if (!input.description.trim()) {
    return { success: false, error: "Description requise." };
  }
  if (input.montant <= 0) {
    return { success: false, error: "Montant doit être > 0." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pas connecté." };

  const { data, error } = await supabase
    .schema("vea")
    .from("compta_transactions")
    .insert({
      date_transaction: input.date_transaction,
      type: input.type,
      categorie: input.categorie,
      montant: input.montant,
      description: input.description.trim().slice(0, 1000),
      document_id: input.document_id,
      statut: input.statut,
      saison: input.saison,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/compta");
  return { success: true, transactionId: data.id };
}

export async function updateTransactionAction(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<ActionResult> {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants." };
  }

  const supabase = await createClient();

  const updateData: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };
  if (input.date_transaction !== undefined)
    updateData.date_transaction = input.date_transaction;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.categorie !== undefined) updateData.categorie = input.categorie;
  if (input.montant !== undefined) updateData.montant = input.montant;
  if (input.description !== undefined)
    updateData.description = input.description.trim().slice(0, 1000);
  if (input.document_id !== undefined) updateData.document_id = input.document_id;
  if (input.statut !== undefined) updateData.statut = input.statut;
  if (input.saison !== undefined) updateData.saison = input.saison;

  const { error } = await supabase
    .schema("vea")
    .from("compta_transactions")
    .update(updateData)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/compta");
  revalidatePath(`/admin/compta/${id}`);
  return { success: true };
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const canEdit = await hasTreasurerAccess();
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("vea")
    .from("compta_transactions")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/compta");
  return { success: true };
}
