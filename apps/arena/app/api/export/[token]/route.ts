/**
 * Export JSON public d'un tournoi — GET /api/export/[qr_token]
 *
 * Pourquoi c'est important (cadrage §Vision) : ARENA promet que les résultats
 * appartiennent aux orgas et aux joueurs. Cet export est la preuve concrète :
 * n'importe qui peut récupérer les données d'un tournoi publié, format ouvert.
 * C'est aussi la matière première des dossiers de subvention VEA (impact).
 *
 * Sécurité : client ANONYME → RLS appliquée → un tournoi BROUILLON renvoie 404.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Joueur, MatchRow, Participation, Tournoi } from "@/lib/arena/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: tournoiData } = await supabase
    .schema("arena")
    .from("tournois")
    .select("*")
    .eq("qr_token", token)
    .maybeSingle();
  if (!tournoiData) {
    return NextResponse.json({ erreur: "Tournoi introuvable" }, { status: 404 });
  }
  const tournoi = tournoiData as Tournoi;

  const [{ data: partData }, { data: matchsData }] = await Promise.all([
    supabase
      .schema("arena")
      .from("participations")
      .select("*, joueur:joueurs(pseudo)")
      .eq("tournoi_id", tournoi.id),
    supabase
      .schema("arena")
      .from("matchs")
      .select("*")
      .eq("tournoi_id", tournoi.id)
      .order("round", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const participations = (partData ?? []) as (Participation & {
    joueur: Pick<Joueur, "pseudo"> | null;
  })[];
  const matchs = (matchsData ?? []) as MatchRow[];

  const pseudos = new Map<string, string>();
  for (const p of participations) {
    if (p.joueur) pseudos.set(p.joueur_id, p.joueur.pseudo);
  }

  const exportData = {
    format: "arena-export-v1",
    exporte_le: new Date().toISOString(),
    tournoi: {
      titre: tournoi.titre,
      jeu: tournoi.jeu,
      format: tournoi.format,
      statut: tournoi.statut,
      date_debut: tournoi.date_debut,
      lieu: tournoi.lieu,
    },
    participants: participations.map((p) => ({
      pseudo: p.joueur?.pseudo ?? "?",
      check_in: p.check_in,
    })),
    matchs: matchs.map((m) => ({
      round: m.round,
      position: m.position,
      joueur1: m.joueur1_id ? (pseudos.get(m.joueur1_id) ?? null) : null,
      joueur2: m.joueur2_id ? (pseudos.get(m.joueur2_id) ?? null) : null,
      score_j1: m.score_j1,
      score_j2: m.score_j2,
      bye: m.is_bye,
      gagnant: m.gagnant_id ? (pseudos.get(m.gagnant_id) ?? null) : null,
      statut: m.statut,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="arena-${tournoi.titre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json"`,
    },
  });
}
