/**
 * REPOSITORY TRÉSORERIE — couche accès aux données (Lot 6, 07/11/2026).
 *
 * Tables compte_tresorerie et solde_observe (sql/06). Mêmes principes que les
 * autres repositories : client injecté, requêtes paramétrées, aucun filtre de
 * sécurité en dur (la RLS cloisonne par entité). Le repository exécute ce que
 * le service a déjà validé ; il ne re-valide pas la logique métier.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CompteTresorerie,
  NouveauCompteTresorerie,
  NouvelleTransaction,
  SoldeObserve,
  Transaction,
} from "@/types/database";
import type { NouveauSoldeObserve } from "@/lib/services/tresorerie";

export async function listerComptesTresorerie(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<CompteTresorerie[]> {
  const { data, error } = await supabase
    .from("compte_tresorerie")
    .select("*")
    .eq("entite_id", entiteId)
    .order("nature")
    .order("nom");
  if (error) throw new Error(`Chargement des comptes impossible : ${error.message}`);
  return (data ?? []) as CompteTresorerie[];
}

export async function getCompteTresorerie(
  supabase: SupabaseClient,
  id: string,
): Promise<CompteTresorerie | null> {
  const { data, error } = await supabase
    .from("compte_tresorerie")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement du compte impossible : ${error.message}`);
  return (data as CompteTresorerie | null) ?? null;
}

export async function creerCompteTresorerie(
  supabase: SupabaseClient,
  nouveau: NouveauCompteTresorerie,
): Promise<CompteTresorerie> {
  const { data, error } = await supabase
    .from("compte_tresorerie")
    .insert(nouveau)
    .select()
    .single();
  if (error) {
    // 23505 = unique_violation : un compte de ce nom existe déjà pour l'entité.
    if (error.code === "23505") throw new Error("Un compte porte déjà ce nom.");
    throw new Error(`Création du compte impossible : ${error.message}`);
  }
  return data as CompteTresorerie;
}

/** Solde initial connu après coup (ex. premier relevé retrouvé). */
export async function definirSoldeInitial(
  supabase: SupabaseClient,
  compteId: string,
  soldeCentimes: number | null,
  date: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("compte_tresorerie")
    .update({ solde_initial_centimes: soldeCentimes, date_solde_initial: date })
    .eq("id", compteId);
  if (error) throw new Error(`Mise à jour du solde initial impossible : ${error.message}`);
}

export async function listerSoldesObserves(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<SoldeObserve[]> {
  const { data, error } = await supabase
    .from("solde_observe")
    .select("*")
    .eq("entite_id", entiteId)
    .order("date_releve", { ascending: false });
  if (error) throw new Error(`Chargement des soldes observés impossible : ${error.message}`);
  return (data ?? []) as SoldeObserve[];
}

/**
 * Enregistre un solde lu sur un relevé. Un second relevé à la même date pour
 * le même compte REMPLACE le premier (upsert sur l'unicité compte + date) :
 * c'est une correction de lecture, pas une deuxième observation.
 */
export async function enregistrerSoldeObserve(
  supabase: SupabaseClient,
  observation: NouveauSoldeObserve,
): Promise<void> {
  const { error } = await supabase
    .from("solde_observe")
    .upsert(observation, { onConflict: "compte_id,date_releve" });
  if (error) throw new Error(`Enregistrement du solde observé impossible : ${error.message}`);
}

export async function supprimerSoldeObserve(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("solde_observe").delete().eq("id", id);
  if (error) throw new Error(`Suppression du solde observé impossible : ${error.message}`);
}

/**
 * Crée les deux jambes d'un virement en UNE requête : Postgres insère les deux
 * lignes dans la même instruction, donc soit les deux existent, soit aucune
 * (jamais une sortie sans son entrée).
 */
export async function creerVirement(
  supabase: SupabaseClient,
  jambes: [NouvelleTransaction, NouvelleTransaction],
): Promise<Transaction[]> {
  const { data, error } = await supabase.from("transaction").insert(jambes).select();
  if (error) throw new Error(`Création du virement impossible : ${error.message}`);
  return (data ?? []) as Transaction[];
}

/** Supprime les deux jambes d'un virement d'un coup (par leur identifiant commun). */
export async function supprimerVirement(supabase: SupabaseClient, virementId: string): Promise<void> {
  const { error } = await supabase.from("transaction").delete().eq("virement_id", virementId);
  if (error) throw new Error(`Suppression du virement impossible : ${error.message}`);
}
