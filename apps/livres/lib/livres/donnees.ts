/**
 * Lectures PUBLIQUES (13/11/2026) : client de la session (anonyme le plus
 * souvent), donc la RLS s'applique : seules les boîtes actives sortent.
 * Ne lève jamais : une base injoignable donne une liste vide, et la page
 * l'explique au lieu d'afficher une erreur 500.
 */
import { createClient } from "../supabase/server";
import { COLONNES_PUBLIQUES, type BoitePublique } from "./types";

export async function lireBoites(): Promise<BoitePublique[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("livres")
      .from("boites")
      .select(COLONNES_PUBLIQUES)
      .order("nom", { ascending: true });
    if (error) {
      console.error("[livres/donnees] lireBoites", error.code, error.message);
      return null;
    }
    return (data ?? []) as unknown as BoitePublique[];
  } catch (e) {
    console.error("[livres/donnees] lireBoites", e);
    return null;
  }
}

export async function lireBoite(slug: string): Promise<BoitePublique | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .schema("livres")
      .from("boites")
      .select(COLONNES_PUBLIQUES)
      .eq("slug", slug)
      .maybeSingle();
    return (data as unknown as BoitePublique | null) ?? null;
  } catch {
    return null;
  }
}
