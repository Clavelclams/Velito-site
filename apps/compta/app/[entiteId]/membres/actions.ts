/**
 * Server actions — membres d'une structure (07/11/2026).
 * Les fonctions SQL refusent d'elles-mêmes un appelant qui n'est pas le
 * propriétaire : la vérification ne dépend pas de l'interface.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ajouterMembre, retirerMembre } from "@/lib/repositories/membres";

interface ResultatAction {
  success: boolean;
  error?: string;
  message?: string;
}

export async function ajouterMembreAction(entiteId: string, email: string, role: string): Promise<ResultatAction> {
  const adresse = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return { success: false, error: "Adresse e-mail invalide." };
  if (role !== "tresorier" && role !== "lecteur") return { success: false, error: "Rôle inconnu." };
  try {
    const supabase = await createClient();
    const r = await ajouterMembre(supabase, entiteId, adresse, role);
    if (r === "compte_inconnu") {
      return { success: false, error: "Aucun compte avec cette adresse : la personne doit d'abord créer son compte sur hub.velito.fr." };
    }
    if (r === "deja_proprietaire") return { success: false, error: "C'est ton propre compte : tu es déjà propriétaire." };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  revalidatePath(`/${entiteId}/membres`);
  return {
    success: true,
    message: "Membre ajouté. Pour qu'il puisse entrer dans compta, ajoute aussi son e-mail à COMPTA_EMAILS_AUTORISES sur Vercel.",
  };
}

export async function retirerMembreAction(entiteId: string, userId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    await retirerMembre(supabase, entiteId, userId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  revalidatePath(`/${entiteId}/membres`);
  return { success: true };
}
