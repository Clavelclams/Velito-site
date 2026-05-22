/**
 * actions.ts — Server Action : definir le sexe d'un participant (admin VEA).
 *
 * Le formulaire /signup ne demande pas le sexe : les membres inscrits en ligne
 * ont donc sexe = NULL. Cette action permet a l'admin de le renseigner depuis
 * la liste du Bilan.
 *
 * Passe par la fonction SECURITY DEFINER vea.admin_set_participant_sexe (qui
 * re-verifie la permission cote SQL), parce que la RLS de vea.participants
 * n'autorise pas un admin a modifier la fiche d'un AUTRE membre directement.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

const SEXES = ["F", "M", "X"] as const;
type Sexe = (typeof SEXES)[number];

export async function setParticipantSexeAction(
  id: string,
  sexe: Sexe
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasPermission("vea", "editor"))) {
    return { success: false, error: "Acces refuse." };
  }
  if (!SEXES.includes(sexe)) {
    return { success: false, error: "Sexe invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("vea")
    .rpc("admin_set_participant_sexe", { p_id: id, p_sexe: sexe });

  if (error) {
    console.error("[setParticipantSexeAction]", error);
    return { success: false, error: "Echec de la mise a jour." };
  }

  revalidatePath("/admin/bilan");
  return { success: true };
}
