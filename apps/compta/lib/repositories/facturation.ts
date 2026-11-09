/**
 * REPOSITORY DEVIS ET FACTURES (09/11/2026) : accès aux données.
 *
 * Tables facturation_parametres, client_facturation, devis, devis_ligne,
 * facture, facture_ligne, facture_paiement (sql/13), plus les recettes de la
 * table transaction dont le module a besoin (gardées ici pour ne pas toucher
 * aux repositories existants). Client injecté, requêtes paramétrées ; la RLS
 * cloisonne par structure, les triggers de sql/13 gardent numérotation, cycle
 * de vie, verrou d'émission et clôture ; le service a déjà validé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "@/types/database";
import type {
  ClientFacturation,
  Devis,
  Facture,
  LigneDevis,
  LigneFacture,
  NouveauClientFacturation,
  NouveauDevis,
  NouveauPaiementFacture,
  NouveauxParametresFacturation,
  NouvelleFacture,
  NouvelleLigneDevis,
  NouvelleLigneFacture,
  PaiementFacture,
  ParametresFacturation,
} from "@/types/facturation";

const PAGE = 1000;

/**
 * [09/11/2026] L'API Supabase plafonne chaque réponse à 1 000 lignes : on lit
 * par pages, avec un ordre stable (id en dernier), comme les notes de frais.
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
// Paramètres vendeur
// ============================================================================

export async function getParametres(supabase: SupabaseClient, entiteId: string): Promise<ParametresFacturation | null> {
  const { data, error } = await supabase.from("facturation_parametres").select("*").eq("entite_id", entiteId).maybeSingle();
  if (error) throw new Error(`Chargement des paramètres de facturation impossible : ${error.message}`);
  return (data as ParametresFacturation | null) ?? null;
}

/** Une ligne par structure : upsert sur la clé entite_id. */
export async function enregistrerParametres(supabase: SupabaseClient, p: NouveauxParametresFacturation): Promise<void> {
  const { error } = await supabase.from("facturation_parametres").upsert(p, { onConflict: "entite_id" });
  if (error) throw new Error(`Enregistrement des paramètres impossible : ${error.message}`);
}

// ============================================================================
// Clients
// ============================================================================

export async function listerClients(supabase: SupabaseClient, entiteId: string): Promise<ClientFacturation[]> {
  return toutesLesPages<ClientFacturation>(
    (d, f) => supabase.from("client_facturation").select("*").eq("entite_id", entiteId).order("nom").order("id").range(d, f),
    "Chargement des clients impossible",
  );
}

export async function getClient(supabase: SupabaseClient, id: string): Promise<ClientFacturation | null> {
  const { data, error } = await supabase.from("client_facturation").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement du client impossible : ${error.message}`);
  return (data as ClientFacturation | null) ?? null;
}

export async function creerClient(supabase: SupabaseClient, c: NouveauClientFacturation): Promise<ClientFacturation> {
  const { data, error } = await supabase.from("client_facturation").insert(c).select().single();
  if (error) throw new Error(`Création du client impossible : ${error.message}`);
  return data as ClientFacturation;
}

export async function modifierClient(supabase: SupabaseClient, id: string, c: Omit<NouveauClientFacturation, "entite_id">): Promise<void> {
  const { error } = await supabase.from("client_facturation").update(c).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Le trigger refuse la suppression d'un client utilisé (message lisible). */
export async function supprimerClient(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("client_facturation").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Devis
// ============================================================================

export async function listerDevis(supabase: SupabaseClient, entiteId: string): Promise<Devis[]> {
  return toutesLesPages<Devis>(
    (d, f) =>
      supabase
        .from("devis")
        .select("*")
        .eq("entite_id", entiteId)
        .order("date_devis", { ascending: false })
        .order("numero", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des devis impossible",
  );
}

export async function getDevis(supabase: SupabaseClient, id: string): Promise<Devis | null> {
  const { data, error } = await supabase.from("devis").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement du devis impossible : ${error.message}`);
  return (data as Devis | null) ?? null;
}

/** Le numéro n'est PAS envoyé : le trigger controle_devis l'attribue. */
export async function creerDevis(supabase: SupabaseClient, d: NouveauDevis): Promise<Devis> {
  const { data, error } = await supabase.from("devis").insert(d).select().single();
  if (error) throw new Error(`Création du devis impossible : ${error.message}`);
  return data as Devis;
}

