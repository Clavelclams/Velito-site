/**
 * Server actions — clôture et réouverture d'un exercice (07/11/2026).
 *
 * Clôturer, en trois barrières successives :
 *  1. le serveur recharge TOUT et refait la checklist (le navigateur n'est pas
 *     de confiance : un bouton dégrisé à la main ne suffit pas) ;
 *  2. il recalcule la signature et la compare à celle que la page affichait :
 *     si une ligne a bougé depuis la revue, refus ;
 *  3. la base (cloturer_exercice) revérifie les blocages et la signature, et
 *     refuse un lecteur.
 * L'instantané est construit ici, à partir des données que la signature
 * certifie identiques à celles revues.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import { chargerDonneesExercice, cloturerExercice, rouvrirExercice } from "@/lib/repositories/cloture";
import {
  checklistCloture,
  construireInstantane,
  validerMotifCloture,
  validerMotifReouverture,
} from "@/lib/services/cloture";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  // L'état clôturé change ce que toutes les pages de saisie acceptent.
  revalidatePath(`/${entiteId}`, "layout");
}

function exerciceValide(exercice: number): boolean {
  return Number.isInteger(exercice) && exercice >= 2000 && exercice <= 2100;
}

export async function cloturerExerciceAction(
  entiteId: string,
  exercice: number,
  motif: string,
  signatureVue: string,
): Promise<ResultatAction> {
  if (!exerciceValide(exercice)) return { success: false, error: "Exercice invalide." };
  const m = validerMotifCloture(motif);
  if (!m.ok) return { success: false, error: m.erreur };

  try {
    const supabase = await createClient();
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const [donnees, categories] = await Promise.all([
      chargerDonneesExercice(supabase, entiteId, exercice, aujourdHui),
      listerCategories(supabase, entiteId, false),
    ]);

    const checklist = checklistCloture(donnees);
    if (!checklist.toutVert) {
      const premier = checklist.points.find((p) => !p.ok)!;
      return { success: false, error: `Clôture impossible : ${premier.libelle.toLowerCase()} (${premier.nombre} à corriger).` };
    }
    // [07/11/2026] Données modifiées entre l'affichage et la confirmation.
    if (checklist.signature !== signatureVue) {
      return {
        success: false,
        error: `Les données de l'exercice ${exercice} ont changé depuis ton affichage : recharge la page et refais la revue.`,
      };
    }

    const instantane = construireInstantane(donnees, categories);
    await cloturerExercice(supabase, {
      entiteId,
      exercice,
      motif: m.valeur,
      signature: signatureVue,
      instantane,
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function rouvrirExerciceAction(
  entiteId: string,
  exercice: number,
  motif: string,
): Promise<ResultatAction> {
  if (!exerciceValide(exercice)) return { success: false, error: "Exercice invalide." };
  const m = validerMotifReouverture(motif);
  if (!m.ok) return { success: false, error: m.erreur };
  try {
    const supabase = await createClient();
    await rouvrirExercice(supabase, entiteId, exercice, m.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}
