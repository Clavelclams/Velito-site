/**
 * Server actions — écran « À traiter » (07/11/2026).
 *
 * Le service (lib/services/traitement) décide, le repository écrit, la RLS
 * cloisonne. L'entité vient de l'URL ; on vérifie en plus que la ligne et la
 * catégorie appartiennent bien à cette entité avant d'écrire.
 */
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTransaction, mettreAJourTransaction } from "@/lib/repositories/transactions";
import { getCategorie } from "@/lib/repositories/categories";
import { getCompteTresorerie } from "@/lib/repositories/tresorerie";
import { supprimerEcrituresParTransaction } from "@/lib/repositories/ecritures";
import { synchroniserEcriture } from "@/lib/comptabilite-sync";
import { preparerClassement, preparerConversionVirement } from "@/lib/services/traitement";

interface ResultatAction {
  success: boolean;
  error?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/a-traiter`);
  revalidatePath(`/${entiteId}/transactions`);
  revalidatePath(`/${entiteId}/tresorerie`, "layout");
  revalidatePath(`/${entiteId}/comptabilite`);
  revalidatePath(`/${entiteId}`);
}

export async function classerAction(
  entiteId: string,
  transactionId: string,
  categorieId: string | null,
  geste: "classer" | "valider",
  commentaire?: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const tx = await getTransaction(supabase, transactionId);
    if (!tx || tx.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };

    let categorie = null;
    if (categorieId) {
      categorie = await getCategorie(supabase, categorieId);
      if (!categorie || categorie.entite_id !== entiteId) return { success: false, error: "Catégorie introuvable." };
    }

    const prepare = preparerClassement(tx, categorie, geste, commentaire);
    if (!prepare.ok) return { success: false, error: prepare.erreur };

    const maj = await mettreAJourTransaction(supabase, tx.id, prepare.valeur);
    // La catégorie choisit le compte de charge ou de produit : écriture régénérée.
    try {
      await synchroniserEcriture(supabase, maj);
    } catch {
      // best-effort : la ligne est classée même si l'écriture échoue.
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function convertirEnVirementAction(
  entiteId: string,
  transactionId: string,
  autreCompteId: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const tx = await getTransaction(supabase, transactionId);
    if (!tx || tx.entite_id !== entiteId) return { success: false, error: "Ligne introuvable." };
    const autre = await getCompteTresorerie(supabase, autreCompteId);
    if (!autre || autre.entite_id !== entiteId) return { success: false, error: "Compte introuvable." };

    const prepare = preparerConversionVirement(tx, autreCompteId, randomUUID());
    if (!prepare.ok) return { success: false, error: prepare.erreur };

    // 1. La ligne existante devient la première jambe (elle garde sa clé d'import).
    const avant = {
      categorie_id: tx.categorie_id,
      statut: tx.statut,
      virement_id: null,
      montant_tva_centimes: tx.montant_tva_centimes,
      commentaire: tx.commentaire,
    };
    await mettreAJourTransaction(supabase, tx.id, prepare.valeur.majOriginale);

    // 2. Création de la jambe opposée. Si elle échoue, on remet la ligne
    //    comme avant : jamais une jambe de virement seule.
    const { error } = await supabase.from("transaction").insert(prepare.valeur.contrepartie);
    if (error) {
      await mettreAJourTransaction(supabase, tx.id, avant);
      return { success: false, error: `Virement impossible : ${error.message}` };
    }

    // 3. Un virement n'est ni charge ni produit : l'ancienne écriture disparaît.
    try {
      await supprimerEcrituresParTransaction(supabase, tx.id);
    } catch {
      // best-effort
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}
