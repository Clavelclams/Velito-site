/**
 * Server Actions — gestion d'une demande de devis (/admin/demandes/[id]).
 *
 * - updateDemandeAction : change le statut (workflow) et/ou les notes internes.
 * - archiveDemandeAction : "supprimer" = archiver (statut 'annule', soft delete).
 *   On ne supprime JAMAIS la ligne (RGPD / traçabilité).
 *
 * Réservé éditeurs+ VEA. RLS UPDATE déjà en place (is_vea_editor()).
 *
 * Statuts autorisés (CHECK en base) :
 *   nouveau, en_cours, devis_envoye, accepte, refuse, annule
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export const STATUTS_DEMANDE = [
  "nouveau",
  "en_cours",
  "devis_envoye",
  "accepte",
  "refuse",
  "annule",
] as const;

interface Result {
  success: boolean;
  error?: string;
}

export async function updateDemandeAction(input: {
  id: string;
  statut?: string;
  notes_internes?: string;
}): Promise<Result> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Permission refusée." };

  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (input.statut !== undefined) {
    if (!STATUTS_DEMANDE.includes(input.statut as (typeof STATUTS_DEMANDE)[number])) {
      return { success: false, error: "Statut invalide." };
    }
    patch.statut = input.statut;
  }
  if (input.notes_internes !== undefined) {
    patch.notes_internes = input.notes_internes.trim() || null;
  }
  if (Object.keys(patch).length === 0) return { success: true };

  const { error } = await supabase
    .schema("vea")
    .from("demandes_prestation")
    .update(patch)
    .eq("id", input.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/demandes/${input.id}`);
  revalidatePath("/admin/demandes");
  return { success: true };
}

/** "Supprimer" = archiver (soft delete via statut 'annule'). */
export async function archiveDemandeAction(id: string): Promise<Result> {
  return updateDemandeAction({ id, statut: "annule" });
}
