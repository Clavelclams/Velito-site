/**
 * Server actions de /signup (Velito Interactive).
 *
 * signUpAction crée un compte Supabase Auth via signUp() — c'est le sign-up
 * "classique" email/mdp, en parallèle du futur flow OAuth "Continuer avec VENA"
 * (qui sera implémenté en phase 5 de la roadmap OAUTH_ARCHITECTURE.md).
 *
 * Sécurité :
 *  - validation minimale serveur (email format + mdp ≥ 8)
 *  - message d'erreur générique (anti-énumération)
 *  - on ne révèle PAS si l'email existe déjà
 *
 * Note : tant qu'on n'a pas activé l'auto-confirmation côté Supabase, le user
 * recevra un email de confirmation. Pour le test pilote on confirme à la main
 * dans Supabase Auth dashboard (cf. velito-credentials-policy).
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface SignUpInput {
  email: string;
  password: string;
  returnTo: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Valide que returnTo est sûr (chemin local relatif uniquement, anti open-redirect).
 * À élargir avec une whitelist .velito.fr quand le SSO cookie sera actif en prod.
 */
function safeReturnTo(raw: string): string {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const email = input.email?.trim().toLowerCase();
  const password = input.password;

  // Validation minimale (la vraie validation est côté Supabase)
  if (!email?.includes("@")) {
    return { success: false, error: "Email invalide." };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Mot de passe : 8 caractères minimum." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Quand on aura un domaine prod, ça sera https://interactive.velito.fr/oauth/callback
        // En attendant, on laisse Supabase utiliser son URL par défaut (configurée sur le projet).
      },
    });

    if (error) {
      console.error("[signUpAction] Supabase signUp error:", error.message);
      // Message générique anti-énumération
      return { success: false, error: "Inscription impossible. Réessaye dans un instant." };
    }

    // Si Supabase n'auto-confirme pas, l'user reçoit un email. Sinon il est direct loggé.
    if (data.session) {
      // Auto-confirm activé → user déjà loggé
      redirect(safeReturnTo(input.returnTo));
    }

    // Sinon : message succès, user doit valider par email
    return {
      success: true,
      message: "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.",
    };
  } catch (e) {
    // Re-throw redirect (Next.js exception)
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: string }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("[signUpAction] exception:", e);
    return { success: false, error: "Erreur technique. Réessaye dans un instant." };
  }
}
