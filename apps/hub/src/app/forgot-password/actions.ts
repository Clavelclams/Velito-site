/**
 * Server actions de /forgot-password (Hub Velito).
 *
 * `requestPasswordResetAction` reçoit un email, et appelle Supabase Auth
 * `resetPasswordForEmail()` pour envoyer le lien magique de reset.
 *
 * ============================================================================
 * SÉCURITÉ — règles d'or rappelées (cf. docs/OAUTH_ARCHITECTURE.md §8 bis) :
 *
 * 1) ANTI-ÉNUMÉRATION : on retourne TOUJOURS le même message générique,
 *    que l'email existe ou pas. Sinon, un attaquant peut tester des emails
 *    en série pour savoir lesquels sont chez nous.
 *
 * 2) ANTI-FAILLE "RESET = SIGNUP DÉGUISÉ" : on utilise STRICTEMENT
 *    `supabase.auth.resetPasswordForEmail()`. Cette API NE crée PAS de compte
 *    si l'email est inconnu — elle ne fait rien (silencieusement). On
 *    n'utilise JAMAIS `signInWithOtp({shouldCreateUser:true})` ici.
 *
 * 3) LE LIEN DANS L'EMAIL pointe vers `<hub>/reset-password`. Cette page
 *    fait UNIQUEMENT `updateUser({password})` sur l'utilisateur EXISTANT
 *    déjà identifié par la session que Supabase ouvre via le hash de l'URL.
 *    Pas de signUp possible depuis ce lien.
 *
 * 4) RATE LIMITING : à brancher plus tard via Vercel Edge Middleware ou
 *    Supabase rate limit (laissons-le côté DB pour MVP).
 * ============================================================================
 */
"use server";

import { createClient } from "@/lib/supabase/server";

interface RequestResetInput {
  email: string;
}

interface ActionResult {
  success: boolean;
  /** Message GÉNÉRIQUE à afficher à l'utilisateur, identique quel que soit le cas. */
  message: string;
}

/** Le message UNIQUE à retourner — ne révèle JAMAIS si l'email existe ou pas. */
const GENERIC_OK_MESSAGE =
  "Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe.";

/**
 * Récupère l'URL racine du hub pour construire le redirectTo du mail.
 * En prod = https://hub.velito.fr. En dev local = http://localhost:3000.
 *
 * On lit NEXT_PUBLIC_HUB_URL si défini, sinon on déduit depuis VERCEL_URL,
 * sinon on retombe sur localhost. Ce n'est pas un secret.
 */
function getHubBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_HUB_URL) return process.env.NEXT_PUBLIC_HUB_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function requestPasswordResetAction(
  input: RequestResetInput
): Promise<ActionResult> {
  const email = input.email?.trim().toLowerCase();

  // Validation minimale — si l'email n'est même pas syntaxique, on ne tente même
  // pas d'envoyer, mais on retourne quand même le message générique (anti-énumération).
  if (!email?.includes("@")) {
    return { success: true, message: GENERIC_OK_MESSAGE };
  }

  try {
    const supabase = await createClient();
    const redirectTo = `${getHubBaseUrl()}/reset-password`;

    // ⚠️ resetPasswordForEmail : safe par défaut. Ne crée PAS de compte si
    // l'email est inconnu. C'est la SEULE API à utiliser pour ce flow.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // On log côté serveur pour debug, mais on retourne le message générique.
      console.error("[requestPasswordResetAction] Supabase error:", error.message);
    }
  } catch (e) {
    console.error("[requestPasswordResetAction] exception:", e);
  }

  // TOUJOURS le même message — qu'on ait envoyé ou pas, qu'on ait eu une erreur ou pas.
  // Sinon → faille d'énumération.
  return { success: true, message: GENERIC_OK_MESSAGE };
}
