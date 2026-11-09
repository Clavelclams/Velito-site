/**
 * Server actions : clients (09/11/2026). CRUD simple. La suppression d'un
 * client utilisé par un devis ou une facture est refusée par la base
 * (trigger controle_client_facturation, message lisible).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { creerClient, getClient, modifierClient, supprimerClient } from "@/lib/repositories/facturation";
import { preparerClient, type SaisieClient } from "@/lib/services/facturation";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/clients`, "layout");
  revalidatePath(`/${entiteId}/devis`, "layout");
  revalidatePath(`/${entiteId}/factures`, "layout");
}

export async function creerClientAction(entiteId: string, saisie: SaisieClient): Promise<ResultatAction & { id?: string }> {
  const prepare = preparerClient(entiteId, saisie);
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  let id: string;
  try {
    const supabase = await createClient();
    id = (await creerClient(supabase, prepare.valeur)).id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

export async function modifierClientAction(entiteId: string, clientId: string, saisie: SaisieClient): Promise<ResultatAction> {
  const prepare = preparerClient(entiteId, saisie);
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    const client = await getClient(supabase, clientId);
    if (!client || client.entite_id !== entiteId) return { success: false, error: "Client introuvable." };
    // [09/11/2026] Les factures émises gardent leur instantané de l'acheteur :
    // modifier la fiche ne change aucune facture déjà émise.
    const { entite_id: _e, ...champs } = prepare.valeur;
    await modifierClient(supabase, clientId, champs);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerClientAction(entiteId: string, clientId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const client = await getClient(supabase, clientId);
    if (!client || client.entite_id !== entiteId) return { success: false, error: "Client introuvable." };
    await supprimerClient(supabase, clientId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  redirect(`/${entiteId}/clients`);
}
