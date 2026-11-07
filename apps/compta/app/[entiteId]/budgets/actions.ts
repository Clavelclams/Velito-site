/**
 * Server actions : Budgets (07/11/2026).
 * Service (valider) → repository (écrire) → RLS (cloisonner : un lecteur est
 * refusé par la base). L'entité vient de l'URL ; la catégorie est revérifiée
 * contre les catégories de cette entité avant d'écrire.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { creerBudgetsManquants, enregistrerBudget, listerBudgets, supprimerBudget } from "@/lib/repositories/budgets";
import { enveloppesACopier, exerciceValide, preparerEnveloppe } from "@/lib/services/budgets";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/budgets`, "layout");
}

/** Enregistre le prévu d'une catégorie ; montant vide = retirer l'enveloppe. */
export async function enregistrerEnveloppeAction(
  entiteId: string,
  exercice: number,
  categorieId: string,
  montant: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const categories = await listerCategories(supabase, entiteId, false);
    const prepare = preparerEnveloppe({ entiteId, exercice, categorieId, montant, commentaire: "" }, categories);
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    if (prepare.valeur === null) {
      await supprimerBudget(supabase, entiteId, exercice, categorieId);
    } else {
      // [07/11/2026] Le commentaire n'est pas saisi depuis le tableau : on
      // garde celui de l'enveloppe existante plutôt que de l'effacer.
      const existante = (await listerBudgets(supabase, entiteId, [exercice])).find((b) => b.categorie_id === categorieId);
      await enregistrerBudget(supabase, { ...prepare.valeur, commentaire: existante?.commentaire ?? null });
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/**
 * Copie les enveloppes de l'exercice précédent vers `exercice`, seulement
 * celles qui manquent : rien d'existant n'est écrasé.
 */
export async function copierBudgetPrecedentAction(
  entiteId: string,
  exercice: number,
): Promise<ResultatAction & { copiees?: number }> {
  if (!exerciceValide(exercice) || !exerciceValide(exercice - 1)) return { success: false, error: "Exercice invalide." };
  let copiees = 0;
  try {
    const supabase = await createClient();
    const [categories, budgets] = await Promise.all([
      listerCategories(supabase, entiteId, false),
      listerBudgets(supabase, entiteId, [exercice - 1, exercice]),
    ]);
    const precedent = budgets.filter((b) => b.exercice === exercice - 1);
    if (precedent.length === 0) return { success: false, error: `Aucune enveloppe en ${exercice - 1} : rien à copier.` };
    const aCreer = enveloppesACopier(
      precedent,
      budgets.filter((b) => b.exercice === exercice),
      categories,
      entiteId,
      exercice,
    );
    copiees = await creerBudgetsManquants(supabase, aCreer);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, copiees };
}
