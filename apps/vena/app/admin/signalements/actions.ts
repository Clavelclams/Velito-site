/**
 * actions.ts — Server Action statut des signalements (admin Velito).
 *
 * Gate permission "vena" editor+ (en plus de la RLS UPDATE qui exige
 * shared.is_velito_admin()).
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

const STATUTS = ["nouveau", "en_cours", "traite", "archive"] as const;
type Statut = (typeof STATUTS)[number];

export async function updateSignalementStatutAction(
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
    .schema("shared")
    .from("signalements")
    .update({ statut })
    .eq("id", id);

  if (error) {
    console.error("[updateSignalementStatutAction] error:", error);
    return { success: false, error: "Échec de la mise à jour." };
  }

  revalidatePath("/admin/signalements");
  return { success: true };
}
