/**
 * Server actions de /login — adaptées de apps/hub/src/app/login/actions.ts.
 *
 * Une server action = une fonction qui s'exécute UNIQUEMENT côté serveur,
 * appelable depuis un composant client comme une fonction normale. Next.js
 * transporte l'appel en HTTP tout seul. Avantage sécurité : la logique
 * d'authentification et les messages d'erreur détaillés ne partent jamais
 * dans le bundle navigateur.
 *
 * Différences avec le hub, assumées :
 *  - pas de hCaptcha : projet Supabase dédié, bot protection désactivée,
 *    et l'outil est mono-utilisateur derrière un middleware default-deny.
 *    (Si on active la protection Supabase plus tard, on reprend le pattern hub.)
 *  - pas de returnTo : Compta n'a qu'une destination après login, l'accueil.
 *    Pas de paramètre d'URL → pas de risque d'open redirect du tout.
 *
 * Leçons du hub CONSERVÉES :
 *  - message générique "Identifiants invalides" : ne jamais révéler si
 *    l'email existe (anti-énumération de comptes) ;
 *  - cas 429 (rate limit) traité À PART : dire "identifiants invalides"
 *    pousserait l'utilisateur à retaper son mot de passe en boucle et à
 *    entretenir le blocage.
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ResultatAction {
  success: boolean;
  error?: string;
}

export async function seConnecterAction(
  email: string,
  motDePasse: string,
): Promise<ResultatAction> {
  // Validation serveur MINIMALE mais obligatoire : ne jamais faire confiance
  // au client, même si le formulaire valide déjà côté navigateur.
  if (!email?.includes("@") || !motDePasse || motDePasse.length < 6) {
    return {
      success: false,
      error: "Email valide et mot de passe (6 caractères minimum) requis.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: motDePasse,
    });

    if (error) {
      // Log serveur pour le debug — l'utilisateur, lui, reçoit un message neutre.
      console.error("[seConnecterAction] Supabase auth :", error.message);

      const code = (error as { code?: string }).code ?? "";
      const statut = (error as { status?: number }).status;
      const estRateLimit =
        code === "over_request_rate_limit" ||
        statut === 429 ||
        error.message?.toLowerCase().includes("rate limit");

      if (estRateLimit) {
        return {
          success: false,
          error:
            "Trop de tentatives en peu de temps. Attends quelques minutes avant de réessayer.",
        };
      }
      return { success: false, error: "Identifiants invalides." };
    }
  } catch (e) {
    console.error("[seConnecterAction] exception :", e);
    return { success: false, error: "Erreur technique. Réessaye dans un instant." };
  }

  // redirect() DOIT être hors du try/catch : il fonctionne en lançant une
  // exception spéciale que Next.js intercepte — un catch la mangerait.
  redirect("/");
}

export async function seDeconnecterAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
