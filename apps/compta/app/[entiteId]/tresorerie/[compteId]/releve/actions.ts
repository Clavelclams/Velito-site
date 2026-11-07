/**
 * Server actions — import d'un relevé PDF Crédit Mutuel (07/11/2026).
 *
 * Deux temps, le PDF est relu à CHAQUE fois côté serveur :
 *  1. analyser : lit le PDF, vérifie ouverture + mouvements = clôture, et
 *     renvoie un aperçu (rien n'est écrit) avec les lignes déjà en base ;
 *  2. importer : relit le même PDF, refuse s'il ne tombe pas juste, puis
 *     écrit les opérations (statut « à classer » ou « à valider »), les deux
 *     soldes lus (ouverture, clôture) et, si le compte n'en a pas encore, le
 *     solde initial.
 *
 * Pourquoi relire au lieu de renvoyer l'aperçu : le navigateur n'est pas de
 * confiance. Le serveur reste l'autorité, comme pour l'import CSV.
 * Le PDF n'est jamais stocké : lu en mémoire, puis oublié.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lignesDuPdf } from "@/lib/pdf/lignes-pdf";
import { lireReleveCm, preparerImportReleve, type LigneAImporter, type ReleveCm } from "@/lib/services/releve-cm";
import { clesSourceExistantes, creerTransactionsEnLot, listerTransactions } from "@/lib/repositories/transactions";
import { listerCategories } from "@/lib/repositories/categories";
import {
  definirSoldeInitial,
  enregistrerSoldeObserve,
  getCompteTresorerie,
  listerSoldesObserves,
} from "@/lib/repositories/tresorerie";
import { genererEcrituresLot } from "@/lib/comptabilite-sync";

/** Un relevé mensuel fait quelques dizaines de Ko : 2 Mo laisse de la marge. */
const TAILLE_MAX = 2 * 1024 * 1024;

export interface LigneApercu {
  date: string;
  dateImprimee: string;
  libelle: string;
  type: "recette" | "depense";
  montantCentimes: number;
  categorie: string | null;
  dejaPresente: boolean;
}

export interface ApercuReleve {
  nomFichier: string;
  ouverture: ReleveCm["ouverture"];
  cloture: ReleveCm["cloture"];
  totalDebitsCentimes: number;
  totalCreditsCentimes: number;
  ecartCentimes: number;
  lignes: LigneApercu[];
  nouvelles: number;
  dejaPresentes: number;
}

type Lecture =
  | { ok: true; releve: ReleveCm; lignes: LigneAImporter[]; nomFichier: string }
  | { ok: false; erreur: string };

async function lireFichier(entiteId: string, compteId: string, formData: FormData): Promise<Lecture> {
  const fichier = formData.get("releve");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, erreur: "Choisis un fichier PDF." };
  if (fichier.size > TAILLE_MAX) return { ok: false, erreur: "Fichier trop lourd (2 Mo au plus)." };

  const octets = new Uint8Array(await fichier.arrayBuffer());
  // Signature d'un PDF : « %PDF » au début. On ne se fie ni au nom ni au type annoncé.
  if (String.fromCharCode(...octets.slice(0, 4)) !== "%PDF") {
    return { ok: false, erreur: "Ce fichier n'est pas un PDF." };
  }

  let lecture;
  try {
    lecture = lireReleveCm(await lignesDuPdf(octets));
  } catch {
    return { ok: false, erreur: "PDF illisible (protégé par mot de passe ou endommagé ?)." };
  }
  if (!lecture.ok) return { ok: false, erreur: lecture.erreur };

  const nomFichier = fichier.name.slice(0, 255);
  return {
    ok: true,
    releve: lecture.releve,
    lignes: preparerImportReleve(lecture.releve, { entiteId, compteId, nomFichier }),
    nomFichier,
  };
}

