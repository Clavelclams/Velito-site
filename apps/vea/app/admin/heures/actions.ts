/**
 * Server Action — addHeuresAction
 *
 * Permet aux dirigeants VEA (scope editor+ sur org vea) d'ajouter des heures
 * de benevolat / participations a un participant. Le trigger PG
 * `trigger_logs_xp_apply` se charge automatiquement de :
 *   - incrementer xp_saison_actuelle
 *   - calculer le nouveau niveau
 *   - attribuer le badge saisonnier si seuil atteint
 *   - crediter les points VENA si niveau franchi
 *
 * Bareme XP (cf. lib/gamification.ts XP_BAREME) :
 *   - benevolat : 15 XP / heure
 *   - tournoi : 10 XP fixe
 *   - podium : 5 XP fixe
 *   - urgent : 20 XP fixe
 *   - admin_manuel : valeur libre (l'admin tape directement le XP)
 *
 * Securite :
 *   - hasPermission('vea', 'editor') verifie en premier
 *   - service_role NON utilise (on passe par RLS authentifie)
 *   - revalidatePath('/admin/heures') + '/profil' apres save
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/supabase/permissions";
import { XP_BAREME } from "@/lib/gamification";

export interface AddHeuresResult {
  success: boolean;
  error?: string;
  xpGagne?: number;
}

export type ActionType = "benevolat" | "tournoi" | "podium" | "urgent" | "admin_manuel";

export interface AddHeuresInput {
  participant_id: string;
  action: ActionType;
  heures?: number; // requis si action = 'benevolat'
  xp_manuel?: number; // requis si action = 'admin_manuel'
  description: string;
  saison?: string; // default '2026/27'
}

export async function addHeuresAction(input: AddHeuresInput): Promise<AddHeuresResult> {
  // 1. Verification permission (dirigeant VEA = scope editor+ sur org vea)
  const canEdit = await hasPermission("vea", "editor");
  if (!canEdit) {
    return { success: false, error: "Acces refuse : reserve aux dirigeants VEA." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecte." };

  // 2. Validation input
  if (!input.participant_id || !/^[0-9a-f-]{36}$/i.test(input.participant_id)) {
    return { success: false, error: "Participant invalide." };
  }
  if (!["benevolat", "tournoi", "podium", "urgent", "admin_manuel"].includes(input.action)) {
    return { success: false, error: "Type d'action invalide." };
  }
  const description = (input.description ?? "").trim().slice(0, 280);
  if (!description) {
    return { success: false, error: "Une description est requise (contexte de l'action)." };
  }
  const saison = (input.saison ?? "2026/27").trim();

  // 3. Calcul XP a attribuer selon le type d'action
  let xpGagne: number;
  let heuresPourBenevolatColonne = 0;

  switch (input.action) {
    case "benevolat": {
      const heures = Number(input.heures ?? 0);
      if (!Number.isFinite(heures) || heures <= 0 || heures > 100) {
        return { success: false, error: "Nombre d'heures invalide (entre 0 et 100)." };
      }
      xpGagne = Math.round(heures * XP_BAREME.benevolat_par_heure);
      heuresPourBenevolatColonne = heures;
      break;
    }
    case "tournoi":
      xpGagne = XP_BAREME.tournoi;
      break;
    case "podium":
      xpGagne = XP_BAREME.podium;
      break;
    case "urgent":
      xpGagne = XP_BAREME.urgent;
      break;
    case "admin_manuel": {
      const xp = Number(input.xp_manuel ?? 0);
      if (!Number.isFinite(xp) || xp <= 0 || xp > 1000) {
        return { success: false, error: "XP manuel invalide (entre 1 et 1000)." };
      }
      xpGagne = Math.round(xp);
      break;
    }
    default:
      return { success: false, error: "Type d'action inconnu." };
  }

  // 4. Si benevolat, on update aussi vea.participants.benevole_hours_2026_2027
  // (avant le INSERT logs_xp pour eviter une race condition theorique)
  if (heuresPourBenevolatColonne > 0 && saison === "2026/27") {
    // On va lire benevole_hours actuels et incrementer
    const { data: current } = await supabase
      .schema("vea")
      .from("participants")
      .select("benevole_hours, benevole_hours_2026_2027")
      .eq("id", input.participant_id)
      .maybeSingle();

    if (current) {
      const newTotal = Number(current.benevole_hours ?? 0) + heuresPourBenevolatColonne;
      const newSaison = Number(current.benevole_hours_2026_2027 ?? 0) + heuresPourBenevolatColonne;
      const { error: updErr } = await supabase
        .schema("vea")
        .from("participants")
        .update({
          benevole_hours: newTotal,
          benevole_hours_2026_2027: newSaison,
        })
        .eq("id", input.participant_id);
      if (updErr) {
        return { success: false, error: `Erreur update heures : ${updErr.message}` };
      }
    }
  }

  // 5. INSERT dans logs_xp. Le trigger PG fait le reste (incr XP, badges, points VENA).
  const { error: logErr } = await supabase
    .schema("vea")
    .from("logs_xp")
    .insert({
      participant_id: input.participant_id,
      action: input.action,
      xp_gagne: xpGagne,
      description,
      saison,
      cree_par: user.id,
    });

  if (logErr) {
    return { success: false, error: `Erreur log XP : ${logErr.message}` };
  }

  // 6. Revalidation
  revalidatePath("/admin/heures");
  revalidatePath("/profil");
  revalidatePath("/joueurs");

  return { success: true, xpGagne };
}
