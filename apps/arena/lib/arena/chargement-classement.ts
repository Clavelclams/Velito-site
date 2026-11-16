/**
 * Chargement du classement public (14/11/2026) — partagé par la page
 * /classement et l'API /api/v1/classement, pour qu'elles ne divergent jamais.
 * Code déplacé tel quel depuis app/classement/page.tsx.
 *
 * Client ANONYME → RLS : seuls les tournois publiés et les joueurs non
 * anonymisés sont visibles. Les mineurs en mode restreint (profil_public =
 * false) sont retirés ICI, en plus de la RLS : jamais dans un classement public.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculerClassement, type LigneClassement } from "./classement";
import type { Discipline, Joueur, MatchRow, Tournoi } from "./types";

export interface LignePubliee extends LigneClassement {
  pseudo: string;
}

export async function chargerClassement(
  supabase: SupabaseClient,
  discipline: Discipline | null
): Promise<LignePubliee[]> {
  let requete = supabase
    .schema("arena")
    .from("tournois")
    .select("id, discipline")
    .eq("statut", "TERMINE");
  if (discipline) requete = requete.eq("discipline", discipline);
  const { data: tournois } = await requete;
  if (!tournois || tournois.length === 0) return [];

  const ids = tournois.map((t) => (t as Pick<Tournoi, "id">).id);
  const [{ data: matchsData }, { data: joueursData }, { data: equipesData }] =
    await Promise.all([
      supabase.schema("arena").from("matchs").select("*").in("tournoi_id", ids),
      supabase.schema("arena").from("joueurs").select("id, pseudo, profil_public"),
      // Compositions d'équipes : au padel, les points du tournoi vont à
      // chaque membre de la paire vainqueur, pas à un identifiant d'équipe
      // qui n'aurait aucun sens dans un classement de JOUEURS.
      supabase
        .schema("arena")
        .from("equipes")
        .select("id, membres:equipes_membres(joueur_id)")
        .in("tournoi_id", ids),
    ]);

  const membresParEquipe = new Map(
    ((equipesData ?? []) as { id: string; membres: { joueur_id: string }[] }[]).map(
      (e) => [e.id, (e.membres ?? []).map((mb) => mb.joueur_id)]
    )
  );

  const pseudos = new Map<string, { pseudo: string; public: boolean }>();
  for (const j of (joueursData ?? []) as Pick<Joueur, "id" | "pseudo" | "profil_public">[]) {
    pseudos.set(j.id, { pseudo: j.pseudo, public: j.profil_public });
  }

  const parTournoi = new Map<string, MatchRow[]>();
  for (const m of (matchsData ?? []) as MatchRow[]) {
    const liste = parTournoi.get(m.tournoi_id) ?? [];
    liste.push(m);
    parTournoi.set(m.tournoi_id, liste);
  }

  const lignes: LignePubliee[] = [];
  for (const l of calculerClassement([...parTournoi.values()], membresParEquipe)) {
    const p = pseudos.get(l.joueurId);
    // Mode restreint mineurs, ou joueur invisible (anonymisé, RLS) : absent.
    if (!p || p.public === false) continue;
    lignes.push({ ...l, pseudo: p.pseudo });
  }
  return lignes;
}
