/**
 * Server action de l'import CSV.
 *
 * Le client a déjà parsé/prévisualisé, MAIS on ne lui fait pas confiance : on
 * repasse chaque ligne par le service de validation côté serveur, et on FORCE
 * l'entité à celle de l'URL (jamais celle envoyée par le client). Défense en
 * profondeur — le client accélère la saisie, le serveur reste l'autorité.
 *
 * [07/11/2026] Lot 6 : compte réel des lignes, provenance (fichier + n° de
 * ligne) et clé anti-doublon CALCULÉE ICI (attribuerClesSource) : réimporter
 * le même relevé n'ajoute que ce qui manque.
 */
"use server";

import { revalidatePath } from "next/cache";
import { creerTransactionsEnLot } from "@/lib/repositories/transactions";
import {
  preparerNouvelleTransaction,
  type SaisieTransaction,
} from "@/lib/services/transactions";
import { attribuerClesSource } from "@/lib/services/import-csv";
import { createClient } from "@/lib/supabase/server";
import { genererEcrituresLot } from "@/lib/comptabilite-sync";
import type { NouvelleTransaction } from "@/types/database";

interface ResultatImport {
  success: boolean;
  inserees?: number;
  /** Lignes invalides (date, montant…) refusées par le service. */
  ignorees?: number;
  /** Lignes déjà présentes (même clé source) : non réimportées. */
  dejaPresentes?: number;
  error?: string;
}

export async function importerTransactionsAction(
  entiteId: string,
  saisies: (SaisieTransaction & { numeroLigne?: number })[],
  options: { compteId?: string | null; nomFichier?: string } = {},
): Promise<ResultatImport> {
  const valides: NouvelleTransaction[] = [];
  const numeros: (number | undefined)[] = [];
  let ignorees = 0;

  for (const s of saisies) {
    // entiteId forcé depuis le contexte serveur, pas depuis la charge client.
    // Statut forcé à vide : c'est le repository qui décide (à classer / à valider).
    const prepare = preparerNouvelleTransaction({
      ...s,
      entiteId,
      statut: "",
      compteId: options.compteId || null,
    });
    if (prepare.ok) {
      valides.push(prepare.valeur);
      numeros.push(s.numeroLigne);
    } else {
      ignorees++;
    }
  }

  const cles = attribuerClesSource(valides);
  const nomFichier = (options.nomFichier ?? "").trim().slice(0, 255) || "import CSV";
  const avecProvenance = valides.map((t, i) => ({
    ...t,
    source_fichier: nomFichier,
    source_ref: numeros[i] !== undefined ? `ligne ${numeros[i]}` : null,
    source_cle: cles[i]!,
  }));

  try {
    const supabase = await createClient();
    const lignes = await creerTransactionsEnLot(supabase, avecProvenance);
    // Génère les écritures comptables du lot (best-effort).
    try {
      await genererEcrituresLot(supabase, lignes);
    } catch {
      // best-effort : l'import réussit même si des écritures échouent.
    }
    revalidatePath(`/${entiteId}/transactions`);
    revalidatePath(`/${entiteId}/tresorerie`);
    revalidatePath(`/${entiteId}/comptabilite`);
    return {
      success: true,
      inserees: lignes.length,
      ignorees,
      dejaPresentes: avecProvenance.length - lignes.length,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