export async function mettreAJourDevis(
  supabase: SupabaseClient,
  id: string,
  champs: Partial<Pick<Devis, "client_id" | "objet" | "date_devis" | "date_fin_validite" | "notes" | "statut" | "date_acceptation" | "signataire_accord" | "facture_id">>,
): Promise<void> {
  const { error } = await supabase.from("devis").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function supprimerDevis(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("devis").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listerLignesDevis(supabase: SupabaseClient, devisId: string): Promise<LigneDevis[]> {
  const { data, error } = await supabase.from("devis_ligne").select("*").eq("devis_id", devisId).order("position").order("cree_le").order("id");
  if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
  return (data ?? []) as LigneDevis[];
}

/** Toutes les lignes de devis de la structure (totaux de la liste). */
export async function listerLignesDevisEntite(supabase: SupabaseClient, entiteId: string): Promise<LigneDevis[]> {
  return toutesLesPages<LigneDevis>(
    (d, f) => supabase.from("devis_ligne").select("*").eq("entite_id", entiteId).order("id").range(d, f),
    "Chargement des lignes de devis impossible",
  );
}

export async function creerLignesDevis(supabase: SupabaseClient, lignes: NouvelleLigneDevis[]): Promise<void> {
  if (lignes.length === 0) return;
  const { error } = await supabase.from("devis_ligne").insert(lignes);
  if (error) throw new Error(error.message);
}

export async function getLigneDevis(supabase: SupabaseClient, id: string): Promise<LigneDevis | null> {
  const { data, error } = await supabase.from("devis_ligne").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la ligne impossible : ${error.message}`);
  return (data as LigneDevis | null) ?? null;
}

export async function supprimerLigneDevis(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("devis_ligne").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Factures et avoirs
// ============================================================================

export async function listerFactures(supabase: SupabaseClient, entiteId: string): Promise<Facture[]> {
  return toutesLesPages<Facture>(
    (d, f) =>
      supabase
        .from("facture")
        .select("*")
        .eq("entite_id", entiteId)
        .order("date_emission", { ascending: false, nullsFirst: true })
        .order("cree_le", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des factures impossible",
  );
}

export async function getFacture(supabase: SupabaseClient, id: string): Promise<Facture | null> {
  const { data, error } = await supabase.from("facture").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la facture impossible : ${error.message}`);
  return (data as Facture | null) ?? null;
}

/** Toujours un brouillon : numéro, totaux et instantanés sont l'affaire du trigger. */
export async function creerFacture(supabase: SupabaseClient, f: NouvelleFacture): Promise<Facture> {
  const { data, error } = await supabase.from("facture").insert(f).select().single();
  if (error) throw new Error(`Création du brouillon impossible : ${error.message}`);
  return data as Facture;
}

export async function mettreAJourFacture(
  supabase: SupabaseClient,
  id: string,
  champs: Partial<Omit<NouvelleFacture, "entite_id" | "sens">>,
): Promise<void> {
  const { error } = await supabase.from("facture").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * [09/11/2026] Émission : un seul UPDATE « statut = emise ». La base attribue
 * le numéro légal, fige les totaux et les instantanés dans la MÊME
 * transaction ; en cas de refus, rien n'est écrit et aucun numéro n'est
 * consommé. Renvoie la facture émise (avec son numéro).
 */
export async function emettreFacture(supabase: SupabaseClient, id: string): Promise<Facture> {
  const { data, error } = await supabase.from("facture").update({ statut: "emise" }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as Facture;
}

export async function supprimerFacture(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("facture").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listerLignesFacture(supabase: SupabaseClient, factureId: string): Promise<LigneFacture[]> {
  const { data, error } = await supabase.from("facture_ligne").select("*").eq("facture_id", factureId).order("position").order("cree_le").order("id");
  if (error) throw new Error(`Chargement des lignes impossible : ${error.message}`);
  return (data ?? []) as LigneFacture[];
}

/** Lignes de la structure (totaux des brouillons dans la liste). */
export async function listerLignesFactureEntite(supabase: SupabaseClient, entiteId: string): Promise<LigneFacture[]> {
  return toutesLesPages<LigneFacture>(
    (d, f) => supabase.from("facture_ligne").select("*").eq("entite_id", entiteId).order("id").range(d, f),
    "Chargement des lignes de facture impossible",
  );
}

export async function creerLignesFacture(supabase: SupabaseClient, lignes: NouvelleLigneFacture[]): Promise<void> {
  if (lignes.length === 0) return;
  const { error } = await supabase.from("facture_ligne").insert(lignes);
  if (error) throw new Error(error.message);
}

export async function getLigneFacture(supabase: SupabaseClient, id: string): Promise<LigneFacture | null> {
  const { data, error } = await supabase.from("facture_ligne").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la ligne impossible : ${error.message}`);
  return (data as LigneFacture | null) ?? null;
}

export async function supprimerLigneFacture(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("facture_ligne").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Encaissements
// ============================================================================

export async function listerPaiementsEntite(supabase: SupabaseClient, entiteId: string): Promise<PaiementFacture[]> {
  return toutesLesPages<PaiementFacture>(
    (d, f) => supabase.from("facture_paiement").select("*").eq("entite_id", entiteId).order("id").range(d, f),
    "Chargement des encaissements impossible",
  );
}

export async function getPaiement(supabase: SupabaseClient, id: string): Promise<PaiementFacture | null> {
  const { data, error } = await supabase.from("facture_paiement").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de l'encaissement impossible : ${error.message}`);
  return (data as PaiementFacture | null) ?? null;
}

/** Le trigger revérifie (facture émise, recette réelle, plafonds) sous verrou. */
export async function rattacherEncaissement(supabase: SupabaseClient, p: NouveauPaiementFacture): Promise<void> {
  const { error } = await supabase.from("facture_paiement").insert(p);
  if (error) throw new Error(error.message);
}

export async function retirerEncaissement(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("facture_paiement").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Recettes hors virement de la structure : candidates à l'encaissement. */
export async function listerRecettes(supabase: SupabaseClient, entiteId: string, depuis: string): Promise<Transaction[]> {
  return toutesLesPages<Transaction>(
    (d, f) =>
      supabase
        .from("transaction")
        .select("*")
        .eq("entite_id", entiteId)
        .eq("type", "recette")
        .is("virement_id", null)
        .gte("date_transaction", depuis)
        .order("date_transaction", { ascending: false })
        .order("id")
        .range(d, f),
    "Chargement des recettes impossible",
  );
}

export async function listerTransactionsParIds(supabase: SupabaseClient, entiteId: string, ids: string[]): Promise<Transaction[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("transaction").select("*").eq("entite_id", entiteId).in("id", ids);
  if (error) throw new Error(`Chargement des opérations impossible : ${error.message}`);
  return (data ?? []) as Transaction[];
}
