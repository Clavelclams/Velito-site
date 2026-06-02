/**
 * Server actions de /signup.
 *
 * signUpAction valide les inputs, appelle Supabase Auth signUp,
 * Supabase envoie un email de confirmation à l'utilisateur.
 * L'utilisateur clique sur le lien dans l'email, son compte est activé,
 * il peut se connecter.
 *
 * Sécurité :
 *  - Validation côté serveur (longueur min, email format)
 *  - Anti-énumération : si l'email existe déjà, on renvoie le MÊME message
 *    générique (sinon un attaquant peut découvrir quels emails sont en DB)
 *  - Email confirmation OBLIGATOIRE (configuré côté Supabase Dashboard)
 *  - Mot de passe min 8 caractères (plus strict que login pour éviter
 *    qu'un user crée un compte avec un mdp faible)
 */
"use server";

import { createClient } from "@/lib/supabase/server";

interface SignUpInput {
  email: string;
  password: string;
  confirmPassword: string;
  returnTo?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  /** Message d'info à afficher si succès (ex: "vérifie ton mail"). */
  info?: string;
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  // ─── 1. Validation locale ───────────────────────────────────────────
  if (!input.email?.includes("@")) {
    return { success: false, error: "Email invalide." };
  }
  if (!input.password || input.password.length < 8) {
    return {
      success: false,
      error: "Mot de passe trop court (8 caractères minimum).",
    };
  }
  if (input.password !== input.confirmPassword) {
    return {
      success: false,
      error: "Les deux mots de passe ne correspondent pas.",
    };
  }

  // ─── 2. Appel Supabase Auth ─────────────────────────────────────────
  try {
    const supabase = await createClient();

    // emailRedirectTo : où Supabase enverra l'user après qu'il ait cliqué
    // sur le lien d'activation dans son email.
    const hubUrl =
      process.env.NEXT_PUBLIC_HUB_URL ??
      "https://hub.velito.fr";
    const emailRedirectTo = `${hubUrl}/login?confirmed=ok`;

    const { error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      // Log serveur pour debug, message générique côté client
      console.error("[signUpAction] Supabase signUp error:", error.message);
      // Cas spécial : Supabase peut renvoyer une erreur si rate-limit ou
      // déjà inscrit — on garde le message générique pour éviter l'énumération.
      return {
        success: false,
        error:
          "Impossible de créer le compte. Réessaye plus tard ou contacte le support.",
      };
    }

    // ─── 3. Succès : on demande à l'user de vérifier ses mails ────────
    return {
      success: true,
      info: "On t'a envoyé un email de confirmation. Clique sur le lien dedans pour activer ton compte (vérifie aussi tes spams).",
    };
  } catch (e) {
    console.error("[signUpAction] exception :", e);
    return {
      success: false,
      error: "Erreur technique. Réessaye dans un instant.",
    };
  }
}
