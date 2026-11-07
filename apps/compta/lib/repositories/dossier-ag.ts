/**
 * REPOSITORY DOSSIER D'AG (07/11/2026) : accès aux données, LECTURE SEULE.
 *
 * Une seule requête nouvelle : le NOMBRE de justificatifs par transaction
 * (le repository justificatifs ne donne que « au moins un », et l'index des
 * pièces affiche le nombre). Le reste réutilise les repositories existants,
 * regroupés dans chargerEntreesDossierAg pour que la page et la route CSV
 * lisent exactement les mêmes données.
 *
 * Mêmes principes que les autres repositories : client injecté, requêtes
 * paramétrées, aucun filtre de sécurité en dur (la RLS cloisonne par entité).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entite } from "@/types/database";
import { listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import { listerComptesTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";
import { listerContributions, listerSubventions } from "@/lib/repositories/subventions";
import type { EntreesDossierAg } from "@/lib/services/dossier-ag";

/**
 * [07/11/2026] Taille des paquets d'identifiants : le filtre « in » part dans
 * l'URL de la requête PostgREST ; quelques milliers d'uuid dépasseraient la
 * longueur admise. 200 uuid ≈ 7 Ko, large marge.
 */
const TAILLE_PAQUET = 200;

/** Nombre de justificatifs par transaction_id (les transactions sans pièce sont absentes). */
export async function compterJustificatifsParTransaction(
  supabase: SupabaseClient,
  transactionIds: string[],
): Promise<Record<string, number>> {
  const compte: Record<string, number> = {};
  for (let i = 0; i < transactionIds.length; i += TAILLE_PAQUET) {
    const paquet = transactionIds.slice(i, i + TAILLE_PAQUET);
    const { data, error } = await supabase.from("justificatif").select("transaction_id").in("transaction_id", paquet);
    if (error) throw new Error(`Comptage des justificatifs impossible : ${error.message}`);
    for (const r of (data ?? []) as { transaction_id: string }[]) {
      compte[r.transaction_id] = (compte[r.transaction_id] ?? 0) + 1;
    }
  }
  return compte;
}

/**
 * Charge toutes les listes brutes du dossier. Les transactions sont TOUTES
 * lues (pas seulement l'exercice) : le solde au 1er janvier dépend du passé.
 * Les justificatifs ne sont comptés que pour les lignes de l'exercice.
 */
export async function chargerEntreesDossierAg(
  supabase: SupabaseClient,
  entite: Pick<Entite, "id" | "nom" | "type_juridique">,
  exercice: number,
  aujourdHui: string,
): Promise<EntreesDossierAg> {
  const [transactions, categories, comptes, observations, subventions, contributions] = await Promise.all([
    listerTransactions(supabase, entite.id),
    listerCategories(supabase, entite.id, false),
    listerComptesTresorerie(supabase, entite.id),
    listerSoldesObserves(supabase, entite.id),
    listerSubventions(supabase, entite.id),
    listerContributions(supabase, entite.id),
  ]);
  const idsExercice = transactions.filter((t) => t.date_transaction.startsWith(`${exercice}-`)).map((t) => t.id);
  const nbJustificatifs = await compterJustificatifsParTransaction(supabase, idsExercice);
  return {
    entite: { nom: entite.nom, type_juridique: entite.type_juridique },
    exercice,
    aujourdHui,
    transactions,
    categories,
    comptes,
    observations,
    subventions,
    contributions,
    nbJustificatifs,
  };
}
