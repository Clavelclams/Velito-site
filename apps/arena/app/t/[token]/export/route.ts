/**
 * GET /t/[token]/export — les résultats du tournoi en CSV, PUBLIC.
 *
 * C'est la doctrine de complémentarité rendue exécutable : tout ce qu'ARENA
 * affiche sur la page publique peut en repartir en un clic, gratuitement.
 * Les plateformes pro facturent l'accès programmatique aux données ; nous en
 * faisons un argument.
 *
 * Sécurité identique à la page publique : client Supabase ANONYME, donc la
 * RLS s'applique — un tournoi BROUILLON est introuvable ici aussi, et le
 * qr_token non devinable reste la seule porte d'entrée. L'export ne révèle
 * RIEN que la page ne montre déjà : mêmes données, autre format.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entetesCsv, genererCsv } from "@/lib/arena/csv";
import { libelleTour } from "@/lib/arena/mon-match";
import type { Joueur, MatchRow, Participation, Tournoi } from "@/lib/arena/types";

export async function GET(
  _req: Request,
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
  if (!tournoiData) notFound();
  const tournoi = tournoiData as Tournoi;

  const [{ data: partData }, { data: matchsData }, { data: equipesData }] =
    await Promise.all([
      supabase
        .schema("arena")
        .from("participations")
        .select("joueur_id, joueur:joueurs(pseudo)")
        .eq("tournoi_id", tournoi.id),
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
        .select("id, nom")
        .eq("tournoi_id", tournoi.id),
    ]);

  const matchs = (matchsData ?? []) as MatchRow[];

  const noms = new Map<string, string>();
  for (const p of (partData ?? []) as unknown as (Participation & {
    joueur: Pick<Joueur, "pseudo"> | null;
  })[]) {
    if (p.joueur) noms.set(p.joueur_id, p.joueur.pseudo);
  }
  for (const e of (equipesData ?? []) as { id: string; nom: string }[]) {
    noms.set(e.id, e.nom);
  }
  const nom = (id: string | null) => (id ? (noms.get(id) ?? "?") : "");

  const roundsW = matchs
    .filter((m) => (m.bracket ?? "W") === "W")
    .map((m) => m.round);
  const nbRounds = roundsW.length > 0 ? Math.max(...roundsW) : 0;

  const lignes: string[][] = [
    ["Tour", "Camp 1", "Score 1", "Score 2", "Camp 2", "Vainqueur", "Terrain", "Statut"],
    ...matchs
      // Les byes sont un artefact du bracket, pas un résultat : les exporter
      // produirait des lignes « X contre personne » qui polluent le fichier.
      .filter((m) => !m.is_bye)
      .map((m) => [
        libelleTour(m, nbRounds),
        nom(m.equipe1_id ?? m.joueur1_id),
        m.score_j1 === null ? "" : String(m.score_j1),
        m.score_j2 === null ? "" : String(m.score_j2),
        nom(m.equipe2_id ?? m.joueur2_id),
        nom(m.equipe_gagnante_id ?? m.gagnant_id),
        m.terrain ?? "",
        m.statut,
      ]),
  ];

  // Nom de fichier lisible, sans caractères interdits par les OS.
  const slug = tournoi.titre.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
  return new Response(genererCsv(lignes), {
    headers: entetesCsv(`arena-${slug}-resultats.csv`),
  });
}
