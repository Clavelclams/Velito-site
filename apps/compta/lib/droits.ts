/**
 * DROITS D'AFFICHAGE (07/11/2026) : utilitaire serveur pour les pages.
 *
 * Un Server Component appelle peutEcrire() pour décider s'il rend les
 * formulaires et boutons d'écriture. Ce n'est qu'un confort d'affichage :
 * les server actions ne changent pas et la base refuse toute écriture au
 * lecteur (sql/09). La logique de rôle est dans le service pur droits.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { roleSurEntite } from "@/lib/repositories/membres";
import { estProprietaireRole, peutEcrireRole } from "@/lib/services/droits";

/** Vrai pour le propriétaire et le trésorier de la structure. */
export async function peutEcrire(supabase: SupabaseClient, entiteId: string): Promise<boolean> {
  return peutEcrireRole(await roleSurEntite(supabase, entiteId));
}

/** Vrai seulement pour le propriétaire de la structure. */
export async function estProprietaire(supabase: SupabaseClient, entiteId: string): Promise<boolean> {
  return estProprietaireRole(await roleSurEntite(supabase, entiteId));
}
