/**
 * Server Actions — Edition motifs d'un event depuis /admin/evenements/[id]
 *
 * 3 actions :
 *   - updateParticipantMotifsAction(participantId, eventSlug, motifs[], heuresAide?)
 *       Sync les motifs d'un participant sur un event :
 *       - Pour chaque motif absent de l'existant -> INSERT presence + INSERT log_xp
 *       - Pour chaque motif present a retirer    -> DELETE presence (CASCADE log_xp + recalc XP)
 *       Garantie : tjrs >= 1 motif (verifie cote UI ET cote serveur).
 *
 *   - addManualParticipantAction(eventSlug, nom, prenom, sexe, dateNaissance,
 *                                phone, motifs[], heuresAide?)
 *       Ajoute manuellement un participant qui n'a pas scanne (ex: gosse
 *       venu mais qui a pas eu le tel pour scanner). Cree fiche pre-inscrit
 *       si pas deja existante (merge auto via phone+nom+prenom), puis ajoute
 *       les motifs cochés.
 *
 *   - removeParticipantFromEventAction(participantId, eventSlug)
 *       Retire COMPLETEMENT un participant de l'event (delete toutes ses
 *       presences sur cet event -> CASCADE delete log_xp -> recalc XP auto).
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { XP_BAREME } from "@/lib/gamification";

type Motif = "jouer" | "aider" | "regarder";

interface ActionResult {
  success: boolean;
  error?: string;
}

// Calcul XP cote serveur (defense en profondeur)
function computeXP(motif: Motif, heuresAide: number): { xp: number; action: "tournoi" | "benevolat" | "spectateur" } {
  switch (motif) {
    case "jouer":
      return { xp: XP_BAREME.tournoi, action: "tournoi" };
    case "aider":
      return {
        xp: Math.round(Math.min(24, Math.max(0.5, heuresAide)) * XP_BAREME.benevolat_par_heure),
        action: "benevolat",
      };
    case "regarder":
      return { xp: 2, action: "spectateur" };
  }
}

// ============================================================================
// 1. updateParticipantMotifsAction
// ----------------------------------------------------------------------------
// Synchronise les motifs d'un participant pour un event :
//   - Ajoute les motifs cochés s'ils n'existent pas encore
//   - Supprime les motifs decochés (cascade XP auto)
// ============================================================================
export async function updateParticipantMotifsAction(input: {
  participantId: string;
  eventSlug: string;
  motifs: Motif[];
  heuresAide?: number; // utilise seulement si "aider" est dans motifs
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  // Permission editor+ sur org vea
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Permission refusee." };

  // Garantie cote serveur : >= 1 motif
  if (!input.motifs || input.motifs.length === 0) {
    return {
      success: false,
      error: "Au moins 1 motif doit etre coche. Pour retirer le participant entierement de l'event, utilise le bouton Retirer.",
    };
  }

  // Validation
  for (const m of input.motifs) {
    if (!["jouer", "aider", "regarder"].includes(m)) {
      return { success: false, error: `Motif invalide : ${m}` };
    }
  }

  const heures = input.motifs.includes("aider")
    ? Math.min(24, Math.max(0.5, input.heuresAide ?? 1))
    : 0;

  // Recupere event (pour event.nom et saison context)
  const { data: event } = await supabase
    .schema("vea")
    .from("evenements")
    .select("event_slug, nom")
    .eq("event_slug", input.eventSlug)
    .maybeSingle();

  if (!event) return { success: false, error: "Event introuvable." };

  // Recupere les motifs deja existants pour ce participant/event
  const { data: existing, error: existingErr } = await supabase
    .schema("vea")
    .from("presences")
    .select("id, motif")
    .eq("participant_id", input.participantId)
    .eq("event_slug", input.eventSlug);

  if (existingErr) return { success: false, error: existingErr.message };

  const existingMotifs = new Set(((existing ?? []) as { motif: Motif }[]).map((p) => p.motif));
  const wantedMotifs = new Set(input.motifs);

  // Recupere la saison du participant
  const { data: participant } = await supabase
    .schema("vea")
    .from("participants")
    .select("saison_actuelle")
    .eq("id", input.participantId)
    .maybeSingle();

  const saison = participant?.saison_actuelle ?? "2026/27";

  // 1) Supprimer les motifs decochés (CASCADE log_xp + trigger recalc XP)
  const toDelete = (existing ?? []).filter(
    (p) => !wantedMotifs.has(p.motif as Motif)
  );
  for (const row of toDelete) {
    const { error: delErr } = await supabase
      .schema("vea")
      .from("presences")
      .delete()
      .eq("id", row.id);
    if (delErr) return { success: false, error: `Erreur delete : ${delErr.message}` };
  }

  // 2) Ajouter les motifs cochés non encore existants
  const toAdd = input.motifs.filter((m) => !existingMotifs.has(m));
  for (const motif of toAdd) {
    const { xp, action } = computeXP(motif, heures);
    const presenceHeures = motif === "aider" ? heures : 0;

    const { data: inserted, error: insErr } = await supabase
      .schema("vea")
      .from("presences")
      .insert({
        participant_id: input.participantId,
        event_slug: input.eventSlug,
        motif,
        heures_aide: presenceHeures,
        scanned_by: user.id,
      })
      .select("id")
      .single();

    if (insErr) return { success: false, error: `Erreur insert presence : ${insErr.message}` };

    const { error: logErr } = await supabase
      .schema("vea")
      .from("logs_xp")
      .insert({
        participant_id: input.participantId,
        action,
        xp_gagne: xp,
        description: `${event.nom} — motif: ${motif}${presenceHeures > 0 ? ` (${presenceHeures}h)` : ""} (ajout admin)`,
        saison,
        cree_par: user.id,
        presence_id: inserted?.id,
      });

    if (logErr) return { success: false, error: `Erreur insert log_xp : ${logErr.message}` };
  }

  // 3) Si "aider" est dans les motifs voulus ET existait deja, on met a jour
  //    le heures_aide (peut etre que admin a change le nb heures).
  if (wantedMotifs.has("aider") && existingMotifs.has("aider")) {
    const existingAider = existing?.find((p) => p.motif === "aider");
    if (existingAider) {
      await supabase
        .schema("vea")
        .from("presences")
        .update({ heures_aide: heures })
        .eq("id", existingAider.id);
      // Note : on ne re-update pas le log_xp lie (trop complexe pour V1).
      // Si tu modifies le nb d'heures, supprime le motif puis re-coche.
    }
  }

  revalidatePath(`/admin/evenements/${input.eventSlug}`);
  revalidatePath("/profil");
  return { success: true };
}

// ============================================================================
// 2. removeParticipantFromEventAction
// ----------------------------------------------------------------------------
// Retire entierement un participant de l'event (toutes ses presences sur cet
// event sont supprimees -> CASCADE log_xp -> trigger recalc XP).
// ============================================================================
export async function removeParticipantFromEventAction(input: {
  participantId: string;
  eventSlug: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Permission refusee." };

  const { error } = await supabase
    .schema("vea")
    .from("presences")
    .delete()
    .eq("participant_id", input.participantId)
    .eq("event_slug", input.eventSlug);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/evenements/${input.eventSlug}`);
  revalidatePath("/profil");
  return { success: true };
}

// ============================================================================
// 3. addManualParticipantAction
// ----------------------------------------------------------------------------
// Ajoute manuellement un participant qui n'a pas pu scanner (ex: gosse sans
// tel). Reutilise la RPC SQL register_preinscrit_scan en appelant pour chaque
// motif coche (ou ajoute en sequence).
// ============================================================================
export async function addManualParticipantAction(input: {
  eventToken: string; // token UUID de l'event
  nom: string;
  prenom: string;
  sexe: "F" | "M" | "X";
  dateNaissance: string; // YYYY-MM-DD
  phone: string;
  motifs: Motif[]; // 1 ou plusieurs
  heuresAide?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) return { success: false, error: "Permission refusee." };

  if (!input.motifs || input.motifs.length === 0) {
    return { success: false, error: "Au moins 1 motif requis." };
  }

  // On appelle la RPC une fois par motif (la RPC fait find_or_create participant
  // au premier appel, puis trouve le meme participant aux appels suivants).
  for (const motif of input.motifs) {
    const { data, error } = await supabase
      .schema("vea")
      .rpc("register_preinscrit_scan", {
        p_token: input.eventToken,
        p_motif: motif,
        p_heures_aide: motif === "aider" ? Number(input.heuresAide ?? 1) : 0,
        p_nom: input.nom.trim(),
        p_prenom: input.prenom.trim(),
        p_sexe: input.sexe,
        p_date_naissance: input.dateNaissance,
        p_phone: input.phone.replace(/\s/g, ""),
      });

    if (error) {
      return { success: false, error: `Erreur RPC (motif ${motif}) : ${error.message}` };
    }

    const result = data as { success: boolean; error?: string; alreadyScanned?: boolean };
    if (!result.success && !result.alreadyScanned) {
      // On ignore alreadyScanned car c'est normal si on ajoute plusieurs motifs
      // (le 2eme motif peut deja exister si on rejoue l'action). Mais sinon
      // c'est une vraie erreur.
      return { success: false, error: result.error ?? "Erreur inconnue" };
    }
  }

  revalidatePath("/profil");
  return { success: true };
}
