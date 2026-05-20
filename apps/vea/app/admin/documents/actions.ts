/**
 * actions.ts — Server Actions pour /admin/documents
 *
 * uploadDocumentAction  : upload fichier vers Supabase Storage + INSERT row
 * validateDocumentAction : marque statut = valide (editor+ uniquement)
 * rejectDocumentAction   : marque statut = rejete avec motif (editor+ uniquement)
 * deleteDocumentAction   : DELETE row + remove file from storage (editor+ uniquement)
 *
 * Tous les calls sont protégés par la combinaison RLS + GRANT côté BDD,
 * mais on revalidate explicitement aussi côté serveur pour fail fast.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { revalidatePath } from "next/cache";

export type DocumentType =
  | "ticket"
  | "facture"
  | "justificatif"
  | "peage"
  | "courrier"
  | "contrat"
  | "autre";

interface UploadDocumentInput {
  nom: string;
  type: DocumentType;
  participant_id: string | null;
  description: string;
  file_path: string; // chemin Storage déjà uploadé côté client (uploader_id/...)
  mime_type: string;
  taille_octets: number;
}

interface ActionResult {
  success: boolean;
  error?: string;
  documentId?: string;
}

export async function uploadDocumentAction(
  input: UploadDocumentInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Pas connecté." };
  }

  if (!input.nom.trim()) {
    return { success: false, error: "Le nom du document est requis." };
  }
  if (!input.file_path) {
    return { success: false, error: "Aucun fichier uploadé." };
  }

  const { data, error } = await supabase
    .schema("vea")
    .from("documents")
    .insert({
      nom: input.nom.trim().slice(0, 200),
      type: input.type,
      participant_id: input.participant_id,
      uploader_id: user.id,
      storage_path: input.file_path,
      mime_type: input.mime_type,
      taille_octets: input.taille_octets,
      description: input.description.trim().slice(0, 1000) || null,
      statut: "en_attente",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/documents");
  return { success: true, documentId: data.id };
}

export async function validateDocumentAction(
  documentId: string
): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants (editor+ requis)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pas connecté." };

  const { error } = await supabase
    .schema("vea")
    .from("documents")
    .update({
      statut: "valide",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      motif_rejet: null,
    })
    .eq("id", documentId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${documentId}`);
  return { success: true };
}

export async function rejectDocumentAction(
  documentId: string,
  motif: string
): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants." };
  }
  if (!motif.trim()) {
    return { success: false, error: "Un motif de rejet est requis." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Pas connecté." };

  const { error } = await supabase
    .schema("vea")
    .from("documents")
    .update({
      statut: "rejete",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      motif_rejet: motif.trim().slice(0, 500),
    })
    .eq("id", documentId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${documentId}`);
  return { success: true };
}

export async function deleteDocumentAction(
  documentId: string,
  storagePath: string
): Promise<ActionResult> {
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Droits insuffisants." };
  }

  const supabase = await createClient();

  // Supprimer d'abord le fichier Storage (avant la row, pour éviter orphelin)
  const { error: storageError } = await supabase.storage
    .from("vea-documents")
    .remove([storagePath]);
  // On ne bloque pas si le fichier est déjà manquant (ENOENT) — on log juste.
  if (storageError) {
    console.warn("[deleteDocument] Storage delete error:", storageError);
  }

  const { error } = await supabase
    .schema("vea")
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/documents");
  return { success: true };
}
