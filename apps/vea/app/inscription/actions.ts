/**
 * Server Actions — pre-inscription "previsionnel" a un evenement a venir.
 *
 * PREVISIONNEL (monde attendu), distinct de la presence reelle (vea.presences) :
 *   - AUCUN XP attribue ici.
 *   - Connecte : addPreinscriptionAction / removePreinscriptionAction ("ne viens plus")
 *     sur SA fiche participant (RLS own).
 *   - Non connecte : registerPreinscriptionGuestAction -> RPC SECURITY DEFINER
 *     qui find_or_create la fiche participant puis insere le previsionnel.
 *
 * Tout est encadre par try/catch : jamais d'exception non geree (pas de 500
 * sur un formulaire public).
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface Result {
  success: boolean;
  error?: string;
}

/** Recupere la fiche participant du user connecte (ou null). */
async function getMyParticipantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .schema("vea")
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/** Connecte : s'ajoute au previsionnel d'un event. Idempotent. */
export async function addPreinscriptionAction(eventSlug: string): Promise<Result> {
  try {
    if (!eventSlug) return { success: false, error: "Evenement manquant." };
    const supabase = await createClient();
    const participantId = await getMyParticipantId(supabase);
    if (!participantId) {
      return {
        success: false,
        error: "Ton compte n'a pas encore de fiche participant. Reconnecte-toi ou contacte un admin.",
      };
    }
    const { error } = await supabase
      .schema("vea")
      .from("preinscriptions_event")
      .insert({ event_slug: eventSlug, participant_id: participantId, source: "agenda" });

    // 23505 = doublon (deja inscrit) -> on considere comme un succes.
    if (error && error.code !== "23505") {
      return { success: false, error: error.message };
    }
    revalidatePath(`/inscription`);
    revalidatePath(`/admin/evenements`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur serveur." };
  }
}

/** Connecte : "je ne viens plus" -> retire sa ligne du previsionnel. */
export async function removePreinscriptionAction(eventSlug: string): Promise<Result> {
  try {
    if (!eventSlug) return { success: false, error: "Evenement manquant." };
    const supabase = await createClient();
    const participantId = await getMyParticipantId(supabase);
    if (!participantId) return { success: false, error: "Fiche participant introuvable." };
    const { error } = await supabase
      .schema("vea")
      .from("preinscriptions_event")
      .delete()
      .eq("event_slug", eventSlug)
      .eq("participant_id", participantId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/inscription`);
    revalidatePath(`/admin/evenements`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur serveur." };
  }
}

/** Non connecte : mini-formulaire (prenom, nom, telephone). Aucun XP. */
export async function registerPreinscriptionGuestAction(input: {
  eventSlug: string;
  prenom: string;
  nom: string;
  phone: string;
}): Promise<Result> {
  try {
    if (!input.eventSlug) return { success: false, error: "Evenement manquant." };
    if (!input.prenom?.trim() || !input.nom?.trim()) {
      return { success: false, error: "Prenom et nom requis." };
    }
    if (!input.phone?.trim() || input.phone.replace(/\s/g, "").length < 8) {
      return { success: false, error: "Numero de telephone invalide." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("vea")
      .rpc("register_preinscription_event", {
        p_event_slug: input.eventSlug,
        p_prenom: input.prenom.trim().slice(0, 100),
        p_nom: input.nom.trim().slice(0, 100),
        p_phone: input.phone.trim().slice(0, 30),
      });
    if (error) return { success: false, error: error.message };
    const res = data as { success: boolean; error?: string };
    if (!res?.success) return { success: false, error: res?.error ?? "Echec de la pre-inscription." };
    revalidatePath(`/admin/evenements`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur serveur." };
  }
}
