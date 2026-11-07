/**
 * REPOSITORY MEMBRES (07/11/2026) — rôles sur une structure (sql/09).
 * Tout passe par des fonctions SQL contrôlées (rpc) : la table entite_membre
 * n'a aucune règle d'écriture directe, seul le propriétaire peut gérer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RoleEntite = "proprietaire" | "tresorier" | "lecteur";

export const LIBELLES_ROLE: Record<RoleEntite, string> = {
  proprietaire: "Propriétaire",
  tresorier: "Trésorier",
  lecteur: "Lecteur",
};

export interface Membre {
  user_id: string;
  email: string;
  role: "tresorier" | "lecteur";
  ajoute_le: string;
}

export async function roleSurEntite(supabase: SupabaseClient, entiteId: string): Promise<RoleEntite | null> {
  const { data, error } = await supabase.rpc("role_entite", { p_entite_id: entiteId });
  if (error) throw new Error(`Lecture du rôle impossible : ${error.message}`);
  return (data as RoleEntite | null) ?? null;
}

export async function listerMembres(supabase: SupabaseClient, entiteId: string): Promise<Membre[]> {
  const { data, error } = await supabase.rpc("membres_entite", { p_entite_id: entiteId });
  if (error) throw new Error(`Chargement des membres impossible : ${error.message}`);
  return (data ?? []) as Membre[];
}

/** Renvoie « ok », « compte_inconnu » ou « deja_proprietaire ». */
export async function ajouterMembre(
  supabase: SupabaseClient,
  entiteId: string,
  email: string,
  role: "tresorier" | "lecteur",
): Promise<string> {
  const { data, error } = await supabase.rpc("ajouter_membre_entite", {
    p_entite_id: entiteId,
    p_email: email,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function retirerMembre(supabase: SupabaseClient, entiteId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("retirer_membre_entite", { p_entite_id: entiteId, p_user_id: userId });
  if (error) throw new Error(error.message);
}
