/**
 * REPOSITORY TRANSACTIONS — couche accès aux données.
 *
 * Toutes les requêtes vers la table `transaction` vivent ICI. Mêmes principes
 * que les autres repositories : client injecté, requêtes paramétrées, et
 * AUCUN filtre de sécurité en dur (la RLS cloisonne par entité côté Postgres).
 * Le filtre `entite_id` présent ici est FONCTIONNEL (afficher une entité à la
 * fois), pas sécuritaire.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction, NouvelleTransaction } from "@/types/database";

/** Champs modifiables d'une transaction : tout sauf l'entité (qui ne bouge pas). */
export type ChampsTransaction = Omit<NouvelleTransaction, "entite_id">;

/**
 * Crée une transaction. Reçoit un DTO DÉJÀ validé et converti en centimes
 * par le service (preparerNouvelleTransaction). Le repository exécute,
 * il ne re-valide pas la logique métier.
 *
 * On n'écrit ni `montant_ht_centimes` (colonne générée par Postgres) ni
 * `statut` (défaut 'validee' pour une saisie manuelle) : la base s'en charge.
 */
export async function creerTransaction(
  supabase: SupabaseClient,
  nouvelle: NouvelleTransaction,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transaction")
    .insert(nouvelle)
    .select()
    .single();

  if (error) {
    throw new Error(`Création de la transaction impossible : ${error.message}`);
  }

  return data as Transaction;
}

/**
 * Insère PLUSIEURS transactions d'un coup (import CSV). Elles naissent en
 * statut 'a_verifier' : issues d'un relevé, elles restent à catégoriser et à
 * confirmer avant d'être considérées comme validées. Renvoie le nombre inséré.
 */
export async function creerTransactionsEnLot(
  supabase: SupabaseClient,
  nouvelles: NouvelleTransaction[],
): Promise<Transaction[]> {
  if (nouvelles.length === 0) return [];

  const payload = nouvelles.map((n) => ({ ...n, statut: "a_verifier" as const }));

  const { data, error } = await supabase
    .from("transaction")
    .insert(payload)
    .select();

  if (error) {
    throw new Error(`Import des transactions impossible : ${error.message}`);
  }

  return (data ?? []) as Transaction[];
}

/**
 * Liste les transactions d'une entité, les plus récentes d'abord.
 * L'ordre (date décroissante, puis création décroissante pour départager
 * deux mêmes dates) correspond exactement à l'index composite
 * idx_transaction_entite_date posé dans sql/01 — la requête est donc servie
 * par l'index, sans tri en mémoire.
 */
export async function listerTransactions(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transaction")
    .select("*")
    .eq("entite_id", entiteId)
    .order("date_transaction", { ascending: false })
    .order("cree_le", { ascending: false });

  if (error) {
    throw new Error(`Chargement des transactions impossible : ${error.message}`);
  }

  return (data ?? []) as Transaction[];
}

/**
 * Récupère UNE transaction par son id (pour l'écran d'édition).
 * Renvoie null si elle n'existe pas ou n'est pas à moi (la RLS ne remonte
 * rien) → la page traduira en notFound(). Pas besoin de passer entite_id.
 */
export async function getTransaction(
  supabase: SupabaseClient,
  id: string,
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transaction")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Chargement de la transaction impossible : ${error.message}`);
  }

  return (data as Transaction | null) ?? null;
}

/**
 * Modifie une transaction. Reçoit les champs mutables DÉJÀ validés/convertis
 * par le service. On ne touche jamais à entite_id (une transaction ne change
 * pas d'entité) : c'est le sens du type ChampsTransaction. Le trigger SQL met
 * `modifie_le` à jour automatiquement, et le HT (colonne générée) suit le TTC.
 */
export async function modifierTransaction(
  supabase: SupabaseClient,
  id: string,
  champs: ChampsTransaction,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transaction")
    .update(champs)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Modification de la transaction impossible : ${error.message}`);
  }

  return data as Transaction;
}

/**
 * Supprime une transaction. Ses justificatifs partent en cascade (ON DELETE
 * CASCADE, sql/01). La RLS garantit qu'on ne peut supprimer que les siennes.
 */
export async function supprimerTransaction(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("transaction").delete().eq("id", id);

  if (error) {
    throw new Error(`Suppression de la transaction impossible : ${error.message}`);
  }
}
