/**
 * Server actions de /reset-password (Hub Velito).
 *
 * `resetPasswordAction` est appelée depuis le form qui demande à l'user de
 * choisir un nouveau mot de passe. Quand l'utilisateur arrive sur cette page
 * via le lien d'email, Supabase a déjà posé une session de "recovery" — on
 * peut donc juste appeler `updateUser({ password })` qui mettra à jour le
 * mot de passe DE L'UTILISATEUR DÉJÀ IDENTIFIÉ par cette session.
 *
 * ============================================================================
 * SÉCURITÉ — pourquoi ce flow ne peut PAS créer de compte (cf. faille
 * "reset = signup déguisé" doc OAUTH_ARCHITECTURE.md §8 bis) :
 *
 * - `updateUser()` REQUIERT une session valide (auth.uid() != NULL)
 * - Si l'email était inconnu, Supabase n'a rien envoyé, donc personne n'arrive
 *   ici avec une session valide → aucun risque de "création accidentelle"
 * - On NE FAIT JAMAIS de signUp() ici. Aucune branche du code ne permet ça.
 * ============================================================================
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ResetPasswordInput {
  newPassword: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const password = input.newPassword;

  // Validation côté serveur — minimum 8 chars (Supabase impose 6 par défaut,
  // on est plus strict).
  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Mot de passe trop court (8 caractères minimum).",
    };
  }

  try {
    const supabase = await createClient();

    // ⚠️ updateUser REQUIERT une session valide. Si pas de session, ça
    // retourne une erreur. On NE fait JAMAIS de signUp() ici.
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error || !data.user) {
      console.error(
        "[resetPasswordAction] updateUser error:",
        error?.message ?? "no user"
      );
      return {
        success: false,
        error:
          "Lien expiré ou invalide. Refais une demande de réinitialisation.",
      };
    }
  } catch (e) {
    // Re-throw redirect Next.js
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("[resetPasswordAction] exception:", e);
    return { success: false, error: "Erreur technique. Réessaye." };
  }

  // Succès → redirect vers /login avec un flag query (le form/login peut
  // afficher un toast "mot de passe mis à jour").
  redirect("/login?reset=ok");
}
