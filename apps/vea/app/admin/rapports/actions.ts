/**
 * actions.ts — Server Actions pour /admin/rapports
 *
 * createRapportAction : nouveau brouillon
 * updateRapportAction : mise à jour (titre, contenu, statut, etc.)
 * deleteRapportAction : suppression définitive
 *
 * Permission : hasPermission("vea", "editor").
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { revalidatePath } from "next/cache";

export type RapportType =
  | "PV_CA"
  | "PV_AG"
  | "convocation"
  | "rapport_activite"
  | "CR_reunion"
  | "autre";

export type RapportStatut = "brouillon" | "valide" | "publie" | "archive";

interface CreateRapportInput {
  type: RapportType;
  titre: string;
  date_reunion: string;
  contenu_markdown: string;
  participants_presents: string[];
}

interface UpdateRapportInput {
  type?: RapportType;
  titre?: string;
  date_reunion?: string;
  contenu_markdown?: string;
  participants_presents?: string[];
  statut?: RapportStatut;
}

interface ActionResult {
  success: boolean;
  error?: string;
  rapportId?: string;
}

export async function createRapportAction(
  input: CreateRapportInput
): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Droits insuffisants." };

  if (!input.titre.trim()) return { success: false, error: "Titre requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pas connecté." };

  const { data, error } = await supabase
    .schema("vea")
    .from("rapports")
    .insert({
      type: input.type,
      titre: input.titre.trim().slice(0, 200),
      date_reunion: input.date_reunion,
      redacteur_id: user.id,
      contenu_markdown: input.contenu_markdown,
      participants_presents: input.participants_presents,
      statut: "brouillon",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/rapports");
  return { success: true, rapportId: data.id };
}

export async function updateRapportAction(
  id: string,
  input: UpdateRapportInput
): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Droits insuffisants." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pas connecté." };

  const updateData: Record<string, string | string[] | null> = {
    updated_at: new Date().toISOString(),
  };
  if (input.type !== undefined) updateData.type = input.type;
  if (input.titre !== undefined) updateData.titre = input.titre.trim().slice(0, 200);
  if (input.date_reunion !== undefined) updateData.date_reunion = input.date_reunion;
  if (input.contenu_markdown !== undefined)
    updateData.contenu_markdown = input.contenu_markdown;
  if (input.participants_presents !== undefined)
    updateData.participants_presents = input.participants_presents;
  if (input.statut !== undefined) {
    updateData.statut = input.statut;
    if (input.statut === "valide") {
      updateData.validated_by = user.id;
      updateData.validated_at = new Date().toISOString();
    } else if (input.statut === "publie") {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .schema("vea")
    .from("rapports")
    .update(updateData)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/rapports");
  revalidatePath(`/admin/rapports/${id}`);
  return { success: true };
}

export async function deleteRapportAction(id: string): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Droits insuffisants." };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("vea")
    .from("rapports")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/rapports");
  return { success: true };
}
