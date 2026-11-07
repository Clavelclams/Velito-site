/**
 * REPOSITORY BUDGETS (07/11/2026) : accès aux données.
 * Table budget (sql/11) et lecture allégée des opérations pour le réalisé.
 * Client injecté, requêtes paramétrées ; la RLS cloisonne par entité (lecture
 * pour les membres, écriture pour propriétaire et trésorier), le service a
 * déjà validé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget, NouveauBudget, OperationBudget } from "@/lib/services/budgets";

/** Enveloppes d'une entité pour les exercices demandés. */
export async function listerBudgets(supabase: SupabaseClient, entiteId: string, exercices: number[]): Promise<Budget[]> {
  if (exercices.length === 0) return [];
  const { data, error } = await supabase
    .from("budget")
    .select("*")
    .eq("entite_id", entiteId)
    .in("exercice", exercices);
  if (error) throw new Error(`Chargement du budget impossible : ${error.message}`);
  return (data ?? []) as Budget[];
}

/** Exercices qui ont au moins une enveloppe (pour proposer les années). */
export async function listerExercicesBudgetes(supabase: SupabaseClient, entiteId: string): Promise<number[]> {
  const { data, error } = await supabase.from("budget").select("exercice").eq("entite_id", entiteId);
  if (error) throw new Error(`Chargement des exercices impossible : ${error.message}`);
  return [...new Set((data ?? []).map((d) => Number((d as { exercice: number }).exercice)))];
}

/**
 * Crée ou met à jour l'enveloppe (exercice + catégorie) : la contrainte
 * budget_enveloppe_unique sert de cible à l'upsert, jamais de doublon.
 */
export async function enregistrerBudget(supabase: SupabaseClient, b: NouveauBudget): Promise<void> {
  const { error } = await supabase.from("budget").upsert(b, { onConflict: "entite_id,exercice,categorie_id" });
  if (error) throw new Error(`Enregistrement de l'enveloppe impossible : ${error.message}`);
}

export async function supprimerBudget(
  supabase: SupabaseClient,
  entiteId: string,
  exercice: number,
  categorieId: string,
): Promise<void> {
  const { error } = await supabase
    .from("budget")
    .delete()
    .eq("entite_id", entiteId)
    .eq("exercice", exercice)
    .eq("categorie_id", categorieId);
  if (error) throw new Error(`Suppression de l'enveloppe impossible : ${error.message}`);
}

/**
 * Insertion en lot des enveloppes manquantes. ignoreDuplicates : si une
 * enveloppe a été créée entre-temps (deux onglets), elle n'est pas écrasée.
 */
export async function creerBudgetsManquants(supabase: SupabaseClient, budgets: NouveauBudget[]): Promise<number> {
  if (budgets.length === 0) return 0;
  const { data, error } = await supabase
    .from("budget")
    .upsert(budgets, { onConflict: "entite_id,exercice,categorie_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`Copie du budget impossible : ${error.message}`);
  return (data ?? []).length;
}

const TAILLE_PAGE = 1000;

/**
 * [07/11/2026] Opérations entre deux années incluses, seulement les colonnes
 * utiles au réalisé. Lecture PAR PAGES : l'API Supabase plafonne une réponse
 * (1 000 lignes par défaut) ; sans boucle, un exercice chargé serait tronqué
 * sans erreur et le réalisé serait faux.
 */
export async function listerOperationsBudget(
  supabase: SupabaseClient,
  entiteId: string,
  anneeDebut: number,
  anneeFin: number,
): Promise<OperationBudget[]> {
  const out: OperationBudget[] = [];
  for (let depart = 0; ; depart += TAILLE_PAGE) {
    const { data, error } = await supabase
      .from("transaction")
      .select("id, categorie_id, type, statut, date_transaction, montant_ttc_centimes, virement_id")
      .eq("entite_id", entiteId)
      .gte("date_transaction", `${anneeDebut}-01-01`)
      .lte("date_transaction", `${anneeFin}-12-31`)
      .order("id")
      .range(depart, depart + TAILLE_PAGE - 1);
    if (error) throw new Error(`Chargement des opérations impossible : ${error.message}`);
    const page = (data ?? []) as OperationBudget[];
    out.push(...page);
    if (page.length < TAILLE_PAGE) return out;
  }
}

/** Années (AAAA) où l'entité a au moins une opération : bornes min et max. */
export async function bornesAnneesOperations(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<{ premiere: number; derniere: number } | null> {
  const lire = async (croissant: boolean) => {
    const { data, error } = await supabase
      .from("transaction")
      .select("date_transaction")
      .eq("entite_id", entiteId)
      .order("date_transaction", { ascending: croissant })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Chargement des opérations impossible : ${error.message}`);
    return data ? Number((data as { date_transaction: string }).date_transaction.slice(0, 4)) : null;
  };
  const [premiere, derniere] = await Promise.all([lire(true), lire(false)]);
  return premiere === null || derniere === null ? null : { premiere, derniere };
}
