/**
 * Server Action — registerPresenceAction
 *
 * User connecte scan un QR -> arrive sur /scan/[token] -> choisit motif
 * (jouer / aider / regarder) -> Server Action insert dans :
 *   1. vea.presences (event_slug + participant_id + motif + heures_aide)
 *   2. vea.logs_xp (action correspondante + xp calcule)
 *
 * Le trigger PG `trigger_logs_xp_apply` fait le reste auto :
 *   - Increment xp_saison_actuelle
 *   - Attribution badge saisonnier si seuil
 *   - Credit points VENA si niveau franchi
 *
 * Securite :
 *   - User doit etre connecte (auth.getUser)
 *   - Event doit avoir scan_actif = true (l'admin peut desactiver apres event)
 *   - UNIQUE constraint (event_slug, participant_id) empeche le double-scan
 *
 * Bareme XP :
 *   - jouer : +10 XP (action tournoi)
 *   - aider : +15 XP/heure (action benevolat) -- defaut 1h si non specifie
 *   - regarder : +2 XP (action spectateur)
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { XP_BAREME } from "@/lib/gamification";

export interface RegisterPresenceResult {
  success: boolean;
  error?: string;
  motif?: "jouer" | "aider" | "regarder";
  xpGagne?: number;
  alreadyScanned?: boolean;
}

export interface RegisterPresenceInput {
  token: string; // token de l'event
  motif: "jouer" | "aider" | "regarder";
  heures_aide?: number; // si motif = 'aider', nb heures (default 1)
}

export async function registerPresenceAction(
  input: RegisterPresenceInput
): Promise<RegisterPresenceResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tu dois etre connecte pour scanner." };

  // 1. Recupere l'event via le token (SELECT public, RLS permet)
  if (!/^[0-9a-f-]{36}$/i.test(input.token)) {
    return { success: false, error: "Token QR invalide." };
  }
  const { data: event } = await supabase
    .schema("vea")
    .from("evenements")
    .select("id, event_slug, nom, scan_actif, statut, duree_estimee_heures")
    .eq("token", input.token)
    .maybeSingle();

  if (!event) return { success: false, error: "Event introuvable." };
  if (!event.scan_actif) return { success: false, error: "Le scan est desactive pour cet event." };
  if (event.statut === "annule") return { success: false, error: "Cet event a ete annule." };

  // 2. Recupere la fiche participant du user
  const { data: participant } = await supabase
    .schema("vea")
    .from("participants")
    .select("id, saison_actuelle")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!participant) {
    return { success: false, error: "Profil participant introuvable. Va sur /profil d'abord." };
  }
  const saison = participant.saison_actuelle ?? "2026/27";

  // 3. Validation motif + calcul XP
  if (!["jouer", "aider", "regarder"].includes(input.motif)) {
    return { success: false, error: "Motif invalide." };
  }
  let xpGagne: number;
  let logAction: "tournoi" | "benevolat" | "spectateur";
  let heuresAide = 0;
  switch (input.motif) {
    case "jouer":
      xpGagne = XP_BAREME.tournoi;
      logAction = "tournoi";
      break;
    case "aider":
      // 19/05/2026 : si input.heures_aide non fourni (cas scan UI minimaliste),
      // on utilise la duree_estimee_heures de l'event (default 2h en BDD).
      // L'admin peut ajuster apres depuis /admin/evenements/[slug].
      heuresAide = Math.min(
        24,
        Math.max(
          0.5,
          Number(input.heures_aide ?? event.duree_estimee_heures ?? 2)
        )
      );
      xpGagne = Math.round(heuresAide * XP_BAREME.benevolat_par_heure);
      logAction = "benevolat";
      break;
    case "regarder":
      xpGagne = 2; // hardcode (pas dans XP_BAREME explicite)
      logAction = "spectateur";
      break;
  }

  // 4. INSERT presence (UNIQUE composite event_slug+participant_id+motif
  // empeche le meme motif d'etre saisi 2 fois pour la meme personne/event,
  // mais autorise un participant a avoir plusieurs motifs (jouer + aider).
  const { data: insertedPresence, error: presErr } = await supabase
    .schema("vea")
    .from("presences")
    .insert({
      participant_id: participant.id,
      event_slug: event.event_slug,
      motif: input.motif,
      heures_aide: heuresAide,
      scanned_by: user.id,
    })
    .select("id")
    .single();

  if (presErr) {
    // Code 23505 = unique_violation = deja scanne ce motif
    if (presErr.code === "23505") {
      return {
        success: false,
        alreadyScanned: true,
        error: `Tu as deja scanne ${event.nom} pour ce motif.`,
      };
    }
    return { success: false, error: presErr.message };
  }

  // 5. INSERT log XP avec lien presence_id (CASCADE delete -> si admin supprime
  // la presence depuis /admin/evenements/[id], le log_xp s'efface auto et le
  // trigger AFTER DELETE recalcule l'XP du participant).
  const { error: logErr } = await supabase
    .schema("vea")
    .from("logs_xp")
    .insert({
      participant_id: participant.id,
      action: logAction,
      xp_gagne: xpGagne,
      description: `${event.nom} — motif: ${input.motif}${heuresAide > 0 ? ` (${heuresAide}h)` : ""}`,
      saison,
      cree_par: user.id,
      presence_id: insertedPresence?.id,
    });

  if (logErr) {
    return { success: false, error: `Presence enregistree mais XP non attribue : ${logErr.message}` };
  }

  // 6. Note : on n'incremente PAS benevole_hours ici (le scan c'est pour la
  // gamification XP/badges). Si un dirigeant veut formaliser les heures
  // benevolat officielles pour les rapports subventions, il le fait depuis
  // /admin/heures (qui passe par le trigger logs_xp ET incremente benevole_hours).

  revalidatePath("/profil");
  return { success: true, motif: input.motif, xpGagne };
}

// ============================================================================
// PRE-INSCRIT SCAN (utilisateur SANS compte) — 19/05/2026
// ----------------------------------------------------------------------------
// Pour qu'une personne sans compte puisse scanner un QR event :
//   1. Saisit nom + prenom + tel
//   2. Choisit motif (jouer / aider / regarder)
//   3. Server Action appelle la RPC SQL vea.register_preinscrit_scan
//      qui fait tout en 1 appel atomique (find_or_create participant
//      via phone + insert presence + insert log_xp).
//
// Merge auto : si quelqu'un re-scanne avec le meme tel, on retrouve son
// participant pre-inscrit existant (INDEX UNIQUE sur phone). Plus tard
// quand il creera son vrai compte avec le meme tel, on pourra fusionner.
// ============================================================================

export interface RegisterPreInscritInput {
  token: string;
  motif: "jouer" | "aider" | "regarder";
  heures_aide?: number;
  nom: string;
  prenom: string;
  sexe: "F" | "M" | "X";
  date_naissance: string; // format YYYY-MM-DD
  phone: string;
}

export async function registerPreInscritScanAction(
  input: RegisterPreInscritInput
): Promise<RegisterPresenceResult> {
  const supabase = await createClient();

  // Validation cote serveur (defense en profondeur, le SQL valide aussi)
  if (!/^[0-9a-f-]{36}$/i.test(input.token)) {
    return { success: false, error: "Token QR invalide." };
  }
  if (!["jouer", "aider", "regarder"].includes(input.motif)) {
    return { success: false, error: "Motif invalide." };
  }
  const nomClean = (input.nom ?? "").trim();
  const prenomClean = (input.prenom ?? "").trim();
  const phoneClean = (input.phone ?? "").replace(/\s/g, "");
  if (nomClean.length < 1 || prenomClean.length < 1) {
    return { success: false, error: "Nom et prenom requis." };
  }
  if (!["F", "M", "X"].includes(input.sexe)) {
    return { success: false, error: "Sexe invalide (F/M/X)." };
  }
  if (!input.date_naissance || !/^\d{4}-\d{2}-\d{2}$/.test(input.date_naissance)) {
    return { success: false, error: "Date de naissance invalide." };
  }
  // Verif date plausible (pas dans le futur, pas avant 1900)
  const dn = new Date(input.date_naissance);
  if (dn > new Date() || dn < new Date("1900-01-01")) {
    return { success: false, error: "Date de naissance hors plage autorisee." };
  }
  if (phoneClean.length < 8) {
    return { success: false, error: "Numero de telephone invalide (8 chiffres min)." };
  }

  // Appel RPC SQL (SECURITY DEFINER -> bypass RLS proprement, 1 transaction atomique)
  const { data, error } = await supabase
    .schema("vea")
    .rpc("register_preinscrit_scan", {
      p_token: input.token,
      p_motif: input.motif,
      p_heures_aide: input.motif === "aider" ? Number(input.heures_aide ?? 1) : 0,
      p_nom: nomClean,
      p_prenom: prenomClean,
      p_sexe: input.sexe,
      p_date_naissance: input.date_naissance,
      p_phone: phoneClean,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  // La RPC retourne du JSONB sous forme d'objet JS
  const result = data as {
    success: boolean;
    error?: string;
    motif?: "jouer" | "aider" | "regarder";
    xpGagne?: number;
    alreadyScanned?: boolean;
    participantId?: string;
  };

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      alreadyScanned: result.alreadyScanned,
    };
  }

  return {
    success: true,
    motif: result.motif,
    xpGagne: result.xpGagne,
  };
}
