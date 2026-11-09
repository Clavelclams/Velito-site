/**
 * Server actions : factures et avoirs (09/11/2026).
 *
 * Le service (lib/services/facturation) décide, le repository écrit, la RLS
 * cloisonne, les triggers de sql/13 gardent la numérotation à l'émission, le
 * verrou d'une facture émise, les plafonds d'encaissement et la clôture.
 * Aucune action ne crée de recette : une facture n'en est jamais une.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import { listerCategories } from "@/lib/repositories/categories";
import { getTransaction, mettreAJourTransaction } from "@/lib/repositories/transactions";
import { synchroniserEcriture } from "@/lib/comptabilite-sync";
import {
  creerFacture,
  creerLignesFacture,
  emettreFacture,
  getClient,
  getFacture,
  getLigneFacture,
  getPaiement,
  getParametres,
  listerClients,
  listerFactures,
  listerLignesFacture,
  listerPaiementsEntite,
  mettreAJourFacture,
  rattacherEncaissement,
  retirerEncaissement,
  supprimerFacture,
  supprimerLigneFacture,
} from "@/lib/repositories/facturation";
import {
  avoirsParFacture,
  categorieVentes,
  controlerEmission,
  derniereDateEmise,
  factureModifiable,
  preparerAvoirTotal,
  preparerCorrection,
  preparerEncaissement,
  preparerFacture,
  preparerLigne,
  prochainePosition,
  type SaisieFacture,
  type SaisieLigne,
} from "@/lib/services/facturation";
import { preparerClassement } from "@/lib/services/traitement";
import type { Facture, NouvelleLigneDocument } from "@/types/facturation";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/factures`, "layout");
  revalidatePath(`/${entiteId}/devis`, "layout");
  revalidatePath(`/${entiteId}/transactions`);
  revalidatePath(`/${entiteId}/a-traiter`);
  revalidatePath(`/${entiteId}`);
}

const aujourdHui = () => new Date().toISOString().slice(0, 10);

type Client = Awaited<ReturnType<typeof createClient>>;

/** Facture de CETTE structure, sinon null (un id d'une autre structure ne révèle rien). */
async function factureDeLEntite(supabase: Client, entiteId: string, factureId: string) {
  const f = await getFacture(supabase, factureId);
  return f && f.entite_id === entiteId ? f : null;
}

/** Brouillons d'avoir en cours et TTC des avoirs émis pour une facture. */
async function etatAvoirs(supabase: Client, entiteId: string, f: Facture) {
  const toutes = await listerFactures(supabase, entiteId);
  return {
    brouillonEnCours: toutes.some((x) => x.sens === "avoir" && x.statut === "brouillon" && x.facture_origine_id === f.id),
    dejaAvoirCentimes: avoirsParFacture(toutes).get(f.id) ?? 0,
  };
}

// ============================================================================
// Brouillon : création, en-tête, suppression
// ============================================================================

export async function creerFactureAction(entiteId: string, saisie: SaisieFacture): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const prepare = preparerFacture(entiteId, saisie, await listerClients(supabase, entiteId));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    id = (await creerFacture(supabase, prepare.valeur)).id;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

