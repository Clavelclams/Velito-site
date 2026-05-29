/**
 * Server actions de /login.
 *
 * signInAction valide les inputs, appelle Supabase Auth signInWithPassword,
 * puis redirige vers returnTo. En cas d'erreur, renvoie un message.
 *
 * Sécurité : on ne révèle PAS si l'email existe (message générique).
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface SignInInput {
  email: string;
  password: string;
  returnTo: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

// Sécurité : returnTo doit être soit un chemin local ("/...") soit un sous-domaine
// .velito.fr connu. Sinon on retombe sur "/" pour empêcher open-redirect.
const ALLOWED_HOSTS = [
  "hub.velito.fr",
  "vea.velito.fr",
  "vena.velito.fr",
  "velito.fr",
  "interactive.velito.fr",
  "arena.velito.fr",
  "prevention.velito.fr",
];

function safeReturnTo(raw: string): string {
  try {
    if (raw.startsWith("/")) return raw;
    const u = new URL(raw);
    if (ALLOWED_HOSTS.includes(u.host) || u.host.endsWith(".localhost") || u.host === "localhost:3000") {
      return u.toString();
    }
  } catch {
    /* malformé, on retombe */
  }
  return "/";
}

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  if (!input.email?.includes("@") || !input.password || input.password.length < 6) {
    return { success: false, error: "Email valide + mot de passe (6+ caractères) requis." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error) {
      // On loggue côté serveur pour debug ; côté client, message générique
      // (ne révèle pas si l'email existe — sécurité contre l'énumération).
      console.error("[signInAction] Supabase auth error:", error.message);
      return { success: false, error: "Identifiants invalides." };
    }
  } catch (e) {
    console.error("[signInAction] exception :", e);
    return { success: false, error: "Erreur technique. Réessaye dans un instant." };
  }

  redirect(safeReturnTo(input.returnTo));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
