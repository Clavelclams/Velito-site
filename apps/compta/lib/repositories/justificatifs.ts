/**
 * REPOSITORY JUSTIFICATIFS — couche accès aux données (métadonnées).
 *
 * Ne gère QUE les métadonnées dans la table public.justificatif. Le fichier
 * binaire vit dans Supabase Storage (bucket privé) et est manipulé par les
 * server actions via l'API Storage, pas ici. Séparation nette : ce repository
 * ne connaît pas Storage, il connaît une table.
 *
 * RLS : la policy « justificatif via la transaction parente » (sql/02) filtre
 * déjà par propriété de l'entité. Aucun filtre de sécurité en dur ici.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Justificatif } from "@/types/database";

/** Métadonnées à insérer (id et cree_le sont générés par la base). */
export type NouveauJustificatif = Omit<Justificatif, "id" | "cree_le">;

export async function creerJustificatif(
  supabase: SupabaseClient,
  meta: NouveauJustificatif,
): Promise<Justificatif> {
  const { data, error } = await supabase
    .from("justificatif")
    .insert(meta)
    .select()
    .single();

  if (error) {
    throw new Error(`Enregistrement du justificatif impossible : ${error.message}`);
  }
  return data as Justificatif;
}

export async function listerParTransaction(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<Justificatif[]> {
  const { data, error } = await supabase
    .from("justificatif")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("cree_le", { ascending: true });

  if (error) {
    throw new Error(`Chargement des justificatifs impossible : ${error.message}`);
  }
  return (data ?? []) as Justificatif[];
}

export async function getJustificatif(
  supabase: SupabaseClient,
  id: string,
): Promise<Justificatif | null> {
  const { data, error } = await supabase
    .from("justificatif")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Chargement du justificatif impossible : ${error.message}`);
  }
  return (data as Justificatif | null) ?? null;
}

export async function supprimerJustificatif(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("justificatif").delete().eq("id", id);
  if (error) {
    throw new Error(`Suppression du justificatif impossible : ${error.message}`);
  }
}

/**
 * Ensemble des transaction_id (parmi ceux fournis) qui ont AU MOINS un
 * justificatif. Sert à la détection des pièces manquantes (le calcul final se
 * fait dans le service, à partir de cet ensemble). On borne la requête aux ids
 * fournis pour ne charger que le nécessaire.
 */
export async function transactionIdsAvecJustificatif(
  supabase: SupabaseClient,
  transactionIds: string[],
): Promise<Set<string>> {
  if (transactionIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("justificatif")
    .select("transaction_id")
    .in("transaction_id", transactionIds);

  if (error) {
    throw new Error(`Vérification des justificatifs impossible : ${error.message}`);
  }

  return new Set((data ?? []).map((r) => (r as { transaction_id: string }).transaction_id));
}