export async function modifierFactureAction(entiteId: string, factureId: string, saisie: SaisieFacture): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Document introuvable." };
    if (!factureModifiable(f)) return { success: false, error: "Document émis : il ne se modifie plus. Prépare un avoir." };
    const prepare = preparerFacture(entiteId, saisie, await listerClients(supabase, entiteId), {
      sens: f.sens,
      facture_origine_id: f.facture_origine_id,
      correction_de: f.correction_de,
    });
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const { entite_id: _e, sens: _s, ...champs } = prepare.valeur;
    await mettreAJourFacture(supabase, factureId, champs);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerFactureAction(entiteId: string, factureId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Document introuvable." };
    if (!factureModifiable(f)) return { success: false, error: "Un document émis ne se supprime pas : émets un avoir." };
    await supprimerFacture(supabase, factureId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  redirect(`/${entiteId}/factures`);
}

// ============================================================================
// Lignes
// ============================================================================

export async function ajouterLigneFactureAction(entiteId: string, factureId: string, saisie: SaisieLigne): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Document introuvable." };
    if (!factureModifiable(f)) return { success: false, error: "Document émis : ses lignes ne se modifient plus." };
    const [lignes, param] = await Promise.all([listerLignesFacture(supabase, factureId), getParametres(supabase, entiteId)]);
    const prepare = preparerLigne(entiteId, saisie, param?.regime_tva ?? null, prochainePosition(lignes));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await creerLignesFacture(supabase, [{ ...prepare.valeur, facture_id: factureId }]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerLigneFactureAction(entiteId: string, ligneId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const l = await getLigneFacture(supabase, ligneId);
    if (!l || l.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    await supprimerLigneFacture(supabase, ligneId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

// ============================================================================
// Émission : numéro légal attribué par la base
// ============================================================================

/**
 * [09/11/2026] Double barrière : le service refuse tant qu'une mention
 * obligatoire manque (la base ne connaît pas toutes ces règles) ; la base
 * attribue le numéro, contrôle la chronologie et le plafond des avoirs,
 * fige totaux et instantanés, le tout dans une seule transaction.
 */
export async function emettreFactureAction(entiteId: string, factureId: string): Promise<ResultatAction & { numero?: string }> {
  let numero: string;
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Document introuvable." };
    const [lignes, param, client, entite, toutes] = await Promise.all([
      listerLignesFacture(supabase, factureId),
      getParametres(supabase, entiteId),
      getClient(supabase, f.client_id),
      getEntite(supabase, entiteId),
      listerFactures(supabase, entiteId),
    ]);
    if (!entite) return { success: false, error: "Structure introuvable." };
    const refus = controlerEmission(f, lignes, param, client, entite.type_juridique, aujourdHui(), derniereDateEmise(toutes, f.sens));
    if (refus.length > 0) return { success: false, error: refus.join(" ") };
    numero = (await emettreFacture(supabase, factureId)).numero as string;
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, numero };
}

// ============================================================================
// Avoir et correction
// ============================================================================

/** Écrit un brouillon et ses lignes ; en cas d'échec sur les lignes, le brouillon est retiré. */
async function creerBrouillonAvecLignes(
  supabase: Client,
  f: Parameters<typeof creerFacture>[1],
  lignes: NouvelleLigneDocument[],
): Promise<string> {
  const cree = await creerFacture(supabase, f);
  try {
    await creerLignesFacture(supabase, lignes.map((l) => ({ ...l, facture_id: cree.id })));
  } catch (e) {
    await supprimerFacture(supabase, cree.id);
    throw e;
  }
  return cree.id;
}

/** Brouillon d'avoir copié de la facture (à ajuster pour un avoir partiel), puis à émettre. */
export async function preparerAvoirAction(entiteId: string, factureId: string): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Facture introuvable." };
    const prepare = preparerAvoirTotal(f, await listerLignesFacture(supabase, factureId), await etatAvoirs(supabase, entiteId, f));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    id = await creerBrouillonAvecLignes(supabase, prepare.valeur.avoir, prepare.valeur.lignes);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

/**
 * [09/11/2026] « Préparer une correction » : avoir total ET nouveau brouillon
 * copié. Les deux restent des brouillons : l'utilisateur émet l'avoir, puis
 * corrige et émet la nouvelle facture. Si le second échoue, le premier est
 * retiré (aucun numéro n'a été consommé, ce sont des brouillons).
 */
export async function preparerCorrectionAction(entiteId: string, factureId: string): Promise<ResultatAction & { id?: string }> {
  let id: string;
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Facture introuvable." };
    const prepare = preparerCorrection(f, await listerLignesFacture(supabase, factureId), await etatAvoirs(supabase, entiteId, f));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    const avoirId = await creerBrouillonAvecLignes(supabase, prepare.valeur.avoir, prepare.valeur.lignes);
    try {
      id = await creerBrouillonAvecLignes(supabase, prepare.valeur.brouillon, prepare.valeur.lignes);
    } catch (e) {
      await supprimerFacture(supabase, avoirId);
      throw e;
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, id };
}

// ============================================================================
// Encaissements : rattacher une recette RÉELLE
// ============================================================================

/**
 * [09/11/2026] Rattache une recette déjà en compta (relevé ou saisie). Rien
 * n'est créé en trésorerie. Option : si l'opération n'a pas encore de
 * catégorie, lui proposer « Ventes et prestations » (jamais imposé, et une
 * opération déjà classée garde sa catégorie).
 */
export async function rattacherEncaissementAction(
  entiteId: string,
  factureId: string,
  transactionId: string,
  montant: string,
  classerVentes: boolean,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const f = await factureDeLEntite(supabase, entiteId, factureId);
    if (!f) return { success: false, error: "Facture introuvable." };
    const tx = await getTransaction(supabase, transactionId);
    if (!tx || tx.entite_id !== entiteId) return { success: false, error: "Opération introuvable." };
    const paiements = await listerPaiementsEntite(supabase, entiteId);
    const somme = (cle: "facture_id" | "transaction_id", id: string) =>
      paiements.filter((p) => p[cle] === id).reduce((s, p) => s + Number(p.montant_centimes), 0);
    const prepare = preparerEncaissement(f, tx, montant, somme("facture_id", f.id), somme("transaction_id", tx.id));
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await rattacherEncaissement(supabase, prepare.valeur);

    if (classerVentes && !tx.categorie_id) {
      const ventes = categorieVentes(await listerCategories(supabase, entiteId));
      if (ventes) {
        const classement = preparerClassement(tx, { id: ventes, type: "recette" }, "classer");
        if (classement.ok) {
          const maj = await mettreAJourTransaction(supabase, tx.id, classement.valeur);
          try {
            await synchroniserEcriture(supabase, maj);
          } catch {
            // best-effort, comme le reste de l'app : l'opération reste valide en partie simple
          }
        }
      }
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/** Retire un rattachement : l'opération reste en compta, seule la liaison disparaît. */
export async function retirerEncaissementAction(entiteId: string, paiementId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const p = await getPaiement(supabase, paiementId);
    if (!p || p.entite_id !== entiteId) return { success: false, error: "Encaissement introuvable." };
    await retirerEncaissement(supabase, paiementId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}
