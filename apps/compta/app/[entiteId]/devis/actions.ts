/**
 * Server actions : devis (09/11/2026).
 *
 * Le service (lib/services/facturation) décide, le repository écrit, la RLS
 * cloisonne, les triggers de sql/13 gardent numérotation, cycle de vie et
 * clôture. L'entité vient de l'URL ; chaque devis, ligne ou client est
 * revérifié avant d'écrire.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  creerDevis,
  creerFacture,
  creerLignesDevis,
  creerLignesFacture,
  getDevis,
  getLigneDevis,
  getParametres,
  listerClients,
  listerLignesDevis,
  mettreAJourDevis,
  supprimerDevis,
  supprimerFacture,
  supprimerLigneDevis,
} from "@/lib/repositories/facturation";
import {
  controlerTransitionDevis,
  devisModifiable,
  factureDepuisDevis,
  preparerDevis,
  preparerLigne,
  prochainePosition,
  type SaisieDevis,
  type SaisieLigne,
} from "@/lib/services/facturation";
import type { StatutDevisStocke } from "@/types/facturation";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/devis`, "layout");
  revalidatePath(`/${entiteId}/factures`, "layout");
}

const aujourdHui = () => new Date().toISOString().slice(0, 10);

/** Devis de CETTE structure, sinon null (un id d'une autre structure ne révèle rien). */
async function devisDeLEntite(supabase: Awaited<ReturnType<typeof createClient>>, entiteId: string, devisId: string) {
  const d = await getDevis(supabase, devisId);
  return d && d.entite_id === entiteId ? d : null;
}

export async function creerDevisAction(entiteId: string, saisie: SaisieDevis): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const prepare = preparerDevis(entiteId, saisie, await listerClients(supabase, entiteId));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    id = (await creerDevis(supabase, prepare.valeur)).id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

export async function modifierDevisAction(entiteId: string, devisId: string, saisie: SaisieDevis): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const d = await devisDeLEntite(supabase, entiteId, devisId);
    if (!d) return { success: false, error: "Devis introuvable." };
    if (!devisModifiable(d)) return { success: false, error: "Ce devis ne se modifie plus." };
    const prepare = preparerDevis(entiteId, saisie, await listerClients(supabase, entiteId));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const { client_id, objet, date_devis, date_fin_validite, notes } = prepare.valeur;
    await mettreAJourDevis(supabase, devisId, { client_id, objet, date_devis, date_fin_validite, notes });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerDevisAction(entiteId: string, devisId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const d = await devisDeLEntite(supabase, entiteId, devisId);
    if (!d) return { success: false, error: "Devis introuvable." };
    if (d.statut !== "brouillon") return { success: false, error: "Seul un devis en brouillon se supprime." };
    await supprimerDevis(supabase, devisId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  redirect(`/${entiteId}/devis`);
}

// ============================================================================
// Lignes
// ============================================================================

export async function ajouterLigneDevisAction(entiteId: string, devisId: string, saisie: SaisieLigne): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const d = await devisDeLEntite(supabase, entiteId, devisId);
    if (!d) return { success: false, error: "Devis introuvable." };
    if (!devisModifiable(d)) return { success: false, error: "Ce devis ne se modifie plus." };
    const [lignes, param] = await Promise.all([listerLignesDevis(supabase, devisId), getParametres(supabase, entiteId)]);
    const prepare = preparerLigne(entiteId, saisie, param?.regime_tva ?? null, prochainePosition(lignes));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await creerLignesDevis(supabase, [{ ...prepare.valeur, devis_id: devisId }]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerLigneDevisAction(entiteId: string, ligneId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const l = await getLigneDevis(supabase, ligneId);
    if (!l || l.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    await supprimerLigneDevis(supabase, ligneId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Cycle de vie
// ============================================================================

export async function changerStatutDevisAction(
  entiteId: string,
  devisId: string,
  vers: StatutDevisStocke,
  dateAcceptation?: string,
  signataire?: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const d = await devisDeLEntite(supabase, entiteId, devisId);
    if (!d) return { success: false, error: "Devis introuvable." };
    const lignes = await listerLignesDevis(supabase, devisId);
    const refus = controlerTransitionDevis(d, vers, lignes.length, aujourdHui(), dateAcceptation);
    if (refus) return { success: false, error: refus };
    const nomSignataire = (signataire ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
    await mettreAJourDevis(
      supabase,
      devisId,
      vers === "accepte"
        ? { statut: vers, date_acceptation: dateAcceptation as string, signataire_accord: nomSignataire || null }
        : { statut: vers, date_acceptation: null, signataire_accord: null },
    );
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/**
 * [09/11/2026] Devis accepté → nouveau BROUILLON de facture (lignes copiées).
 * Ordre : brouillon, lignes, puis lien facture_id sur le devis EN DERNIER.
 * Un échec en route supprime le brouillon (pas de facture à moitié copiée,
 * aucun numéro légal consommé : un brouillon n'en a pas). Aucun encaissement.
 */
export async function transformerEnFactureAction(entiteId: string, devisId: string): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const d = await devisDeLEntite(supabase, entiteId, devisId);
    if (!d) return { success: false, error: "Devis introuvable." };
    const prepare = factureDepuisDevis(d, await listerLignesDevis(supabase, devisId));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const f = await creerFacture(supabase, prepare.valeur.facture);
    try {
      await creerLignesFacture(supabase, prepare.valeur.lignes.map((l) => ({ ...l, facture_id: f.id })));
      await mettreAJourDevis(supabase, devisId, { facture_id: f.id });
    } catch (e) {
      await supprimerFacture(supabase, f.id);
      throw e;
    }
    id = f.id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}
