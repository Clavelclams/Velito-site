/**
 * REPOSITORY COMPTES — accès à la table `compte` (plan comptable).
 * Mêmes principes que les autres repos : client injecté, RLS pour la sécurité,
 * requêtes paramétrées.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Compte, NouveauCompte } from "@/types/database";

export async function listerComptes(
  supabase: SupabaseClient,
  entiteId: string,
  seulementActifs = true,
): Promise<Compte[]> {
  let requete = supabase
    .from("compte")
    .select("*")
    .eq("entite_id", entiteId)
    .order("numero", { ascending: true });

  if (seulementActifs) requete = requete.eq("active", true);

  const { data, error } = await requete;
  if (error) throw new Error(`Chargement du plan comptable impossible : ${error.message}`);
  return (data ?? []) as Compte[];
}

export async function getCompteParNumero(
  supabase: SupabaseClient,
  entiteId: string,
  numero: string,
): Promise<Compte | null> {
  const { data, error } = await supabase
    .from("compte")
    .select("*")
    .eq("entite_id", entiteId)
    .eq("numero", numero)
    .maybeSingle();

  if (error) throw new Error(`Recherche du compte impossible : ${error.message}`);
  return (data as Compte | null) ?? null;
}

/**
 * Insère un plan comptable en lot (seed PCG d'une entité). Idempotence gérée
 * par l'unicité (entite_id, numero) : on ignore les doublons côté appelant.
 * Renvoie le nombre de comptes créés.
 */
export async function creerComptesEnLot(
  supabase: SupabaseClient,
  nouveaux: NouveauCompte[],
): Promise<number> {
  if (nouveaux.length === 0) return 0;
  const { data, error } = await supabase.from("compte").insert(nouveaux).select("id");
  if (error) throw new Error(`Initialisation du plan comptable impossible : ${error.message}`);
  return data?.length ?? nouveaux.length;
}
