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
 *
 * Les données viennent du même chargeur que l'export JSON
 * (lib/arena/chargement-public.ts) : une seule résolution des noms.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chargerTournoiPublic, slugFichier } from "@/lib/arena/chargement-public";
import { entetesCsv, genererCsv } from "@/lib/arena/csv";
import { libelleTour } from "@/lib/arena/mon-match";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const donnees = await chargerTournoiPublic(supabase, token);
  if (!donnees) notFound();
  const { tournoi, matchs, nom, nbRounds } = donnees;

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

  return new Response(genererCsv(lignes), {
    headers: entetesCsv(`arena-${slugFichier(tournoi.titre)}-resultats.csv`),
  });
}
