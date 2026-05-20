/**
 * Server Actions — /admin/evenements
 *
 * createEventAction : cree un evenement avec un token unique (pour QR scan).
 * Verifie permission hasPermission('vea', 'editor').
 *
 * Le token est genere automatiquement par PG (DEFAULT gen_random_uuid()).
 * Apres creation, l'admin voit le QR code a imprimer/afficher.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";

export interface CreateEventResult {
  success: boolean;
  error?: string;
  eventId?: string;
  token?: string;
}

export interface CreateEventInput {
  nom: string;
  event_slug: string; // utilise pour relier presences (cle existante)
  date: string; // format YYYY-MM-DD
  lieu: string;
  description?: string;
  type: "tournoi" | "animation" | "programme" | "reunion" | "autre";
  capacite?: number;
}

export async function createEventAction(
  input: CreateEventInput
): Promise<CreateEventResult> {
  // 1. Permission editor+ vea
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Acces refuse : reserve aux dirigeants VEA." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  // 2. Validation
  const nom = (input.nom ?? "").trim();
  if (!nom || nom.length < 3) {
    return { success: false, error: "Nom event requis (min 3 caracteres)." };
  }
  const event_slug = (input.event_slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!event_slug || event_slug.length < 3) {
    return { success: false, error: "Slug event requis (lettres, chiffres, tirets)." };
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { success: false, error: "Date invalide (format YYYY-MM-DD)." };
  }
  const lieu = (input.lieu ?? "").trim();
  if (!lieu) return { success: false, error: "Lieu requis." };

  // 3. INSERT (le token est genere auto par DEFAULT)
  const { data: created, error: insertErr } = await supabase
    .schema("vea")
    .from("evenements")
    .insert({
      nom,
      event_slug,
      date: input.date,
      lieu,
      description: input.description?.trim() || null,
      type: input.type,
      capacite: input.capacite ?? null,
      created_by: user.id,
    })
    .select("id, token")
    .maybeSingle();

  if (insertErr || !created) {
    return { success: false, error: insertErr?.message ?? "Erreur creation event." };
  }

  revalidatePath("/admin/evenements");
  revalidatePath("/agenda");

  return {
    success: true,
    eventId: created.id,
    token: created.token,
  };
}
