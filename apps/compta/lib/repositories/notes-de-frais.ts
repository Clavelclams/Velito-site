/**
 * REPOSITORY NOTES DE FRAIS ET IK (07/11/2026) — accès aux données.
 *
 * Tables note_frais, note_frais_ligne, trajet_ik (sql/12), plus les requêtes
 * sur transaction, compte_tresorerie et contribution_nature dont le module a
 * besoin (gardées ici pour ne pas toucher aux repositories existants).
 * Client injecté, requêtes paramétrées ; la RLS cloisonne par structure, les
 * triggers de sql/12 gardent le cycle de vie et la clôture ; le service a
 * déjà validé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompteTresorerie, NouvelleContribution, NouvelleTransaction, Transaction } from "@/types/database";
import type {
  LigneNoteFrais,
  NoteFrais,
  NouveauTrajetIk,
  NouvelleLigneNoteFrais,
  NouvelleNoteFrais,
  TrajetIk,
} from "@/types/notes-de-frais";
import { NOM_COMPTE_AVANCES } from "@/lib/services/notes-de-frais";

const PAGE = 1000;

/**
 * [07/11/2026] L'API Supabase plafonne chaque réponse à 1 000 lignes : on lit
 * par pages, avec un ordre stable (id en dernier), comme listerTransactions.
 */
