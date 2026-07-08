/**
 * REPOSITORY ÉCRITURES — accès aux tables `ecriture` et `ligne_ecriture`.
 *
 * Point délicat (à défendre au jury) : le trigger d'équilibre SQL est DIFFÉRÉ,
 * donc vérifié à la fin de la transaction Postgres. Or supabase-js envoie une
 * requête = une transaction. Pour que les lignes soient contrôlées ENSEMBLE
 * (et non ligne par ligne), on les insère en UN SEUL appel `.insert([...])` :
 * toutes les lignes arrivent dans la même transaction → l'équilibre est vrai
 * au moment du contrôle. Les lignes sont d'ailleurs déjà validées en amont par
 * le service (validerEcriture), donc le trigger ne fait que confirmer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ecriture, LigneEcriture } from "@/types/database";
import type { LigneSaisie } from "@/lib/services/comptabilite";

/** En-tête à créer (id/cree_le générés par la base). */
export interface NouvelleEcriture {
  entite_id: string;
  transaction_id?: string | null;
  journal: string;
  date_ecriture: string;
  libelle: string;
  piece?: string | null;
}

/**
 * Crée une écriture ET ses lignes. Les lignes partent en un seul insert pour
 * que le trigger d'équilibre les voie toutes ensemble. En cas d'échec des
 * lignes, on supprime l'en-tête pour ne pas laisser d'écriture orpheline.
 * Renvoie l'id de l'écriture créée.
 */
export async function creerEcritureAvecLignes(
  supabase: SupabaseClient,
  enTete: NouvelleEcriture,
  lignes: LigneSaisie[],
): Promise<string> {
  const { data: ecriture, error } = await supabase
    .from("ecriture")
    .insert(enTete)
    .select("id")
    .single();

  if (error) throw new Error(`Création de l'écriture impossible : ${error.message}`);
  const ecritureId = (ecriture as { id: string }).id;

  const payload = lignes.map((l) => ({
    ecriture_id: ecritureId,
    entite_id: enTete.entite_id,
    compte_id: l.compteId,
    debit_centimes: l.debitCentimes,
    credit_centimes: l.creditCentimes,
  }));

  const { error: erreurLignes } = await supabase.from("ligne_ecriture").insert(payload);
  if (erreurLignes) {
    // Rollback applicatif : pas de lignes → on retire l'en-tête.
    await supabase.from("ecriture").delete().eq("id", ecritureId);
    throw new Error(`Enregistrement des lignes impossible : ${erreurLignes.message}`);
  }

  return ecritureId;
}

export async function supprimerEcrituresParTransaction(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<void> {
  // Les lignes partent en cascade (ON DELETE CASCADE, sql/04). Sert à
  // régénérer une écriture après modification de la transaction source.
  const { error } = await supabase
    .from("ecriture")
    .delete()
    .eq("transaction_id", transactionId);
  if (error) {
    throw new Error(`Suppression des écritures liées impossible : ${error.message}`);
  }
}

export async function listerEcritures(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<Ecriture[]> {
  const { data, error } = await supabase
    .from("ecriture")
    .select("*")
    .eq("entite_id", entiteId)
    .order("date_ecriture", { ascending: false });

  if (error) throw new Error(`Chargement des écritures impossible : ${error.message}`);
  return (data ?? []) as Ecriture[];
}

export async function listerLignesParEcriture(
  supabase: SupabaseClient,
  ecritureId: string,
): Promise<LigneEcriture[]> {
  const { data, error } = await supabase
    .from("ligne_ecriture")
    .select("*")
    .eq("ecriture_id", ecritureId);

  if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
  return (data ?? []) as LigneEcriture[];
}

/** Toutes les lignes d'écriture d'une entité (base des états : FEC, balance). */
export async function listerToutesLignes(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<LigneEcriture[]> {
  const { data, error } = await supabase
    .from("ligne_ecriture")
    .select("*")
    .eq("entite_id", entiteId);

  if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
  return (data ?? []) as LigneEcriture[];
}
