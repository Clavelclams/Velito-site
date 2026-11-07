/**
 * Server actions — Trésorerie (Lot 6, 07/11/2026).
 *
 * Même schéma que les autres actions : le service valide (fonction pure),
 * le repository écrit, la RLS cloisonne. L'entité vient TOUJOURS du
 * paramètre d'URL passé par la page, jamais d'un champ de formulaire libre ;
 * et les FK composites (compte, entité) de sql/06 refusent en base un compte
 * qui appartiendrait à une autre entité.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  creerCompteTresorerie,
  creerVirement,
  definirSoldeInitial,
  enregistrerSoldeObserve,
  supprimerSoldeObserve,
  supprimerVirement,
} from "@/lib/repositories/tresorerie";
import {
  preparerCompte,
  preparerSoldeObserve,
  preparerVirement,
  saisieSigneeVersCentimes,
  estDateValide,
  type SaisieCompte,
  type SaisieSoldeObserve,
  type SaisieVirement,
} from "@/lib/services/tresorerie";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/tresorerie`, "layout");
  revalidatePath(`/${entiteId}/transactions`);
  revalidatePath(`/${entiteId}`);
}

export async function creerCompteAction(
  entiteId: string,
  saisie: Omit<SaisieCompte, "entiteId">,
): Promise<ResultatAction> {
  const prepare = preparerCompte({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    await creerCompteTresorerie(supabase, prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/** Renseigner (ou effacer) le solde initial d'un compte après coup. */
export async function definirSoldeInitialAction(
  entiteId: string,
  compteId: string,
  solde: string,
  date: string,
): Promise<ResultatAction> {
  const vide = solde.trim() === "" && date.trim() === "";
  const centimes = saisieSigneeVersCentimes(solde);
  if (!vide && (centimes === null || !estDateValide(date))) {
    return { success: false, error: "Indique un montant et une date réelle, ou laisse les deux vides." };
  }
  try {
    const supabase = await createClient();
    await definirSoldeInitial(supabase, compteId, vide ? null : centimes, vide ? null : date);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function enregistrerSoldeObserveAction(
  entiteId: string,
  saisie: Omit<SaisieSoldeObserve, "entiteId">,
): Promise<ResultatAction> {
  const prepare = preparerSoldeObserve({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    await enregistrerSoldeObserve(supabase, prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerSoldeObserveAction(entiteId: string, id: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    await supprimerSoldeObserve(supabase, id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function creerVirementAction(
  entiteId: string,
  saisie: Omit<SaisieVirement, "entiteId">,
): Promise<ResultatAction> {
  // L'identifiant commun est tiré ICI (serveur) : le service reste pur.
  const prepare = preparerVirement({ ...saisie, entiteId }, crypto.randomUUID());
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    await creerVirement(supabase, prepare.valeur);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerVirementAction(entiteId: string, virementId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    await supprimerVirement(supabase, virementId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}
