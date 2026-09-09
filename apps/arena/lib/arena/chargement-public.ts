/**
 * Chargement PUBLIC d'un tournoi par son qr_token — partagé par les exports
 * CSV et JSON (et, à terme, par la page publique).
 *
 * Pourquoi ce module : trois endroits reconstruisaient chacun leur table
 * « identifiant → nom » (joueurs + équipes), avec de petites différences
 * (l'export JSON ignorait les équipes, donc un match de padel sortait avec
 * deux camps vides — audit du 06/09/2026). Une seule résolution, un seul
 * comportement.
 *
 * Sécurité : le client passé est ANONYME → la RLS s'applique. Un tournoi
 * BROUILLON est introuvable, un joueur anonymisé n'a pas de nom (on affiche
 * « Anonyme »), et seules les colonnes publiques de joueurs sont demandées
 * (migration 009).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchRow, Tournoi } from "./types";

export interface EquipePublique {
  id: string;
  nom: string;
  /** Pseudos des membres (résolus ; « Anonyme » si le joueur est effacé). */
  membres: string[];
}

export interface TournoiPublic {
  tournoi: Tournoi;
  /** Participants dans l'ordre d'inscription : { pseudo, check_in }. */
  participants: { id: string; pseudo: string; check_in: boolean }[];
  matchs: MatchRow[];
  equipes: EquipePublique[];
  /** Nom d'un camp (joueur OU équipe) à partir de son identifiant. */
  nom: (id: string | null | undefined) => string;
  /** Profondeur du tableau principal (pour nommer finale / demi-finale…). */
  nbRounds: number;
}

/** Libellé d'un identifiant sans nom résolu : joueur effacé (RGPD). */
export const NOM_ANONYME = "Anonyme";

export async function chargerTournoiPublic(
  supabase: SupabaseClient,
  token: string
): Promise<TournoiPublic | null> {
  const { data: tournoiData } = await supabase
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();
  if (!tournoiData) return null;
  const tournoi = tournoiData as Tournoi;

  const [{ data: partData }, { data: matchsData }, { data: equipesData }] =
    await Promise.all([
      supabase
        .schema("arena")
        .from("participations")
        .select("id, joueur_id, check_in, joueur:joueurs(id, pseudo)")
        .eq("tournoi_id", tournoi.id)
        .order("created_at", { ascending: true }),
      supabase
        .schema("arena")
        .from("matchs")
        .select("*")
        .eq("tournoi_id", tournoi.id)
        .order("round", { ascending: true })
        .order("position", { ascending: true }),
      supabase
        .schema("arena")
        .from("equipes")
        .select("id, nom, membres:equipes_membres(joueur_id)")
        .eq("tournoi_id", tournoi.id)
        .order("nom", { ascending: true }),
    ]);

  const noms = new Map<string, string>();
  const participants = ((partData ?? []) as unknown as {
    id: string;
    joueur_id: string;
    check_in: boolean;
    joueur: { id: string; pseudo: string } | null;
  }[]).map((p) => {
    const pseudo = p.joueur?.pseudo ?? NOM_ANONYME;
    noms.set(p.joueur_id, pseudo);
    return { id: p.joueur_id, pseudo, check_in: p.check_in };
  });

  const equipes = ((equipesData ?? []) as unknown as {
    id: string;
    nom: string;
    membres: { joueur_id: string }[] | null;
  }[]).map((e) => {
    noms.set(e.id, e.nom);
    return {
      id: e.id,
      nom: e.nom,
      membres: (e.membres ?? []).map((mb) => noms.get(mb.joueur_id) ?? NOM_ANONYME),
    };
  });

  const matchs = (matchsData ?? []) as MatchRow[];
  const roundsW = matchs.filter((m) => (m.bracket ?? "W") === "W").map((m) => m.round);
  const nbRounds = roundsW.length > 0 ? Math.max(...roundsW) : 0;

  return {
    tournoi,
    participants,
    matchs,
    equipes,
    nom: (id) => (id ? (noms.get(id) ?? NOM_ANONYME) : ""),
    nbRounds,
  };
}

/** Nom de fichier sûr pour un export : sans caractères interdits par les OS. */
export function slugFichier(titre: string): string {
  return titre.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
}
