/**
 * SYNCHRONISATION COMPTABLE — module serveur (PAS une "use server").
 *
 * Regroupe la logique de (re)génération des écritures à partir des
 * transactions, partagée par les server actions de saisie et d'import. On
 * l'isole ici précisément parce que ses fonctions prennent un SupabaseClient
 * en paramètre : ce ne sont pas des server actions (dont les arguments doivent
 * être sérialisables), mais des helpers serveur appelés directement.
 *
 * Toujours best-effort côté appelant : si le plan comptable n'est pas
 * initialisé, on ne génère rien et la transaction reste valide en partie simple.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "@/types/database";
import { listerComptes } from "@/lib/repositories/comptes";
import { getCategorie } from "@/lib/repositories/categories";
import {
  creerEcritureAvecLignes,
  supprimerEcrituresParTransaction,
} from "@/lib/repositories/ecritures";
import { construireEcritureDepuisTransaction } from "@/lib/services/pont-partie-double";

/** Correspondance numéro de compte → id, pour une entité. */
export async function chargerMapComptes(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<Map<string, string>> {
  const comptes = await listerComptes(supabase, entiteId, false);
  return new Map(comptes.map((c) => [c.numero, c.id]));
}

/**
 * (Re)synchronise l'écriture d'une transaction : supprime l'ancienne puis en
 * génère une fraîche. Idempotent (création comme modification).
 */
export async function synchroniserEcriture(
  supabase: SupabaseClient,
  tx: Transaction,
  map?: Map<string, string>,
): Promise<void> {
  const m = map ?? (await chargerMapComptes(supabase, tx.entite_id));

  await supprimerEcrituresParTransaction(supabase, tx.id);

  let contrepartie: string | null = null;
  if (tx.categorie_id) {
    const cat = await getCategorie(supabase, tx.categorie_id);
    contrepartie = cat?.compte_id ?? null;
  }

  const res = construireEcritureDepuisTransaction(tx, m, contrepartie);
  if (!res.ok) return;

  await creerEcritureAvecLignes(
    supabase,
    {
      entite_id: tx.entite_id,
      transaction_id: tx.id,
      journal: res.valeur.journal,
      date_ecriture: tx.date_transaction,
      libelle: tx.libelle,
      piece: null,
    },
    res.valeur.lignes,
  );
}

/** Génère les écritures d'un lot importé (map de comptes chargée une fois). */
export async function genererEcrituresLot(
  supabase: SupabaseClient,
  transactions: Transaction[],
): Promise<void> {
  if (transactions.length === 0) return;
  const map = await chargerMapComptes(supabase, transactions[0]!.entite_id);
  for (const tx of transactions) {
    try {
      await synchroniserEcriture(supabase, tx, map);
    } catch {
      // best-effort par ligne : une écriture ratée n'annule pas l'import.
    }
  }
}
