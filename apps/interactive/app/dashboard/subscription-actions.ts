/**
 * Server actions liées aux abonnements Velito Interactive.
 *
 * - activateTrialAction : démarre l'essai 7 jours gratuit sans CB.
 * - cancelSubscriptionAction : marque l'abo comme cancel_at_period_end.
 *
 * Sécurité : RLS sur shared.subscriptions = user_id = auth.uid(), donc on
 * peut uniquement INSERT/UPDATE sa propre ligne.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidSiret, normalizeSiret, sirenFromSiret, lookupSiretInsee } from "@/lib/business";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Étape 1/2 — Lookup d'un SIRET pour afficher le nom de l'établissement
 * AVANT activation. Anti-fraude : on demande confirmation visuelle.
 */
export async function previewSiretAction(formData: FormData): Promise<
  | { success: true; name: string; siret: string; activity?: string; address?: string; city?: string; isClosed: boolean }
  | { success: false; error: string }
> {
  const rawSiret = String(formData.get("siret") ?? "").trim();
  if (!rawSiret) {
    return { success: false, error: "SIRET obligatoire." };
  }
  const cleaned = normalizeSiret(rawSiret);
  if (!isValidSiret(cleaned)) {
    return {
      success: false,
      error: "SIRET invalide. Vérifie les 14 chiffres et réessaie.",
    };
  }
  const info = await lookupSiretInsee(cleaned);
  if (!info) {
    return {
      success: false,
      error: "SIRET introuvable au registre des entreprises. Vérifie ta saisie.",
    };
  }
  if (info.isClosed) {
    return {
      success: false,
      error: "Cet établissement est fermé selon le registre. Si tu penses que c'est une erreur, contacte-nous.",
    };
  }
  return {
    success: true,
    name: info.name,
    siret: info.siret,
    activity: info.activity,
    address: info.address,
    city: info.city,
    isClosed: info.isClosed,
  };
}

/**
 * Étape 2/2 — Active l'essai 7 jours après confirmation.
 *
 * Règles métier :
 *  - SIRET obligatoire + valide + EXISTANT au registre INSEE
 *  - 1 SIRET ne peut activer qu'UN seul essai (UNIQUE index)
 *  - 1 user ne peut activer qu'UN seul essai
 *  - Les particuliers n'ont PAS d'essai → ils paient direct
 */
export async function activateTrialAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Connecte-toi d'abord." };

  const rawSiret = String(formData.get("siret") ?? "").trim();
  if (!rawSiret) {
    return { success: false, error: "SIRET obligatoire pour l'essai gratuit." };
  }

  const cleanedSiret = normalizeSiret(rawSiret);
  if (!isValidSiret(cleanedSiret)) {
    return {
      success: false,
      error: "SIRET invalide. Vérifie les 14 chiffres et réessaie.",
    };
  }

  // Vérif INSEE — anti-fraude
  const inseeInfo = await lookupSiretInsee(cleanedSiret);
  if (!inseeInfo) {
    return {
      success: false,
      error: "SIRET introuvable au registre. Re-tape ou contacte-nous.",
    };
  }
  if (inseeInfo.isClosed) {
    return {
      success: false,
      error: "Cet établissement est fermé selon le registre.",
    };
  }

  const siren = sirenFromSiret(cleanedSiret)!;

  // Check anti-doublon SIRET
  const { data: existingSiret } = await supabase
    .schema("shared" as never)
    .from("subscriptions")
    .select("user_id")
    .eq("siret", cleanedSiret)
    .maybeSingle();
  if (existingSiret && (existingSiret as { user_id: string }).user_id !== user.id) {
    return {
      success: false,
      error: "Ce SIRET a déjà bénéficié d'un essai. Contacte-nous si besoin.",
    };
  }

  // Check si l'user a déjà un essai
  const { data: existing } = await supabase
    .schema("shared" as never)
    .from("subscriptions")
    .select("plan, trial_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const row = existing as { plan: string; trial_ends_at: string | null };
    if (row.trial_ends_at) {
      return { success: false, error: "Tu as déjà utilisé ton essai gratuit." };
    }
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  if (existing) {
    await supabase
      .schema("shared" as never)
      .from("subscriptions")
      .update({
        plan: "trial",
        trial_ends_at: trialEnd.toISOString(),
        siret: cleanedSiret,
        siren,
        account_type: "establishment",
      } as never)
      .eq("user_id", user.id);
  } else {
    await supabase
      .schema("shared" as never)
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "trial",
        trial_ends_at: trialEnd.toISOString(),
        siret: cleanedSiret,
        siren,
        account_type: "establishment",
      } as never);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Crée un profil "particulier" (pas d'essai gratuit, juste pour mémo).
 * L'user pourra s'abonner directement en payant après.
 */
export async function declareIndividualAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Connecte-toi d'abord." };

  const { data: existing } = await supabase
    .schema("shared" as never)
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .schema("shared" as never)
      .from("subscriptions")
      .update({ account_type: "individual" } as never)
      .eq("user_id", user.id);
  } else {
    await supabase
      .schema("shared" as never)
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        account_type: "individual",
      } as never);
  }

  revalidatePath("/dashboard");
  return { success: true };
}
