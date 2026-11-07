/**
 * Server actions — pointage des lignes d'un compte sur le relevé (07/11/2026).
 *
 * Pointer = « j'ai vu cette opération sur le relevé du JJ/MM/AAAA ». C'est
 * distinct de valider (la nature de la ligne est vérifiée) et de justifier
 * (une pièce existe). L'entité et le compte viennent de l'URL ; on revérifie
 * que la ligne leur appartient avant d'écrire. Si l'exercice est clôturé, la
 * base refuse et son message (« Exercice 2025 clôturé : rouvre-le d'abord. »)
 * est affiché tel quel.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCompteTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";
import { depointerLigne, getLigneControlee, listerLignesJusquAu, pointerLignes } from "@/lib/repositories/cloture";
import { estMoisValide, lignesAPointerDuMois, preparerPointage } from "@/lib/services/cloture";
import { controleMensuel, finDeMois } from "@/lib/services/tresorerie";

interface ResultatAction {
  success: boolean;
  error?: string;
  pointees?: number;
}

function rafraichir(entiteId: string, compteId: string) {
  revalidatePath(`/${entiteId}/tresorerie/${compteId}`, "layout");
  revalidatePath(`/${entiteId}/cloture`);
}

export async function pointerLigneAction(
  entiteId: string,
  compteId: string,
  transactionId: string,
  date: string,
  reference: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const ligne = await getLigneControlee(supabase, transactionId);
    if (!ligne || ligne.entite_id !== entiteId || ligne.compte_tresorerie_id !== compteId) {
      return { success: false, error: "Ligne introuvable." };
    }
    const prepare = preparerPointage(ligne, { date, reference });
    if (!prepare.ok) return { success: false, error: prepare.erreur };
    await pointerLignes(supabase, [ligne.id], prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId, compteId);
  return { success: true, pointees: 1 };
}

export async function depointerLigneAction(
  entiteId: string,
  compteId: string,
  transactionId: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const ligne = await getLigneControlee(supabase, transactionId);
    if (!ligne || ligne.entite_id !== entiteId || ligne.compte_tresorerie_id !== compteId) {
      return { success: false, error: "Ligne introuvable." };
    }
    await depointerLigne(supabase, ligne.id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId, compteId);
  return { success: true };
}

/**
 * [07/11/2026] « Pointer toutes les lignes du mois » : le serveur recalcule
 * le contrôle mensuel et n'accepte que si le relevé du mois CONCORDE. Seules
 * les lignes datées au plus tard du relevé et pas encore pointées bougent.
 */
export async function pointerMoisAction(entiteId: string, compteId: string, mois: string): Promise<ResultatAction> {
  if (!estMoisValide(mois)) return { success: false, error: "Mois invalide." };
  const annee = Number(mois.slice(0, 4));
  const numero = Number(mois.slice(5, 7));
  try {
    const supabase = await createClient();
    const compte = await getCompteTresorerie(supabase, compteId);
    if (!compte || compte.entite_id !== entiteId) return { success: false, error: "Compte introuvable." };
    const [lignes, observations] = await Promise.all([
      listerLignesJusquAu(supabase, entiteId, finDeMois(annee, numero)),
      listerSoldesObserves(supabase, entiteId),
    ]);
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const controle = controleMensuel(compte, lignes, observations, annee, aujourdHui)[numero - 1]!;
    const lot = lignesAPointerDuMois(lignes, compteId, mois, controle);
    if (!lot.ok) return { success: false, error: lot.erreur };
    const pointees = await pointerLignes(supabase, lot.valeur.ids, lot.valeur.champs);
    rafraichir(entiteId, compteId);
    return { success: true, pointees };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