export async function analyserReleveAction(
  entiteId: string,
  compteId: string,
  formData: FormData,
): Promise<{ success: boolean; apercu?: ApercuReleve; error?: string }> {
  const lu = await lireFichier(entiteId, compteId, formData);
  if (!lu.ok) return { success: false, error: lu.erreur };

  try {
    const supabase = await createClient();
    const compte = await getCompteTresorerie(supabase, compteId);
    if (!compte || compte.entite_id !== entiteId) return { success: false, error: "Compte introuvable." };

    const existantes = await clesSourceExistantes(
      supabase,
      entiteId,
      lu.lignes.map((l) => l.transaction.source_cle!),
    );
    const lignes: LigneApercu[] = lu.lignes.map((l, i) => ({
      date: l.transaction.date_transaction,
      dateImprimee: lu.releve.operations[i]!.date,
      libelle: l.transaction.libelle,
      type: l.transaction.type,
      montantCentimes: l.transaction.montant_ttc_centimes,
      categorie: l.categorie,
      dejaPresente: existantes.has(l.transaction.source_cle!),
    }));
    const dejaPresentes = lignes.filter((l) => l.dejaPresente).length;

    return {
      success: true,
      apercu: {
        nomFichier: lu.nomFichier,
        ouverture: lu.releve.ouverture,
        cloture: lu.releve.cloture,
        totalDebitsCentimes: lu.releve.totalDebitsCentimes,
        totalCreditsCentimes: lu.releve.totalCreditsCentimes,
        ecartCentimes: lu.releve.ecartCentimes,
        lignes,
        nouvelles: lignes.length - dejaPresentes,
        dejaPresentes,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function importerReleveAction(
  entiteId: string,
  compteId: string,
  formData: FormData,
): Promise<{ success: boolean; inserees?: number; dejaPresentes?: number; soldeInitialDefini?: boolean; error?: string }> {
  const lu = await lireFichier(entiteId, compteId, formData);
  if (!lu.ok) return { success: false, error: lu.erreur };
  if (lu.releve.ecartCentimes !== 0) {
    return { success: false, error: "Le relevé ne tombe pas juste : import refusé, rien n'a été écrit." };
  }

  try {
    const supabase = await createClient();
    const compte = await getCompteTresorerie(supabase, compteId);
    // Compte inconnu, pas à moi (RLS) ou d'une autre entité : refus neutre.
    if (!compte || compte.entite_id !== entiteId) return { success: false, error: "Compte introuvable." };

    // Catégorie certaine → id, seulement si l'entité a une catégorie de ce nom et de ce type.
    const categories = await listerCategories(supabase, entiteId);
    const aInserer = lu.lignes.map((l) => {
      const cat = l.categorie
        ? categories.find((c) => c.nom === l.categorie && c.type === l.transaction.type)
        : undefined;
      return { ...l.transaction, categorie_id: cat?.id ?? null };
    });

    // [07/11/2026] sql/10 : les soldes lus s'écrivent EN PREMIER. Si l'exercice
    // est clôturé, la base refuse ici, avant toute ligne insérée (pas d'import
    // à moitié fait). Un solde déjà enregistré à l'identique n'est pas
    // réécrit : le solde d'ouverture d'un relevé de janvier tombe le 31/12 de
    // l'exercice précédent, qui peut être clôturé.
    const dejaLus = (await listerSoldesObserves(supabase, entiteId)).filter((o) => o.compte_id === compteId);
    for (const s of [lu.releve.ouverture, lu.releve.cloture]) {
      if (dejaLus.some((o) => o.date_releve === s.date && o.solde_centimes === s.soldeCentimes)) continue;
      await enregistrerSoldeObserve(supabase, {
        entite_id: entiteId,
        compte_id: compteId,
        date_releve: s.date,
        solde_centimes: s.soldeCentimes,
        reference: `Relevé Crédit Mutuel (${lu.nomFichier})`.slice(0, 120),
      });
    }

    // Solde initial : seulement s'il est inconnu ET qu'aucune opération du
    // compte n'est antérieure à l'ouverture du relevé (sinon il serait faux).
    let soldeInitialDefini = false;
    if (compte.solde_initial_centimes === null) {
      const anterieures = (await listerTransactions(supabase, entiteId)).some(
        (t) => t.compte_tresorerie_id === compteId && t.date_transaction < lu.releve.ouverture.date,
      );
      if (!anterieures) {
        await definirSoldeInitial(supabase, compteId, lu.releve.ouverture.soldeCentimes, lu.releve.ouverture.date);
        soldeInitialDefini = true;
      }
    }

    // Les lignes arrivent pointées sur ce relevé (preparerImportReleve).
    const inserees = await creerTransactionsEnLot(supabase, aInserer);

    try {
      await genererEcrituresLot(supabase, inserees);
    } catch {
      // best-effort : l'import réussit même si des écritures échouent.
    }

    revalidatePath(`/${entiteId}/tresorerie`, "layout");
    revalidatePath(`/${entiteId}/transactions`);
    revalidatePath(`/${entiteId}/comptabilite`);
    return {
      success: true,
      inserees: inserees.length,
      dejaPresentes: aInserer.length - inserees.length,
      soldeInitialDefini,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
