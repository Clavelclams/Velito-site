/**
 * actions.ts — Server Actions du dashboard admin VENA.
 *
 * updateStatutAction : change le statut d'une demande. Gate permission
 * "vena" editor+ (défense en profondeur, en plus de la RLS UPDATE).
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

const STATUTS = ["nouveau", "en_cours", "traite", "archive"] as const;
type Statut = (typeof STATUTS)[number];

export async function updateStatutAction(
  id: string,
  statut: Statut
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasPermission("vena", "editor"))) {
    return { success: false, error: "Accès refusé." };
  }
  if (!STATUTS.includes(statut)) {
    return { success: false, error: "Statut invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("vena")
    .from("demandes_contact")
    .update({ statut })
    .eq("id", id);

  if (error) {
    console.error("[updateStatutAction] error:", error);
    return { success: false, error: "Échec de la mise à jour." };
  }

  revalidatePath("/admin");
  return { success: true };
}
