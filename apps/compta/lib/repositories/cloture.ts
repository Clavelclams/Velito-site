/**
 * REPOSITORY CLÔTURE D'EXERCICE — couche accès aux données (07/11/2026).
 *
 * Table cloture_exercice et colonnes de pointage de transaction (sql/10).
 * Mêmes principes que les autres repositories : client injecté, requêtes
 * paramétrées, aucun filtre de sécurité en dur (RLS + fonctions SQL).
 * Clôturer et rouvrir passent par les fonctions SQL cloturer_exercice et
 * rouvrir_exercice : la table n'a aucun droit d'écriture directe.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bornesExercice,
  type ChampsPointage,
  type ClotureExercice,
  type DonneesExercice,
  type Instantane,
  type LigneControlee,
} from "@/lib/services/cloture";
import { listerComptesTresorerie, listerSoldesObserves } from "@/lib/repositories/tresorerie";

/** PostgREST renvoie au plus 1 000 lignes par requête : on lit par pages. */
const PAGE = 1000;

/**
 * [07/11/2026] Toutes les lignes de l'entité datées au plus tard de `jusquAu`
 * (les soldes ont besoin de l'historique, la signature de TOUTES les lignes
 * de l'exercice). Lecture par pages : une liste tronquée à 1 000 donnerait une
 * fausse signature (la clôture serait refusée, jamais faussée).
 */
export async function listerLignesJusquAu(
  supabase: SupabaseClient,
  entiteId: string,
  jusquAu: string,
): Promise<LigneControlee[]> {
  const toutes: LigneControlee[] = [];
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await supabase
      .from("transaction")
      .select("*")
      .eq("entite_id", entiteId)
      .lte("date_transaction", jusquAu)
      .order("date_transaction", { ascending: true })
      .order("id", { ascending: true })
      .range(debut, debut + PAGE - 1);
    if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
    const page = (data ?? []) as LigneControlee[];
    toutes.push(...page);
    if (page.length < PAGE) return toutes;
  }
}

/** Une ligne avec ses colonnes de pointage et d'exception, ou null (RLS). */
export async function getLigneControlee(supabase: SupabaseClient, id: string): Promise<LigneControlee | null> {
  const { data, error } = await supabase.from("transaction").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la ligne impossible : ${error.message}`);
  return (data as LigneControlee | null) ?? null;
}

/**
 * Ids des lignes (parmi celles fournies) qui ont au moins une pièce. Par
 * paquets de 200 : une liste « in » de milliers d'ids dépasserait la longueur
 * maximale d'une URL.
 */
export async function idsAvecPiece(supabase: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const avec = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("justificatif")
      .select("transaction_id")
      .in("transaction_id", ids.slice(i, i + 200));
    if (error) throw new Error(`Vérification des justificatifs impossible : ${error.message}`);
    for (const r of data ?? []) avec.add((r as { transaction_id: string }).transaction_id);
  }
  return avec;
}

/**
 * Tout ce que la revue de clôture lit, en un appel : comptes, relevés, lignes
 * jusqu'au 31/12, pièces jointes des lignes de l'exercice. Utilisé par la page
 * (affichage) ET par l'action (confirmation) : les deux voient la même chose.
 */
export async function chargerDonneesExercice(
  supabase: SupabaseClient,
  entiteId: string,
  annee: number,
  aujourdHui: string,
): Promise<DonneesExercice> {
  const { fin } = bornesExercice(annee);
  const [comptes, observations, lignes] = await Promise.all([
    listerComptesTresorerie(supabase, entiteId),
    listerSoldesObserves(supabase, entiteId),
    listerLignesJusquAu(supabase, entiteId, fin),
  ]);
  const idsExercice = lignes.filter((t) => t.date_transaction.startsWith(`${annee}-`)).map((t) => t.id);
  return {
    entiteId,
    annee,
    aujourdHui,
    comptes,
    lignes,
    idsAvecPiece: await idsAvecPiece(supabase, idsExercice),
    observations,
  };
}

export async function listerClotures(supabase: SupabaseClient, entiteId: string): Promise<ClotureExercice[]> {
  const { data, error } = await supabase
    .from("cloture_exercice")
    .select("*")
    .eq("entite_id", entiteId)
    .order("exercice", { ascending: false })
    .order("cloture_le", { ascending: false });
  if (error) throw new Error(`Chargement des clôtures impossible : ${error.message}`);
  return (data ?? []) as ClotureExercice[];
}

export async function estExerciceCloture(supabase: SupabaseClient, entiteId: string, annee: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("exercice_cloture", { p_entite_id: entiteId, p_annee: annee });
  if (error) throw new Error(`Lecture de l'état de l'exercice impossible : ${error.message}`);
  return data === true;
}

/** Appelle cloturer_exercice (SQL), qui revérifie tout. Renvoie l'id de la clôture. */
export async function cloturerExercice(
  supabase: SupabaseClient,
  p: { entiteId: string; exercice: number; motif: string; signature: string; instantane: Instantane },
): Promise<string> {
  const { data, error } = await supabase.rpc("cloturer_exercice", {
    p_entite_id: p.entiteId,
    p_exercice: p.exercice,
    p_motif: p.motif,
    p_signature: p.signature,
    p_instantane: p.instantane,
  });
  // Le message de la base est déjà rédigé pour l'utilisateur : on le garde tel quel.
  if (error) throw new Error(error.message);
  return data as string;
}

export async function rouvrirExercice(
  supabase: SupabaseClient,
  entiteId: string,
  exercice: number,
  motif: string,
): Promise<void> {
  const { error } = await supabase.rpc("rouvrir_exercice", {
    p_entite_id: entiteId,
    p_exercice: exercice,
    p_motif: motif,
  });
  if (error) throw new Error(error.message);
}

/** Pointe une ou plusieurs lignes sur le même relevé. Renvoie le nombre de lignes pointées. */
export async function pointerLignes(supabase: SupabaseClient, ids: string[], champs: ChampsPointage): Promise<number> {
  if (ids.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("transaction")
      .update(champs)
      .in("id", ids.slice(i, i + 200))
      .select("id");
    if (error) throw new Error(`Pointage impossible : ${error.message}`);
    total += (data ?? []).length;
  }
  return total;
}

export async function depointerLigne(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("transaction").update({ pointe_le: null, pointe_ref: null }).eq("id", id);
  if (error) throw new Error(`Dépointage impossible : ${error.message}`);
}

/** Exception motivée (texte) ou retrait (null). */
export async function definirExceptionJustificatif(
  supabase: SupabaseClient,
  id: string,
  exception: string | null,
): Promise<void> {
  const { error } = await supabase.from("transaction").update({ exception_justificatif: exception }).eq("id", id);
  if (error) throw new Error(`Enregistrement de l'exception impossible : ${error.message}`);
}