async function toutesLesPages<T>(
  lire: (debut: number, fin: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  contexte: string,
): Promise<T[]> {
  const toutes: T[] = [];
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await lire(debut, debut + PAGE - 1);
    if (error) throw new Error(`${contexte} : ${error.message}`);
    toutes.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return toutes;
}

// ============================================================================
// Notes
// ============================================================================

export async function listerNotes(supabase: SupabaseClient, entiteId: string): Promise<NoteFrais[]> {
  return toutesLesPages<NoteFrais>(
    (d, f) =>
      supabase
        .from("note_frais")
        .select("*")
        .eq("entite_id", entiteId)
        .order("date_note", { ascending: false })
        .order("numero", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des notes de frais impossible",
  );
}

export async function getNote(supabase: SupabaseClient, id: string): Promise<NoteFrais | null> {
  const { data, error } = await supabase.from("note_frais").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la note impossible : ${error.message}`);
  return (data as NoteFrais | null) ?? null;
}

/** Le numéro n'est PAS envoyé : le trigger note_frais_numerotation l'attribue. */
export async function creerNote(supabase: SupabaseClient, n: NouvelleNoteFrais): Promise<NoteFrais> {
  const { data, error } = await supabase.from("note_frais").insert(n).select().single();
  if (error) throw new Error(`Création de la note impossible : ${error.message}`);
  return data as NoteFrais;
}

/** Mise à jour partielle (en-tête, statut, règlement). Les triggers refusent ce qui est interdit. */
export async function mettreAJourNote(
  supabase: SupabaseClient,
  id: string,
  champs: Partial<Omit<NoteFrais, "id" | "entite_id" | "numero" | "annee_numero" | "rang" | "cree_le" | "modifie_le">>,
): Promise<NoteFrais> {
  const { data, error } = await supabase.from("note_frais").update(champs).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as NoteFrais;
}

export async function supprimerNote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("note_frais").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Lignes
// ============================================================================

/** Toutes les lignes de la structure (totaux de la liste, opérations déjà prises). */
export async function listerLignesEntite(supabase: SupabaseClient, entiteId: string): Promise<LigneNoteFrais[]> {
  return toutesLesPages<LigneNoteFrais>(
    (d, f) => supabase.from("note_frais_ligne").select("*").eq("entite_id", entiteId).order("id").range(d, f),
    "Chargement des lignes impossible",
  );
}

export async function listerLignesNote(supabase: SupabaseClient, noteId: string): Promise<LigneNoteFrais[]> {
  const { data, error } = await supabase
    .from("note_frais_ligne")
    .select("*")
    .eq("note_id", noteId)
    .order("date_depense")
    .order("cree_le")
    .order("id");
  if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
  return (data ?? []) as LigneNoteFrais[];
}

export async function getLigne(supabase: SupabaseClient, id: string): Promise<LigneNoteFrais | null> {
  const { data, error } = await supabase.from("note_frais_ligne").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la ligne impossible : ${error.message}`);
  return (data as LigneNoteFrais | null) ?? null;
}

export async function creerLignes(supabase: SupabaseClient, lignes: NouvelleLigneNoteFrais[]): Promise<void> {
  if (lignes.length === 0) return;
  const { error } = await supabase.from("note_frais_ligne").insert(lignes);
  if (error) throw new Error(error.message);
}

export async function mettreAJourLigne(
  supabase: SupabaseClient,
  id: string,
  champs: Partial<Pick<LigneNoteFrais, "categorie_id" | "transaction_id" | "libelle" | "date_depense" | "montant_ttc_centimes">>,
): Promise<void> {
  const { error } = await supabase.from("note_frais_ligne").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function supprimerLigne(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("note_frais_ligne").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Trajets IK
// ============================================================================

export async function listerTrajets(supabase: SupabaseClient, entiteId: string): Promise<TrajetIk[]> {
  return toutesLesPages<TrajetIk>(
    (d, f) =>
      supabase
        .from("trajet_ik")
        .select("*")
        .eq("entite_id", entiteId)
        .order("date_trajet", { ascending: false })
        .order("cree_le", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des trajets impossible",
  );
}

export async function getTrajet(supabase: SupabaseClient, id: string): Promise<TrajetIk | null> {
  const { data, error } = await supabase.from("trajet_ik").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement du trajet impossible : ${error.message}`);
  return (data as TrajetIk | null) ?? null;
}

export async function creerTrajet(supabase: SupabaseClient, t: NouveauTrajetIk): Promise<TrajetIk> {
  const { data, error } = await supabase.from("trajet_ik").insert(t).select().single();
  if (error) throw new Error(`Enregistrement du trajet impossible : ${error.message}`);
  return data as TrajetIk;
}

/** La ligne IK d'une note en cours suit automatiquement (trigger synchroniser_ligne_ik). */
export async function modifierTrajet(supabase: SupabaseClient, id: string, t: Omit<NouveauTrajetIk, "entite_id">): Promise<void> {
  const { error } = await supabase.from("trajet_ik").update(t).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function supprimerTrajet(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("trajet_ik").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Compte « Avances des membres »
// ============================================================================

export async function trouverCompteAvances(supabase: SupabaseClient, entiteId: string): Promise<CompteTresorerie | null> {
  const { data, error } = await supabase
    .from("compte_tresorerie")
    .select("*")
    .eq("entite_id", entiteId)
    .eq("nom", NOM_COMPTE_AVANCES)
    .maybeSingle();
  if (error) throw new Error(`Recherche du compte « ${NOM_COMPTE_AVANCES} » impossible : ${error.message}`);
  return (data as CompteTresorerie | null) ?? null;
}

/**
 * [07/11/2026] Crée le compte à la demande, UNE seule fois par structure : la
 * contrainte unique (entite_id, nom) de sql/06 fait de l'upsert « ignorer si
 * existe » une opération sûre, même lancée deux fois en même temps. Solde
 * initial inconnu (NULL), comme tout compte créé sans relevé.
 */
export async function obtenirCompteAvances(supabase: SupabaseClient, entiteId: string): Promise<CompteTresorerie> {
  const existant = await trouverCompteAvances(supabase, entiteId);
  if (existant) return existant;
  const { error } = await supabase
    .from("compte_tresorerie")
    .upsert(
      { entite_id: entiteId, nom: NOM_COMPTE_AVANCES, nature: "autre", solde_initial_centimes: null, date_solde_initial: null },
      { onConflict: "entite_id,nom", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Création du compte « ${NOM_COMPTE_AVANCES} » impossible : ${error.message}`);
  const cree = await trouverCompteAvances(supabase, entiteId);
  if (!cree) throw new Error(`Compte « ${NOM_COMPTE_AVANCES} » introuvable après création.`);
  return cree;
}

// ============================================================================
// Opérations (table transaction)
// ============================================================================

/** Dépenses dont le compte est inconnu, hors virements : tickets payés par un membre. */
export async function listerOperationsSansCompte(supabase: SupabaseClient, entiteId: string): Promise<Transaction[]> {
  return toutesLesPages<Transaction>(
    (d, f) =>
      supabase
        .from("transaction")
        .select("*")
        .eq("entite_id", entiteId)
        .eq("type", "depense")
        .is("compte_tresorerie_id", null)
        .is("virement_id", null)
        .order("date_transaction", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des opérations sans compte impossible",
  );
}

/** Dépenses passées sur un compte, hors virements : candidates au remboursement. */
export async function listerDepensesSurCompte(supabase: SupabaseClient, entiteId: string, depuis: string): Promise<Transaction[]> {
  return toutesLesPages<Transaction>(
    (d, f) =>
      supabase
        .from("transaction")
        .select("*")
        .eq("entite_id", entiteId)
        .eq("type", "depense")
        .not("compte_tresorerie_id", "is", null)
        .is("virement_id", null)
        .gte("date_transaction", depuis)
        .order("date_transaction", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des opérations bancaires impossible",
  );
}

export async function listerTransactionsParIds(supabase: SupabaseClient, entiteId: string, ids: string[]): Promise<Transaction[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("transaction").select("*").eq("entite_id", entiteId).in("id", ids);
  if (error) throw new Error(`Chargement des opérations impossible : ${error.message}`);
  return (data ?? []) as Transaction[];
}

/**
 * [07/11/2026] Crée les dépenses d'une validation de façon RELANÇABLE :
 * chacune porte la clé source « ndf-ligne:<id> » ; l'upsert ignore celles qui
 * existent déjà (contrainte transaction_source_unique de sql/06), puis on
 * relit toutes les clés pour connaître l'id de chaque dépense.
 * Renvoie clé source → transaction.
 */
export async function creerDepensesRelancables(
  supabase: SupabaseClient,
  entiteId: string,
  depenses: NouvelleTransaction[],
): Promise<Map<string, Transaction>> {
  if (depenses.length === 0) return new Map();
  const { error } = await supabase
    .from("transaction")
    .upsert(depenses, { onConflict: "entite_id,source_cle", ignoreDuplicates: true });
  if (error) throw new Error(`Création des dépenses impossible : ${error.message}`);
  const cles = depenses.map((d) => d.source_cle as string);
  const { data, error: e2 } = await supabase.from("transaction").select("*").eq("entite_id", entiteId).in("source_cle", cles);
  if (e2) throw new Error(`Relecture des dépenses impossible : ${e2.message}`);
  return new Map(((data ?? []) as Transaction[]).map((t) => [t.source_cle as string, t]));
}

// ============================================================================
// Contribution « frais abandonnés »
// ============================================================================

/**
 * Fiche de don créée à l'abandon. Clé « ndf:<id> » : relancer l'abandon ne la
 * duplique pas (unique (entite_id, source_cle) de sql/08). Renvoie son id.
 */
export async function creerContributionAbandon(supabase: SupabaseClient, c: NouvelleContribution): Promise<string> {
  const { error } = await supabase
    .from("contribution_nature")
    .upsert(c, { onConflict: "entite_id,source_cle", ignoreDuplicates: true });
  if (error) throw new Error(`Création de la fiche de frais abandonnés impossible : ${error.message}`);
  const { data, error: e2 } = await supabase
    .from("contribution_nature")
    .select("id")
    .eq("entite_id", c.entite_id)
    .eq("source_cle", c.source_cle as string)
    .single();
  if (e2) throw new Error(`Relecture de la fiche impossible : ${e2.message}`);
  return (data as { id: string }).id;
}
